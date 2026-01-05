-- Función para revertir una producción (devuelve insumos consumidos y reduce stock terminado)

CREATE OR REPLACE FUNCTION reverse_production(
  p_production_history_id UUID
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_production RECORD;
  v_consumption RECORD;
  v_total_cost DECIMAL(10,4) := 0;
BEGIN
  -- Get production record
  SELECT * INTO v_production
  FROM production_history
  WHERE id = p_production_history_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro de producción no encontrado';
  END IF;

  -- Verify ownership
  IF v_production.user_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  v_user_id := v_production.user_id;

  -- Check if producto has enough finished stock to reverse
  DECLARE
    v_current_stock INTEGER;
  BEGIN
    SELECT finished_stock INTO v_current_stock
    FROM productos
    WHERE id = v_production.producto_id;

    IF v_current_stock < v_production.quantity_produced THEN
      RAISE EXCEPTION 'Stock insuficiente de producto terminado (tiene %, necesita %) para revertir esta producción',
        v_current_stock,
        v_production.quantity_produced;
    END IF;
  END;

  -- Restore consumed insumos from production_consumptions
  FOR v_consumption IN
    SELECT *
    FROM production_consumptions
    WHERE production_history_id = p_production_history_id
  LOOP
    -- Return the consumed quantity to the lote
    UPDATE insumo_lotes
    SET
      quantity_remaining = quantity_remaining + v_consumption.quantity_used,
      updated_at = NOW()
    WHERE id = v_consumption.lote_id;

    v_total_cost := v_total_cost + (v_consumption.quantity_used * v_consumption.cost_per_unit);
  END LOOP;

  -- Reduce finished stock
  UPDATE productos
  SET
    finished_stock = finished_stock - v_production.quantity_produced,
    updated_at = NOW()
  WHERE id = v_production.producto_id;

  -- Mark production as reversed (soft delete)
  -- We'll add a new column or just delete the records

  -- Delete consumption records
  DELETE FROM production_consumptions
  WHERE production_history_id = p_production_history_id;

  -- Delete production history record
  DELETE FROM production_history
  WHERE id = p_production_history_id;

  RETURN json_build_object(
    'success', TRUE,
    'quantity_reversed', v_production.quantity_produced,
    'total_cost_reversed', v_total_cost
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reverse_production IS 'Revierte una producción: devuelve insumos consumidos al stock y reduce productos terminados';
