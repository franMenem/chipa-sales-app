-- Modificar tabla insumos para sistema LIFO
-- Los datos de precio y cantidad ahora viven en insumo_lotes
-- La tabla insumos se convierte en el "catálogo base" de ingredientes

-- IMPORTANTE: Primero eliminar la vista productos_with_cost porque depende de las columnas que vamos a eliminar
DROP VIEW IF EXISTS productos_with_cost;

-- 1. Eliminar columnas que se movieron a insumo_lotes
-- Primero eliminar base_unit_cost (columna GENERATED que depende de price_per_unit)
ALTER TABLE insumos
  DROP COLUMN IF EXISTS base_unit_cost;

-- Luego eliminar price_per_unit y quantity
ALTER TABLE insumos
  DROP COLUMN IF EXISTS quantity,
  DROP COLUMN IF EXISTS price_per_unit;

-- 2. Agregar nuevas columnas
ALTER TABLE insumos
  ADD COLUMN description TEXT,
  ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- 3. Actualizar comentarios
COMMENT ON TABLE insumos IS 'Catálogo base de ingredientes/insumos. Los precios y stock están en insumo_lotes.';
COMMENT ON COLUMN insumos.name IS 'Nombre del insumo (ej: "Harina", "Azúcar", "Leche")';
COMMENT ON COLUMN insumos.unit_type IS 'Tipo de unidad preferida para este insumo';
COMMENT ON COLUMN insumos.description IS 'Descripción opcional del insumo';
COMMENT ON COLUMN insumos.is_active IS 'Si es FALSE, el insumo está archivado y no aparecerá en listas principales';
