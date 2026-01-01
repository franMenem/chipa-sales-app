import { Layout } from '../components/layout/Layout';
import { KpiCard } from '../components/ui/KpiCard';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
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
        <div className="space-y-6">
          {/* KPIs Skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-32" />
                </div>
              </Card>
            ))}
          </div>

          {/* Charts Skeletons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <Card>
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-64 w-full" />
            </Card>
            <Card>
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-64 w-full" />
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard" subtitle="Vista general">
      <div className="space-y-6">
        {/* KPIs - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
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

        {/* Charts - Responsive Grid */}
        {profitTrend && profitTrend.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
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
          </div>
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
                      <p className="text-sm text-slate-700 dark:text-slate-300">
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
              <p className="text-slate-700 dark:text-slate-300">
                Comienza registrando ventas para ver estadísticas
              </p>
            </Card>
          )}
      </div>
    </Layout>
  );
}
