-- Add quantity field to insumos table
-- This field stores how many units were purchased (e.g., 5 kg, 10 liters, etc.)

ALTER TABLE insumos 
ADD COLUMN quantity DECIMAL(10,4) DEFAULT 1.0 CHECK (quantity > 0);

COMMENT ON COLUMN insumos.quantity IS 'Cantidad de unidades compradas (ej: 5 kg, 10 litros, etc.)';


