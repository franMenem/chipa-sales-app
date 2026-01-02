-- Crear tabla insumo_lotes para historial de compras de insumos
-- Sistema LIFO: cada compra se registra como un lote independiente

CREATE TABLE insumo_lotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,

  -- Datos de la compra
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quantity_purchased DECIMAL(10,4) NOT NULL CHECK (quantity_purchased > 0),
  quantity_remaining DECIMAL(10,4) NOT NULL CHECK (quantity_remaining >= 0),
  price_per_unit DECIMAL(10,2) NOT NULL CHECK (price_per_unit > 0),

  -- Unidad al momento de la compra (puede variar entre lotes)
  unit_type VARCHAR(20) NOT NULL CHECK (unit_type IN ('kg', 'l', 'unit', 'g', 'ml')),

  -- Costo por unidad base (calculado automáticamente)
  base_unit_cost DECIMAL(10,6) GENERATED ALWAYS AS (
    CASE
      WHEN unit_type = 'kg' THEN price_per_unit / 1000
      WHEN unit_type = 'l' THEN price_per_unit / 1000
      ELSE price_per_unit
    END
  ) STORED,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: remaining no puede ser mayor que purchased
  CONSTRAINT check_remaining_lte_purchased
    CHECK (quantity_remaining <= quantity_purchased)
);

-- Índices para performance
CREATE INDEX idx_lotes_user ON insumo_lotes(user_id);
CREATE INDEX idx_lotes_insumo ON insumo_lotes(insumo_id);
CREATE INDEX idx_lotes_date ON insumo_lotes(purchase_date DESC);
CREATE INDEX idx_lotes_remaining ON insumo_lotes(quantity_remaining) WHERE quantity_remaining > 0;

-- Row Level Security
ALTER TABLE insumo_lotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lotes"
ON insumo_lotes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lotes"
ON insumo_lotes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lotes"
ON insumo_lotes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lotes"
ON insumo_lotes FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_insumo_lotes_updated_at
BEFORE UPDATE ON insumo_lotes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE insumo_lotes IS 'Historial de compras de insumos - cada registro es un lote individual';
COMMENT ON COLUMN insumo_lotes.quantity_purchased IS 'Cantidad total comprada en este lote';
COMMENT ON COLUMN insumo_lotes.quantity_remaining IS 'Cantidad que queda disponible de este lote (se descuenta al fabricar productos)';
COMMENT ON COLUMN insumo_lotes.base_unit_cost IS 'Costo por unidad base (g, ml o unidad) - calculado automáticamente';
