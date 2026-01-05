-- Actualiza la función reverse_production para permitir forzar la reversión incluso con stock insuficiente

CREATE OR REPLACE FUNCTION reverse_production(
  p_production_history_id UUID,
  p_force BOOLEAN DEFAULT FALSE
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_production RECORD;
  v_consumption RECORD;
  v_total_cost DECIMAL(10,4) := 0;
  v_current_stock INTEGER;
  v_new_stock INTEGER;
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

  -- Check current stock
  SELECT finished_stock INTO v_current_stock
  FROM productos
  WHERE id = v_production.producto_id;

  v_new_stock := v_current_stock - v_production.quantity_produced;

  -- If not forcing and stock would be negative, raise error
  IF NOT p_force AND v_new_stock < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente de producto terminado (tiene %, necesita %) para revertir esta producción. Usa la opción "Forzar" si quieres revertir de todos modos.',
      v_current_stock,
      v_production.quantity_produced;
  END IF;

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

  -- Reduce finished stock (can go negative if forced)
  UPDATE productos
  SET
    finished_stock = v_new_stock,
    updated_at = NOW()
  WHERE id = v_production.producto_id;

  -- Delete consumption records
  DELETE FROM production_consumptions
  WHERE production_history_id = p_production_history_id;

  -- Delete production history record
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reverse_production(UUID, BOOLEAN) IS 'Revierte una producción: devuelve insumos consumidos al stock. Si force=true, permite stock negativo en productos.';
