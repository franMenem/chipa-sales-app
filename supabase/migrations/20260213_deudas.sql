-- Migration: Create deudas (debts) and deuda_pagos (debt payments) tables
-- Date: 2026-02-13
-- Description:
--   1. Create deudas table for tracking debts
--   2. Create deuda_pagos table for tracking individual payments toward debts
--   3. Add RLS policies, indexes, and triggers

-- ============================================================================
-- PART 1: CREATE DEUDAS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.deudas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  creditor_name TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
  paid_amount NUMERIC(12,2) DEFAULT 0 NOT NULL CHECK (paid_amount >= 0),
  remaining_amount NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  due_date DATE,
  status TEXT GENERATED ALWAYS AS (
    CASE
      WHEN paid_amount >= total_amount THEN 'pagada'
      WHEN paid_amount > 0 THEN 'parcial'
      ELSE 'pendiente'
    END
  ) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.deudas IS
  'Debts tracker. Each deuda belongs to a user with auto-calculated remaining_amount and status.';
COMMENT ON COLUMN public.deudas.remaining_amount IS
  'Auto-calculated: total_amount - paid_amount.';
COMMENT ON COLUMN public.deudas.status IS
  'Auto-calculated: pendiente (no payments), parcial (partial payments), pagada (fully paid).';

-- ============================================================================
-- PART 2: CREATE DEUDA_PAGOS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.deuda_pagos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deuda_id UUID NOT NULL REFERENCES public.deudas(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('efectivo', 'transferencia', 'tarjeta', 'otro')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.deuda_pagos IS
  'Individual payment records toward debts. On insert/delete, updates deudas.paid_amount via trigger.';

-- ============================================================================
-- PART 3: TRIGGER TO SYNC paid_amount ON deudas
-- ============================================================================

-- Function to recalculate paid_amount on deudas when pagos change
CREATE OR REPLACE FUNCTION public.sync_deuda_paid_amount()
RETURNS TRIGGER AS $$
DECLARE
  target_deuda_id UUID;
BEGIN
  -- Determine which deuda to update
  IF TG_OP = 'DELETE' THEN
    target_deuda_id := OLD.deuda_id;
  ELSE
    target_deuda_id := NEW.deuda_id;
  END IF;

  -- Recalculate paid_amount from all pagos
  UPDATE public.deudas
  SET paid_amount = COALESCE(
    (SELECT SUM(dp.amount) FROM public.deuda_pagos dp WHERE dp.deuda_id = target_deuda_id),
    0
  )
  WHERE id = target_deuda_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.sync_deuda_paid_amount IS
  'Trigger function to recalculate deudas.paid_amount when deuda_pagos are inserted, updated, or deleted.';

-- Apply trigger
DROP TRIGGER IF EXISTS trigger_sync_deuda_paid_amount ON public.deuda_pagos;
CREATE TRIGGER trigger_sync_deuda_paid_amount
  AFTER INSERT OR UPDATE OR DELETE ON public.deuda_pagos
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_deuda_paid_amount();

-- ============================================================================
-- PART 4: INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_deudas_user_status
  ON public.deudas (user_id, status);

CREATE INDEX IF NOT EXISTS idx_deudas_user_due_date
  ON public.deudas (user_id, due_date);

CREATE INDEX IF NOT EXISTS idx_deuda_pagos_deuda
  ON public.deuda_pagos (deuda_id);

CREATE INDEX IF NOT EXISTS idx_deuda_pagos_user_date
  ON public.deuda_pagos (user_id, payment_date DESC);

-- ============================================================================
-- PART 5: UPDATED_AT TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_deudas_updated_at ON public.deudas;
CREATE TRIGGER trigger_update_deudas_updated_at
  BEFORE UPDATE ON public.deudas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PART 6: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.deudas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deuda_pagos ENABLE ROW LEVEL SECURITY;

-- Deudas RLS policies
DROP POLICY IF EXISTS "Users can view their own deudas" ON public.deudas;
CREATE POLICY "Users can view their own deudas"
  ON public.deudas FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own deudas" ON public.deudas;
CREATE POLICY "Users can create their own deudas"
  ON public.deudas FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own deudas" ON public.deudas;
CREATE POLICY "Users can update their own deudas"
  ON public.deudas FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own deudas" ON public.deudas;
CREATE POLICY "Users can delete their own deudas"
  ON public.deudas FOR DELETE USING (auth.uid() = user_id);

-- Deuda pagos RLS policies
DROP POLICY IF EXISTS "Users can view their own deuda pagos" ON public.deuda_pagos;
CREATE POLICY "Users can view their own deuda pagos"
  ON public.deuda_pagos FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own deuda pagos" ON public.deuda_pagos;
CREATE POLICY "Users can create their own deuda pagos"
  ON public.deuda_pagos FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own deuda pagos" ON public.deuda_pagos;
CREATE POLICY "Users can update their own deuda pagos"
  ON public.deuda_pagos FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own deuda pagos" ON public.deuda_pagos;
CREATE POLICY "Users can delete their own deuda pagos"
  ON public.deuda_pagos FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- PART 7: GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deudas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deuda_pagos TO authenticated;
REVOKE ALL ON public.deudas FROM anon;
REVOKE ALL ON public.deuda_pagos FROM anon;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
-- ✓ Created deudas table with auto-calculated remaining_amount and status
-- ✓ Created deuda_pagos table for tracking payments
-- ✓ Created sync trigger to update paid_amount when pagos change
-- ✓ Added indexes for query performance
-- ✓ Applied updated_at trigger on deudas
-- ✓ Enabled RLS on both tables with full CRUD policies
-- ✓ Granted appropriate permissions
