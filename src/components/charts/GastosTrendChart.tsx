import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import type { GastoTrendPoint } from '../../lib/types';

interface GastosTrendChartProps {
  data: GastoTrendPoint[];
  conceptoName: string;
}

export function GastosTrendChart({ data, conceptoName }: GastosTrendChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('es-AR', { month: 'short', day: 'numeric' }),
  }));

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Tendencia: {conceptoName}
      </h3>
      <ResponsiveContainer width="100%" height={220} minHeight={180}>
        <AreaChart data={formattedData}>
          <defs>
            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#13ec5b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#13ec5b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
          <XAxis
            dataKey="date"
            stroke="#64748b"
            style={{ fontSize: '11px' }}
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
            }}
            formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#13ec5b"
            strokeWidth={2}
            fill="url(#colorAmount)"
            name="Monto"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
