-- Función para fabricar productos consumiendo insumos usando LIFO
-- Esta función:
-- 1. Valida permisos del usuario
-- 2. Consume insumos de los lotes más recientes primero (LIFO)
-- 3. Actualiza finished_stock del producto
-- 4. Registra la producción en production_history
-- 5. Retorna información de la producción

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
  v_total_cost DECIMAL(10,2) := 0;
  v_to_consume DECIMAL(10,4);
BEGIN
  -- Obtener user_id del producto
  SELECT user_id INTO v_user_id FROM productos WHERE id = p_producto_id;

  -- Validar que existe
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  -- Validar que el usuario autenticado sea el dueño
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Validar cantidad
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a 0';
  END IF;

  -- Iterar por cada insumo de la receta
  FOR v_recipe_item IN
    SELECT
      ri.*,
      i.name as insumo_name,
      i.unit_type
    FROM recipe_items ri
    JOIN insumos i ON ri.insumo_id = i.id
    WHERE ri.producto_id = p_producto_id
  LOOP
    -- Calcular cantidad necesaria de este insumo
    v_needed_quantity := v_recipe_item.quantity_in_base_units * p_quantity;
    v_consumed_quantity := 0;

    -- Consumir lotes en orden LIFO (más reciente primero)
    FOR v_lote IN
      SELECT * FROM insumo_lotes
      WHERE insumo_id = v_recipe_item.insumo_id
        AND quantity_remaining > 0
        AND user_id = v_user_id
      ORDER BY purchase_date DESC, created_at DESC
    LOOP
      -- Calcular cuánto consumir de este lote
      v_to_consume := LEAST(v_lote.quantity_remaining, v_needed_quantity - v_consumed_quantity);

      -- Actualizar lote (descontar lo consumido)
      UPDATE insumo_lotes
      SET
        quantity_remaining = quantity_remaining - v_to_consume,
        updated_at = NOW()
      WHERE id = v_lote.id;

      -- Acumular costo (cantidad consumida * precio base del lote)
      v_total_cost := v_total_cost + (v_to_consume * v_lote.base_unit_cost);
      v_consumed_quantity := v_consumed_quantity + v_to_consume;

      -- Si ya consumimos todo lo necesario, salir del loop
      EXIT WHEN v_consumed_quantity >= v_needed_quantity;
    END LOOP;

    -- Verificar que se consumió toda la cantidad necesaria
    IF v_consumed_quantity < v_needed_quantity THEN
      RAISE EXCEPTION 'Stock insuficiente de "%" (necesario: %, disponible: %)',
        v_recipe_item.insumo_name,
        v_needed_quantity,
        v_consumed_quantity;
    END IF;
  END LOOP;

  -- Aumentar finished_stock del producto
  UPDATE productos
  SET
    finished_stock = finished_stock + p_quantity,
    updated_at = NOW()
  WHERE id = p_producto_id;

  -- Registrar en historial de producción
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
    v_total_cost / p_quantity,
    NOW()
  );

  -- Retornar resultado
  RETURN json_build_object(
    'success', TRUE,
    'quantity_produced', p_quantity,
    'total_cost', v_total_cost,
    'cost_per_unit', v_total_cost / p_quantity
  );

EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, retornar información del error
    RETURN json_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON FUNCTION produce_producto IS 'Fabrica productos consumiendo insumos usando LIFO. Retorna JSON con resultado de la producción.';
