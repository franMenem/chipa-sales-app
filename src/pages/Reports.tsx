import { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { IncomeVsCostChart } from '../components/charts/IncomeVsCostChart';
import { useTopProducts, useDailyProfitTrend } from '../hooks/useDashboard';
import { formatCurrency } from '../utils/formatters';

export function Reports() {
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const { data: topProducts } = useTopProducts(10);
  const { data: profitTrend } = useDailyProfitTrend(30);

  const handleExportCSV = () => {
    if (!topProducts || !profitTrend) {
      alert('No hay datos para exportar');
      return;
    }

    // Prepare CSV content
    let csv = 'Reporte de Ventas\n\n';
    csv += 'Productos más vendidos\n';
    csv += 'Producto,Cantidad,Ingresos,Ganancia\n';

    topProducts.forEach((product) => {
      csv += `"${product.producto_name}",${product.total_quantity},${product.total_income},${product.total_profit}\n`;
    });

    csv += '\n\nTendencia Diaria\n';
    csv += 'Fecha,Ingresos,Costos,Ganancia\n';

    profitTrend.forEach((day) => {
      csv += `${day.date},${day.income},${day.cost},${day.profit}\n`;
    });

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalIncome = profitTrend?.reduce((sum, d) => sum + d.income, 0) || 0;
  const totalCost = profitTrend?.reduce((sum, d) => sum + d.cost, 0) || 0;
  const totalProfit = profitTrend?.reduce((sum, d) => sum + d.profit, 0) || 0;

  return (
    <Layout
      title="Reportes"
      subtitle="Analytics y estadísticas"
      headerAction={
        <Button icon="download" size="sm" onClick={handleExportCSV}>
          Exportar
        </Button>
      }
    >
      <div className="p-4 space-y-6">
        {/* Date Range Filter */}
        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
            Filtrar por rango de fechas
          </h3>
          <div className="flex flex-col gap-3">
            <Input
              label="Desde"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Hasta"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </Card>

        {/* Summary Metrics */}
        <div className="flex flex-col gap-3">
          <Card className="bg-blue-50 dark:bg-blue-950/30">
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
              Ingresos totales
            </p>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(totalIncome)}
            </p>
          </Card>
          <Card className="bg-red-50 dark:bg-red-950/30">
            <p className="text-xs text-red-600 dark:text-red-400 mb-1">
              Costos totales
            </p>
            <p className="text-xl font-bold text-red-700 dark:text-red-300">
              {formatCurrency(totalCost)}
            </p>
          </Card>
          <Card className="bg-green-50 dark:bg-green-950/30">
            <p className="text-xs text-green-600 dark:text-green-400 mb-1">
              Ganancia total
            </p>
            <p className="text-xl font-bold text-green-700 dark:text-green-300">
              {formatCurrency(totalProfit)}
            </p>
          </Card>
          <Card className="bg-primary/10 dark:bg-primary/20 border-2 border-primary/30">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary text-lg">
                account_balance
              </span>
              <p className="text-xs text-primary font-semibold">
                En Banco (Total Ventas)
              </p>
            </div>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(totalIncome)}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Dinero total recibido de las ventas
            </p>
          </Card>
        </div>

        {/* Chart */}
        {profitTrend && profitTrend.length > 0 && (
          <Card>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
              Análisis de Ingresos, Costos y Ganancias
            </h3>
            <IncomeVsCostChart data={profitTrend} />
          </Card>
        )}

        {/* Top Products Table */}
        {topProducts && topProducts.length > 0 && (
          <Card>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
              Ranking de Productos
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="text-left py-3 px-2 font-semibold text-slate-700 dark:text-slate-300">
                      #
                    </th>
                    <th className="text-left py-3 px-2 font-semibold text-slate-700 dark:text-slate-300">
                      Producto
                    </th>
                    <th className="text-right py-3 px-2 font-semibold text-slate-700 dark:text-slate-300">
                      Cantidad
                    </th>
                    <th className="text-right py-3 px-2 font-semibold text-slate-700 dark:text-slate-300">
                      Ingresos
                    </th>
                    <th className="text-right py-3 px-2 font-semibold text-slate-700 dark:text-slate-300">
                      Ganancia
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product, index) => (
                    <tr
                      key={product.producto_name}
                      className="border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {index + 1}
                        </div>
                      </td>
                      <td className="py-3 px-2 font-medium text-slate-900 dark:text-white">
                        {product.producto_name}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-600 dark:text-slate-400">
                        {product.total_quantity}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(product.total_income)}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(product.total_profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {(!topProducts || topProducts.length === 0) &&
          (!profitTrend || profitTrend.length === 0) && (
            <Card className="text-center py-12">
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-6xl mb-4">
                bar_chart
              </span>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                No hay datos para el reporte
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                Registra ventas para generar reportes y estadísticas
              </p>
            </Card>
          )}
      </div>
    </Layout>
  );
}
