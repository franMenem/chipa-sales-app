# CLAUDE.md - Chipa Sales App

## Proyecto
App de gestión de ventas e inventario de chipas. PWA con Vite + React 19 + TypeScript + Tailwind CSS + Supabase.

## Stack
- **Framework:** Vite + React 19 (NO es Next.js)
- **Router:** React Router v7
- **State:** TanStack React Query (server state) + Zustand (client state)
- **Forms:** React Hook Form + Zod
- **Backend:** Supabase (Postgres + Auth + RLS)
- **Styling:** Tailwind CSS v4
- **Charts:** Recharts
- **Idioma/Locale:** Español Argentina (es-AR)
- **Moneda:** Pesos Argentinos (ARS)

## Estructura del proyecto
```
src/
├── components/
│   ├── ui/                 # Componentes reutilizables (Button, Card, Input, Modal, Select, etc.)
│   ├── forms/              # Formularios de cada entidad
│   │   ├── production/     # Sub-componentes del formulario de producción
│   │   └── GastoForm.tsx   # Formulario de gastos (con modal inline para crear conceptos)
│   ├── lists/              # Listas con filtering/sorting (VentasList)
│   ├── charts/             # Gráficos Recharts (IncomeVsCostChart, ProfitLineChart, GastosTrendChart)
│   └── layout/             # Layout, AppBar, Sidebar, BottomNav, ProtectedRoute
├── hooks/
│   ├── domain/             # Hooks de cálculos puros (useAvailableStock, useProfitCalculation, useRecipeBuilder)
│   ├── queries/            # React Query reads (useProductosQueries, useVentasQueries, useGastosQueries)
│   ├── mutations/          # React Query writes (useProductosMutations, useVentasMutations, useGastosMutations, useAdjustFinishedStock, useAddInsumoStock)
│   └── production/         # Hooks del formulario de producción (useRecipeWithLotes, useLotSelection, useCategoryInsumoSelection)
├── lib/                    # types.ts, constants.ts, supabase.ts, auth.ts, queries.ts
├── pages/                  # 12 páginas (Dashboard, Insumos, InsumoHistory, Categorias, Productos, ProductionHistory, Stock, Ventas, CostosFijos, Gastos, Reports, Login)
├── utils/                  # Funciones puras (calculations, formatters, validators, cacheInvalidation, dates, productionHelpers)
└── styles/                 # CSS global (index.css)
```

## Archivos clave
- `lib/auth.ts` - `getCurrentUser()` centralizado (NO usar `supabase.auth.getUser()` directamente)
- `lib/queries.ts` - Funciones imperativas de fetch (`fetchRecipeItems`, `fetchLatestProductionHistory`)
- `lib/constants.ts` - Constantes numéricas, stale times, locale, moneda, PAYMENT_METHODS, ROUTES
- `lib/types.ts` - Todos los tipos de entidades, formularios y Database schema para Supabase
- `hooks/production/types.ts` - Tipos compartidos del sistema de producción
- `utils/cacheInvalidation.ts` - Helpers centralizados para invalidar cache (invalidateProductionRelated, invalidateSalesRelated, invalidateInventoryRelated, invalidateGastosRelated, etc.)
- `utils/validators.ts` - Zod schemas para todos los formularios

## Navegación
- **Sidebar (desktop)**: Dividido en secciones "Operaciones" (Inicio, Insumos, Categorías, Recetas, Stock, Ventas) y "Finanzas" (Mis Gastos, Deudas, Costos Fijos, Reportes)
- **BottomNav (mobile)**: 4 items primarios (Inicio, Recetas, Stock, Ventas) + menú "Más" con el resto (Insumos, Categorías, Costos Fijos, Mis Gastos, Deudas, Reportes)
- Todas las rutas están en `lib/constants.ts` → `ROUTES`

## Tablas Supabase (RLS habilitado en todas)
- `insumos` - Materias primas
- `insumo_lotes` - Lotes/batches de insumos con LIFO pricing
- `categorias` - Categorías de insumos
- `productos` - Recetas de productos
- `recipe_items` - Ingredientes de cada receta (soporta modo categoría o insumo específico)
- `production_history` - Historial de fabricación
- `production_consumptions` - Detalle de consumos por producción
- `stock_fabricado` - Batches de producto terminado con costo, margen y precio
- `ventas` - Ventas con payment_status (pagado/debe) y delivery_status (entregado/no_entregado)
- `costos_fijos` - Gastos fijos recurrentes (monthly/weekly/annual)
- `gasto_conceptos` - Conceptos reutilizables de gastos (Luz, Gas, Alquiler, etc.)
- `gastos` - Registros individuales de gastos con monto, fecha, método de pago y notas
- `deudas` - Deudas con remaining_amount y status auto-calculados (GENERATED ALWAYS AS)
- `deuda_pagos` - Pagos individuales de deudas (trigger sincroniza paid_amount en deudas)
- **Vista** `insumos_with_stock` - Vista con SECURITY INVOKER (corregido de SECURITY DEFINER)

## Módulo Gastos (feature reciente)
- **Página**: `pages/Gastos.tsx` - Resumen mensual, filtros fecha/concepto, lista de gastos, gráfico tendencia
- **Form**: `components/forms/GastoForm.tsx` - Formulario con creación inline de conceptos nuevos via modal
- **Chart**: `components/charts/GastosTrendChart.tsx` - AreaChart de tendencia por concepto
- **Queries**: `hooks/queries/useGastosQueries.ts` - useGastoConceptos, useGastos (con filtros), useGastosTrend, useGastosMonthlyByConcepto
- **Mutations**: `hooks/mutations/useGastosMutations.ts` - useCreateGastoConcepto, useCreateGasto, useUpdateGasto, useDeleteGasto
- **Validación**: `gastoSchema` y `gastoConceptoSchema` en `utils/validators.ts`
- **Tipos**: PaymentMethod, GastoConcepto, Gasto, GastoWithConcepto, GastoTrendPoint, GastoFormData, GastoConceptoFormData en `lib/types.ts`
- **Migration**: `supabase/migrations/20260211_gastos_and_security_fix.sql`

## Módulo Deudas (feature reciente)
- **Página**: `pages/Deudas.tsx` - Resumen total/pagado/restante, filtro por estado, lista con barra de progreso, pagos expandibles
- **Forms**: `components/forms/DeudaForm.tsx` + `components/forms/DeudaPagoForm.tsx`
- **Queries**: `hooks/queries/useDeudasQueries.ts` - useDeudas (con filtro status), useDeudaPagos
- **Mutations**: `hooks/mutations/useDeudasMutations.ts` - useCreateDeuda, useUpdateDeuda, useDeleteDeuda, useCreateDeudaPago, useDeleteDeudaPago
- **Validación**: `deudaSchema` y `deudaPagoSchema` en `utils/validators.ts`
- **Tipos**: DeudaStatus, Deuda, DeudaPago, DeudaWithPagos, DeudaFormData, DeudaPagoFormData en `lib/types.ts`
- **Migration**: `supabase/migrations/20260213_deudas.sql`
- **DB**: remaining_amount y status son columnas GENERATED (auto-calculadas). Trigger `sync_deuda_paid_amount` actualiza paid_amount al insertar/borrar pagos.

## Pendiente
- (nada pendiente)

## Reglas de desarrollo (OBLIGATORIAS)

### Arquitectura
- **NUNCA llamar a Supabase directamente desde componentes o páginas.** Toda interacción con la DB va en hooks dentro de `hooks/queries/`, `hooks/mutations/`, o `hooks/production/`.
- **NUNCA usar `supabase.auth.getUser()` directamente.** Usar `getCurrentUser()` de `lib/auth.ts`.
- **Max 300 líneas por componente.** Si crece más, dividir en sub-componentes y/o extraer lógica a hooks.
- **Lógica de negocio va en `utils/` o `hooks/domain/`.** Los componentes solo renderizan.
- **Formularios:** React Hook Form + Zod para validación. Schemas en `utils/validators.ts`.

### Hooks
- Queries van en `hooks/queries/` - solo lectura
- Mutations van en `hooks/mutations/` - escritura con cache invalidation via `utils/cacheInvalidation.ts`
- Domain hooks van en `hooks/domain/` - cálculos puros sin side effects
- Production hooks van en `hooks/production/` - lógica del formulario de fabricación
- **NO crear hooks monolíticos.** Cada hook tiene una responsabilidad.

### TypeScript
- **Nunca usar `any`.** Definir interfaces propias.
- **Nunca usar `@ts-ignore` o `@ts-expect-error`.**
- Tipos de entidades van en `lib/types.ts`.
- Tipos de producción van en `hooks/production/types.ts`.
- Usar union types, no enums de TypeScript.

### Constantes
- Magic numbers van en `lib/constants.ts`.
- Stale times: usar `STALE_TIME.REALTIME`, `STALE_TIME.FREQUENT`, `STALE_TIME.STANDARD`, `STALE_TIME.MASTER_DATA`, `STALE_TIME.RARE`.
- Precisión numérica: usar `FLOAT_PRECISION`, `DISPLAY_PRECISION`, `QUANTITY_DECIMAL_PLACES`.
- Locale/moneda: usar `APP_LOCALE` y `APP_CURRENCY`.
- Unit types y validaciones deben referenciar las constantes, no hardcodear.

### Error Handling
- Mutations: try-catch + toast notification
- Queries: React Query maneja errores automáticamente, agregar UI de error en el componente
- Nunca silenciar errores con catch vacío

### Performance
- Usar `useMemo` para cálculos derivados costosos
- Usar `memo()` para componentes en listas
- Usar `useCallback` para handlers pasados como props
- Virtualizar listas de más de 50 items (`@tanstack/react-virtual`)

### iOS Safari / Mobile Touch (IMPORTANTE)
- **NUNCA usar `overflow-x: hidden` en `html` o `body`.** Usar `overflow-x: clip` en su lugar. `hidden` crea un scroll container en iOS Safari que interfiere con el procesamiento de touch events, causando que taps rápidos consecutivos dejen de registrarse.
- **NUNCA usar `document.addEventListener('touchstart', ...)` para cerrar menús.** Usar `pointerdown` que unifica touch+mouse sin las race conditions de touchstart en iOS Safari.
- **Evitar `active:scale-*` en elementos de navegación (Links, tabs).** Las CSS transforms durante navegación crean nuevas capas de compositor en iOS Safari. Usar `transition-colors` en su lugar de `transition-all`.
- **NO usar `WebkitTransform: 'translateZ(0)'` como hack de GPU.** En iOS Safari moderno es innecesario y puede causar stacking context issues.
- **NO poner `position: relative` en `body`.** Crea un stacking context innecesario que afecta z-index de elementos fixed en iOS.
- **Siempre agregar `onClick={closeHandler}` a Links dentro de menús popup**, además del cierre por route change, para garantizar cierre inmediato sin depender del useEffect.

## Comandos
```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción (tsc + vite)
npm run lint     # ESLint
npm run preview  # Preview del build
```
