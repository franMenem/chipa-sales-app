-- ============================================================================
-- Fix: Security warnings from Supabase Linter
--
-- 1. Re-drop/create views to clear SECURITY DEFINER errors
-- 2. Add SET search_path = 'public' to all SECURITY DEFINER functions
-- 3. Add search_path to trigger functions flagged by linter
-- ============================================================================

-- ============================================================================
-- ERRORS: Views with SECURITY DEFINER (re-create to clear linter cache)
-- ============================================================================

DROP VIEW IF EXISTS public.productos_with_cost;
DROP VIEW IF EXISTS public.insumos_with_stock;

CREATE VIEW public.insumos_with_stock
WITH (security_invoker = true) AS
SELECT
  i.*,
  COALESCE(agg.total_stock, 0) AS total_stock,
  agg.current_price_per_unit,
  agg.current_base_unit_cost,
  COALESCE(agg.active_batches, 0) AS active_batches
FROM public.insumos i
LEFT JOIN LATERAL (
  SELECT
    SUM(il.quantity_remaining) AS total_stock,
    COUNT(*) FILTER (WHERE il.quantity_remaining > 0) AS active_batches,
    (SELECT il2.price_per_unit
     FROM public.insumo_lotes il2
     WHERE il2.insumo_id = i.id AND il2.quantity_remaining > 0
     ORDER BY il2.purchase_date DESC
     LIMIT 1) AS current_price_per_unit,
    (SELECT il2.base_unit_cost
     FROM public.insumo_lotes il2
     WHERE il2.insumo_id = i.id AND il2.quantity_remaining > 0
     ORDER BY il2.purchase_date DESC
     LIMIT 1) AS current_base_unit_cost
  FROM public.insumo_lotes il
  WHERE il.insumo_id = i.id
) agg ON true;

CREATE OR REPLACE VIEW public.productos_with_cost
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.user_id,
  p.name,
  p.finished_stock,
  p.created_at,
  p.updated_at,
  COALESCE(SUM(
    CASE
      WHEN ri.id IS NULL THEN 0
      WHEN ri.use_categorias THEN
        ri.quantity_in_base_units *
        COALESCE((
          SELECT MIN(iws_cat.current_price_per_unit)
          FROM insumos_with_stock iws_cat
          WHERE iws_cat.user_id = p.user_id
            AND iws_cat.is_active
            AND COALESCE(to_jsonb(iws_cat.categoria_ids), '[]'::jsonb)
              @> COALESCE(ri.required_categoria_ids, '[]'::jsonb)
            AND iws_cat.total_stock >= ri.quantity_in_base_units
        ), 0)
      ELSE ri.quantity_in_base_units * COALESCE(iws.current_price_per_unit, 0)
    END
  ), 0) AS cost_unit,
  BOOL_AND(
    CASE
      WHEN ri.id IS NULL THEN TRUE
      WHEN ri.use_categorias THEN EXISTS (
        SELECT 1
        FROM insumos_with_stock iws_cat
        WHERE iws_cat.user_id = p.user_id
          AND iws_cat.is_active
          AND COALESCE(to_jsonb(iws_cat.categoria_ids), '[]'::jsonb)
            @> COALESCE(ri.required_categoria_ids, '[]'::jsonb)
          AND iws_cat.total_stock >= ri.quantity_in_base_units
      )
      ELSE COALESCE(iws.total_stock, 0) >= ri.quantity_in_base_units
    END
  ) AS has_sufficient_ingredients
FROM public.productos p
LEFT JOIN public.recipe_items ri ON p.id = ri.producto_id
LEFT JOIN public.insumos_with_stock iws ON ri.insumo_id = iws.id
GROUP BY p.id, p.user_id, p.name, p.finished_stock, p.created_at, p.updated_at;

-- ============================================================================
-- WARNINGS: Functions with SECURITY DEFINER missing search_path
-- ============================================================================

-- 1. get_insumos_by_categorias
CREATE OR REPLACE FUNCTION public.get_insumos_by_categorias(
  p_categoria_ids JSONB,
  p_user_id UUID
) RETURNS TABLE (
  insumo_id UUID,
  insumo_name TEXT,
  unit_type TEXT,
  total_stock DECIMAL(10,4),
  current_base_unit_cost DECIMAL(10,4)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    iws.id AS insumo_id,
    iws.name AS insumo_name,
    iws.unit_type,
    iws.total_stock,
    iws.current_base_unit_cost
  FROM insumos_with_stock iws
  WHERE iws.user_id = p_user_id
    AND iws.categoria_ids @> p_categoria_ids
    AND iws.total_stock > 0
  ORDER BY iws.current_base_unit_cost ASC;
END;
$$;

-- 2. validate_categoria_ownership
CREATE OR REPLACE FUNCTION public.validate_categoria_ownership(
  p_categoria_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM categorias
    WHERE id = p_categoria_id
      AND user_id = p_user_id
      AND is_active = TRUE
  );
END;
$$;

-- 3. update_categorias_updated_at (no SECURITY DEFINER, but linter flags search_path)
CREATE OR REPLACE FUNCTION public.update_categorias_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 4. produce_producto
CREATE OR REPLACE FUNCTION public.produce_producto(
  p_producto_id UUID,
  p_quantity INTEGER
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_recipe_item RECORD;
  v_needed_quantity DECIMAL(10,4);
  v_consumed_quantity DECIMAL(10,4);
  v_lote RECORD;
  v_total_cost DECIMAL(10,4) := 0;
  v_to_consume DECIMAL(10,4);
  v_consumption_logs JSONB := '[]'::jsonb;
  v_production_history_id UUID;
  v_cost_unit DECIMAL(10,4);
  v_precision CONSTANT DECIMAL(10,4) := 0.0001;
BEGIN
  SELECT user_id INTO v_user_id FROM productos WHERE id = p_producto_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a 0';
  END IF;

  FOR v_recipe_item IN
    SELECT
      ri.*,
      i.name as insumo_name,
      i.unit_type
    FROM recipe_items ri
    JOIN insumos i ON ri.insumo_id = i.id
    WHERE ri.producto_id = p_producto_id
  LOOP
    v_needed_quantity := v_recipe_item.quantity_in_base_units * p_quantity;
    v_consumed_quantity := 0;

    FOR v_lote IN
      SELECT * FROM insumo_lotes
      WHERE insumo_id = v_recipe_item.insumo_id
        AND quantity_remaining > 0
        AND user_id = v_user_id
      ORDER BY purchase_date DESC, created_at DESC
    LOOP
      v_to_consume := LEAST(v_lote.quantity_remaining, v_needed_quantity - v_consumed_quantity);

      IF v_to_consume > 0 THEN
        UPDATE insumo_lotes
        SET
          quantity_remaining = quantity_remaining - v_to_consume,
          updated_at = NOW()
        WHERE id = v_lote.id;

        v_total_cost := v_total_cost + (v_to_consume * v_lote.price_per_unit);
        v_consumed_quantity := v_consumed_quantity + v_to_consume;

        v_consumption_logs := v_consumption_logs || jsonb_build_array(jsonb_build_object(
          'recipe_item_id', v_recipe_item.id,
          'insumo_id', v_recipe_item.insumo_id,
          'lote_id', v_lote.id,
          'quantity_used', v_to_consume,
          'cost_per_unit', v_lote.price_per_unit
        ));
      END IF;

      EXIT WHEN v_consumed_quantity >= v_needed_quantity - v_precision;
    END LOOP;

    IF v_consumed_quantity < v_needed_quantity - v_precision THEN
      RAISE EXCEPTION 'Stock insuficiente de "%" (necesario: %, disponible: %)',
        v_recipe_item.insumo_name,
        v_needed_quantity,
        v_consumed_quantity;
    END IF;
  END LOOP;

  v_cost_unit := v_total_cost / p_quantity;

  UPDATE productos
  SET
    finished_stock = finished_stock + p_quantity,
    updated_at = NOW()
  WHERE id = p_producto_id;

  INSERT INTO production_history (
    user_id, producto_id, quantity_produced, cost_unit_at_production, production_date
  ) VALUES (
    v_user_id, p_producto_id, p_quantity, v_cost_unit, NOW()
  ) RETURNING id INTO v_production_history_id;

  IF jsonb_array_length(v_consumption_logs) > 0 THEN
    INSERT INTO production_consumptions (
      user_id, production_history_id, producto_id, recipe_item_id,
      insumo_id, lote_id, quantity_used, cost_per_unit
    )
    SELECT
      v_user_id, v_production_history_id, p_producto_id,
      (entry->>'recipe_item_id')::UUID,
      (entry->>'insumo_id')::UUID,
      (entry->>'lote_id')::UUID,
      (entry->>'quantity_used')::DECIMAL(10,4),
      (entry->>'cost_per_unit')::DECIMAL(10,4)
    FROM jsonb_array_elements(v_consumption_logs) AS entry;
  END IF;

  RETURN json_build_object(
    'success', TRUE,
    'quantity_produced', p_quantity,
    'total_cost', v_total_cost,
    'cost_per_unit', v_cost_unit
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$;

-- 5. reverse_production
CREATE OR REPLACE FUNCTION public.reverse_production(
  p_production_history_id UUID,
  p_force BOOLEAN DEFAULT FALSE
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_production RECORD;
  v_consumption RECORD;
  v_total_cost DECIMAL(10,4) := 0;
  v_current_stock INTEGER;
  v_new_stock INTEGER;
BEGIN
  SELECT * INTO v_production
  FROM production_history
  WHERE id = p_production_history_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro de producción no encontrado';
  END IF;

  IF v_production.user_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  v_user_id := v_production.user_id;

  SELECT finished_stock INTO v_current_stock
  FROM productos
  WHERE id = v_production.producto_id;

  v_new_stock := v_current_stock - v_production.quantity_produced;

  IF NOT p_force AND v_new_stock < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente de producto terminado (tiene %, necesita %) para revertir esta producción. Usa la opción "Forzar" si quieres revertir de todos modos.',
      v_current_stock,
      v_production.quantity_produced;
  END IF;

  FOR v_consumption IN
    SELECT * FROM production_consumptions
    WHERE production_history_id = p_production_history_id
  LOOP
    UPDATE insumo_lotes
    SET
      quantity_remaining = quantity_remaining + v_consumption.quantity_used,
      updated_at = NOW()
    WHERE id = v_consumption.lote_id;

    v_total_cost := v_total_cost + (v_consumption.quantity_used * v_consumption.cost_per_unit);
  END LOOP;

  UPDATE productos
  SET finished_stock = v_new_stock, updated_at = NOW()
  WHERE id = v_production.producto_id;

  DELETE FROM production_consumptions
  WHERE production_history_id = p_production_history_id;

  DELETE FROM production_history
  WHERE id = p_production_history_id;

  RETURN json_build_object(
    'success', TRUE,
    'quantity_reversed', v_production.quantity_produced,
    'total_cost_reversed', v_total_cost,
    'new_stock', v_new_stock,
    'was_forced', p_force
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$;

-- 6. produce_producto_custom_order
DROP FUNCTION IF EXISTS public.produce_producto_custom_order(UUID, INTEGER, DECIMAL, DECIMAL, JSONB, JSONB);

CREATE OR REPLACE FUNCTION public.produce_producto_custom_order(
  p_producto_id UUID,
  p_quantity INTEGER,
  p_margin_percentage DECIMAL(5,2),
  p_price_sale DECIMAL(10,2),
  p_lote_order JSONB DEFAULT '{}'::jsonb,
  p_lot_selections JSONB DEFAULT '[]'::jsonb
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_recipe_item RECORD;
  v_needed_quantity DECIMAL(10,4);
  v_consumed_quantity DECIMAL(10,4);
  v_lote RECORD;
  v_total_cost DECIMAL(10,4) := 0;
  v_to_consume DECIMAL(10,4);
  v_custom_order TEXT[];
  v_lote_id UUID;
  v_selection RECORD;
  v_selection_total DECIMAL(10,4);
  v_lot_entry RECORD;
  v_consumption_logs JSONB := '[]'::jsonb;
  v_production_history_id UUID;
  v_stock_fabricado_id UUID;
  v_cost_unit DECIMAL(10,4);
  v_precision CONSTANT DECIMAL(10,4) := 0.0001;
  v_ingredient_id UUID;
  v_insumo_name TEXT;
  v_selections_for_item JSONB;
BEGIN
  SELECT user_id INTO v_user_id FROM productos WHERE id = p_producto_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a 0';
  END IF;
  IF p_margin_percentage < 0 OR p_margin_percentage > 100 THEN
    RAISE EXCEPTION 'El margen debe estar entre 0 y 100%%';
  END IF;
  IF p_price_sale < 0 THEN
    RAISE EXCEPTION 'El precio de venta debe ser mayor o igual a 0';
  END IF;

  FOR v_selection IN
    SELECT
      (sel->>'recipe_item_id')::UUID as recipe_item_id,
      (sel->>'ingredient_id')::UUID as ingredient_id,
      sel->'lots' as lots
    FROM jsonb_array_elements(p_lot_selections) AS sel
  LOOP
    SELECT
      ri.*,
      CASE
        WHEN ri.insumo_id IS NOT NULL THEN ri.quantity_in_base_units
        ELSE ri.quantity_in_base_units
      END as quantity_needed
    INTO v_recipe_item
    FROM recipe_items ri
    WHERE ri.id = v_selection.recipe_item_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Recipe item % no encontrado', v_selection.recipe_item_id;
    END IF;

    SELECT name INTO v_insumo_name FROM insumos WHERE id = v_selection.ingredient_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insumo % no encontrado', v_selection.ingredient_id;
    END IF;

    v_needed_quantity := v_recipe_item.quantity_needed * p_quantity;
    v_consumed_quantity := 0;

    SELECT COALESCE(SUM((lot->>'quantity')::DECIMAL), 0)
    INTO v_selection_total
    FROM jsonb_array_elements(v_selection.lots) AS lot;

    FOR v_lot_entry IN
      SELECT
        (lot->>'lot_id')::UUID AS lot_id,
        (lot->>'quantity')::DECIMAL(10,4) AS quantity
      FROM jsonb_array_elements(v_selection.lots) AS lot
    LOOP
      IF v_lot_entry.quantity <= 0 THEN
        CONTINUE;
      END IF;

      SELECT * INTO v_lote FROM insumo_lotes
      WHERE id = v_lot_entry.lot_id
        AND insumo_id = v_selection.ingredient_id
        AND quantity_remaining > 0
        AND user_id = v_user_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Lote % inválido para "%"', v_lot_entry.lot_id, v_insumo_name;
      END IF;

      IF v_lot_entry.quantity > v_lote.quantity_remaining + v_precision THEN
        RAISE EXCEPTION 'Stock insuficiente en lote % para "%" (disponible: %, requerido: %)',
          v_lot_entry.lot_id, v_insumo_name, v_lote.quantity_remaining, v_lot_entry.quantity;
      END IF;

      UPDATE insumo_lotes
      SET
        quantity_remaining = quantity_remaining - v_lot_entry.quantity,
        updated_at = NOW()
      WHERE id = v_lote.id;

      v_total_cost := v_total_cost + (v_lot_entry.quantity * v_lote.price_per_unit);
      v_consumed_quantity := v_consumed_quantity + v_lot_entry.quantity;

      v_consumption_logs := v_consumption_logs || jsonb_build_array(jsonb_build_object(
        'recipe_item_id', v_recipe_item.id,
        'insumo_id', v_selection.ingredient_id,
        'lote_id', v_lote.id,
        'quantity_used', v_lot_entry.quantity,
        'cost_per_unit', v_lote.price_per_unit
      ));
    END LOOP;
  END LOOP;

  FOR v_recipe_item IN
    SELECT ri.* FROM recipe_items ri WHERE ri.producto_id = p_producto_id
  LOOP
    v_needed_quantity := v_recipe_item.quantity_in_base_units * p_quantity;

    SELECT COALESCE(SUM((entry->>'quantity_used')::DECIMAL), 0)
    INTO v_consumed_quantity
    FROM jsonb_array_elements(v_consumption_logs) AS entry
    WHERE (entry->>'recipe_item_id')::UUID = v_recipe_item.id;

    IF v_consumed_quantity < v_needed_quantity - v_precision THEN
      RAISE EXCEPTION 'Cantidad insuficiente para recipe item % (requerido: %, consumido: %)',
        v_recipe_item.id, v_needed_quantity, v_consumed_quantity;
    END IF;
  END LOOP;

  v_cost_unit := v_total_cost / p_quantity;

  UPDATE productos
  SET finished_stock = finished_stock + p_quantity, updated_at = NOW()
  WHERE id = p_producto_id;

  INSERT INTO production_history (
    user_id, producto_id, quantity_produced, cost_unit_at_production, production_date
  ) VALUES (
    v_user_id, p_producto_id, p_quantity, v_cost_unit, NOW()
  ) RETURNING id INTO v_production_history_id;

  INSERT INTO stock_fabricado (
    user_id, production_history_id, producto_id, quantity_fabricated,
    quantity_remaining, cost_unit, margin_percentage, price_sale, production_date
  ) VALUES (
    v_user_id, v_production_history_id, p_producto_id, p_quantity,
    p_quantity, v_cost_unit, p_margin_percentage, p_price_sale, NOW()
  ) RETURNING id INTO v_stock_fabricado_id;

  IF jsonb_array_length(v_consumption_logs) > 0 THEN
    INSERT INTO production_consumptions (
      user_id, production_history_id, producto_id, recipe_item_id,
      insumo_id, lote_id, quantity_used, cost_per_unit
    )
    SELECT
      v_user_id, v_production_history_id, p_producto_id,
      (entry->>'recipe_item_id')::UUID,
      (entry->>'insumo_id')::UUID,
      (entry->>'lote_id')::UUID,
      (entry->>'quantity_used')::DECIMAL(10,4),
      (entry->>'cost_per_unit')::DECIMAL(10,4)
    FROM jsonb_array_elements(v_consumption_logs) AS entry;
  END IF;

  RETURN json_build_object(
    'success', TRUE,
    'quantity_produced', p_quantity,
    'total_cost', v_total_cost,
    'cost_per_unit', v_cost_unit,
    'margin_percentage', p_margin_percentage,
    'price_sale', p_price_sale,
    'production_history_id', v_production_history_id,
    'stock_fabricado_id', v_stock_fabricado_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$;

-- 7. sync_deuda_paid_amount
CREATE OR REPLACE FUNCTION public.sync_deuda_paid_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  target_deuda_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_deuda_id := OLD.deuda_id;
  ELSE
    target_deuda_id := NEW.deuda_id;
  END IF;

  UPDATE deudas
  SET paid_amount = COALESCE(
    (SELECT SUM(dp.amount) FROM deuda_pagos dp WHERE dp.deuda_id = target_deuda_id),
    0
  )
  WHERE id = target_deuda_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- 8. update_stock_fabricado_updated_at (no SECURITY DEFINER, but linter flags it)
CREATE OR REPLACE FUNCTION public.update_stock_fabricado_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 9. update_updated_at_column (no SECURITY DEFINER, but linter flags it)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
