-- Create stock_fabricado table to track manufactured product batches
-- Each batch has its own cost, margin, and sale price
CREATE TABLE IF NOT EXISTS stock_fabricado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  production_history_id UUID NOT NULL REFERENCES production_history(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,

  -- Quantities
  quantity_fabricated INTEGER NOT NULL CHECK (quantity_fabricated > 0),
  quantity_remaining INTEGER NOT NULL CHECK (quantity_remaining >= 0),

  -- Cost captured at production time
  cost_unit DECIMAL(10,2) NOT NULL CHECK (cost_unit >= 0),

  -- Margin and price configured at production time
  margin_percentage DECIMAL(5,2) NOT NULL CHECK (margin_percentage >= 0 AND margin_percentage <= 100),
  price_sale DECIMAL(10,2) NOT NULL CHECK (price_sale >= 0),

  -- Timestamps
  production_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CHECK (quantity_remaining <= quantity_fabricated)
);

-- Indexes for performance
CREATE INDEX idx_stock_fabricado_user_id ON stock_fabricado(user_id);
CREATE INDEX idx_stock_fabricado_producto_id ON stock_fabricado(producto_id);
CREATE INDEX idx_stock_fabricado_production_history_id ON stock_fabricado(production_history_id);
CREATE INDEX idx_stock_fabricado_production_date ON stock_fabricado(production_date DESC);
CREATE INDEX idx_stock_fabricado_quantity_remaining ON stock_fabricado(quantity_remaining) WHERE quantity_remaining > 0;

-- Enable RLS
ALTER TABLE stock_fabricado ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own stock_fabricado"
  ON stock_fabricado
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stock_fabricado"
  ON stock_fabricado
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stock_fabricado"
  ON stock_fabricado
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stock_fabricado"
  ON stock_fabricado
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stock_fabricado_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_stock_fabricado_updated_at
  BEFORE UPDATE ON stock_fabricado
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_fabricado_updated_at();

-- Comment on table
COMMENT ON TABLE stock_fabricado IS 'Tracks batches of manufactured products with their specific cost, margin, and sale price. Uses LIFO for sales.';
COMMENT ON COLUMN stock_fabricado.quantity_fabricated IS 'Total quantity produced in this batch';
COMMENT ON COLUMN stock_fabricado.quantity_remaining IS 'Remaining quantity available for sale (decreases with sales)';
COMMENT ON COLUMN stock_fabricado.cost_unit IS 'Unit cost captured at production time (based on actual ingredients used)';
COMMENT ON COLUMN stock_fabricado.margin_percentage IS 'Profit margin configured at production time (0-100%)';
COMMENT ON COLUMN stock_fabricado.price_sale IS 'Sale price configured at production time';
