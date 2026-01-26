import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  salesToday: number;
  salesThisMonth: number;
  profitToday: number;
  profitThisMonth: number;
  costsToday: number;
  costsThisMonth: number;
  averageMargin: number;
}

interface TopProduct {
  producto_name: string;
  total_quantity: number;
  total_income: number;
  total_profit: number;
}

interface DailyProfit {
  date: string;
  profit: number;
  income: number;
  cost: number;
}

interface DateRangeFilters {
  startDate?: string;
  endDate?: string;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    staleTime: 1000 * 60, // 1 minute (frequently changing analytics data)
    refetchOnWindowFocus: true, // Refetch when window regains focus
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Get all ventas for today and this month
      const { data: ventas, error } = await supabase
        .from('ventas')
        .select('*')
        .eq('user_id', user.id)
        .gte('sale_date', monthStart);

      if (error) throw error;

      const today = ventas.filter((v) => v.sale_date >= todayStart);
      const thisMonth = ventas;

      const stats: DashboardStats = {
        salesToday: today.reduce((sum, v) => sum + v.total_income, 0),
        salesThisMonth: thisMonth.reduce((sum, v) => sum + v.total_income, 0),
        profitToday: today.reduce((sum, v) => sum + v.profit, 0),
        profitThisMonth: thisMonth.reduce((sum, v) => sum + v.profit, 0),
        costsToday: today.reduce((sum, v) => sum + v.total_cost, 0),
        costsThisMonth: thisMonth.reduce((sum, v) => sum + v.total_cost, 0),
        averageMargin:
          thisMonth.length > 0
            ? thisMonth.reduce((sum, v) => sum + v.profit_margin, 0) / thisMonth.length
            : 0,
      };

      return stats;
    },
  });
}

export function useTopProducts(limit: number = 5, filters?: DateRangeFilters) {
  return useQuery({
    queryKey: ['dashboard', 'top-products', limit, filters?.startDate, filters?.endDate],
    staleTime: 1000 * 60, // 1 minute (frequently changing analytics data)
    refetchOnWindowFocus: true, // Refetch when window regains focus
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      let query = supabase
        .from('ventas')
        .select('producto_name, quantity, total_income, profit')
        .eq('user_id', user.id);

      if (filters?.startDate) {
        query = query.gte('sale_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('sale_date', filters.endDate);
      }

      const { data: ventas, error } = await query;

      if (error) throw error;

      // Aggregate by producto_name
      const aggregated = ventas.reduce((acc, venta) => {
        const existing = acc.find((p) => p.producto_name === venta.producto_name);
        if (existing) {
          existing.total_quantity += venta.quantity;
          existing.total_income += venta.total_income;
          existing.total_profit += venta.profit;
        } else {
          acc.push({
            producto_name: venta.producto_name,
            total_quantity: venta.quantity,
            total_income: venta.total_income,
            total_profit: venta.profit,
          });
        }
        return acc;
      }, [] as TopProduct[]);

      // Sort by total_quantity and limit
      const sorted = aggregated
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, limit);

      return sorted;
    },
  });
}

export function useDailyProfitTrend(days: number = 30, filters?: DateRangeFilters) {
  return useQuery({
    queryKey: ['dashboard', 'daily-profit', days, filters?.startDate, filters?.endDate],
    staleTime: 1000 * 60, // 1 minute (frequently changing analytics data)
    refetchOnWindowFocus: true, // Refetch when window regains focus
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      let query = supabase
        .from('ventas')
        .select('sale_date, profit, total_income, total_cost')
        .eq('user_id', user.id)
        .order('sale_date', { ascending: true });

      if (filters?.startDate) {
        query = query.gte('sale_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('sale_date', filters.endDate);
      }
      if (!filters?.startDate && !filters?.endDate) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query = query.gte('sale_date', startDate.toISOString());
      }

      const { data: ventas, error } = await query;

      if (error) throw error;

      // Group by date
      const grouped = ventas.reduce((acc, venta) => {
        const date = venta.sale_date.split('T')[0];
        const existing = acc.find((d) => d.date === date);
        if (existing) {
          existing.profit += venta.profit;
          existing.income += venta.total_income;
          existing.cost += venta.total_cost;
        } else {
          acc.push({
            date,
            profit: venta.profit,
            income: venta.total_income,
            cost: venta.total_cost,
          });
        }
        return acc;
      }, [] as DailyProfit[]);

      return grouped;
    },
  });
}
