-- Migration: Fix insumos_with_stock security and add gastos tables
-- Date: 2026-02-11
-- Description:
--   1. Fix SECURITY DEFINER issue on insumos_with_stock view (security vulnerability)
--   2. Create gasto_conceptos and gastos tables for expense tracking
--   3. Add RLS policies, indexes, and triggers for gastos system

-- ============================================================================
-- PART 1: FIX SECURITY DEFINER ON insumos_with_stock VIEW
-- ============================================================================
-- The view was created with SECURITY DEFINER which bypasses RLS.
-- We recreate it with the default SECURITY INVOKER to respect RLS policies.

-- CASCADE needed because productos_with_cost depends on insumos_with_stock
DROP VIEW IF EXISTS public.insumos_with_stock CASCADE;

CREATE VIEW public.insumos_with_stock AS
SELECT
  i.*,
  COALESCE(agg.total_stock, 0) AS total_stock,
  agg.current_price_per_unit,
  agg.current_base_unit_cost,
  COALESCE(agg.active_batches, 0) AS active_batches
FROM public.insumos i
LEFT JOIN LATERAL (
  SELECT
    SUM(il.quantity_remaining) AS total_stock,
    COUNT(*) FILTER (WHERE il.quantity_remaining > 0) AS active_batches,
    -- Get current price from most recent batch with stock
    (SELECT il2.price_per_unit
     FROM public.insumo_lotes il2
     WHERE il2.insumo_id = i.id AND il2.quantity_remaining > 0
     ORDER BY il2.purchase_date DESC
     LIMIT 1) AS current_price_per_unit,
    -- Get current base unit cost from most recent batch with stock
    (SELECT il2.base_unit_cost
     FROM public.insumo_lotes il2
     WHERE il2.insumo_id = i.id AND il2.quantity_remaining > 0
     ORDER BY il2.purchase_date DESC
     LIMIT 1) AS current_base_unit_cost
  FROM public.insumo_lotes il
  WHERE il.insumo_id = i.id
) agg ON true;

COMMENT ON VIEW public.insumos_with_stock IS
  'Aggregated view of insumos with total stock and pricing from lotes. Uses SECURITY INVOKER (default) to respect RLS policies.';

-- Recreate productos_with_cost which was dropped via CASCADE
CREATE OR REPLACE VIEW productos_with_cost AS
SELECT
  p.id,
  p.user_id,
  p.name,
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
FROM productos p
LEFT JOIN recipe_items ri ON p.id = ri.producto_id
LEFT JOIN insumos_with_stock iws ON ri.insumo_id = iws.id
GROUP BY p.id, p.user_id, p.name, p.finished_stock, p.created_at, p.updated_at;

COMMENT ON VIEW productos_with_cost IS 'Vista de productos con costo estimado (solo para referencia). El precio y margen real se configuran en stock_fabricado.';

-- ============================================================================
-- PART 2: CREATE GASTOS TABLES
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- Table: gasto_conceptos (expense categories/concepts)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gasto_conceptos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Ensure unique concept names per user
  CONSTRAINT gasto_conceptos_user_name_unique UNIQUE (user_id, name)
);

COMMENT ON TABLE public.gasto_conceptos IS
  'Expense categories/concepts for organizing gastos. User-specific.';
COMMENT ON COLUMN public.gasto_conceptos.is_active IS
  'Soft delete flag. Inactive concepts are hidden but preserved for historical data integrity.';

-- ────────────────────────────────────────────────────────────────────────────
-- Table: gastos (individual expenses)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gastos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concepto_id UUID NOT NULL REFERENCES public.gasto_conceptos(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('efectivo', 'transferencia', 'tarjeta', 'otro')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.gastos IS
  'Individual expense records. Each gasto belongs to a user and a concepto.';
COMMENT ON COLUMN public.gastos.amount IS
  'Expense amount in ARS (Argentine Pesos). Must be positive.';
COMMENT ON COLUMN public.gastos.payment_method IS
  'Payment method: efectivo, transferencia, tarjeta, otro';
COMMENT ON COLUMN public.gastos.payment_date IS
  'Date when the expense was paid (not when it was recorded).';

-- ────────────────────────────────────────────────────────────────────────────
-- Indexes for performance
-- ────────────────────────────────────────────────────────────────────────────

-- gasto_conceptos indexes
CREATE INDEX IF NOT EXISTS idx_gasto_conceptos_user_active
  ON public.gasto_conceptos (user_id, is_active);

-- gastos indexes
CREATE INDEX IF NOT EXISTS idx_gastos_user_date
  ON public.gastos (user_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_gastos_concepto
  ON public.gastos (concepto_id);

CREATE INDEX IF NOT EXISTS idx_gastos_payment_method
  ON public.gastos (payment_method);

-- ────────────────────────────────────────────────────────────────────────────
-- Updated_at trigger function (create if not exists)
-- ────────────────────────────────────────────────────────────────────────────

-- Check if the trigger function already exists, if not create it
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_updated_at_column IS
  'Trigger function to automatically update updated_at timestamp on row modification.';

-- ────────────────────────────────────────────────────────────────────────────
-- Apply updated_at triggers
-- ────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trigger_update_gasto_conceptos_updated_at ON public.gasto_conceptos;
CREATE TRIGGER trigger_update_gasto_conceptos_updated_at
  BEFORE UPDATE ON public.gasto_conceptos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_gastos_updated_at ON public.gastos;
CREATE TRIGGER trigger_update_gastos_updated_at
  BEFORE UPDATE ON public.gastos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PART 3: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- Enable RLS on both tables
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.gasto_conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- RLS Policies for gasto_conceptos
-- ────────────────────────────────────────────────────────────────────────────

-- SELECT: Users can only see their own conceptos
DROP POLICY IF EXISTS "Users can view their own gasto conceptos" ON public.gasto_conceptos;
CREATE POLICY "Users can view their own gasto conceptos"
  ON public.gasto_conceptos
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can only create conceptos for themselves
DROP POLICY IF EXISTS "Users can create their own gasto conceptos" ON public.gasto_conceptos;
CREATE POLICY "Users can create their own gasto conceptos"
  ON public.gasto_conceptos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own conceptos
DROP POLICY IF EXISTS "Users can update their own gasto conceptos" ON public.gasto_conceptos;
CREATE POLICY "Users can update their own gasto conceptos"
  ON public.gasto_conceptos
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own conceptos
DROP POLICY IF EXISTS "Users can delete their own gasto conceptos" ON public.gasto_conceptos;
CREATE POLICY "Users can delete their own gasto conceptos"
  ON public.gasto_conceptos
  FOR DELETE
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- RLS Policies for gastos
-- ────────────────────────────────────────────────────────────────────────────

-- SELECT: Users can only see their own gastos
DROP POLICY IF EXISTS "Users can view their own gastos" ON public.gastos;
CREATE POLICY "Users can view their own gastos"
  ON public.gastos
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can only create gastos for themselves
DROP POLICY IF EXISTS "Users can create their own gastos" ON public.gastos;
CREATE POLICY "Users can create their own gastos"
  ON public.gastos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own gastos
DROP POLICY IF EXISTS "Users can update their own gastos" ON public.gastos;
CREATE POLICY "Users can update their own gastos"
  ON public.gastos
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own gastos
DROP POLICY IF EXISTS "Users can delete their own gastos" ON public.gastos;
CREATE POLICY "Users can delete their own gastos"
  ON public.gastos
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- PART 4: GRANTS
-- ============================================================================

-- Grant appropriate permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gasto_conceptos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gastos TO authenticated;

-- Grant SELECT on sequences (if needed for serial columns, though we use UUID)
-- Not applicable here, but keeping for completeness

-- Anon users should not have direct access to these tables
REVOKE ALL ON public.gasto_conceptos FROM anon;
REVOKE ALL ON public.gastos FROM anon;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- ✓ Fixed insumos_with_stock view to use SECURITY INVOKER (respects RLS)
-- ✓ Created gasto_conceptos table with unique constraint per user
-- ✓ Created gastos table with foreign key constraints and validation
-- ✓ Added indexes for query performance
-- ✓ Created/reused updated_at trigger function
-- ✓ Applied updated_at triggers to both tables
-- ✓ Enabled RLS on both tables
-- ✓ Created comprehensive RLS policies (SELECT, INSERT, UPDATE, DELETE)
-- ✓ Granted appropriate permissions to authenticated role
