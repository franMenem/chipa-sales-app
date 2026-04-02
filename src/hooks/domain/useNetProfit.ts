import { useMemo } from 'react';
import { useDashboardStats } from '../useDashboard';
import { useGastos } from '../queries/useGastosQueries';
import { useCostosFijos } from '../queries/useCostosFijosQueries';
import { useRetirosMonthlyTotal } from '../queries/useRetirosQueries';
import { normalizeToMonthly } from '../../utils/calculations';

interface NetProfitResult {
  grossProfit: number;
  totalGastos: number;
  totalCostosFijos: number;
  totalRetiros: number;
  netProfit: number;
  isPositive: boolean;
  isLoading: boolean;
}

export function useNetProfit(): NetProfitResult {
  const { data: stats, isLoading: loadingStats } = useDashboardStats();
  const { data: costosFijos, isLoading: loadingCostos } = useCostosFijos();
  const { data: retirosTotal, isLoading: loadingRetiros } = useRetirosMonthlyTotal();

  // Get gastos for current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const { data: gastos, isLoading: loadingGastos } = useGastos({
    startDate: monthStart,
    endDate: monthEnd,
  });

  const isLoading = loadingStats || loadingCostos || loadingRetiros || loadingGastos;

  return useMemo(() => {
    const grossProfit = stats?.profitThisMonth || 0;

    const totalGastos = (gastos || []).reduce((sum, g) => sum + g.amount, 0);

    const totalCostosFijos = (costosFijos || []).reduce(
      (sum, cf) => sum + normalizeToMonthly(cf.amount, cf.frequency),
      0
    );

    const totalRetiros = retirosTotal || 0;

    const netProfit = grossProfit - totalGastos - totalCostosFijos - totalRetiros;

    return {
      grossProfit,
      totalGastos,
      totalCostosFijos,
      totalRetiros,
      netProfit,
      isPositive: netProfit >= 0,
      isLoading,
    };
  }, [stats, gastos, costosFijos, retirosTotal, isLoading]);
}
