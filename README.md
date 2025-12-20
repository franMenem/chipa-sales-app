# Chipa Sales App 🥐

Sistema de gestión completo para negocios de venta de productos alimenticios. Control de costos, precios, márgenes de ganancia y ventas de manera profesional y automatizada.

## Estado del Proyecto

### Fases Completadas

✅ **Fase 1: Fundamentos**
- Proyecto Vite + React + TypeScript inicializado
- Dependencias instaladas (React Router, Supabase, TanStack Query, Zustand, Recharts)
- Tailwind CSS configurado con tema personalizado
- Estructura de carpetas creada
- Tipos TypeScript definidos
- Utilidades de cálculo implementadas

✅ **Fase 2: Supabase + Autenticación**
- Cliente Supabase configurado con tipos TypeScript
- Migración SQL completa con todas las tablas y políticas RLS
- Sistema de autenticación (Login/Register)
- Rutas protegidas con ProtectedRoute
- Hook useAuth para gestión de sesión

✅ **Fase 3: Módulo Insumos**
- CRUD completo de insumos con validación Zod
- Conversión automática a unidades base (g, ml, unit)
- Búsqueda y filtrado en tiempo real
- UI responsive con estados de carga

✅ **Fase 4: Módulo Productos**
- CRUD de productos con recetas dinámicas
- Constructor de recetas (agregar/quitar insumos)
- Cálculo de costo unitario en tiempo real
- Precio sugerido según margen objetivo

✅ **Fase 5: Módulo Ventas**
- Registro de ventas con cálculos automáticos
- Snapshots de costos para historial preciso
- Filtros por fecha (hoy, semana, mes, custom)
- Resúmenes de ingresos, costos y ganancias

✅ **Fase 6: Módulo Costos Fijos**
- Gestión de gastos fijos (alquiler, servicios, etc.)
- Frecuencias: mensual, semanal, anual
- Conversión automática a equivalente mensual
- Resumen total mensual estimado

✅ **Fase 7: Dashboard**
- KPIs en tiempo real (ventas, ganancias, márgenes)
- Gráficos con Recharts (tendencias, comparativas)
- Top productos más vendidos
- Filtros temporales dinámicos

✅ **Fase 8: Reports**
- Analytics y ranking de productos
- Exportación a CSV
- Filtros por rango de fechas personalizados

✅ **Fase 9: Pulido y Optimización** (90% completada)
- Toggle Dark Mode con persistencia localStorage
- Error Boundaries para manejo robusto de errores
- Lazy Loading de rutas para mejor rendimiento
- Optimización con React Query cache
- Memoización de cálculos costosos

### Próximo Paso

⏳ **Fase 10: Deployment**
- Build de producción
- Deploy a Vercel/Netlify
- Verificación post-deploy

## Stack Tecnológico

- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Routing:** React Router DOM
- **Base de Datos:** Supabase (PostgreSQL)
- **State Management:** TanStack Query + Zustand
- **Estilos:** Tailwind CSS
- **Gráficos:** Recharts
- **Validación:** Zod + React Hook Form
- **Autenticación:** Supabase Auth

## Estructura del Proyecto

```
src/
├── lib/
│   ├── supabase.ts          # Cliente Supabase
│   ├── types.ts             # Tipos TypeScript globales
│   └── constants.ts         # Constantes de la app
├── hooks/                   # Custom React Hooks
├── components/              # Componentes React
│   ├── layout/             # Componentes de layout
│   ├── ui/                 # Componentes UI reutilizables
│   ├── charts/             # Componentes de gráficos
│   ├── forms/              # Formularios
│   └── lists/              # Listas de datos
├── pages/                   # Páginas de la aplicación
├── utils/                   # Utilidades
│   ├── calculations.ts     # Funciones de cálculo
│   ├── formatters.ts       # Formateo de datos
│   └── validators.ts       # Esquemas de validación
└── styles/                  # Estilos globales
```

## Configuración Inicial

### 1. Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto basado en `.env.example`:

```bash
cp .env.example .env
```

Luego configura tus credenciales de Supabase:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Iniciar Servidor de Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Comandos Disponibles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Type checking
npx tsc --noEmit
```

## Nuevas Características (Fase 9)

🌓 **Dark Mode**
- Toggle manual entre tema claro y oscuro
- Detección automática de preferencia del sistema
- Persistencia de preferencia en localStorage

🛡️ **Error Handling**
- Error Boundaries que capturan errores de React
- UI amigable para errores con opción de reintentar
- Logs detallados en consola para debugging

⚡ **Performance**
- Lazy loading de todas las páginas
- Code splitting automático
- Cache estratégico con React Query (5min stale time)
- Suspense con loading states elegantes

## Características Principales

✅ **Auto-recalculación:** Cambios en precios de insumos actualizan productos automáticamente
✅ **Márgenes personalizables:** Define tu ganancia objetivo y obtén precio sugerido
✅ **Historial completo:** Snapshots de costos para análisis histórico preciso
✅ **Multi-usuario:** Cada usuario ve solo sus datos (RLS)
✅ **Responsive:** Diseño móvil-first
✅ **Modo oscuro:** Soporte de tema claro/oscuro
✅ **Notificaciones:** Feedback instantáneo en cada acción

## Documentación

Para más detalles sobre la implementación completa, consulta el archivo:
```
../stitch_insumos_master_price_input/PLAN.md
```

## Licencia

Proyecto privado - Todos los derechos reservados
