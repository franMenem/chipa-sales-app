-- Migration: Retiros (withdrawals) system
-- Date: 2026-04-02
-- Description:
--   Allows tracking non-production consumption of insumos and finished products.
--   Covers: personal/family use, waste/spoilage, inventory adjustments.
--   Each retiro records the exact cost for accurate profit calculations.

-- ============================================================================
-- TABLE: retiros
-- ============================================================================

CREATE TABLE retiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What was withdrawn
  item_type TEXT NOT NULL CHECK (item_type IN ('insumo', 'producto')),
  item_id UUID NOT NULL,           -- insumo.id or producto.id
  item_name TEXT NOT NULL,         -- snapshot of name at withdrawal time
  lote_id UUID,                    -- insumo_lotes.id or stock_fabricado.id

  -- How much and at what cost
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  cost_per_unit NUMERIC NOT NULL CHECK (cost_per_unit >= 0),
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * cost_per_unit) STORED,

  -- Why
  reason TEXT NOT NULL CHECK (reason IN ('consumo_personal', 'merma', 'ajuste')),
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_retiros_user_created ON retiros(user_id, created_at DESC);
CREATE INDEX idx_retiros_item ON retiros(item_type, item_id);

-- Enable RLS
ALTER TABLE retiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own retiros"
  ON retiros FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own retiros"
  ON retiros FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own retiros"
  ON retiros FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own retiros"
  ON retiros FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RPC: create_retiro_insumo
-- Atomically: validate stock → deduct from lote → insert retiro
-- ============================================================================

CREATE OR REPLACE FUNCTION create_retiro_insumo(
  p_insumo_id UUID,
  p_lote_id UUID,
  p_quantity NUMERIC,
  p_reason TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id UUID;
  v_insumo_name TEXT;
  v_lote_remaining NUMERIC;
  v_base_unit_cost NUMERIC;
  v_retiro_id UUID;
  v_retiro JSONB;
BEGIN
  v_user_id := auth.uid();

  -- Get insumo name and validate ownership
  SELECT name INTO v_insumo_name
  FROM insumos
  WHERE id = p_insumo_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insumo no encontrado';
  END IF;

  -- Lock the lote row and validate stock
  SELECT quantity_remaining, base_unit_cost
  INTO v_lote_remaining, v_base_unit_cost
  FROM insumo_lotes
  WHERE id = p_lote_id AND insumo_id = p_insumo_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote no encontrado';
  END IF;

  IF v_lote_remaining < p_quantity THEN
    RAISE EXCEPTION 'Stock insuficiente en el lote. Disponible: %', v_lote_remaining;
  END IF;

  -- Deduct from lote
  UPDATE insumo_lotes
  SET quantity_remaining = quantity_remaining - p_quantity
  WHERE id = p_lote_id;

  -- Insert retiro
  INSERT INTO retiros (user_id, item_type, item_id, item_name, lote_id, quantity, cost_per_unit, reason, notes)
  VALUES (v_user_id, 'insumo', p_insumo_id, v_insumo_name, p_lote_id, p_quantity, v_base_unit_cost, p_reason, p_notes)
  RETURNING id INTO v_retiro_id;

  SELECT row_to_json(r.*)::JSONB INTO v_retiro
  FROM retiros r
  WHERE r.id = v_retiro_id;

  RETURN v_retiro;
END;
$$;

GRANT EXECUTE ON FUNCTION create_retiro_insumo(UUID, UUID, NUMERIC, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- RPC: create_retiro_producto
-- Atomically: validate stock → deduct from batch + finished_stock → insert retiro
-- ============================================================================

CREATE OR REPLACE FUNCTION create_retiro_producto(
  p_producto_id UUID,
  p_stock_fabricado_id UUID,
  p_quantity INTEGER,
  p_reason TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id UUID;
  v_producto_name TEXT;
  v_batch_remaining INTEGER;
  v_cost_unit NUMERIC;
  v_retiro_id UUID;
  v_retiro JSONB;
BEGIN
  v_user_id := auth.uid();

  -- Get producto name and validate ownership
  SELECT name INTO v_producto_name
  FROM productos
  WHERE id = p_producto_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  -- Lock the batch row and validate stock
  SELECT quantity_remaining, cost_unit
  INTO v_batch_remaining, v_cost_unit
  FROM stock_fabricado
  WHERE id = p_stock_fabricado_id AND producto_id = p_producto_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch no encontrado';
  END IF;

  IF v_batch_remaining < p_quantity THEN
    RAISE EXCEPTION 'Stock insuficiente en el batch. Disponible: %', v_batch_remaining;
  END IF;

  -- Deduct from batch
  UPDATE stock_fabricado
  SET quantity_remaining = quantity_remaining - p_quantity
  WHERE id = p_stock_fabricado_id;

  -- Deduct from producto finished_stock
  UPDATE productos
  SET finished_stock = finished_stock - p_quantity
  WHERE id = p_producto_id AND user_id = v_user_id;

  -- Insert retiro
  INSERT INTO retiros (user_id, item_type, item_id, item_name, lote_id, quantity, cost_per_unit, reason, notes)
  VALUES (v_user_id, 'producto', p_producto_id, v_producto_name, p_stock_fabricado_id, p_quantity, v_cost_unit, p_reason, p_notes)
  RETURNING id INTO v_retiro_id;

  SELECT row_to_json(r.*)::JSONB INTO v_retiro
  FROM retiros r
  WHERE r.id = v_retiro_id;

  RETURN v_retiro;
END;
$$;

GRANT EXECUTE ON FUNCTION create_retiro_producto(UUID, UUID, INTEGER, TEXT, TEXT) TO authenticated;
