# Configuración de Base de Datos Supabase

Este directorio contiene las migraciones SQL para configurar la base de datos.

## Cómo Ejecutar la Migración

### Opción 1: SQL Editor en Supabase Dashboard (Recomendado)

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. En el menú lateral, haz clic en **SQL Editor**
3. Haz clic en **+ New Query**
4. Copia y pega todo el contenido del archivo `migrations/20250101000000_initial_schema.sql`
5. Haz clic en **Run** (o presiona Ctrl/Cmd + Enter)
6. Verifica que la ejecución fue exitosa (debería mostrar "Success")

### Opción 2: Supabase CLI (Avanzado)

Si tienes el CLI de Supabase instalado:

```bash
# Vincula tu proyecto
supabase link --project-ref your-project-ref

# Ejecuta la migración
supabase db push
```

## Verificar que la Migración Funcionó

Después de ejecutar la migración, verifica que las tablas se crearon correctamente:

1. En Supabase Dashboard, ve a **Table Editor**
2. Deberías ver estas tablas:
   - ✅ `insumos`
   - ✅ `productos`
   - ✅ `recipe_items`
   - ✅ `ventas`
   - ✅ `costos_fijos`

3. También puedes ejecutar esta query en SQL Editor para listar todas las tablas:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

## Estructura de la Base de Datos

### Tablas Principales

**insumos** - Ingredientes y materias primas
- Contiene: nombre, precio por unidad, tipo de unidad (kg/l/unit/g/ml)
- Calcula automáticamente: `base_unit_cost` (precio por unidad base)

**productos** - Productos que se venden
- Contiene: nombre, precio de venta, margen objetivo
- Se relaciona con insumos a través de `recipe_items`

**recipe_items** - Recetas (qué insumos lleva cada producto)
- Relaciona productos con insumos
- Indica la cantidad de cada insumo

**ventas** - Registro de ventas
- Guarda snapshots de precios y costos al momento de la venta
- Calcula automáticamente: total ingreso, costo, ganancia y margen

**costos_fijos** - Gastos fijos del negocio
- Contiene: nombre, monto, frecuencia (mensual/semanal/anual)

### Vista Especial

**productos_with_cost** - Vista que calcula el costo de cada producto
- Suma automáticamente el costo de todos los insumos en la receta
- Se usa para mostrar el costo actual de cada producto

### Seguridad (RLS)

Todas las tablas tienen Row Level Security (RLS) habilitado:
- ✅ Cada usuario solo ve sus propios datos
- ✅ No pueden acceder a datos de otros usuarios
- ✅ Autenticación requerida para todas las operaciones

## Próximos Pasos

Después de ejecutar la migración:

1. ✅ Copia tu **Project URL** desde Settings → API
2. ✅ Copia tu **anon public key** desde Settings → API
3. ✅ Crea un archivo `.env` en la raíz del proyecto
4. ✅ Agrega las variables de entorno:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

¡Listo! Tu base de datos está configurada y lista para usar 🚀
