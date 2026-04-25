import { useMemo } from 'react';
import { useAppConfig } from '../queries/useAppConfigQuery';
import { useInsumoLotesTotalCost } from '../queries/useInsumosQueries';
import { useVentasTotalCobradas } from '../queries/useVentasQueries';

export interface DineroDisponibleResult {
  totalCostosInsumos: number;
  deberiaTener: number;
  tengoEnMp: number;
  diferenciaMp: number;
  ingresosCobrados: number;
  ganancia: number;
  bufferPercentage: number;
  isPositiveMp: boolean;
  isPositiveGanancia: boolean;
  isLoading: boolean;
}

export function useDineroDisponible(): DineroDisponibleResult {
  const { data: config, isLoading: loadingConfig } = useAppConfig();
  const { data: totalCostos, isLoading: loadingCostos } = useInsumoLotesTotalCost();
  const { data: totalCobradas, isLoading: loadingCobradas } = useVentasTotalCobradas();

  const isLoading = loadingConfig || loadingCostos || loadingCobradas;

  return useMemo(() => {
    const bufferPercentage = config?.buffer_percentage ?? 15;
    const tengoEnMp = config?.mp_reserva_amount ?? 0;
    const totalCostosInsumos = totalCostos ?? 0;
    const ingresosCobrados = totalCobradas ?? 0;

    const deberiaTener = totalCostosInsumos * (1 + bufferPercentage / 100);
    const diferenciaMp = tengoEnMp - deberiaTener;
    const ganancia = ingresosCobrados - deberiaTener;

    return {
      totalCostosInsumos,
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
  }, [config, totalCostos, totalCobradas, isLoading]);
}
