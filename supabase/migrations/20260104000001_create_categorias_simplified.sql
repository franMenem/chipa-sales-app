-- Sistema de Categorías Simplificado
-- Permite asignar categorías a insumos y crear recetas basadas en categorías

-- 1. Tabla de categorías (catálogo central)
CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Color hex para UI (azul por defecto)
  unit_type VARCHAR(10) DEFAULT 'g', -- Tipo de unidad preferido: kg, g, l, ml, unit
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Índice para búsquedas por usuario
CREATE INDEX idx_categorias_user ON categorias(user_id) WHERE is_active = TRUE;

-- RLS Policies para categorias
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categorias"
  ON categorias FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categorias"
  ON categorias FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categorias"
  ON categorias FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categorias"
  ON categorias FOR DELETE
  USING (auth.uid() = user_id);

-- Comentarios
COMMENT ON TABLE categorias IS 'Catálogo de categorías de insumos (ej: Quesos duros, Harinas, Mantecas)';
COMMENT ON COLUMN categorias.color IS 'Código hex para visualización en UI (#3B82F6)';
COMMENT ON COLUMN categorias.unit_type IS 'Tipo de unidad preferido para esta categoría (kg, g, l, ml, unit)';

-- 2. Agregar columnas JSONB a tabla insumos
ALTER TABLE insumos
  ADD COLUMN categoria_ids JSONB DEFAULT '[]'::jsonb;

-- Índice GIN para búsquedas eficientes por categoría
CREATE INDEX idx_insumos_categoria_ids ON insumos USING GIN (categoria_ids);

COMMENT ON COLUMN insumos.categoria_ids IS 'Array de UUIDs de categorías. Ej: ["uuid1", "uuid2"]';

-- 3. Agregar columnas a recipe_items para soportar categorías
ALTER TABLE recipe_items
  ADD COLUMN required_categoria_ids JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN use_categorias BOOLEAN DEFAULT FALSE;

-- Hacer insumo_id nullable (para items que usan categorías)
ALTER TABLE recipe_items ALTER COLUMN insumo_id DROP NOT NULL;

-- Índice GIN para búsquedas por categorías requeridas
CREATE INDEX idx_recipe_items_required_categorias ON recipe_items USING GIN (required_categoria_ids);

-- Índice para filtrar por modo
CREATE INDEX idx_recipe_items_use_categorias ON recipe_items(use_categorias) WHERE use_categorias = TRUE;

COMMENT ON COLUMN recipe_items.required_categoria_ids IS 'Array de UUIDs de categorías requeridas. Insumo debe tener TODAS.';
COMMENT ON COLUMN recipe_items.use_categorias IS 'TRUE = usa categorías, FALSE = usa insumo_id específico';

-- 4. Constraint de validación: o usa categorías o insumo específico
ALTER TABLE recipe_items
  ADD CONSTRAINT check_categoria_or_insumo
  CHECK (
    (use_categorias = FALSE AND insumo_id IS NOT NULL AND required_categoria_ids = '[]'::jsonb) OR
    (use_categorias = TRUE AND insumo_id IS NULL AND jsonb_array_length(required_categoria_ids) > 0)
  );

COMMENT ON CONSTRAINT check_categoria_or_insumo ON recipe_items IS
  'Asegura que recipe_item use O bien insumo_id específico O categorías, nunca ambos';

-- 5. Función auxiliar: obtener insumos compatibles con categorías
CREATE OR REPLACE FUNCTION get_insumos_by_categorias(
  p_categoria_ids JSONB,
  p_user_id UUID
) RETURNS TABLE (
  insumo_id UUID,
  insumo_name TEXT,
  unit_type TEXT,
  total_stock DECIMAL(10,4),
  current_base_unit_cost DECIMAL(10,4)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    iws.id AS insumo_id,
    iws.name AS insumo_name,
    iws.unit_type,
    iws.total_stock,
    iws.current_base_unit_cost
  FROM insumos_with_stock iws
  WHERE iws.user_id = p_user_id
    AND iws.categoria_ids @> p_categoria_ids -- Tiene todas las categorías requeridas
    AND iws.total_stock > 0
  ORDER BY iws.current_base_unit_cost ASC; -- Más baratos primero
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_insumos_by_categorias IS
  'Retorna insumos que tienen TODAS las categorías especificadas, ordenados por precio LIFO';

-- 6. Función auxiliar: validar que categoría existe y pertenece al usuario
CREATE OR REPLACE FUNCTION validate_categoria_ownership(
  p_categoria_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM categorias
    WHERE id = p_categoria_id
      AND user_id = p_user_id
      AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger: actualizar updated_at en categorias
CREATE OR REPLACE FUNCTION update_categorias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_categorias_updated_at
  BEFORE UPDATE ON categorias
  FOR EACH ROW
  EXECUTE FUNCTION update_categorias_updated_at();

-- 8. Vista auxiliar: insumos con nombres de categorías
CREATE OR REPLACE VIEW insumos_with_categoria_names AS
SELECT
  i.*,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'color', c.color
        )
      )
      FROM categorias c
      WHERE c.id IN (
        SELECT jsonb_array_elements_text(i.categoria_ids)::uuid
      )
      AND c.is_active = TRUE
    ),
    '[]'::jsonb
  ) AS categorias
FROM insumos i;

COMMENT ON VIEW insumos_with_categoria_names IS
  'Extiende insumos con array de objetos de categorías completas (id, name, color)';
