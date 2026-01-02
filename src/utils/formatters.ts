/**
 * Formats a number as currency (Guaraníes)
 * @param amount - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Formats a number as a percentage
 * @param value - Number to format (e.g., 42.5)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "42.5%")
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formats a number with thousands separators
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('es-PY', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formats a date as a relative time string (e.g., "hace 2 horas", "ayer")
 * Uses Intl API for native relative time formatting
 * @param date - Date to format (string or Date object)
 * @returns Relative time string
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'ahora';
  } else if (diffMins < 60) {
    return `hace ${diffMins} min`;
  } else if (diffHours < 24) {
    return `hace ${diffHours}h`;
  } else if (diffDays === 1) {
    return 'ayer';
  } else if (diffDays < 7) {
    return `hace ${diffDays} días`;
  } else {
    return formatDate(d);
  }
}

/**
 * Formats a date as a short date string (e.g., "20 Dic 2024")
 * @param date - Date to format (string or Date object)
 * @returns Formatted date string
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-PY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Formats a date as a time string (e.g., "14:30")
 * @param date - Date to format (string or Date object)
 * @returns Formatted time string
 */
export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-PY', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Formats a date as a full date-time string (e.g., "20 Dic 2024, 14:30")
 * @param date - Date to format (string or Date object)
 * @returns Formatted date-time string
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-PY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
