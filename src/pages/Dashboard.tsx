import { Layout } from '../components/layout/Layout';
import { KpiCard } from '../components/ui/KpiCard';
import { Card } from '../components/ui/Card';
import { ProfitLineChart } from '../components/charts/ProfitLineChart';
import { IncomeVsCostChart } from '../components/charts/IncomeVsCostChart';
import { useDashboardStats, useTopProducts, useDailyProfitTrend } from '../hooks/useDashboard';
import { formatCurrency } from '../utils/formatters';

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: topProducts, isLoading: productsLoading } = useTopProducts(5);
  const { data: profitTrend, isLoading: trendLoading } = useDailyProfitTrend(30);

  const isLoading = statsLoading || productsLoading || trendLoading;

  if (isLoading) {
    return (
      <Layout title="Dashboard" subtitle="Vista general">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Cargando dashboard...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard" subtitle="Vista general">
      <div className="p-4 space-y-6">
        {/* KPIs - Vertical Stack */}
        <div className="flex flex-col gap-3">
          <KpiCard
            label="Ventas hoy"
            value={formatCurrency(stats?.salesToday || 0)}
            icon="payments"
            iconColor="blue"
          />
          <KpiCard
            label="Ventas este mes"
            value={formatCurrency(stats?.salesThisMonth || 0)}
            icon="trending_up"
            iconColor="primary"
          />
          <KpiCard
            label="Ganancia hoy"
            value={formatCurrency(stats?.profitToday || 0)}
            icon="account_balance_wallet"
            iconColor="green"
          />
          <KpiCard
            label="Ganancia este mes"
            value={formatCurrency(stats?.profitThisMonth || 0)}
            icon="analytics"
            iconColor="green"
          />
          <KpiCard
            label="Margen promedio"
            value={`${(stats?.averageMargin || 0).toFixed(1)}%`}
            icon="percent"
            iconColor="orange"
          />
        </div>

        {/* Charts */}
        {profitTrend && profitTrend.length > 0 && (
          <>
            <Card>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                Tendencia de Ganancia (últimos 30 días)
              </h3>
              <ProfitLineChart data={profitTrend} />
            </Card>

            <Card>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                Ingresos vs Costos vs Ganancia
              </h3>
              <IncomeVsCostChart data={profitTrend} />
            </Card>
          </>
        )}

        {/* Top Products */}
        {topProducts && topProducts.length > 0 && (
          <Card>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
              Productos más vendidos
            </h3>
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div
                  key={product.producto_name}
                  className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                      <span className="text-sm font-bold text-primary">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 dark:text-white truncate">
                        {product.producto_name}
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {product.total_quantity} unidades vendidas
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(product.total_income)}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      +{formatCurrency(product.total_profit)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Empty State */}
        {(!profitTrend || profitTrend.length === 0) &&
          (!topProducts || topProducts.length === 0) && (
            <Card className="text-center py-12">
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-6xl mb-4">
                analytics
              </span>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                No hay datos aún
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                Comienza registrando ventas para ver estadísticas
              </p>
            </Card>
          )}
      </div>
    </Layout>
  );
}
