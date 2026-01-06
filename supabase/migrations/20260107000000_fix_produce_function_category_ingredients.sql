-- Fix produce_producto_custom_order to handle category-based ingredients
-- Category-based ingredients don't have insumo_id in recipe_items, they come from lot_selections

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

      v_total_cost := v_total_cost + (v_lot_entry.quantity * v_lote.base_unit_cost);
      v_consumed_quantity := v_consumed_quantity + v_lot_entry.quantity;

      v_consumption_logs := v_consumption_logs || jsonb_build_array(jsonb_build_object(
        'recipe_item_id', v_recipe_item.id,
        'insumo_id', v_selection.ingredient_id,
        'lote_id', v_lote.id,
        'quantity_used', v_lot_entry.quantity,
        'cost_per_unit', v_lote.base_unit_cost
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
