-- Script para limpiar datos de producción y restaurar insumos
-- EJECUTA ESTO EN EL SQL EDITOR DE SUPABASE

-- 1. Ver estado actual de los lotes (para referencia)
SELECT
  il.id,
  i.name as insumo_name,
  il.quantity_purchased,
  il.quantity_remaining,
  il.quantity_purchased - il.quantity_remaining as consumido,
  ROUND(((il.quantity_purchased - il.quantity_remaining)::numeric / il.quantity_purchased * 100), 0) as porcentaje_consumido
FROM insumo_lotes il
JOIN insumos i ON i.id = il.insumo_id
WHERE il.quantity_remaining < il.quantity_purchased
ORDER BY i.name;

-- 2. Eliminar todos los registros de consumo de producción
DELETE FROM production_consumptions;

-- 3. Eliminar todo el historial de producción
DELETE FROM production_history;

-- 4. RESTAURAR todos los lotes a su cantidad original (resetear consumo)
UPDATE insumo_lotes
SET
  quantity_remaining = quantity_purchased,
  updated_at = NOW()
WHERE quantity_remaining < quantity_purchased;

-- 5. Resetear el stock de productos terminados a 0
UPDATE productos
SET
  finished_stock = 0,
  updated_at = NOW();

-- 6. Verificar que todo quedó limpio
SELECT
  'Lotes con consumo' as tabla,
  COUNT(*) as registros
FROM insumo_lotes
WHERE quantity_remaining < quantity_purchased
UNION ALL
SELECT
  'Consumos registrados' as tabla,
  COUNT(*) as registros
FROM production_consumptions
UNION ALL
SELECT
  'Historial de producción' as tabla,
  COUNT(*) as registros
FROM production_history
UNION ALL
SELECT
  'Productos con stock' as tabla,
  COUNT(*) as registros
FROM productos
WHERE finished_stock > 0;

-- El resultado debería mostrar todo en 0 excepto posiblemente "Productos con stock"
-- si tenías stock de productos que NO fabricaste (ej: comprados)
