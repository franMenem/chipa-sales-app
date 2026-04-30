-- Trigger que descuenta/ajusta/devuelve mp_reserva_amount en app_config
-- cuando se inserta, edita o elimina un lote de insumos.

CREATE OR REPLACE FUNCTION update_mp_reserva_on_lote_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  costo_nuevo numeric;
  costo_viejo numeric;
  delta       numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    costo_nuevo := NEW.price_per_unit * NEW.quantity_purchased;
    UPDATE app_config
    SET mp_reserva_amount     = mp_reserva_amount - costo_nuevo,
        mp_reserva_updated_at = now(),
        updated_at            = now()
    WHERE user_id = NEW.user_id;

  ELSIF TG_OP = 'UPDATE' THEN
    costo_nuevo := NEW.price_per_unit * NEW.quantity_purchased;
    costo_viejo := OLD.price_per_unit * OLD.quantity_purchased;
    delta       := costo_nuevo - costo_viejo;
    UPDATE app_config
    SET mp_reserva_amount     = mp_reserva_amount - delta,
        mp_reserva_updated_at = now(),
        updated_at            = now()
    WHERE user_id = NEW.user_id;

  ELSIF TG_OP = 'DELETE' THEN
    costo_viejo := OLD.price_per_unit * OLD.quantity_purchased;
    UPDATE app_config
    SET mp_reserva_amount     = mp_reserva_amount + costo_viejo,
        mp_reserva_updated_at = now(),
        updated_at            = now()
    WHERE user_id = OLD.user_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_mp_reserva_lote_change
  AFTER INSERT OR UPDATE OR DELETE ON insumo_lotes
  FOR EACH ROW
  EXECUTE FUNCTION update_mp_reserva_on_lote_change();
