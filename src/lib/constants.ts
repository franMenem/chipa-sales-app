// Unit types for insumos
export const UNIT_TYPES = [
  { value: 'kg', label: 'Kilogramo (kg)' },
  { value: 'g', label: 'Gramo (g)' },
  { value: 'l', label: 'Litro (l)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'unit', label: 'Unidad' },
] as const;

// Frequency types for costos fijos
export const FREQUENCIES = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'annual', label: 'Anual' },
] as const;

// Date filter options
export const DATE_FILTERS = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Esta Semana' },
  { value: 'month', label: 'Este Mes' },
] as const;

// Payment methods for gastos
export const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'otro', label: 'Otro' },
] as const;

// Navigation routes
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  INSUMOS: '/insumos',
  CATEGORIAS: '/categorias',
  PRODUCTOS: '/productos',
  STOCK: '/stock',
  VENTAS: '/ventas',
  COSTOS_FIJOS: '/costos-fijos',
  GASTOS: '/gastos',
  DEUDAS: '/deudas',
  REPORTS: '/reports',
} as const;

// Toast duration in milliseconds
export const TOAST_DURATION = 3000;

// Numeric precision for floating point comparisons
export const FLOAT_PRECISION = 0.0001;
export const DISPLAY_PRECISION = 0.001;
export const QUANTITY_DECIMAL_PLACES = 4;

// Default business values
export const DEFAULT_MARGIN_PERCENTAGE = 50;
export const QUICK_PRODUCE_MARGIN_PERCENTAGE = 30;

// React Query cache durations (milliseconds)
export const STALE_TIME = {
  REALTIME: 1000 * 30,
  FREQUENT: 1000 * 60,
  STANDARD: 1000 * 60 * 2,
  MASTER_DATA: 1000 * 60 * 5,
  RARE: 1000 * 60 * 10,
} as const;

// Locale and currency
export const APP_LOCALE = 'es-AR' as const;
export const APP_CURRENCY = 'ARS' as const;
