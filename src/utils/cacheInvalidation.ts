import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';

/**
 * Invalidate all queries related to production operations
 * (producing productos, consuming insumos, updating stock)
 */
export async function invalidateProductionRelated(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['productos'], refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: ['insumos'], exact: false, refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: ['insumo-lotes'], exact: false, refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: ['production-history'], refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: ['stock-fabricado-totals'], refetchType: 'active' }),
  ]);
}

/**
 * Invalidate all queries related to sales operations
 * (creating/updating/deleting ventas)
 */
export async function invalidateSalesRelated(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['ventas'], exact: false, refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: ['productos'], refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'], exact: false, refetchType: 'active' }),
  ]);
}

/**
 * Invalidate all queries related to inventory operations
 * (updating insumos, adding lotes, managing stock)
 */
export async function invalidateInventoryRelated(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['insumos'], exact: false, refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: ['insumo-lotes'], exact: false, refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: ['productos'], refetchType: 'active' }),
  ]);
}

/**
 * Invalidate all queries related to productos
 * (used when productos are created/updated/deleted)
 */
export async function invalidateProductosRelated(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['productos'], refetchType: 'active' }),
  ]);
}

/**
 * Invalidate all queries related to categorias
 */
export async function invalidateCategoriasRelated(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['categorias'], exact: false, refetchType: 'active' }),
  ]);
}

/**
 * Invalidate all queries related to deudas
 * (used when deudas or deuda_pagos are created/updated/deleted)
 */
export async function invalidateDeudasRelated(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.deudas.all(), exact: false, refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: queryKeys.deudas.pagosAll(), exact: false, refetchType: 'active' }),
  ]);
}

/**
 * Invalidate all queries related to gastos
 * (used when gastos or gasto_conceptos are created/updated/deleted)
 */
export async function invalidateGastosRelated(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.gastos.all(), exact: false, refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: queryKeys.gastos.trendBase(), exact: false, refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: queryKeys.gastos.monthlyByConcepto(), refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'], exact: false, refetchType: 'active' }),
  ]);
}
