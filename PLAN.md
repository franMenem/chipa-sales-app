# Feature Implementation Plan: Retiros + Ganancia Neta + Dashboard

**Overall Progress:** `0%`

## TLDR
El negocio familiar usa insumos y productos terminados para consumo personal, pero no hay forma de registrarlo. La ganancia que muestra la app es solo bruta (ventas - costo producción), nunca resta gastos ni costos fijos. El dashboard muestra Top 5 productos + categorías, que no aporta valor. Arreglamos las tres cosas en cadena: retiros → ganancia neta → dashboard nuevo.

## Critical Decisions
- **Retiros unificados**: Una sola tabla `retiros` cubre tanto insumos como productos terminados, usando `item_type` para distinguir
- **Motivos de retiro**: `'consumo_personal' | 'merma' | 'ajuste'` — cubre los 3 casos reales
- **Costo exacto en cada retiro**: base_unit_cost del lote (insumos) o cost_unit del stock_fabricado (productos)
- **Ganancia neta**: `Ganancia bruta - Gastos - Costos Fijos (mensualizado) - Retiros = Ganancia Neta`
- **Dashboard nuevo**: Reemplaza completamente el actual. Categorías se mueven a `/categorias`
- **RPCs atómicas**: Los retiros usan funciones RPC de Supabase para garantizar atomicidad (validar stock + descontar + insertar en una transacción)

## Tasks:

### Fase 1: Sistema de Retiros

- [ ] 🟥 **Step 1: Migration SQL — tabla `retiros` + RPCs**
  - [ ] 🟥 Crear `supabase/migrations/20260402_retiros.sql` con:
    - Tabla `retiros`: id (uuid PK), user_id (uuid FK auth.users), item_type (text CHECK 'insumo'|'producto'), item_id (uuid), item_name (text), lote_id (uuid nullable), quantity (numeric), cost_per_unit (numeric), total_cost (numeric GENERATED AS quantity * cost_per_unit), reason (text CHECK 'consumo_personal'|'merma'|'ajuste'), notes (text nullable), created_at (timestamptz)
    - RLS policies: SELECT/INSERT/UPDATE/DELETE solo para auth.uid() = user_id
    - Índice: (user_id, created_at DESC)
  - [ ] 🟥 RPC `create_retiro_insumo(p_insumo_id, p_lote_id, p_quantity, p_reason, p_notes)`: dentro de transacción valida quantity_remaining >= p_quantity en insumo_lotes, descuenta, inserta retiro con item_name del insumo y cost_per_unit = lote.base_unit_cost
  - [ ] 🟥 RPC `create_retiro_producto(p_producto_id, p_stock_fabricado_id, p_quantity, p_reason, p_notes)`: valida quantity_remaining >= p_quantity en stock_fabricado, descuenta, actualiza productos.finished_stock, inserta retiro con cost_per_unit = batch.cost_unit

- [ ] 🟥 **Step 2: Types, validators, constants, query keys**
  - [ ] 🟥 `lib/types.ts`: agregar RetiroItemType = 'insumo' | 'producto', RetiroReason = 'consumo_personal' | 'merma' | 'ajuste', interface Retiro, RetiroInsumoFormData, RetiroProductoFormData. Agregar tabla retiros al Database schema
  - [ ] 🟥 `lib/queryKeys.ts`: agregar sección retiros { all(), filtered(), monthlyTotal() }
  - [ ] 🟥 `utils/validators.ts`: agregar retiroInsumoSchema (lote_id uuid, quantity > 0, reason enum) y retiroProductoSchema (stock_fabricado_id uuid, quantity > 0, reason enum)
  - [ ] 🟥 `lib/constants.ts`: agregar RETIRO_REASONS = [{ value: 'consumo_personal', label: 'Consumo familiar' }, { value: 'merma', label: 'Merma / Desperdicio' }, { value: 'ajuste', label: 'Ajuste de inventario' }]

- [ ] 🟥 **Step 3: Hooks de retiros**
  - [ ] 🟥 `hooks/queries/useRetirosQueries.ts`: useRetiros(filters?: { startDate, endDate }), useRetirosMonthlyTotal() — suma total_cost del mes actual
  - [ ] 🟥 `hooks/mutations/useRetirosMutations.ts`: useCreateRetiroInsumo() llama RPC create_retiro_insumo, useCreateRetiroProducto() llama RPC create_retiro_producto. Ambos invalidan cache con invalidateRetirosRelated()
  - [ ] 🟥 `utils/cacheInvalidation.ts`: agregar invalidateRetirosRelated() que invalida retiros + insumos + insumo-lotes + stock-fabricado-totals + productos + dashboard

- [ ] 🟥 **Step 4: UI de retiros**
  - [ ] 🟥 `components/forms/RetiroInsumoForm.tsx`: modal con select insumo (solo activos con stock) → select lote (mostrando quantity_remaining y base_unit_cost) → input cantidad (max = quantity_remaining) → select motivo → notas opcional. React Hook Form + Zod
  - [ ] 🟥 `components/forms/RetiroProductoForm.tsx`: modal con select producto (solo con stock) → select batch stock_fabricado (mostrando quantity_remaining y cost_unit) → input cantidad → select motivo → notas
  - [ ] 🟥 Agregar botón "Descontar" en página Insumos que abre RetiroInsumoForm
  - [ ] 🟥 Agregar botón "Descontar" en página Stock que abre RetiroProductoForm

### Fase 2: Ganancia Neta

- [ ] 🟥 **Step 5: Hook useNetProfit**
  - [ ] 🟥 Crear `hooks/domain/useNetProfit.ts` que combina:
    - useDashboardStats() → grossProfit (profitThisMonth o profitToday)
    - useGastos({ startDate, endDate }) → suma amounts del período
    - useCostosFijos() → mensualizado con normalizeToMonthly() de calculations.ts
    - useRetirosMonthlyTotal() → total retiros del período
  - [ ] 🟥 Retorna: { grossProfit, totalGastos, totalCostosFijos, totalRetiros, netProfit, isPositive, isLoading }

### Fase 3: Dashboard Nuevo

- [ ] 🟥 **Step 6: Reescribir Dashboard**
  - [ ] 🟥 Reescribir `pages/Dashboard.tsx` con secciones:
    - **Hoy**: ventas del día ($) + ganancia bruta del día ($) — de useDashboardStats
    - **Este mes**: ingresos, gastos + costos fijos, retiros, **ganancia neta** (verde si positiva, rojo si negativa) — de useNetProfit('month')
    - **Stock bajo**: insumos con total_stock = 0 o bajo umbral — de useInsumos filtrado
    - **Te deben**: total $ pendiente + cantidad de ventas con payment_status='debe' — de useVentas filtrado
    - **Acciones rápidas**: 3 botones Link a /ventas, /stock, /gastos
  - [ ] 🟥 Eliminar todo código de categorías del Dashboard (imports, state, handlers, JSX de CategoriaForm)
  - [ ] 🟥 Si supera 300 líneas, extraer sub-componentes (DashboardFinancials, StockAlerts, PendingPayments)

- [ ] 🟥 **Step 7: Limpieza**
  - [ ] 🟥 Verificar que Categorias.tsx ya tiene CRUD completo (tiene create+edit+archive — ya verificado)
  - [ ] 🟥 Limpiar imports huérfanos del Dashboard viejo

- [ ] 🟥 **Step 8: Verificación final**
  - [ ] 🟥 `npm run build` pasa sin errores
  - [ ] 🟥 `npm run lint` pasa sin errores
  - [ ] 🟥 Probar Dashboard con datos y sin datos (empty states)
