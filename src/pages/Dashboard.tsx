import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

import { useDashboardStats } from '../hooks/useDashboard';
import { useNetProfit } from '../hooks/domain/useNetProfit';
import { useInsumos } from '../hooks/queries/useInsumosQueries';
import { useVentas } from '../hooks/queries/useVentasQueries';
import { formatCurrency } from '../utils/formatters';
import { queryKeys } from '../lib/queryKeys';
import { ROUTES } from '../lib/constants';
import { ReservaCard } from '../components/ui/ReservaCard';
import { GananciasCard } from '../components/ui/GananciasCard';

export function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: loadingStats } = useDashboardStats();
  const netProfit = useNetProfit();
  const { data: insumos } = useInsumos();
  const { data: dueVentas } = useVentas({ payment_status: 'debe' });

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.ventas.all(), exact: false }),
      queryClient.invalidateQueries({ queryKey: queryKeys.retiros.all(), exact: false }),
      queryClient.invalidateQueries({ queryKey: queryKeys.insumos.lotes(), exact: false }),
      queryClient.invalidateQueries({ queryKey: queryKeys.appConfig.all() }),
    ]);
  }, [queryClient]);

  // Insumos sin stock
  const insumosOutOfStock = useMemo(
    () => (insumos || []).filter((i) => i.total_stock <= 0),
    [insumos]
  );

  // Total pendiente de cobro
  const totalDue = useMemo(
    () => (dueVentas || []).reduce((sum, v) => sum + v.total_income, 0),
    [dueVentas]
  );
  const dueCount = dueVentas?.length || 0;

  if (loadingStats) {
    return (
      <Layout title="Inicio" subtitle="Resumen">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Inicio" subtitle="Resumen">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button variant="ghost" icon="refresh" size="sm" onClick={handleRefresh} />
        </div>

        {/* Hoy */}
        <Card>
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Hoy</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ventas</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(stats?.salesToday || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ganancia bruta</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(stats?.profitToday || 0)}
              </p>
            </div>
          </div>
        </Card>

        {/* Este mes — Ganancia Neta */}
        <Card>
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Este mes</h3>
          {netProfit.isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Ganancia bruta</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {formatCurrency(netProfit.grossProfit)}
                </span>
              </div>
              {netProfit.totalGastos > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Gastos</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    -{formatCurrency(netProfit.totalGastos)}
                  </span>
                </div>
              )}
              {netProfit.totalCostosFijos > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Costos fijos</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    -{formatCurrency(netProfit.totalCostosFijos)}
                  </span>
                </div>
              )}
              {netProfit.totalRetiros > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Retiros</span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">
                    -{formatCurrency(netProfit.totalRetiros)}
                  </span>
                </div>
              )}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">Ganancia neta</span>
                  <span className={`text-xl font-bold ${
                    netProfit.isPositive
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatCurrency(netProfit.netProfit)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Stock bajo */}
        {insumosOutOfStock.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-amber-500 text-[20px]">warning</span>
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                Sin stock ({insumosOutOfStock.length})
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {insumosOutOfStock.map((insumo) => (
                <span
                  key={insumo.id}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                >
                  {insumo.name}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Te deben */}
        {dueCount > 0 && (
          <Card>
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => navigate(ROUTES.VENTAS)}
              role="button"
              tabIndex={0}
              style={{ touchAction: 'manipulation' }}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-500 text-[20px]">account_balance_wallet</span>
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white">Te deben</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{dueCount} ventas pendientes</p>
                </div>
              </div>
              <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {formatCurrency(totalDue)}
              </span>
            </div>
          </Card>
        )}

        {/* Dinero disponible */}
        <ReservaCard />
        <GananciasCard />

        {/* Acciones rápidas */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="secondary"
            icon="point_of_sale"
            onClick={() => navigate(ROUTES.VENTAS)}
            className="flex-col gap-1 py-4"
          >
            Venta
          </Button>
          <Button
            variant="secondary"
            icon="manufacturing"
            onClick={() => navigate(ROUTES.STOCK)}
            className="flex-col gap-1 py-4"
          >
            Fabricar
          </Button>
          <Button
            variant="secondary"
            icon="receipt_long"
            onClick={() => navigate(ROUTES.GASTOS)}
            className="flex-col gap-1 py-4"
          >
            Gasto
          </Button>
        </div>
      </div>
    </Layout>
  );
}
