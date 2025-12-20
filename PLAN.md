# Plan de Implementación: App de Gestión de Ventas Chipa

## Contexto de la Aplicación

### ¿Qué es esta aplicación?

Es un **sistema de gestión completo para negocios de venta de productos alimenticios** (inicialmente enfocado en chipa, un producto tradicional paraguayo), que permite controlar costos, precios, márgenes de ganancia y ventas de manera profesional y automatizada.

### Problema que Resuelve

Los pequeños emprendedores de alimentos enfrentan desafíos críticos:

1. **Descontrol de costos:** Cuando sube el precio del queso o la harina, no saben cómo impacta en el costo real de cada producto.

2. **Márgenes de ganancia desconocidos:** Venden "a ojo", sin saber realmente cuánto ganan por unidad vendida.

3. **Falta de visibilidad financiera:** No tienen claridad sobre si están ganando o perdiendo dinero, cuáles productos son más rentables, o cómo van las ventas mes a mes.

4. **Gestión manual:** Llevan cuentas en cuadernos o planillas complejas de Excel que son difíciles de mantener actualizadas.

5. **Decisiones sin datos:** No saben si deben subir precios, qué productos promocionar, o dónde recortar costos.

### Solución que Ofrece

Esta app resuelve todos estos problemas mediante:

**1. Control Inteligente de Insumos (Master Price Input)**
- Lista maestra de todos los ingredientes con sus precios actuales
- Conversión automática a costo por unidad base (gramos, mililitros, unidades)
- Actualización fácil de precios cuando cambia el mercado

**2. Recetas Inteligentes de Productos**
- Constructor de recetas: defines qué insumos lleva cada producto y en qué cantidad
- **Auto-recalculación en tiempo real:** Si cambias el precio del queso, TODOS los productos que usan queso recalculan su costo automáticamente
- Precio sugerido basado en tu margen de ganancia objetivo

**3. Registro de Ventas con Cálculos Automáticos**
- Registras la venta (producto + cantidad)
- La app calcula automáticamente:
  * Ingreso total
  * Costo total (basado en la receta)
  * Ganancia neta
  * Margen de ganancia en porcentaje
- Historial completo de todas las ventas

**4. Dashboard Ejecutivo**
- Vista instantánea del negocio:
  * Ventas de hoy y del mes
  * Ganancia total
  * Costos totales
  * Margen de ganancia promedio
- Gráficos visuales:
  * Tendencia de ganancia últimos 30 días
  * Comparación Ingresos vs Costos vs Ganancia
  * Desglose de costos por categoría
- Lista de productos más vendidos

**5. Gestión de Costos Fijos**
- Registro de gastos fijos (alquiler, luz, gas, internet)
- Clasificación por frecuencia (mensual, semanal, anual)
- Resumen mensual estimado para análisis de rentabilidad

**6. Reportes y Analytics**
- Análisis mensual de ventas
- Ranking de mejores productos
- Exportación de reportes (CSV/PDF)
- Filtros por rango de fechas

### Características Principales

✅ **Auto-recalculación:** Cambias un precio de insumo → todos los productos se actualizan
✅ **Márgenes personalizables:** Define tu ganancia objetivo y ve el precio sugerido
✅ **Historial completo:** Snapshot de costos en cada venta para análisis histórico preciso
✅ **Multi-usuario:** Cada usuario ve solo sus datos (Supabase Auth + RLS)
✅ **Responsive:** Diseño móvil-first, funciona en celulares y tablets
✅ **Modo oscuro:** Interfaz moderna con soporte de tema claro/oscuro
✅ **Notificaciones:** Feedback instantáneo en cada acción

### Usuarios Objetivo

- Emprendedores de alimentos (chipa, pastelería, panadería, etc.)
- Pequeños negocios gastronómicos
- Productores artesanales que venden directamente
- Food trucks
- Negocios familiares de comida

### Flujo de Trabajo del Usuario

```
1. SETUP INICIAL
   └─ Registrar cuenta
   └─ Agregar insumos con precios actuales
   └─ Crear productos con sus recetas
   └─ Configurar costos fijos

2. USO DIARIO
   └─ Registrar ventas del día
   └─ Ver dashboard para monitorear rendimiento
   └─ Actualizar precios de insumos cuando sea necesario

3. ANÁLISIS PERIÓDICO (semanal/mensual)
   └─ Revisar reportes
   └─ Analizar productos más rentables
   └─ Ajustar precios según márgenes
   └─ Exportar datos para contador/registro fiscal
```

### Ejemplo Concreto de Uso

**María vende chipas:**

1. **Define sus insumos:**
   - Almidón: $1,50/kg
   - Queso Paraguay: $5,00/kg
   - Huevos: $0,10/unidad
   - Manteca: $6,00/kg
   - Leche: $1,20/litro

2. **Crea su producto "Chipa Tradicional x12":**
   - Receta:
     * 250g de almidón
     * 200g de queso
     * 2 huevos
     * 100g de manteca
     * 150ml de leche
   - **La app calcula:** Costo unitario = $2,35
   - María define margen objetivo: 50%
   - **La app sugiere:** Precio de venta = $4,70

3. **El precio del queso sube a $6,00/kg:**
   - María actualiza el insumo
   - **Automáticamente:**
     * Nuevo costo unitario = $2,55
     * Nuevo precio sugerido (50% margen) = $5,10
   - María decide ajustar precio a $5,00

4. **Vende 15 docenas en un día:**
   - Registra venta: 15 unidades x $5,00
   - **La app muestra:**
     * Ingreso: $75,00
     * Costo: $38,25
     * Ganancia: $36,75
     * Margen: 49%

5. **Al final del mes:**
   - Ve en dashboard que vendió $2,400
   - Ganó $1,100 netos
   - Identifica que "Chipa con Jamón" es su producto más rentable
   - Exporta reporte para su contador

### Valor Diferencial

🎯 **No es solo una app de contabilidad:** Es un sistema que **entiende recetas** y **costos de producción**

🎯 **No requiere conocimientos técnicos:** Interfaz intuitiva diseñada para emprendedores sin experiencia en software

🎯 **Datos en tiempo real:** No esperas al fin de mes para saber si ganaste dinero

🎯 **Decisiones basadas en datos:** Sabes exactamente qué productos te dan más ganancia y cuáles ajustar

---

## Resumen Ejecutivo

Convertir 6 diseños HTML/Tailwind estáticos en una aplicación React + TypeScript + Supabase funcional para gestión de ventas de productos de chipa.

**Stack Tecnológico:**
- Vite + React + TypeScript
- Supabase (base de datos + autenticación)
- Tailwind CSS
- Recharts (gráficos)
- React Router (navegación)
- TanStack Query (React Query) - manejo de estado del servidor
- Zustand - estado del cliente (UI, notificaciones)

**Duración Estimada:** 22 días

---

## Estructura del Proyecto

```
chipa-sales-app/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── lib/
│   │   ├── supabase.ts          # Cliente Supabase
│   │   ├── types.ts             # Tipos TypeScript globales
│   │   └── constants.ts         # Constantes (colores, etc.)
│   ├── hooks/
│   │   ├── useAuth.ts           # Hook de autenticación
│   │   ├── useInsumos.ts        # CRUD insumos
│   │   ├── useProductos.ts      # CRUD productos + cálculos
│   │   ├── useVentas.ts         # CRUD ventas + cálculos
│   │   ├── useCostosFijos.ts    # Gestión costos fijos
│   │   ├── useDashboard.ts      # Agregaciones dashboard
│   │   └── useToast.ts          # Notificaciones toast
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppBar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   └── Layout.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── KpiCard.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── QuantityStepper.tsx
│   │   ├── charts/
│   │   │   ├── LineChart.tsx
│   │   │   ├── BarChart.tsx
│   │   │   └── DonutChart.tsx
│   │   ├── forms/
│   │   │   ├── InsumoForm.tsx
│   │   │   ├── ProductoForm.tsx
│   │   │   ├── VentaForm.tsx
│   │   │   └── CostoFijoForm.tsx
│   │   └── lists/
│   │       ├── InsumosList.tsx
│   │       ├── ProductosList.tsx
│   │       ├── VentasList.tsx
│   │       └── CostosFijosList.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Insumos.tsx
│   │   ├── Productos.tsx
│   │   ├── Ventas.tsx
│   │   ├── CostosFijos.tsx
│   │   └── Reports.tsx
│   ├── utils/
│   │   ├── calculations.ts      # Funciones de lógica de negocio
│   │   ├── formatters.ts        # Formateo números/fechas
│   │   └── validators.ts        # Validación de formularios
│   └── styles/
│       └── index.css
├── supabase/
│   └── migrations/
│       └── 20240101000000_initial_schema.sql
└── [archivos de configuración]
```

---

## Modelo de Datos - Supabase

### Tablas

**1. insumos (ingredientes)**
```sql
- id: UUID (PK)
- user_id: UUID (FK → auth.users)
- name: VARCHAR(255)
- price_per_unit: DECIMAL(10,2)
- unit_type: VARCHAR(20) ['kg', 'l', 'unit', 'g', 'ml']
- base_unit_cost: DECIMAL(10,6) [COMPUTED]
  * Si unit_type = 'kg' → price_per_unit / 1000
  * Si unit_type = 'l' → price_per_unit / 1000
  * Else → price_per_unit
- created_at, updated_at
```

**2. productos**
```sql
- id: UUID (PK)
- user_id: UUID (FK → auth.users)
- name: VARCHAR(255)
- price_sale: DECIMAL(10,2)
- margin_goal: DECIMAL(5,2) [nullable] (porcentaje objetivo)
- created_at, updated_at
```

**3. recipe_items (receta)**
```sql
- id: UUID (PK)
- producto_id: UUID (FK → productos)
- insumo_id: UUID (FK → insumos)
- quantity_in_base_units: DECIMAL(10,4)
- created_at
```

**4. productos_with_cost (VIEW)**
```sql
SELECT productos.*,
  COALESCE(SUM(recipe_items.quantity * insumos.base_unit_cost), 0) AS cost_unit
FROM productos
LEFT JOIN recipe_items ON productos.id = recipe_items.producto_id
LEFT JOIN insumos ON recipe_items.insumo_id = insumos.id
GROUP BY productos.id
```

**5. ventas**
```sql
- id: UUID (PK)
- user_id: UUID (FK → auth.users)
- producto_id: UUID (FK → productos) [nullable]
- producto_name: VARCHAR(255) [snapshot]
- quantity: INTEGER
- price_sold: DECIMAL(10,2) [snapshot del precio al momento]
- cost_unit: DECIMAL(10,2) [snapshot del costo al momento]
- total_income: DECIMAL(10,2) [COMPUTED: quantity * price_sold]
- total_cost: DECIMAL(10,2) [COMPUTED: quantity * cost_unit]
- profit: DECIMAL(10,2) [COMPUTED: total_income - total_cost]
- profit_margin: DECIMAL(5,2) [COMPUTED: (profit/total_income)*100]
- sale_date: TIMESTAMPTZ
- created_at
```

**6. costos_fijos**
```sql
- id: UUID (PK)
- user_id: UUID (FK → auth.users)
- name: VARCHAR(255)
- amount: DECIMAL(10,2)
- frequency: VARCHAR(20) ['monthly', 'weekly', 'annual']
- created_at, updated_at
```

### Políticas RLS (Row Level Security)

Cada tabla tiene políticas para que los usuarios solo vean sus propios datos:
```sql
-- Ejemplo para insumos
CREATE POLICY "Users can view own insumos" ON insumos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insumos" ON insumos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- [Repetir para UPDATE y DELETE]
-- [Aplicar patrón similar a todas las tablas]
```

---

## Lógica de Negocio Crítica

### 1. Auto-recalculación de Costos

**Problema:** Cuando cambia el precio de un insumo, TODOS los productos que lo usan deben recalcular su `cost_unit`.

**Solución:**
- Base de datos calcula `base_unit_cost` automáticamente (columna computada)
- Vista `productos_with_cost` recalcula `cost_unit` en cada query
- En frontend: al actualizar insumo → invalidar queries de productos
```typescript
// hooks/useInsumos.ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['productos'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  toast.success('Costs recalculated');
}
```

### 2. Cálculo de Costo de Producto

```typescript
// utils/calculations.ts
export function calculateProductCost(
  recipeItems: RecipeItem[],
  insumos: Insumo[]
): number {
  return recipeItems.reduce((total, item) => {
    const insumo = insumos.find(i => i.id === item.insumo_id);
    if (!insumo) return total;
    return total + (item.quantity_in_base_units * insumo.base_unit_cost);
  }, 0);
}
```

### 3. Precio Sugerido según Margen

```typescript
export function calculateSuggestedPrice(
  costUnit: number,
  marginGoal: number
): number {
  // Si margen objetivo = 40%, precio = costo / (1 - 0.40)
  return costUnit / (1 - marginGoal / 100);
}
```

### 4. Snapshot de Costos en Ventas

Al registrar una venta, se guarda el `cost_unit` actual del producto como snapshot:
```typescript
const { data: producto } = await supabase
  .from('productos_with_cost')
  .select('*')
  .eq('id', producto_id)
  .single();

await supabase.from('ventas').insert({
  producto_id,
  producto_name: producto.name,
  quantity,
  price_sold: precio_usado,
  cost_unit: producto.cost_unit, // ← SNAPSHOT del costo actual
});
```

**Razón:** Si el costo del producto cambia después, las ventas históricas mantienen el costo que tenían en ese momento.

---

## Arquitectura de Componentes

### Layout Compartido

```typescript
// components/layout/Layout.tsx
<Layout
  title="Productos"
  subtitle="Gestión de productos"
  headerAction={<AddButton />}
  showBottomNav={true}
>
  {children}
</Layout>
```

### KPI Card Reutilizable

```typescript
<KpiCard
  label="Sales Today"
  value="$450.00"
  icon="payments"
  iconColor="primary"
  trend={{
    value: 12,
    label: "vs yesterday",
    direction: "up"
  }}
/>
```

### Formulario de Producto (Complejo)

Características:
- Constructor de receta (agregar/quitar ingredientes)
- Cálculo en tiempo real del costo mientras se edita
- Precio sugerido basado en margen objetivo
- Validación con `react-hook-form` + `zod`

---

## Flujo de Navegación

```
/login → Autenticación
  ↓
/ → Redirect a /dashboard

/dashboard → Vista general (KPIs, gráficos, ventas recientes)
/insumos → Lista y gestión de ingredientes
/productos → Lista de productos
  /productos/:id → Detalle/edición de producto
/ventas → Registro de ventas + historial
/costos-fijos → Gestión de costos fijos
/reports → Analytics y reportes

[Todas las rutas protegidas con ProtectedRoute]
```

---

## Plan de Implementación - 10 Fases

### Fase 1: Fundamentos (Días 1-2)
✅ **Tareas:**
1. Inicializar proyecto Vite + React + TypeScript
   ```bash
   npm create vite@latest chipa-sales-app -- --template react-ts
   cd chipa-sales-app
   npm install
   ```

2. Instalar dependencias
   ```bash
   npm install react-router-dom @supabase/supabase-js @tanstack/react-query zustand recharts
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

3. Configurar Tailwind CSS
   - Copiar configuración de tema de los HTMLs
   - Agregar colores personalizados (primary: #13ec5b, etc.)

4. Crear utilidades core
   - `lib/supabase.ts` - Cliente Supabase
   - `lib/types.ts` - Tipos TypeScript
   - `utils/calculations.ts` - Funciones de cálculo

**Entregables:**
- Proyecto inicializado
- Tailwind configurado
- Estructura de carpetas creada

---

### Fase 2: Supabase + Autenticación (Días 3-4)

✅ **Tareas:**
1. Crear proyecto en Supabase
2. Ejecutar migración SQL (schema completo)
3. Configurar RLS policies
4. Obtener API keys y configurar `.env`

5. Implementar autenticación
   - `hooks/useAuth.ts`
   - `pages/Login.tsx`
   - Componente `ProtectedRoute`

6. Crear layout base
   - `components/layout/AppBar.tsx`
   - `components/layout/BottomNav.tsx`
   - `components/layout/Layout.tsx`

7. Sistema de notificaciones
   - `hooks/useToast.ts` (Zustand)
   - `components/ui/Toast.tsx`

**Entregables:**
- Base de datos configurada
- Login funcional
- Layout base con navegación

---

### Fase 3: Módulo Insumos (Días 5-6)

✅ **Tareas:**
1. Implementar hooks de datos
   - `hooks/useInsumos.ts` (queries + mutations)

2. Crear componentes
   - `components/forms/InsumoForm.tsx` (agregar/editar)
   - `components/lists/InsumosList.tsx` (lista)
   - `components/ui/SearchBar.tsx`

3. Página completa
   - `pages/Insumos.tsx`

4. Testing
   - Agregar insumo
   - Editar precio
   - Verificar cálculo de `base_unit_cost`
   - Buscar insumos

**Entregables:**
- CRUD completo de insumos
- Búsqueda funcional
- Notificación al actualizar

---

### Fase 4: Módulo Productos (Días 7-9)

✅ **Tareas:**
1. Implementar hooks
   - `hooks/useProductos.ts`

2. Formulario complejo de producto
   - `components/forms/ProductoForm.tsx`
   - Constructor de receta (agregar/quitar insumos)
   - Selector de insumo + cantidad
   - Cálculo en vivo del costo
   - Campo de margen objetivo
   - Precio sugerido calculado

3. Lista de productos
   - `components/lists/ProductosList.tsx`
   - Mostrar costo, precio, margen %

4. Página
   - `pages/Productos.tsx`

5. Testing crítico
   - Crear producto con receta
   - Editar receta existente
   - **Cambiar precio de insumo → verificar que productos se recalculan**
   - Verificar precio sugerido según margen

**Entregables:**
- CRUD de productos funcional
- Constructor de recetas operativo
- Auto-recalculación verificada

---

### Fase 5: Módulo Ventas (Días 10-11)

✅ **Tareas:**
1. Hook de ventas
   - `hooks/useVentas.ts`

2. Formulario de venta
   - `components/forms/VentaForm.tsx`
   - Selector de producto
   - `components/ui/QuantityStepper.tsx` (+/-)
   - Auto-completar precio de venta
   - Mostrar cálculos en tiempo real:
     * Total ingreso
     * Costo total
     * Ganancia
     * Margen %

3. Historial de ventas
   - `components/lists/VentasList.tsx`
   - Filtros por fecha
   - Filtros por producto

4. Página
   - `pages/Ventas.tsx`

5. Testing
   - Registrar venta
   - Verificar cálculos automáticos
   - Verificar snapshot de costo
   - Filtrar historial

**Entregables:**
- Registro de ventas funcional
- Cálculos automáticos correctos
- Historial con filtros

---

### Fase 6: Módulo Costos Fijos (Días 12-13)

✅ **Tareas:**
1. Hook
   - `hooks/useCostosFijos.ts`

2. Componentes
   - `components/forms/CostoFijoForm.tsx`
   - `components/lists/CostosFijosList.tsx`

3. Página
   - `pages/CostosFijos.tsx`
   - Filtros por frecuencia (mensual/semanal/anual)
   - Resumen mensual estimado

**Entregables:**
- CRUD de costos fijos
- Resumen mensual

---

### Fase 7: Dashboard (Días 14-16)

✅ **Tareas:**
1. Hooks de agregación
   - `hooks/useDashboard.ts`
   - KPIs calculados (ventas hoy, mes, ganancia, costos)
   - Mejores productos vendidos

2. Componentes de gráficos
   - `components/charts/LineChart.tsx` (tendencia ganancia 30 días)
   - `components/charts/BarChart.tsx` (ingreso vs costo vs ganancia)
   - `components/charts/DonutChart.tsx` (desglose costos)

3. KPI Cards
   - `components/ui/KpiCard.tsx`
   - Mostrar valor + tendencia

4. Página completa
   - `pages/Dashboard.tsx`
   - Filtros por fecha (Hoy/Semana/Mes)
   - Scroll horizontal de KPIs
   - Gráficos
   - Ventas recientes

**Entregables:**
- Dashboard funcional con datos reales
- Gráficos con Recharts
- KPIs calculados dinámicamente

---

### Fase 8: Reports (Días 17-18)

✅ **Tareas:**
1. Analytics
   - Ranking mejores productos
   - Gráfico volumen de ventas
   - Filtros por rango de fechas

2. Exportación
   - Botón de exportar (CSV o PDF)
   - Implementar generación de reporte

3. Página
   - `pages/Reports.tsx`

**Entregables:**
- Página de reportes
- Exportación funcional

---

### Fase 9: Pulido y Testing (Días 19-21)

✅ **Tareas:**
1. Refinamientos UI
   - Toggle dark mode
   - Estados de carga (skeletons)
   - Manejo de errores (error boundaries)
   - Validación exhaustiva de formularios

2. Optimización de rendimiento
   - Memoización de cálculos (`useMemo`)
   - Estrategia de caché de React Query
   - Lazy loading de rutas

3. Testing integral
   - Probar todos los flujos CRUD
   - Edge cases de lógica de negocio
   - Responsividad móvil
   - Modo oscuro

4. Ajustes finales
   - Revisar todos los diseños HTML vs implementación
   - Ajustar espaciados, colores, tipografías

**Entregables:**
- App pulida y sin bugs conocidos
- Performance optimizado
- 100% responsive

---

### Fase 10: Deployment (Día 22)

✅ **Tareas:**
1. Preparar producción
   - Build de producción: `npm run build`
   - Verificar variables de entorno

2. Deploy
   - Opciones: Vercel, Netlify, o servidor propio
   - Configurar variables de entorno en plataforma
   - Deploy

3. Verificación post-deploy
   - Probar login
   - Probar flujos principales
   - Verificar que Supabase conecta correctamente

**Entregables:**
- App deployada en producción
- URL pública funcionando

---

## Variables de Entorno

**`.env.local`**
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

---

## Comandos Importantes

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Preview build
npm run preview

# Type check
npx tsc --noEmit
```

---

## Dependencias Clave

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@supabase/supabase-js": "^2.38.0",
    "@tanstack/react-query": "^5.8.0",
    "zustand": "^4.4.0",
    "recharts": "^2.10.0",
    "react-hook-form": "^7.48.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## Archivos Críticos de Referencia

Los siguientes archivos HTML contienen los diseños completos que deben replicarse:

1. **Dashboard:** `/Users/efmenem/Desktop/Trabajo/ChipaApp/stitch_insumos_master_price_input/dashboard_-_sales_overview/code.html`
2. **Insumos:** `/Users/efmenem/Desktop/Trabajo/ChipaApp/stitch_insumos_master_price_input/insumos_-_master_price_input/code.html`
3. **Productos:** `/Users/efmenem/Desktop/Trabajo/ChipaApp/stitch_insumos_master_price_input/productos_-_product_list/code.html`
4. **Ventas:** `/Users/efmenem/Desktop/Trabajo/ChipaApp/stitch_insumos_master_price_input/ventas_-_record_sale/code.html`
5. **Costos Fijos:** `/Users/efmenem/Desktop/Trabajo/ChipaApp/stitch_insumos_master_price_input/costos_fijos_-_management/code.html`
6. **Reports:** `/Users/efmenem/Desktop/Trabajo/ChipaApp/stitch_insumos_master_price_input/reports_-_business_analytics/code.html`

---

## Métricas de Éxito

✅ Las 6 páginas completamente funcionales con datos reales
✅ Recalculación automática de costos al cambiar precios de insumos
✅ Registro de ventas con cálculos precisos de ganancia y margen
✅ Dashboard mostrando KPIs en tiempo real
✅ Autenticación Supabase funcional con datos por usuario
✅ 100% responsive (móvil y desktop)
✅ Modo oscuro funcional

---

## Decisiones del Usuario

✅ **Cuenta Supabase:** Ya existe
✅ **Enfoque:** Implementación paso a paso (fase por fase)

## Orden de Ejecución

Procederemos fase por fase:
1. **Fase 1-2** → Fundamentos + Supabase + Auth (primero)
2. Revisión y aprobación del usuario
3. **Fase 3** → Módulo Insumos
4. Revisión y aprobación del usuario
5. **Fase 4** → Módulo Productos
6. ... y así sucesivamente

## Próximo Paso Inmediato

**Iniciar Fase 1: Fundamentos**
- Crear proyecto Vite + React + TypeScript
- Instalar dependencias
- Configurar Tailwind
- Estructura de carpetas base
