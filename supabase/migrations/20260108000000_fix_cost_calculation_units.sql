-- Fix cost calculations to use unit-based pricing (quantity fields are stored in unit_type)

-- Update productos_with_cost to use current_price_per_unit
CREATE OR REPLACE VIEW productos_with_cost AS
SELECT
  p.id,
  p.user_id,
  p.name,
  p.finished_stock,
  p.created_at,
  p.updated_at,

  -- Calculate cost based on current LIFO prices (price per unit_type)
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

  -- Check if all ingredients have sufficient stock
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

FROM productos p
LEFT JOIN recipe_items ri ON p.id = ri.producto_id
LEFT JOIN insumos_with_stock iws ON ri.insumo_id = iws.id
GROUP BY p.id, p.user_id, p.name, p.finished_stock, p.created_at, p.updated_at;

COMMENT ON VIEW productos_with_cost IS 'Vista de productos con costo estimado (solo para referencia). El precio y margen real se configuran en stock_fabricado.';

-- Produce products (consume insumos using LIFO, increase finished_stock)
CREATE OR REPLACE FUNCTION produce_producto(
  p_producto_id UUID,
  p_quantity INTEGER
) RETURNS JSON AS $$
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
    user_id,
    producto_id,
    quantity_produced,
    cost_unit_at_production,
    production_date
  )
  VALUES (
    v_user_id,
    p_producto_id,
    p_quantity,
    v_cost_unit,
    NOW()
  )
  RETURNING id INTO v_production_history_id;

  IF jsonb_array_length(v_consumption_logs) > 0 THEN
    INSERT INTO production_consumptions (
      user_id,
      production_history_id,
      producto_id,
      recipe_item_id,
      insumo_id,
      lote_id,
      quantity_used,
      cost_per_unit
    )
    SELECT
      v_user_id,
      v_production_history_id,
      p_producto_id,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Produce products with custom lote selection and categories
DROP FUNCTION IF EXISTS produce_producto_custom_order(UUID, INTEGER, DECIMAL, DECIMAL, JSONB, JSONB);

CREATE OR REPLACE FUNCTION produce_producto_custom_order(
  p_producto_id UUID,
  p_quantity INTEGER,
  p_margin_percentage DECIMAL(5,2),
  p_price_sale DECIMAL(10,2),
  p_lote_order JSONB DEFAULT '{}'::jsonb,
  p_lot_selections JSONB DEFAULT '[]'::jsonb
) RETURNS JSON AS $$
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
  -- Validate user ownership
  SELECT user_id INTO v_user_id FROM productos WHERE id = p_producto_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Validate parameters
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a 0';
  END IF;
  IF p_margin_percentage < 0 OR p_margin_percentage > 100 THEN
    RAISE EXCEPTION 'El margen debe estar entre 0 y 100%%';
  END IF;
  IF p_price_sale < 0 THEN
    RAISE EXCEPTION 'El precio de venta debe ser mayor o igual a 0';
  END IF;

  -- Process lot_selections directly (handles both regular and category-based ingredients)
  -- Group by recipe_item_id and ingredient_id
  FOR v_selection IN
    SELECT
      (sel->>'recipe_item_id')::UUID as recipe_item_id,
      (sel->>'ingredient_id')::UUID as ingredient_id,
      sel->'lots' as lots
    FROM jsonb_array_elements(p_lot_selections) AS sel
  LOOP
    -- Get recipe item details
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

    -- Get insumo name
    SELECT name INTO v_insumo_name FROM insumos WHERE id = v_selection.ingredient_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insumo % no encontrado', v_selection.ingredient_id;
    END IF;

    v_needed_quantity := v_recipe_item.quantity_needed * p_quantity;
    v_consumed_quantity := 0;

    -- Calculate total selected for this ingredient
    SELECT COALESCE(SUM((lot->>'quantity')::DECIMAL), 0)
    INTO v_selection_total
    FROM jsonb_array_elements(v_selection.lots) AS lot;

    -- Process each lot for this ingredient
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

      -- Consume the lot
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

  -- Validate that all recipe items were satisfied
  FOR v_recipe_item IN
    SELECT ri.*
    FROM recipe_items ri
    WHERE ri.producto_id = p_producto_id
  LOOP
    v_needed_quantity := v_recipe_item.quantity_in_base_units * p_quantity;

    -- Calculate total consumed for this recipe item (sum across all ingredients)
    SELECT COALESCE(SUM((entry->>'quantity_used')::DECIMAL), 0)
    INTO v_consumed_quantity
    FROM jsonb_array_elements(v_consumption_logs) AS entry
    WHERE (entry->>'recipe_item_id')::UUID = v_recipe_item.id;

    IF v_consumed_quantity < v_needed_quantity - v_precision THEN
      RAISE EXCEPTION 'Cantidad insuficiente para recipe item % (requerido: %, consumido: %)',
        v_recipe_item.id, v_needed_quantity, v_consumed_quantity;
    END IF;
  END LOOP;

  -- Calculate cost per unit
  v_cost_unit := v_total_cost / p_quantity;

  -- Update finished_stock in productos
  UPDATE productos
  SET
    finished_stock = finished_stock + p_quantity,
    updated_at = NOW()
  WHERE id = p_producto_id;

  -- Create production_history record
  INSERT INTO production_history (
    user_id,
    producto_id,
    quantity_produced,
    cost_unit_at_production,
    production_date
  )
  VALUES (
    v_user_id,
    p_producto_id,
    p_quantity,
    v_cost_unit,
    NOW()
  )
  RETURNING id INTO v_production_history_id;

  -- Create stock_fabricado record
  INSERT INTO stock_fabricado (
    user_id,
    production_history_id,
    producto_id,
    quantity_fabricated,
    quantity_remaining,
    cost_unit,
    margin_percentage,
    price_sale,
    production_date
  )
  VALUES (
    v_user_id,
    v_production_history_id,
    p_producto_id,
    p_quantity,
    p_quantity,
    v_cost_unit,
    p_margin_percentage,
    p_price_sale,
    NOW()
  )
  RETURNING id INTO v_stock_fabricado_id;

  -- Insert production_consumptions
  IF jsonb_array_length(v_consumption_logs) > 0 THEN
    INSERT INTO production_consumptions (
      user_id,
      production_history_id,
      producto_id,
      recipe_item_id,
      insumo_id,
      lote_id,
      quantity_used,
      cost_per_unit
    )
    SELECT
      v_user_id,
      v_production_history_id,
      p_producto_id,
      (entry->>'recipe_item_id')::UUID,
      (entry->>'insumo_id')::UUID,
      (entry->>'lote_id')::UUID,
      (entry->>'quantity_used')::DECIMAL(10,4),
      (entry->>'cost_per_unit')::DECIMAL(10,4)
    FROM jsonb_array_elements(v_consumption_logs) AS entry;
  END IF;

  -- Return success
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION produce_producto_custom_order IS 'Produces products with support for category-based ingredients and multiple insumos per recipe item';
