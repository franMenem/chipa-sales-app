-- Remove price_sale and margin_goal from productos table
-- These fields are now in stock_fabricado (configured per batch at production time)

-- Step 1: Drop the existing view first
DROP VIEW IF EXISTS productos_with_cost CASCADE;

-- Step 2: Remove columns from productos table
ALTER TABLE productos DROP COLUMN IF EXISTS price_sale;
ALTER TABLE productos DROP COLUMN IF EXISTS margin_goal;

-- Update table comment
COMMENT ON TABLE productos IS 'Product definitions with recipes. Price and margin are configured per batch in stock_fabricado table.';

-- Step 3: Recreate the view without price_sale and margin_goal
CREATE OR REPLACE VIEW productos_with_cost AS
SELECT
  p.id,
  p.user_id,
  p.name,
  p.finished_stock,
  p.created_at,
  p.updated_at,

  -- Calculate cost based on current LIFO prices
  COALESCE(SUM(
    CASE
      WHEN ri.id IS NULL THEN 0
      WHEN ri.use_categorias THEN
        ri.quantity_in_base_units *
        COALESCE((
          SELECT MIN(iws_cat.current_base_unit_cost)
          FROM insumos_with_stock iws_cat
          WHERE iws_cat.user_id = p.user_id
            AND iws_cat.is_active
            AND COALESCE(to_jsonb(iws_cat.categoria_ids), '[]'::jsonb)
              @> COALESCE(ri.required_categoria_ids, '[]'::jsonb)
            AND iws_cat.total_stock >= ri.quantity_in_base_units
        ), 0)
      ELSE ri.quantity_in_base_units * COALESCE(iws.current_base_unit_cost, 0)
    END
  ), 0) AS cost_unit,

  -- Check if all ingredients have sufficient stock
  BOOL_AND(
    CASE
      WHEN ri.id IS NULL THEN TRUE
      WHEN ri.use_categorias THEN EXISTS (
        SELECT 1
        FROM insumos_with_stock iws_cat
        WHERE iws_cat.user_id = p.user_id
          AND iws_cat.is_active
          AND COALESCE(to_jsonb(iws_cat.categoria_ids), '[]'::jsonb)
            @> COALESCE(ri.required_categoria_ids, '[]'::jsonb)
          AND iws_cat.total_stock >= ri.quantity_in_base_units
      )
      ELSE COALESCE(iws.total_stock, 0) >= ri.quantity_in_base_units
    END
  ) AS has_sufficient_ingredients

FROM productos p
LEFT JOIN recipe_items ri ON p.id = ri.producto_id
LEFT JOIN insumos_with_stock iws ON ri.insumo_id = iws.id
GROUP BY p.id, p.user_id, p.name, p.finished_stock, p.created_at, p.updated_at;

COMMENT ON VIEW productos_with_cost IS 'Vista de productos con costo estimado (solo para referencia). El precio y margen real se configuran en stock_fabricado.';
