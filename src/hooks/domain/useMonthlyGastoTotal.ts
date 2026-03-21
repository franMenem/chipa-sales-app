import { useMemo } from 'react';
import type { GastoWithConcepto } from '../../lib/types';

/**
 * Calculates the total gastos amount for the current calendar month.
 */
export function useMonthlyGastoTotal(gastos: GastoWithConcepto[] | undefined): number {
  return useMemo(() => {
    if (!gastos) return 0;
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return gastos
      .filter((g) => g.payment_date >= firstDay && g.payment_date <= lastDay)
      .reduce((sum, g) => sum + g.amount, 0);
  }, [gastos]);
}
