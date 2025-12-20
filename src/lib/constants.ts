// Theme colors
export const COLORS = {
  primary: '#13ec5b',
  backgroundLight: '#f6f8f6',
  backgroundDark: '#102216',
  surfaceLight: '#ffffff',
  surfaceDark: '#1c2e24',
} as const;

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

// Navigation routes
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  INSUMOS: '/insumos',
  PRODUCTOS: '/productos',
  VENTAS: '/ventas',
  COSTOS_FIJOS: '/costos-fijos',
  REPORTS: '/reports',
} as const;

// Toast duration in milliseconds
export const TOAST_DURATION = 3000;
