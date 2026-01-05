-- Update produce_producto_custom_order function to create stock_fabricado records
-- Now accepts margin_percentage and price_sale parameters

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS produce_producto_custom_order(UUID, INTEGER, JSONB);
DROP FUNCTION IF EXISTS produce_producto_custom_order(UUID, INTEGER, JSONB, JSONB);

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

  -- Process each recipe item
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

    -- Check if there's an explicit lot selection for this recipe item
    v_selection := NULL;
    IF jsonb_typeof(p_lot_selections) = 'array' THEN
      SELECT *
      INTO v_selection
      FROM jsonb_to_recordset(p_lot_selections) AS sel(
        recipe_item_id UUID,
        ingredient_id UUID,
        lots JSONB
      )
      WHERE sel.recipe_item_id = v_recipe_item.id
      LIMIT 1;
    END IF;

    -- Path 1: Explicit lot selection provided
    IF v_selection.recipe_item_id IS NOT NULL THEN
      IF v_selection.ingredient_id IS NULL OR v_selection.ingredient_id != v_recipe_item.insumo_id THEN
        RAISE EXCEPTION 'Selección inválida para "%"', v_recipe_item.insumo_name;
      END IF;

      SELECT COALESCE(SUM((lot->>'quantity')::DECIMAL), 0)
      INTO v_selection_total
      FROM jsonb_array_elements(v_selection.lots) AS lot;

      IF v_selection_total < v_needed_quantity - v_precision THEN
        RAISE EXCEPTION 'Cantidad seleccionada insuficiente para "%" (requerido %, seleccionado %)',
          v_recipe_item.insumo_name,
          v_needed_quantity,
          v_selection_total;
      ELSIF v_selection_total > v_needed_quantity + v_precision THEN
        RAISE EXCEPTION 'Cantidad seleccionada excede lo requerido para "%" (requerido %, seleccionado %)',
          v_recipe_item.insumo_name,
          v_needed_quantity,
          v_selection_total;
      END IF;

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
          AND insumo_id = v_recipe_item.insumo_id
          AND quantity_remaining > 0
          AND user_id = v_user_id
        FOR UPDATE;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Lote % inválido para "%"', v_lot_entry.lot_id, v_recipe_item.insumo_name;
        END IF;

        IF v_lot_entry.quantity > v_lote.quantity_remaining + v_precision THEN
          RAISE EXCEPTION 'Stock insuficiente en lote % para "%"', v_lot_entry.lot_id, v_recipe_item.insumo_name;
        END IF;

        UPDATE insumo_lotes
        SET
          quantity_remaining = quantity_remaining - v_lot_entry.quantity,
          updated_at = NOW()
        WHERE id = v_lote.id;

        v_total_cost := v_total_cost + (v_lot_entry.quantity * v_lote.base_unit_cost);
        v_consumed_quantity := v_consumed_quantity + v_lot_entry.quantity;

        v_consumption_logs := v_consumption_logs || jsonb_build_array(jsonb_build_object(
          'recipe_item_id', v_recipe_item.id,
          'insumo_id', v_recipe_item.insumo_id,
          'lote_id', v_lote.id,
          'quantity_used', v_lot_entry.quantity,
          'cost_per_unit', v_lote.base_unit_cost
        ));
      END LOOP;

      IF v_consumed_quantity < v_needed_quantity - v_precision THEN
        RAISE EXCEPTION 'Selección incompleta para "%"', v_recipe_item.insumo_name;
      END IF;

      CONTINUE;
    END IF;

    -- Path 2: Custom order provided
    v_custom_order := NULL;
    IF p_lote_order ? v_recipe_item.insumo_id::text THEN
      SELECT ARRAY(
        SELECT jsonb_array_elements_text(p_lote_order->v_recipe_item.insumo_id::text)
      ) INTO v_custom_order;
    END IF;

    IF v_custom_order IS NOT NULL AND array_length(v_custom_order, 1) > 0 THEN
      FOREACH v_lote_id IN ARRAY v_custom_order LOOP
        SELECT * INTO v_lote FROM insumo_lotes
        WHERE id = v_lote_id
          AND insumo_id = v_recipe_item.insumo_id
          AND quantity_remaining > 0
          AND user_id = v_user_id
        FOR UPDATE;

        IF FOUND THEN
          v_to_consume := LEAST(v_lote.quantity_remaining, v_needed_quantity - v_consumed_quantity);

          IF v_to_consume > 0 THEN
            UPDATE insumo_lotes
            SET
              quantity_remaining = quantity_remaining - v_to_consume,
              updated_at = NOW()
            WHERE id = v_lote.id;

            v_total_cost := v_total_cost + (v_to_consume * v_lote.base_unit_cost);
            v_consumed_quantity := v_consumed_quantity + v_to_consume;

            v_consumption_logs := v_consumption_logs || jsonb_build_array(jsonb_build_object(
              'recipe_item_id', v_recipe_item.id,
              'insumo_id', v_recipe_item.insumo_id,
              'lote_id', v_lote.id,
              'quantity_used', v_to_consume,
              'cost_per_unit', v_lote.base_unit_cost
            ));

            EXIT WHEN v_consumed_quantity >= v_needed_quantity - v_precision;
          END IF;
        END IF;
      END LOOP;

      IF v_consumed_quantity < v_needed_quantity - v_precision THEN
        RAISE EXCEPTION 'Stock insuficiente para "%" (requerido %, consumido %)',
          v_recipe_item.insumo_name,
          v_needed_quantity,
          v_consumed_quantity;
      END IF;

      CONTINUE;
    END IF;

    -- Path 3: Default LIFO order
    FOR v_lote IN
      SELECT * FROM insumo_lotes
      WHERE insumo_id = v_recipe_item.insumo_id
        AND quantity_remaining > 0
        AND user_id = v_user_id
      ORDER BY purchase_date DESC, created_at DESC
      FOR UPDATE
    LOOP
      v_to_consume := LEAST(v_lote.quantity_remaining, v_needed_quantity - v_consumed_quantity);

      IF v_to_consume > 0 THEN
        UPDATE insumo_lotes
        SET
          quantity_remaining = quantity_remaining - v_to_consume,
          updated_at = NOW()
        WHERE id = v_lote.id;

        v_total_cost := v_total_cost + (v_to_consume * v_lote.base_unit_cost);
        v_consumed_quantity := v_consumed_quantity + v_to_consume;

        v_consumption_logs := v_consumption_logs || jsonb_build_array(jsonb_build_object(
          'recipe_item_id', v_recipe_item.id,
          'insumo_id', v_recipe_item.insumo_id,
          'lote_id', v_lote.id,
          'quantity_used', v_to_consume,
          'cost_per_unit', v_lote.base_unit_cost
        ));

        EXIT WHEN v_consumed_quantity >= v_needed_quantity - v_precision;
      END IF;
    END LOOP;

    IF v_consumed_quantity < v_needed_quantity - v_precision THEN
      RAISE EXCEPTION 'Stock insuficiente para "%" (requerido %, disponible %)',
        v_recipe_item.insumo_name,
        v_needed_quantity,
        v_consumed_quantity;
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

  -- Create stock_fabricado record (NEW)
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
    p_quantity,  -- Initially all quantity is available
    v_cost_unit,
    p_margin_percentage,
    p_price_sale,
    NOW()
  )
  RETURNING id INTO v_stock_fabricado_id;

  -- Insert production_consumptions (detailed ingredient consumption log)
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

  -- Return success with all relevant information
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

COMMENT ON FUNCTION produce_producto_custom_order IS 'Produces products with custom lot selection and creates stock_fabricado batch with margin and price';
