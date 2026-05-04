-- Drop el trigger de auto-descuento de mp_reserva_amount.
-- Modelo nuevo: el usuario actualiza manualmente "tengo en MP" y el sistema
-- calcula "necesito reponer" basándose en (ventas_cost − lotes_comprados).

DROP TRIGGER IF EXISTS trg_mp_reserva_lote_change ON insumo_lotes;
DROP FUNCTION IF EXISTS update_mp_reserva_on_lote_change();
