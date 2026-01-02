-- Tabla para registrar historial de producción
-- Cada registro representa una sesión de fabricación de productos

CREATE TABLE production_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,

  -- Datos de la producción
  quantity_produced INTEGER NOT NULL CHECK (quantity_produced > 0),
  cost_unit_at_production DECIMAL(10,2) NOT NULL,
  production_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_production_user ON production_history(user_id);
CREATE INDEX idx_production_producto ON production_history(producto_id);
CREATE INDEX idx_production_date ON production_history(production_date DESC);

-- Row Level Security
ALTER TABLE production_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own production history"
ON production_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own production history"
ON production_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own production history"
ON production_history FOR DELETE
USING (auth.uid() = user_id);

-- Comentarios
COMMENT ON TABLE production_history IS 'Historial de fabricación de productos terminados';
COMMENT ON COLUMN production_history.quantity_produced IS 'Cantidad de unidades producidas en esta sesión';
COMMENT ON COLUMN production_history.cost_unit_at_production IS 'Costo por unidad al momento de la producción (snapshot)';
COMMENT ON COLUMN production_history.production_date IS 'Fecha y hora de la producción';
