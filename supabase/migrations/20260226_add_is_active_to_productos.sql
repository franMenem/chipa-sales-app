-- Add is_active column to productos for soft-delete/archive functionality
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- Recreate the view to expose is_active
DROP VIEW IF EXISTS public.productos_with_cost;

CREATE VIEW public.productos_with_cost
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.user_id,
  p.name,
  p.is_active,
  p.finished_stock,
  p.created_at,
  p.updated_at,
  COALESCE(SUM(
    CASE
      WHEN ri.id IS NULL THEN 0
      WHEN ri.use_categorias THEN
        ri.quantity_in_base_units *
        COALESCE((
          SELECT MIN(iws_cat.current_price_per_unit)
          FROM insumos_with_stock iws_cat
          WHERE iws_cat.user_id = p.user_id
            AND iws_cat.is_active
            AND COALESCE(to_jsonb(iws_cat.categoria_ids), '[]'::jsonb)
              @> COALESCE(ri.required_categoria_ids, '[]'::jsonb)
            AND iws_cat.total_stock >= ri.quantity_in_base_units
        ), 0)
      ELSE ri.quantity_in_base_units * COALESCE(iws.current_price_per_unit, 0)
    END
  ), 0) AS cost_unit,
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
FROM public.productos p
LEFT JOIN public.recipe_items ri ON p.id = ri.producto_id
LEFT JOIN public.insumos_with_stock iws ON ri.insumo_id = iws.id
GROUP BY p.id, p.user_id, p.name, p.is_active, p.finished_stock, p.created_at, p.updated_at;

COMMENT ON VIEW public.productos_with_cost IS 'Vista de productos con costo estimado (solo para referencia). El precio y margen real se configuran en stock_fabricado.';
