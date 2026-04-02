/**
 * Central query key factory — single source of truth for React Query cache keys.
 * Use these instead of inline string arrays in useQuery / invalidateQueries calls.
 */
export const queryKeys = {
  dashboard: {
    all: () => ['dashboard'] as const,
  },
  ventas: {
    all: () => ['ventas'] as const,
  },
  insumos: {
    all: () => ['insumos'] as const,
    lotes: () => ['insumo-lotes'] as const,
  },
  productos: {
    all: () => ['productos'] as const,
  },
  stock: {
    fabricadoTotals: () => ['stock-fabricado-totals'] as const,
  },
  gastos: {
    all: () => ['gastos'] as const,
    filtered: (filters?: { startDate?: string; endDate?: string; concepto_id?: string }) =>
      ['gastos', filters] as const,
    trendBase: () => ['gastos-trend'] as const,
    trend: (conceptoId?: string) => ['gastos-trend', conceptoId] as const,
    monthlyByConcepto: () => ['gastos-monthly-by-concepto'] as const,
  },
  gastoConceptos: {
    all: () => ['gasto-conceptos'] as const,
  },
  deudas: {
    all: () => ['deudas'] as const,
    filtered: (status?: string) => ['deudas', status] as const,
    pagosAll: () => ['deuda-pagos'] as const,
    pagos: (deudaId?: string) => ['deuda-pagos', deudaId] as const,
  },
  retiros: {
    all: () => ['retiros'] as const,
    filtered: (filters?: { startDate?: string; endDate?: string }) =>
      ['retiros', filters] as const,
    monthlyTotal: () => ['retiros', 'monthly-total'] as const,
  },
};
