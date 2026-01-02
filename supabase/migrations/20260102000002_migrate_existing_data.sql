-- Migrar datos existentes de insumos a lotes
-- Por cada insumo existente con quantity > 0, crear un lote inicial
-- IMPORTANTE: Esta migración debe ejecutarse ANTES de eliminar las columnas de insumos

-- Insertar lotes desde los insumos existentes
INSERT INTO insumo_lotes (
  user_id,
  insumo_id,
  purchase_date,
  quantity_purchased,
  quantity_remaining,
  price_per_unit,
  unit_type
)
SELECT
  user_id,
  id as insumo_id,
  created_at as purchase_date,
  quantity as quantity_purchased,
  quantity as quantity_remaining,
  price_per_unit,
  unit_type
FROM insumos
WHERE quantity > 0;

-- Mensaje de confirmación
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM insumo_lotes;
  RAISE NOTICE 'Migración completada: % lotes creados desde insumos existentes', v_count;
END $$;
