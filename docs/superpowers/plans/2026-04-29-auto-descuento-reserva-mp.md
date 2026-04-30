# Auto-descuento Reserva MP al Registrar Insumos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuando el usuario registra/edita/elimina un lote de insumos, el costo se descuenta/ajusta/devuelve automáticamente en `mp_reserva_amount` (tabla `app_config`), manteniendo la ReservaCard siempre actualizada.

**Architecture:** Trigger Postgres `AFTER INSERT OR UPDATE OR DELETE` en `insumo_lotes` que actualiza `app_config.mp_reserva_amount` atómicamente. En el cliente, `invalidateInventoryRelated()` se extiende para invalidar también `app-config`, forzando el refetch de la ReservaCard.

**Tech Stack:** Supabase (Postgres 17, triggers PL/pgSQL), React 19, TanStack Query, TypeScript.

---

## File Map

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `supabase/migrations/2026XXXX_mp_reserva_trigger.sql` | Crear | Trigger + función PL/pgSQL que ajusta mp_reserva_amount |
| `src/utils/cacheInvalidation.ts` | Modificar línea ~34-39 | Agregar invalidación de `app-config` en `invalidateInventoryRelated` |

---

## Task 1: Migración Supabase — Trigger en `insumo_lotes`

**Files:**
- Create: `supabase/migrations/20260429_mp_reserva_trigger.sql`

### Contexto
- `insumo_lotes` tiene `price_per_unit` (numeric) y `quantity_purchased` (numeric) → costo del lote = `price_per_unit * quantity_purchased`
- `app_config` tiene `mp_reserva_amount` (numeric) con `user_id UNIQUE`
- Si no existe fila en `app_config` para ese usuario, el trigger no hace nada (UPDATE sin match = 0 rows, válido)
- Si `mp_reserva_amount` queda negativo es correcto: la UI lo muestra en rojo

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- supabase/migrations/20260429_mp_reserva_trigger.sql

CREATE OR REPLACE FUNCTION update_mp_reserva_on_lote_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  costo_nuevo numeric;
  costo_viejo numeric;
  delta       numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    costo_nuevo := NEW.price_per_unit * NEW.quantity_purchased;

    UPDATE app_config
    SET
      mp_reserva_amount    = mp_reserva_amount - costo_nuevo,
      mp_reserva_updated_at = now(),
      updated_at           = now()
    WHERE user_id = NEW.user_id;

  ELSIF TG_OP = 'UPDATE' THEN
    costo_nuevo := NEW.price_per_unit * NEW.quantity_purchased;
    costo_viejo := OLD.price_per_unit * OLD.quantity_purchased;
    delta       := costo_nuevo - costo_viejo;

    UPDATE app_config
    SET
      mp_reserva_amount    = mp_reserva_amount - delta,
      mp_reserva_updated_at = now(),
      updated_at           = now()
    WHERE user_id = NEW.user_id;

  ELSIF TG_OP = 'DELETE' THEN
    costo_viejo := OLD.price_per_unit * OLD.quantity_purchased;

    UPDATE app_config
    SET
      mp_reserva_amount    = mp_reserva_amount + costo_viejo,
      mp_reserva_updated_at = now(),
      updated_at           = now()
    WHERE user_id = OLD.user_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_mp_reserva_lote_change
  AFTER INSERT OR UPDATE OR DELETE ON insumo_lotes
  FOR EACH ROW
  EXECUTE FUNCTION update_mp_reserva_on_lote_change();
```

- [ ] **Step 2: Aplicar la migración vía Supabase MCP o CLI**

```bash
# Opción A — via CLI (si tiene supabase CLI configurado):
supabase db push

# Opción B — aplicar el SQL directamente desde el MCP tool:
# mcp__5805c448__apply_migration con project_id=povwqqxpgcitgkdgbbvb
```

- [ ] **Step 3: Verificar que el trigger existe**

Ejecutar en Supabase SQL Editor o via `execute_sql`:
```sql
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'insumo_lotes'
  AND trigger_schema = 'public';
```

Expected output — 3 filas (una por cada event):
```
trg_mp_reserva_lote_change | INSERT | AFTER
trg_mp_reserva_lote_change | UPDATE | AFTER
trg_mp_reserva_lote_change | DELETE | AFTER
```

- [ ] **Step 4: Test manual del trigger — INSERT**

```sql
-- Asumiendo que existe una fila en app_config para tu user_id
-- y que hay un insumo_id válido en insumo_lotes.
-- 1. Ver el valor actual:
SELECT mp_reserva_amount FROM app_config WHERE user_id = auth.uid();

-- 2. Insertar un lote de prueba ($1000 × 5 = $5000):
INSERT INTO insumo_lotes (user_id, insumo_id, quantity_purchased, quantity_remaining, price_per_unit, unit_type, base_unit_cost)
VALUES (auth.uid(), '<un-insumo_id-válido>', 5, 5, 1000, 'kg', 1);

-- 3. Verificar que mp_reserva_amount bajó $5000:
SELECT mp_reserva_amount FROM app_config WHERE user_id = auth.uid();
```

- [ ] **Step 5: Test manual del trigger — DELETE**

```sql
-- Borrar el lote de prueba (usar el id del INSERT anterior):
DELETE FROM insumo_lotes WHERE id = '<id-del-lote-de-prueba>';

-- Verificar que mp_reserva_amount volvió al valor original:
SELECT mp_reserva_amount FROM app_config WHERE user_id = auth.uid();
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260429_mp_reserva_trigger.sql
git commit -m "feat: trigger auto-descuento reserva MP al registrar/editar/eliminar lotes"
```

---

## Task 2: Cliente — Invalidar `app-config` en `invalidateInventoryRelated`

**Files:**
- Modify: `src/utils/cacheInvalidation.ts` (función `invalidateInventoryRelated`, líneas ~34-39)

### Contexto
- `useAddInsumoBatch`, `useUpdateInsumoBatch` y `useDeleteInsumoBatch` están en `src/hooks/useInsumoLotes.ts`
- Los tres llaman `queryClient.invalidateQueries({ queryKey: ['insumo-lotes'] })` directamente (sin usar `invalidateInventoryRelated`)
- Por eso la solución más segura es agregar la invalidación de `app-config` directamente en esos tres hooks, Y también en `invalidateInventoryRelated` para que cualquier otro path futuro también lo cubra

- [ ] **Step 1: Agregar `appConfig` a `invalidateInventoryRelated`**

Archivo: `src/utils/cacheInvalidation.ts`

Cambiar esto:
```typescript
export async function invalidateInventoryRelated(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['insumos'], exact: false, refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: ['insumo-lotes'], exact: false, refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: ['productos'], refetchType: 'active' }),
  ]);
}
```

Por esto:
```typescript
export async function invalidateInventoryRelated(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['insumos'], exact: false, refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: ['insumo-lotes'], exact: false, refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: ['productos'], refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: queryKeys.appConfig.all(), refetchType: 'active' }),
  ]);
}
```

- [ ] **Step 2: Agregar invalidación de `app-config` en `useAddInsumoBatch`**

Archivo: `src/hooks/useInsumoLotes.ts` — función `useAddInsumoBatch`, en `onSuccess`:

Cambiar:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['insumo-lotes'] });
  queryClient.invalidateQueries({ queryKey: ['insumos'] });
  toast.success('Compra registrada', 'El lote se agregó al inventario');
},
```

Por:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['insumo-lotes'] });
  queryClient.invalidateQueries({ queryKey: ['insumos'] });
  queryClient.invalidateQueries({ queryKey: queryKeys.appConfig.all() });
  toast.success('Compra registrada', 'El lote se agregó al inventario');
},
```

- [ ] **Step 3: Agregar invalidación de `app-config` en `useUpdateInsumoBatch`**

Archivo: `src/hooks/useInsumoLotes.ts` — función `useUpdateInsumoBatch`, en `onSuccess`:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['insumo-lotes'] });
  queryClient.invalidateQueries({ queryKey: ['insumos'] });
  queryClient.invalidateQueries({ queryKey: queryKeys.appConfig.all() });
  toast.success('Compra actualizada', 'Los cambios del lote se guardaron correctamente');
},
```

- [ ] **Step 4: Agregar invalidación de `app-config` en `useDeleteInsumoBatch`**

Archivo: `src/hooks/useInsumoLotes.ts` — función `useDeleteInsumoBatch`, en `onSuccess`:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['insumo-lotes'] });
  queryClient.invalidateQueries({ queryKey: ['insumos'] });
  queryClient.invalidateQueries({ queryKey: queryKeys.appConfig.all() });
  toast.success('Lote eliminado', 'El lote se eliminó del inventario');
},
```

- [ ] **Step 5: Verificar import de `queryKeys` en `useInsumoLotes.ts`**

El archivo `src/hooks/useInsumoLotes.ts` debe tener este import (agregar si no existe):
```typescript
import { queryKeys } from '../lib/queryKeys';
```

- [ ] **Step 6: Build para verificar que no hay errores TypeScript**

```bash
npm run build
```

Expected: `✓ built in X.XXs` sin errores.

- [ ] **Step 7: Test de integración manual**

1. Abrir la app en el browser
2. Ir a Dashboard → ver el valor actual de "Tengo en MP" en la ReservaCard
3. Ir a Insumos → registrar una compra nueva (ej: $10,000)
4. Volver al Dashboard → "Tengo en MP" debe haber bajado $10,000 automáticamente
5. Volver a Insumos → eliminar ese lote
6. Dashboard → "Tengo en MP" debe haber vuelto al valor original

- [ ] **Step 8: Commit final**

```bash
git add src/utils/cacheInvalidation.ts src/hooks/useInsumoLotes.ts
git commit -m "feat: invalidar app-config al modificar lotes para refrescar ReservaCard"
```

---

## Resumen de cambios

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260429_mp_reserva_trigger.sql` | Nuevo — trigger que descuenta/ajusta/devuelve mp_reserva_amount |
| `src/utils/cacheInvalidation.ts` | +1 línea en `invalidateInventoryRelated` |
| `src/hooks/useInsumoLotes.ts` | +1 línea en `onSuccess` de 3 funciones |

**Total: ~50 líneas de código nuevo.**

---

## Caveats

- Si el usuario nunca configuró su MP (no tiene fila en `app_config`), el trigger no hace nada — correcto por diseño.
- `mp_reserva_amount` puede quedar negativo — la UI ya lo muestra en rojo, es el comportamiento esperado.
- `SECURITY DEFINER` en la función del trigger es necesario para que tenga permisos de escribir en `app_config` bajo RLS.
