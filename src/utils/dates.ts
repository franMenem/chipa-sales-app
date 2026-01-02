import { format, parseISO, startOfDay, endOfDay, subDays, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formatea una fecha en formato ISO a formato legible
 * @param date - Fecha en formato ISO string o Date
 * @returns Fecha formateada como "31/12/2024"
 */
export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd/MM/yyyy', { locale: es });
};

/**
 * Formatea una fecha con hora
 * @param date - Fecha en formato ISO string o Date
 * @returns Fecha formateada como "31/12/2024 15:30"
 */
export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: es });
};

/**
 * Obtiene el rango de fechas según el filtro especificado
 * @param filter - Tipo de filtro: 'today', 'week', 'month'
 * @returns Objeto con fechas de inicio y fin en formato ISO
 */
export const getDateRangeForFilter = (
  filter: 'today' | 'week' | 'month'
): { start: string; end: string } => {
  const now = new Date();

  switch (filter) {
    case 'today':
      return {
        start: startOfDay(now).toISOString(),
        end: endOfDay(now).toISOString(),
      };
    case 'week':
      return {
        start: subDays(now, 7).toISOString(),
        end: now.toISOString(),
      };
    case 'month':
      return {
        start: subMonths(now, 1).toISOString(),
        end: now.toISOString(),
      };
  }
};

/**
 * Obtiene la fecha actual en formato ISO para input type="date"
 * @returns Fecha en formato "YYYY-MM-DD"
 */
export const getTodayForInput = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

/**
 * Obtiene una fecha N días atrás en formato ISO para input type="date"
 * @param days - Número de días hacia atrás
 * @returns Fecha en formato "YYYY-MM-DD"
 */
export const getDaysAgoForInput = (days: number): string => {
  return format(subDays(new Date(), days), 'yyyy-MM-dd');
};

/**
 * Convierte una fecha ISO a formato para input type="date"
 * @param date - Fecha en formato ISO string
 * @returns Fecha en formato "YYYY-MM-DD"
 */
export const isoToInputDate = (date: string): string => {
  return format(parseISO(date), 'yyyy-MM-dd');
};
