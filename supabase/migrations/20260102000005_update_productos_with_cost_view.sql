-- Actualizar vista productos_with_cost para usar precios LIFO
-- Ahora usa insumos_with_stock en lugar de insumos directamente
-- Incluye verificación de stock suficiente de ingredientes

-- Primero agregar finished_stock a la tabla productos si no existe
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS finished_stock INTEGER DEFAULT 0 CHECK (finished_stock >= 0);

COMMENT ON COLUMN productos.finished_stock IS 'Stock de productos terminados listos para vender';

-- Recrear la vista con los nuevos campos
DROP VIEW IF EXISTS productos_with_cost;

CREATE OR REPLACE VIEW productos_with_cost AS
SELECT
  p.id,
  p.user_id,
  p.name,
  p.price_sale,
  p.margin_goal,
  p.finished_stock,
  p.created_at,
  p.updated_at,

  -- Costo calculado usando precio LIFO actual de cada insumo
  COALESCE(SUM(
    ri.quantity_in_base_units * iws.current_base_unit_cost
  ), 0) AS cost_unit,

  -- Verificar si hay stock suficiente de TODOS los insumos para fabricar 1 unidad
  BOOL_AND(
    CASE
      WHEN ri.quantity_in_base_units IS NULL THEN TRUE
      ELSE iws.total_stock >= ri.quantity_in_base_units
    END
  ) AS has_sufficient_ingredients

FROM productos p
LEFT JOIN recipe_items ri ON p.id = ri.producto_id
LEFT JOIN insumos_with_stock iws ON ri.insumo_id = iws.id
GROUP BY p.id, p.user_id, p.name, p.price_sale, p.margin_goal, p.finished_stock, p.created_at, p.updated_at;

-- Comentarios
COMMENT ON VIEW productos_with_cost IS 'Vista de productos con costo calculado usando precios LIFO actuales';
