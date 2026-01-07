-- Add payment status and customer details to ventas

ALTER TABLE ventas
  ADD COLUMN customer_name TEXT,
  ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pagado' CHECK (payment_status IN ('pagado', 'debe')),
  ADD COLUMN payment_destination TEXT;

UPDATE ventas
SET payment_status = 'pagado'
WHERE payment_status IS NULL;

COMMENT ON COLUMN ventas.customer_name IS 'Nombre del cliente o comprador';
COMMENT ON COLUMN ventas.payment_status IS 'Estado de pago: pagado o debe';
COMMENT ON COLUMN ventas.payment_destination IS 'Destino o medio donde se cobro';
