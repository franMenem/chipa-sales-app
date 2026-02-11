# Diagnóstico Completo - Chipa Sales App

**Fecha:** 2026-02-06
**Stack:** Vite + React 19 + TypeScript + Tailwind CSS + Supabase + TanStack React Query + Zustand
**Tipo:** PWA (Progressive Web App) - SPA con React Router v7

---

## Resumen Ejecutivo

| Área | Nota | Estado |
|------|------|--------|
| Arquitectura general | 7.5/10 | Buena base, necesita refinamiento |
| SOLID - Single Responsibility | 7/10 | God component decomposed, mejoras significativas |
| SOLID - Open/Closed | 7/10 | Componentes UI son extensibles |
| SOLID - Liskov Substitution | 8/10 | N/A en la mayoría, bien en tipos |
| SOLID - Interface Segregation | 6/10 | Hooks hacen demasiado |
| SOLID - Dependency Inversion | 7/10 | Supabase removido de componentes, ahora en hooks |
| Type Safety | 9/10 | Excelente, as any eliminados |
| DRY (No repetir código) | 7/10 | Auth pattern centralizado, constantes unificadas |
| Performance | 7/10 | Buen uso de memo/useMemo, falta optimización en queries |
| Error Handling | 6/10 | Inconsistente entre capas |
| Mantenibilidad | 8/10 | Componentes decomposed, arquitectura más limpia |

---

## FORTALEZAS

### 1. Componentes UI bien diseñados
Los componentes en `src/components/ui/` (Button, Card, Input, Select, Modal, etc.) son excelentes:
- Responsabilidad única
- Props bien tipadas con TypeScript
- Extensibles via props (className, variants)
- Accesibilidad: Modal tiene focus trap, ARIA labels, manejo de teclado

### 2. React Query bien configurado
- Stale times apropiados: 5min para datos maestros, 1min para transaccionales
- Cache invalidation centralizada en `src/utils/cacheInvalidation.ts`
- Buenas query keys con parámetros
- `refetchOnWindowFocus` deshabilitado globalmente (apropiado para esta app)

### 3. Buen sistema de tipos
- `src/lib/types.ts` (451 líneas) con interfaces bien definidas
- Jerarquía de tipos: `Insumo` → `InsumoWithStock` → `InsumoWithCategorias`
- Union types para estados: `'pagado' | 'debe'`, `'entregado' | 'no_entregado'`
- Zod schemas para validación de formularios

### 4. Separación de utilidades
- `src/utils/` contiene funciones puras y bien tipadas
- `calculations.ts`, `formatters.ts`, `dates.ts` son reutilizables
- `productionHelpers.ts` encapsula lógica LIFO compleja

### 5. Domain hooks (buen patrón)
- `useAvailableStock` - cálculo puro con useMemo
- `useProfitCalculation` - matemática de márgenes
- `useRecipeBuilder` - gestión de estado de recetas
Estos muestran el patrón correcto que debería replicarse.

### 6. Error Boundaries en múltiples niveles
- `ErrorBoundary.tsx` global
- `PageErrorBoundary.tsx` por página
- Cada ruta protegida envuelta en error boundary

### 7. PWA funcional
- Service worker con workbox
- Cache de Supabase con NetworkFirst strategy
- Manifest completo para instalación

### 8. Lazy loading de páginas
- Todas las páginas usan `React.lazy()` en App.tsx
- Suspense con fallback de loading

---

## DEBILIDADES

---

### CRÍTICO - Bugs activos

#### BUG-001: `calculateProductCost` retorna siempre 0
**STATUS: ✅ RESUELTO** - Changed `* 0` to `* (insumo.current_price_per_unit || 0)`, changed type from `Insumo[]` to `InsumoWithStock[]`, added guard for `use_categorias`

**Archivo:** `src/utils/calculations.ts:40`
```typescript
return total + item.quantity_in_base_units * 0; // ← Multiplica por 0!
```
Esta función está rota. Siempre retorna 0 sin importar los inputs.

#### BUG-002: Código muerto - Hooks duplicados sin usar
**STATUS: ✅ RESUELTO** - Deleted `useProductos.ts` and `useVentas.ts` files

**Archivos muertos (nadie los importa):**
- `src/hooks/useProductos.ts` (218 líneas)
- `src/hooks/useVentas.ts` (271 líneas)

**Archivos activos (los que realmente se usan):**
- `src/hooks/queries/useProductosQueries.ts`
- `src/hooks/mutations/useProductosMutations.ts`
- `src/hooks/queries/useVentasQueries.ts`
- `src/hooks/mutations/useVentasMutations.ts`

Los archivos muertos son versiones antiguas que no se limpiaron tras la refactorización.

---

### CRÍTICO - Violaciones de arquitectura

#### ARCH-001: Llamadas directas a Supabase en componentes
**STATUS: ✅ RESUELTO** - All 5 components refactored: ProduceProductoForm → hooks in `hooks/production/`, AdjustFinishedStockForm → `useAdjustFinishedStock` hook, AddStockForm → `useAddInsumoStock` hook, Productos.tsx → `fetchRecipeItems()` and `fetchLatestProductionHistory()` from `lib/queries.ts`, AppBar.tsx → `useAuth().signOut`

Violan la separación de concerns. Toda llamada a Supabase debe estar en hooks.

| Componente | Línea | Operación |
|---|---|---|
| `ProduceProductoForm.tsx` | Múltiples | Fetch de recetas, insumos, lotes |
| `AdjustFinishedStockForm.tsx` | ~35 | Update de finished_stock |
| `AddStockForm.tsx` | ~52 | Update de quantity |
| `Productos.tsx` (página) | ~41 | Fetch de recipe_items |
| `AppBar.tsx` | ~19 | signOut (debería usar useAuth) |

#### ARCH-002: ProduceProductoForm.tsx - God Component (1555 líneas)
**STATUS: ✅ RESUELTO** - Decomposed from 1555 → 441 lines across 9 files: `hooks/production/types.ts` (39 lines), `hooks/production/useRecipeWithLotes.ts` (171 lines), `hooks/production/useLotSelection.ts` (299 lines), `hooks/production/useCategoryInsumoSelection.ts` (130 lines), `components/forms/production/CategoryInsumoSelector.tsx` (137 lines), `components/forms/production/LotSelectionCard.tsx` (346 lines), `components/forms/production/LoteOrderAdvanced.tsx` (127 lines), `components/forms/production/ProductionCostSummary.tsx` (91 lines)

Este es el componente más problemático. Hace TODO:
- Carga recetas de la DB
- Gestiona selección de lotes
- Calcula costos
- Maneja selección de insumos por categoría
- Pricing dinámico
- Validación de selección de lotes
- Renderizado de UI compleja
- 7+ useState interdependientes

**Debería dividirse en:**
1. Hook: `useProduceRecipe()` - carga y lógica de recetas
2. Hook: `useLotSelection()` - estado de selección de lotes
3. Componente: `LotSelector` - UI de selección de lotes
4. Componente: `CategoryInsumoSelector` - selector por categoría
5. Hook: `useCostCalculator()` - cálculos de costo

#### ARCH-003: `as any` type assertions
**STATUS: ✅ RESUELTO** - Replaced with `InsumoWithStock` type and inline typed responses

**Archivos afectados:**
- `src/hooks/useInsumoLotes.ts:51` → `{ insumo: any }`
- `src/hooks/useInsumoLotes.ts:96` → `(data as any[])`

Debería definir tipos propios para estas respuestas.

---

### ALTO - Violaciones SOLID

#### SRP-001: Formularios que mezclan lógica de negocio con presentación

| Componente | Líneas | Problema |
|---|---|---|
| `ProduceProductoForm.tsx` | 1555 | God component, múltiples responsabilidades |
| `AddInsumoBatchForm.tsx` | 484 | Lógica de cálculo de precios + selección de categorías + UI |
| `VentaForm.tsx` | 463 | Gestión de estado compleja (8 useState) |
| `ProductoForm.tsx` | 412 | Recipe builder logic mezclada con form |
| `VentasList.tsx` | 345 | Sorting, filtering, cálculos + renderizado |
| `ProductosList.tsx` | 312 | Quick produce logic + filtering + virtualización |

#### SRP-002: Hooks que hacen demasiado
- `useProduction.ts` (219 líneas) - 3 mutaciones diferentes que deberían ser hooks separados
- `useCategorias.ts` (182 líneas) - 5 funciones exportadas
- `useDashboard.ts` (183 líneas) - Agregación client-side compleja

#### DI-001: Acoplamiento directo a Supabase
No hay capa de abstracción entre los hooks y Supabase. Si se quisiera cambiar de backend, habría que tocar TODOS los hooks. Debería existir una capa `src/services/` o `src/repositories/`.

---

### ALTO - Código duplicado (DRY violations)

#### DRY-001: Patrón de autenticación repetido 29 veces
**STATUS: ✅ RESUELTO** - Created `src/lib/auth.ts` with `getCurrentUser()` function, replaced 23 occurrences across 13 files

```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) throw new Error('No authenticated user');
```
Debería extraerse a `getCurrentUser()` utility.

#### DRY-002: Lógica de conversión de unidades duplicada
- `src/utils/calculations.ts:16` (función correcta)
- `src/components/forms/AddStockForm.tsx:43-49` (duplicada inline)
- `src/utils/productionHelpers.ts` (implícita en cálculos LIFO)

#### DRY-003: Filtro de lotes disponibles repetido 5+ veces
```typescript
.gte('quantity_remaining', 0.01) // ← Aparece en múltiples archivos
```

#### DRY-004: Mapeo de recipe items duplicado
El mismo patrón de mapping de recipe_items aparece en `useProductosMutations.ts` (create y update).

---

### MEDIO - Magic numbers y constantes faltantes
**STATUS: ✅ RESUELTO** - Added FLOAT_PRECISION, DISPLAY_PRECISION, QUANTITY_DECIMAL_PLACES, DEFAULT_MARGIN_PERCENTAGE, QUICK_PRODUCE_MARGIN_PERCENTAGE, STALE_TIME object, APP_LOCALE, APP_CURRENCY to constants.ts

| Valor | Ubicación | Debería ser |
|---|---|---|
| `1000` | calculations.ts, useAvailableStock.ts | `UNIT_CONVERSION_FACTOR` |
| `0.01` | productionHelpers.ts, ProduceProductoForm.tsx (x4) | `MIN_QUANTITY_THRESHOLD` |
| `0.0001` | productionHelpers.ts, ProduceProductoForm.tsx (x2) | `PRECISION_TOLERANCE` |
| `30` | useQuickProduce.ts, productionHelpers.ts | `DEFAULT_MARGIN_PERCENTAGE` |
| `4` (toFixed) | productionHelpers.ts, recipeCalculations.ts | `QUANTITY_DECIMAL_PLACES` |
| `1000*60*5` | useProductosQueries.ts, useProductos.ts | `STALE_TIME_MASTER` |
| `1000*60*2` | App.tsx | `STALE_TIME_DEFAULT` |
| `1000*60*1` | useVentasQueries.ts | `STALE_TIME_TRANSACTIONAL` |
| `255` | validators.ts (x3) | `MAX_STRING_LENGTH` |
| `6` | validators.ts (x2) | `MIN_PASSWORD_LENGTH` |
| `50` | ProductosList.tsx | `VIRTUALIZATION_THRESHOLD` |
| `100` | useProduction.ts | `PRODUCTION_HISTORY_LIMIT` |

---

### MEDIO - Error handling inconsistente

| Patrón | Dónde | Problema |
|---|---|---|
| `try-catch + toast` | Mutations en hooks | Correcto |
| `throw error` | Queries en hooks | Correcto |
| `console.error` | productionHelpers.ts | Sin logging real |
| Sin error handling | Dashboard.tsx | No maneja query errors |
| Sin error handling | Reports.tsx | No muestra loading ni errors |
| `window.confirm` | Categorias.tsx | Debería usar modal propio |

---

### MEDIO - Lógica de negocio en páginas

| Página | Problema |
|---|---|
| `Reports.tsx` | Cálculos de inversión mensual y balance (líneas 56-79) |
| `Stock.tsx` | Cálculos de estado de stock y sorting (líneas 46-54) |
| `CostosFijos.tsx` | Form modal inline (~50 líneas) en vez de componente separado |
| `Productos.tsx` | Fetch directo a Supabase en handleEdit |

---

### BAJO - Mejoras de calidad

#### Locale inconsistente
**STATUS: ✅ RESUELTO** - All formatters now use APP_LOCALE ('es-AR') and APP_CURRENCY ('ARS') from constants.ts

- `formatCurrency` usa `'es-AR'` (Argentina)
- `formatNumber` usa `'es-PY'` (Paraguay)
- `formatDate` usa `'es-PY'`
- `dates.ts` usa `es` de date-fns

Debería unificarse en una constante `APP_LOCALE`.

#### Enum values hardcodeados en validators
```typescript
// validators.ts
z.enum(['kg', 'l', 'unit', 'g', 'ml']) // Hardcoded, debería venir de constants
```

#### Toast en hooks = acoplamiento a UI
Los hooks de mutations llaman directamente a `useToast()`. Esto acopla la capa de datos a la capa de UI. Patrón alternativo: devolver resultado y que el componente muestre el toast.

#### Falta tests
No se encontraron archivos de test en todo el proyecto. Las utilidades puras (`calculations.ts`, `formatters.ts`, `recipeCalculations.ts`, `productionHelpers.ts`) son candidatas ideales para unit testing.

---

## Métricas del código

### Archivos más grandes (señales de refactoring)
| Archivo | Líneas | Acción sugerida |
|---|---|---|
| `ProduceProductoForm.tsx` | 1555 | Dividir en 5+ archivos |
| `AddInsumoBatchForm.tsx` | 484 | Dividir en 3 componentes |
| `VentaForm.tsx` | 463 | Extraer lógica a hooks |
| `lib/types.ts` | 451 | OK - es definiciones de tipos |
| `ProductoForm.tsx` | 412 | Extraer recipe builder |
| `VentasList.tsx` | 345 | Extraer sorting/filtering |
| `ProductosList.tsx` | 312 | Extraer quick produce logic |
| `useVentas.ts` | 271 | MUERTO - borrar |
| `InsumosList.tsx` | 247 | OK borderline |
| `useProductos.ts` | 218 | MUERTO - borrar |

### Distribución del código
```
Componentes UI:     11 archivos (~800 LOC) ← Excelente calidad
Formularios:        11 archivos (~4000 LOC) ← Necesitan refactoring
Listas:              3 archivos (~900 LOC) ← Aceptable
Layout:              6 archivos (~400 LOC) ← Excelente
Páginas:            11 archivos (~2500 LOC) ← Algunas necesitan limpieza
Hooks:              21 archivos (~3500 LOC) ← 2 muertos, varios grandes
Utils:               8 archivos (~800 LOC) ← Buena calidad (1 bug)
Lib:                 3 archivos (~520 LOC) ← Buena calidad
```

---

## Plan de mejora priorizado

### Fase 1: Limpieza inmediata (bajo riesgo, alto impacto)
1. Borrar archivos muertos: `hooks/useProductos.ts`, `hooks/useVentas.ts`
2. Arreglar bug `calculateProductCost` (multiplica por 0)
3. Eliminar `as any` en `useInsumoLotes.ts` (definir tipo propio)
4. Extraer `getCurrentUser()` utility (eliminar 29 duplicaciones)

### Fase 2: Constantes y configuración
5. Crear sección de constantes numéricas en `constants.ts`
6. Unificar locale a una constante `APP_LOCALE`
7. Mover stale times a constantes de configuración
8. Usar constantes de `UNIT_TYPES` en validators

### Fase 3: Extraer lógica de componentes
9. Mover llamadas Supabase de componentes a hooks
10. Crear `useAdjustFinishedStock()`, `useAddInsumoStock()`
11. Extraer CSV export de Reports.tsx a utility
12. Extraer CostoFijoForm como componente separado
13. Extraer lógica de Stock.tsx a hook

### Fase 4: Refactoring de ProduceProductoForm (el gordo)
14. Crear `useProduceRecipe()` hook
15. Crear `useLotSelection()` hook
16. Crear componente `LotSelector`
17. Crear componente `CategoryInsumoSelector`
18. Reducir ProduceProductoForm de 1555 a ~300 líneas

### Fase 5: Refinamiento
19. Dividir `useProduction.ts` en 3 hooks
20. Reducir AddInsumoBatchForm (extraer CategorySelector, PriceCalculator)
21. Extraer sorting/filtering de listas a hooks
22. Estandarizar error handling (crear patrón único)
23. Considerar capa de servicios/repositorios

### Fase 6: Testing y calidad
24. Unit tests para utilities (`calculations.ts`, `formatters.ts`, etc.)
25. Integration tests para hooks críticos
26. Agregar error handling faltante en Dashboard y Reports

---

## Reglas para desarrollo futuro

1. **Max 300 líneas por componente** - si crece más, dividir
2. **No Supabase en componentes** - solo en hooks
3. **No magic numbers** - todo a constants.ts
4. **Hooks de responsabilidad única** - queries y mutations separados
5. **Lógica de negocio en utils/hooks** - nunca en componentes o páginas
6. **Tipos estrictos** - nada de `any`, definir interfaces propias
7. **Error handling consistente** - try-catch + toast en mutations, error states en queries
8. **Imports desde subdirectorios** - usar `queries/` y `mutations/`, no hooks raíz
