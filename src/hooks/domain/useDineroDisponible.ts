import { useMemo } from 'react';
import { useAppConfig } from '../queries/useAppConfigQuery';
import { useInsumoLotesTotalCost, useInsumoStockActualCost } from '../queries/useInsumosQueries';
import { useVentasTotalCobradas } from '../queries/useVentasQueries';

export interface DineroDisponibleResult {
  // Costo del stock que todavía tenés (quantity_remaining > 0)
  // Usado para: deberiaTener en ReservaCard
  costoStockActual: number;
  // Costo histórico total de todos los lotes (consumidos + actuales)
  // Usado para: ganancia en GananciasCard
  totalCostosHistoricos: number;
  // Cuánto deberías tener en MP = costoStockActual × (1 + buffer%)
  deberiaTener: number;
  tengoEnMp: number;
  diferenciaMp: number;
  ingresosCobrados: number;
  // Ganancia = ingresos cobrados - totalCostosHistoricos (incluye insumos consumidos)
  ganancia: number;
  bufferPercentage: number;
  isPositiveMp: boolean;
  isPositiveGanancia: boolean;
  isLoading: boolean;
}

export function useDineroDisponible(): DineroDisponibleResult {
  const { data: config, isLoading: loadingConfig } = useAppConfig();
  const { data: stockActual, isLoading: loadingStockActual } = useInsumoStockActualCost();
  const { data: totalHistorico, isLoading: loadingHistorico } = useInsumoLotesTotalCost();
  const { data: totalCobradas, isLoading: loadingCobradas } = useVentasTotalCobradas();

  const isLoading = loadingConfig || loadingStockActual || loadingHistorico || loadingCobradas;

  return useMemo(() => {
    const bufferPercentage = config?.buffer_percentage ?? 15;
    const tengoEnMp = config?.mp_reserva_amount ?? 0;
    const costoStockActual = stockActual ?? 0;
    const totalCostosHistoricos = totalHistorico ?? 0;
    const ingresosCobrados = totalCobradas ?? 0;

    const deberiaTener = costoStockActual * (1 + bufferPercentage / 100);
    const diferenciaMp = tengoEnMp - deberiaTener;
    const ganancia = ingresosCobrados - totalCostosHistoricos;

    return {
      costoStockActual,
      totalCostosHistoricos,
      deberiaTener,
      tengoEnMp,
      diferenciaMp,
      ingresosCobrados,
      ganancia,
      bufferPercentage,
      isPositiveMp: diferenciaMp >= 0,
      isPositiveGanancia: ganancia >= 0,
      isLoading,
    };
  }, [config, stockActual, totalHistorico, totalCobradas, isLoading]);
}
