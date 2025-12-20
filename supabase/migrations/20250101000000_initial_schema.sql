-- Chipa Sales App - Initial Database Schema
-- Este archivo crea todas las tablas, views, triggers y políticas RLS necesarias

-- ============================================
-- 1. EXTENSIONES
-- ============================================

-- Habilitar extensión UUID para generar IDs únicos
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. TABLAS PRINCIPALES
-- ============================================

-- Tabla: insumos (ingredientes/materias primas)
CREATE TABLE insumos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price_per_unit DECIMAL(10,2) NOT NULL CHECK (price_per_unit > 0),
  unit_type VARCHAR(20) NOT NULL CHECK (unit_type IN ('kg', 'l', 'unit', 'g', 'ml')),

  -- Columna computada: convierte precio a unidad base
  -- kg/l → divide por 1000 para obtener precio por g/ml
  -- unit/g/ml → mantiene el precio tal cual
  base_unit_cost DECIMAL(10,6) GENERATED ALWAYS AS (
    CASE
      WHEN unit_type = 'kg' THEN price_per_unit / 1000
      WHEN unit_type = 'l' THEN price_per_unit / 1000
      ELSE price_per_unit
    END
  ) STORED,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Cada usuario solo puede tener un insumo con el mismo nombre
  UNIQUE(user_id, name)
);

-- Tabla: productos
CREATE TABLE productos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price_sale DECIMAL(10,2) NOT NULL CHECK (price_sale > 0),
  margin_goal DECIMAL(5,2) CHECK (margin_goal >= 0 AND margin_goal <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, name)
);

-- Tabla: recipe_items (items de receta - relación productos-insumos)
CREATE TABLE recipe_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  quantity_in_base_units DECIMAL(10,4) NOT NULL CHECK (quantity_in_base_units > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Un producto no puede tener el mismo insumo dos veces
  UNIQUE(producto_id, insumo_id)
);

-- Tabla: ventas
CREATE TABLE ventas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,

  -- Snapshot del nombre del producto (para mantener histórico)
  producto_name VARCHAR(255) NOT NULL,

  quantity INTEGER NOT NULL CHECK (quantity > 0),

  -- Snapshots de precios al momento de la venta
  price_sold DECIMAL(10,2) NOT NULL CHECK (price_sold > 0),
  cost_unit DECIMAL(10,2) NOT NULL CHECK (cost_unit >= 0),

  -- Columnas computadas para cálculos automáticos
  total_income DECIMAL(10,2) GENERATED ALWAYS AS (quantity * price_sold) STORED,
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * cost_unit) STORED,
  profit DECIMAL(10,2) GENERATED ALWAYS AS (quantity * (price_sold - cost_unit)) STORED,
  profit_margin DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN price_sold > 0 THEN ((price_sold - cost_unit) / price_sold * 100)
      ELSE 0
    END
  ) STORED,

  sale_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: costos_fijos
CREATE TABLE costos_fijos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('monthly', 'weekly', 'annual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. VISTA: productos_with_cost
-- ============================================

-- Esta vista calcula el costo de cada producto basado en su receta
CREATE OR REPLACE VIEW productos_with_cost AS
SELECT
  p.id,
  p.user_id,
  p.name,
  p.price_sale,
  p.margin_goal,
  p.created_at,
  p.updated_at,
  COALESCE(SUM(ri.quantity_in_base_units * i.base_unit_cost), 0) AS cost_unit
FROM productos p
LEFT JOIN recipe_items ri ON p.id = ri.producto_id
LEFT JOIN insumos i ON ri.insumo_id = i.id
GROUP BY p.id, p.user_id, p.name, p.price_sale, p.margin_goal, p.created_at, p.updated_at;

-- ============================================
-- 4. ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índices en user_id para filtrado rápido
CREATE INDEX idx_insumos_user ON insumos(user_id);
CREATE INDEX idx_productos_user ON productos(user_id);
CREATE INDEX idx_ventas_user ON ventas(user_id);
CREATE INDEX idx_costos_fijos_user ON costos_fijos(user_id);

-- Índice en fecha de ventas para queries de dashboard
CREATE INDEX idx_ventas_date ON ventas(sale_date DESC);
CREATE INDEX idx_ventas_user_date ON ventas(user_id, sale_date DESC);

-- Índices en recipe_items para joins rápidos
CREATE INDEX idx_recipe_items_producto ON recipe_items(producto_id);
CREATE INDEX idx_recipe_items_insumo ON recipe_items(insumo_id);

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Función: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para insumos
CREATE TRIGGER update_insumos_updated_at
BEFORE UPDATE ON insumos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger para productos
CREATE TRIGGER update_productos_updated_at
BEFORE UPDATE ON productos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger para costos_fijos
CREATE TRIGGER update_costos_fijos_updated_at
BEFORE UPDATE ON costos_fijos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE costos_fijos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS - INSUMOS
-- ============================================

CREATE POLICY "Users can view own insumos"
ON insumos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insumos"
ON insumos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insumos"
ON insumos FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own insumos"
ON insumos FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS RLS - PRODUCTOS
-- ============================================

CREATE POLICY "Users can view own productos"
ON productos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own productos"
ON productos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own productos"
ON productos FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own productos"
ON productos FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS RLS - RECIPE_ITEMS
-- ============================================

-- Los recipe_items se controlan a través de la relación con productos
CREATE POLICY "Users can view recipe items for own productos"
ON recipe_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM productos
    WHERE productos.id = recipe_items.producto_id
    AND productos.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert recipe items for own productos"
ON recipe_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM productos
    WHERE productos.id = recipe_items.producto_id
    AND productos.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update recipe items for own productos"
ON recipe_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM productos
    WHERE productos.id = recipe_items.producto_id
    AND productos.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete recipe items for own productos"
ON recipe_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM productos
    WHERE productos.id = recipe_items.producto_id
    AND productos.user_id = auth.uid()
  )
);

-- ============================================
-- POLÍTICAS RLS - VENTAS
-- ============================================

CREATE POLICY "Users can view own ventas"
ON ventas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ventas"
ON ventas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ventas"
ON ventas FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ventas"
ON ventas FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS RLS - COSTOS_FIJOS
-- ============================================

CREATE POLICY "Users can view own costos_fijos"
ON costos_fijos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own costos_fijos"
ON costos_fijos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own costos_fijos"
ON costos_fijos FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own costos_fijos"
ON costos_fijos FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 7. COMENTARIOS (DOCUMENTACIÓN)
-- ============================================

COMMENT ON TABLE insumos IS 'Ingredientes y materias primas con sus precios';
COMMENT ON TABLE productos IS 'Productos finales que se venden';
COMMENT ON TABLE recipe_items IS 'Receta de cada producto (qué insumos lleva y en qué cantidad)';
COMMENT ON TABLE ventas IS 'Registro histórico de todas las ventas realizadas';
COMMENT ON TABLE costos_fijos IS 'Gastos fijos del negocio (alquiler, servicios, etc.)';

COMMENT ON COLUMN insumos.base_unit_cost IS 'Costo por unidad base (gramo, mililitro o unidad) - calculado automáticamente';
COMMENT ON COLUMN productos.margin_goal IS 'Margen de ganancia objetivo en porcentaje (0-100)';
COMMENT ON COLUMN ventas.cost_unit IS 'Snapshot del costo unitario al momento de la venta';
COMMENT ON COLUMN ventas.price_sold IS 'Snapshot del precio de venta al momento de la venta';

-- ============================================
-- FIN DEL SCHEMA
-- ============================================

-- Para verificar que todo se creó correctamente, puedes ejecutar:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
