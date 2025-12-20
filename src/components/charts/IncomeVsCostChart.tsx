import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

interface IncomeVsCostChartProps {
  data: Array<{
    date: string;
    income: number;
    cost: number;
    profit: number;
  }>;
}

export function IncomeVsCostChart({ data }: IncomeVsCostChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('es-PY', { month: 'short', day: 'numeric' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={formattedData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="date"
          stroke="#64748b"
          style={{ fontSize: '12px' }}
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
        <Legend />
        <Bar dataKey="income" fill="#3b82f6" name="Ingresos" />
        <Bar dataKey="cost" fill="#ef4444" name="Costos" />
        <Bar dataKey="profit" fill="#13ec5b" name="Ganancia" />
      </BarChart>
    </ResponsiveContainer>
  );
}
