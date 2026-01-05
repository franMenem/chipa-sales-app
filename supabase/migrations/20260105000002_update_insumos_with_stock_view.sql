-- Actualiza la vista de insumos con stock para incluir categoria_ids

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

  COALESCE(SUM(l.quantity_remaining), 0) AS total_stock,

  (SELECT l2.price_per_unit
   FROM insumo_lotes l2
   WHERE l2.insumo_id = i.id AND l2.quantity_remaining > 0
   ORDER BY l2.purchase_date DESC, l2.created_at DESC
   LIMIT 1) AS current_price_per_unit,

  (SELECT l2.base_unit_cost
   FROM insumo_lotes l2
   WHERE l2.insumo_id = i.id AND l2.quantity_remaining > 0
   ORDER BY l2.purchase_date DESC, l2.created_at DESC
   LIMIT 1) AS current_base_unit_cost,

  COUNT(CASE WHEN l.quantity_remaining > 0 THEN 1 END) AS active_batches,
  i.categoria_ids

FROM insumos i
LEFT JOIN insumo_lotes l ON i.id = l.insumo_id
GROUP BY i.id, i.user_id, i.name, i.unit_type, i.description, i.is_active, i.created_at, i.updated_at, i.categoria_ids;

COMMENT ON VIEW insumos_with_stock IS 'Vista agregada de insumos con stock calculado desde lotes (LIFO)';
