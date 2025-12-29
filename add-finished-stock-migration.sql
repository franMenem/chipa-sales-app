-- Agregar columna de stock de productos terminados
-- Ejecuta este script en tu dashboard de Supabase: SQL Editor

ALTER TABLE productos
ADD COLUMN IF NOT EXISTS finished_stock INTEGER DEFAULT 0;

-- Agregar comentario para documentar
COMMENT ON COLUMN productos.finished_stock IS 'Cantidad de productos terminados en stock (adicional al stock calculado por insumos)';
