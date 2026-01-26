import { useMemo } from 'react';

export interface ProfitCalculationResult {
  totalIncome: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
}

/**
 * Calculate profit metrics for a sale
 */
export function useProfitCalculation(
  quantity: number,
  price: number,
  costUnit: number
): ProfitCalculationResult {
  return useMemo(() => {
    const totalIncome = quantity * price;
    const totalCost = quantity * costUnit;
    const profit = totalIncome - totalCost;
    const profitMargin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalCost,
      profit,
      profitMargin,
    };
  }, [quantity, price, costUnit]);
}
