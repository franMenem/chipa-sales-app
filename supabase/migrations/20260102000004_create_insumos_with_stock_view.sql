-- Vista agregada de insumos con stock total calculado desde todos los lotes
-- Esta vista reemplaza las consultas directas a la tabla insumos
-- y proporciona información actualizada de stock y precios LIFO

CREATE OR REPLACE VIEW insumos_with_stock AS
SELECT
  i.id,
  i.user_id,
  i.name,
  i.unit_type,
  i.description,
  i.is_active,
  i.created_at,
  i.updated_at,

  -- Stock total: suma de quantity_remaining de todos los lotes
  COALESCE(SUM(l.quantity_remaining), 0) AS total_stock,

  -- Precio del lote más reciente con stock disponible (LIFO)
  (SELECT l2.price_per_unit
   FROM insumo_lotes l2
   WHERE l2.insumo_id = i.id AND l2.quantity_remaining > 0
   ORDER BY l2.purchase_date DESC, l2.created_at DESC
   LIMIT 1) AS current_price_per_unit,

  -- Precio base (por g/ml/unidad) del lote más reciente (LIFO)
  (SELECT l2.base_unit_cost
   FROM insumo_lotes l2
   WHERE l2.insumo_id = i.id AND l2.quantity_remaining > 0
   ORDER BY l2.purchase_date DESC, l2.created_at DESC
   LIMIT 1) AS current_base_unit_cost,

  -- Número de lotes que tienen stock disponible
  COUNT(CASE WHEN l.quantity_remaining > 0 THEN 1 END) AS active_batches

FROM insumos i
LEFT JOIN insumo_lotes l ON i.id = l.insumo_id
GROUP BY i.id, i.user_id, i.name, i.unit_type, i.description, i.is_active, i.created_at, i.updated_at;

-- Comentarios
COMMENT ON VIEW insumos_with_stock IS 'Vista agregada de insumos con stock calculado desde lotes (LIFO)';
