import { useMemo } from 'react';
import { useAppConfig } from '../queries/useAppConfigQuery';
import { useInsumoLotesTotalCost } from '../queries/useInsumosQueries';
import { useVentasTotalCobradas, useVentasTotalCosto } from '../queries/useVentasQueries';

export interface DineroDisponibleResult {
  // Costo histórico total de todos los lotes comprados (consumidos + actuales)
  totalLotesComprados: number;
  // Costo basis de todas las ventas hechas (lo que tenés que reponer)
  totalCostoVentas: number;
  // Cuánto necesitás reponer = max(0, totalCostoVentas - totalLotesComprados) × buffer
  // Sólo es > 0 si vendiste más de lo que ya repusiste comprando lotes nuevos
  necesitoReponer: number;
  // Tengo en MP — manual, lo ingresa el usuario
  tengoEnMp: number;
  // Disponible = tengoEnMp - necesitoReponer
  disponible: number;
  // Ingresos cobrados (all time, payment_status = 'pagado')
  ingresosCobrados: number;
  // Ganancia = ingresos cobrados - costo basis de ventas (cost real de lo vendido)
  ganancia: number;
  bufferPercentage: number;
  isPositiveDisponible: boolean;
  isPositiveGanancia: boolean;
  isLoading: boolean;
}

export function useDineroDisponible(): DineroDisponibleResult {
  const { data: config, isLoading: loadingConfig } = useAppConfig();
  const { data: totalLotes, isLoading: loadingLotes } = useInsumoLotesTotalCost();
  const { data: totalCostoV, isLoading: loadingCostoV } = useVentasTotalCosto();
  const { data: totalCobradas, isLoading: loadingCobradas } = useVentasTotalCobradas();

  const isLoading = loadingConfig || loadingLotes || loadingCostoV || loadingCobradas;

  return useMemo(() => {
    const bufferPercentage = config?.buffer_percentage ?? 15;
    const tengoEnMp = config?.mp_reserva_amount ?? 0;
    const totalLotesComprados = totalLotes ?? 0;
    const totalCostoVentas = totalCostoV ?? 0;
    const ingresosCobrados = totalCobradas ?? 0;

    // Si vendiste más de lo que reponés con compras nuevas, te falta reponer la diferencia
    const obligacionPendiente = Math.max(0, totalCostoVentas - totalLotesComprados);
    const necesitoReponer = obligacionPendiente * (1 + bufferPercentage / 100);
    const disponible = tengoEnMp - necesitoReponer;
    const ganancia = ingresosCobrados - totalCostoVentas;

    return {
      totalLotesComprados,
      totalCostoVentas,
      necesitoReponer,
      tengoEnMp,
      disponible,
      ingresosCobrados,
      ganancia,
      bufferPercentage,
      isPositiveDisponible: disponible >= 0,
      isPositiveGanancia: ganancia >= 0,
      isLoading,
    };
  }, [config, totalLotes, totalCostoV, totalCobradas, isLoading]);
}
