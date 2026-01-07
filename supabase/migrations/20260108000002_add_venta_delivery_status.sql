-- Add delivery status to ventas

ALTER TABLE ventas
  ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'entregado' CHECK (delivery_status IN ('entregado', 'no_entregado'));

UPDATE ventas
SET delivery_status = 'entregado'
WHERE delivery_status IS NULL;

COMMENT ON COLUMN ventas.delivery_status IS 'Estado de entrega: entregado o no_entregado';
