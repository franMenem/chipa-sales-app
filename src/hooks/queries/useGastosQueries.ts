import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import type { GastoConcepto, GastoWithConcepto, GastoTrendPoint } from '../../lib/types';
import { STALE_TIME } from '../../lib/constants';

// Fetch all gasto conceptos for current user
export function useGastoConceptos() {
  return useQuery({
    queryKey: ['gasto-conceptos'],
    staleTime: STALE_TIME.MASTER_DATA,
    queryFn: async () => {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('gasto_conceptos')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as GastoConcepto[];
    },
  });
}

// Fetch gastos with optional date filters
export function useGastos(filters?: { startDate?: string; endDate?: string; concepto_id?: string }) {
  return useQuery({
    queryKey: ['gastos', filters],
    staleTime: STALE_TIME.FREQUENT,
    queryFn: async () => {
      const user = await getCurrentUser();

      let query = supabase
        .from('gastos')
        .select('*, gasto_conceptos(name)')
        .eq('user_id', user.id);

      // Apply filters
      if (filters?.startDate) {
        query = query.gte('payment_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('payment_date', filters.endDate);
      }
      if (filters?.concepto_id) {
        query = query.eq('concepto_id', filters.concepto_id);
      }

      query = query.order('payment_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Map results to include concepto_name
      return (data || []).map((gasto) => ({
        ...gasto,
        concepto_name: (gasto.gasto_conceptos as unknown as { name: string })?.name || '',
      })) as GastoWithConcepto[];
    },
  });
}

// Fetch gastos trend for a specific concepto (for charts)
export function useGastosTrend(conceptoId: string | undefined) {
  return useQuery({
    queryKey: ['gastos-trend', conceptoId],
    staleTime: STALE_TIME.STANDARD,
    enabled: !!conceptoId,
    queryFn: async () => {
      if (!conceptoId) throw new Error('Concepto ID es requerido');

      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('gastos')
        .select('payment_date, amount')
        .eq('concepto_id', conceptoId)
        .eq('user_id', user.id)
        .order('payment_date', { ascending: true });

      if (error) throw error;

      return (data || []).map((item) => ({
        date: item.payment_date,
        amount: item.amount,
      })) as GastoTrendPoint[];
    },
  });
}

// Fetch monthly totals per concepto (for overview chart)
export function useGastosMonthlyByConcepto() {
  return useQuery({
    queryKey: ['gastos-monthly-by-concepto'],
    staleTime: STALE_TIME.STANDARD,
    queryFn: async () => {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('gastos')
        .select('*, gasto_conceptos(name)')
        .eq('user_id', user.id)
        .order('payment_date', { ascending: true });

      if (error) throw error;

      // Group by concepto name and month
      const grouped = new Map<string, Map<string, number>>();

      (data || []).forEach((gasto) => {
        const conceptoName = (gasto.gasto_conceptos as unknown as { name: string })?.name || 'Sin concepto';
        const monthKey = gasto.payment_date.substring(0, 7); // YYYY-MM

        if (!grouped.has(conceptoName)) {
          grouped.set(conceptoName, new Map());
        }

        const conceptoMap = grouped.get(conceptoName)!;
        const currentAmount = conceptoMap.get(monthKey) || 0;
        conceptoMap.set(monthKey, currentAmount + gasto.amount);
      });

      // Convert to array format suitable for charts
      const result: Array<{ concepto: string; month: string; amount: number }> = [];

      grouped.forEach((monthMap, conceptoName) => {
        monthMap.forEach((amount, month) => {
          result.push({ concepto: conceptoName, month, amount });
        });
      });

      return result;
    },
  });
}
