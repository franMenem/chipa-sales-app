-- Tabla para registrar el consumo de lotes durante la fabricación

CREATE TABLE production_consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  production_history_id UUID NOT NULL REFERENCES production_history(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  recipe_item_id UUID NOT NULL REFERENCES recipe_items(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  lote_id UUID NOT NULL REFERENCES insumo_lotes(id) ON DELETE CASCADE,
  quantity_used DECIMAL(10,4) NOT NULL,
  cost_per_unit DECIMAL(10,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_production_consumptions_user ON production_consumptions(user_id);
CREATE INDEX idx_production_consumptions_history ON production_consumptions(production_history_id);
CREATE INDEX idx_production_consumptions_lote ON production_consumptions(lote_id);

ALTER TABLE production_consumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_select_own_consumptions"
  ON production_consumptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "allow_insert_own_consumptions"
  ON production_consumptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE production_consumptions IS 'Registra el detalle de consumo de cada lote cuando se fabrica un producto.';
COMMENT ON COLUMN production_consumptions.quantity_used IS 'Cantidad descontada del lote durante la producción.';
COMMENT ON COLUMN production_consumptions.cost_per_unit IS 'Costo base del lote al momento del consumo.';
