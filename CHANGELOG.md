# Changelog

All notable changes to Chipa Sales App will be documented in this file.

## [Unreleased]

### Added
- **Mis Gastos**: Nueva sección completa de control de gastos
  - Crear y reutilizar conceptos de gasto (Luz, Gas, Alquiler, etc.)
  - Registrar gastos con monto, fecha, método de pago (efectivo/transferencia/tarjeta/otro) y notas
  - Resumen mensual de gastos totales
  - Filtros por rango de fechas y concepto
  - Gráfico de tendencia (AreaChart) por concepto seleccionado
  - Creación inline de nuevos conceptos desde el formulario de gasto
  - CRUD completo: crear, editar, eliminar gastos
- Tablas `gasto_conceptos` y `gastos` en Supabase con RLS, índices y triggers
- Hooks de React Query: `useGastoConceptos`, `useGastos`, `useGastosTrend`, `useGastosMonthlyByConcepto`
- Mutations: `useCreateGastoConcepto`, `useCreateGasto`, `useUpdateGasto`, `useDeleteGasto`
- Cache invalidation centralizada para gastos (`invalidateGastosRelated`)
- Validación Zod: `gastoSchema`, `gastoConceptoSchema`
- Tipos: `PaymentMethod`, `GastoConcepto`, `Gasto`, `GastoWithConcepto`, `GastoTrendPoint`
- Ruta `/gastos` con lazy loading y error boundary
- Gastos en Sidebar (sección "Finanzas") y BottomNav (menú "Más")

### Changed
- **BottomNav**: safe-area iOS (`env(safe-area-inset-bottom)`), dot indicator en item activo, animación slide-up en menú "Más", feedback táctil `active:scale-95`
- **Sidebar**: navegación dividida en secciones "Operaciones" y "Finanzas" con headers
- **Layout**: animación fadeIn en contenido principal, padding safe-area lateral para iOS

### Security
- Fix vulnerabilidad `SECURITY DEFINER` en vista `insumos_with_stock` — recreada con `SECURITY INVOKER` para respetar políticas RLS

### Migration
- `supabase/migrations/20260211_gastos_and_security_fix.sql` — Aplicar con `supabase db push`
