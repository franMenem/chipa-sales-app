import type { Insumo, RecipeItem, UnitType } from '../lib/types';

/**
 * Calculates the base unit cost for an insumo based on its unit type
 * - kg → price / 1000 (to get price per gram)
 * - l → price / 1000 (to get price per ml)
 * - unit → price (no conversion)
 */
export function calculateBaseUnitCost(
  pricePerUnit: number,
  unitType: UnitType
): number {
  switch (unitType) {
    case 'kg':
    case 'l':
      return pricePerUnit / 1000;
    case 'g':
    case 'ml':
    case 'unit':
      return pricePerUnit;
    default:
      return pricePerUnit;
  }
}

/**
 * Calculates the total cost of a product based on its recipe
 * @param recipeItems - Array of recipe items with quantities
 * @param insumos - Array of all available insumos
 * @returns Total cost of the product
 */
export function calculateProductCost(
  recipeItems: RecipeItem[],
  insumos: Insumo[]
): number {
  return recipeItems.reduce((total, item) => {
    const insumo = insumos.find((i) => i.id === item.insumo_id);
    if (!insumo) return total;

    return total + item.quantity_in_base_units * insumo.base_unit_cost;
  }, 0);
}

/**
 * Calculates the profit margin percentage
 * @param priceSale - Sale price
 * @param costUnit - Unit cost
 * @returns Profit margin as percentage
 */
export function calculateProfitMargin(
  priceSale: number,
  costUnit: number
): number {
  if (priceSale === 0) return 0;
  return ((priceSale - costUnit) / priceSale) * 100;
}

/**
 * Calculates the suggested sale price based on cost and margin goal
 * @param costUnit - Unit cost
 * @param marginGoal - Desired profit margin percentage
 * @returns Suggested sale price
 *
 * Formula: If margin goal is 40%, price = cost / (1 - 0.40) = cost / 0.60
 */
export function calculateSuggestedPrice(
  costUnit: number,
  marginGoal: number
): number {
  if (marginGoal >= 100 || marginGoal < 0) return costUnit;
  return costUnit / (1 - marginGoal / 100);
}

/**
 * Calculates profit from a sale
 * @param totalIncome - Total income from sale
 * @param totalCost - Total cost of sale
 * @returns Profit amount
 */
export function calculateProfit(
  totalIncome: number,
  totalCost: number
): number {
  return totalIncome - totalCost;
}

/**
 * Converts a monthly cost to an annual equivalent
 */
export function monthlyToAnnual(amount: number): number {
  return amount * 12;
}

/**
 * Converts a weekly cost to a monthly equivalent
 */
export function weeklyToMonthly(amount: number): number {
  return (amount * 52) / 12;
}

/**
 * Converts an annual cost to a monthly equivalent
 */
export function annualToMonthly(amount: number): number {
  return amount / 12;
}

/**
 * Normalizes all fixed costs to a monthly amount
 */
export function normalizeToMonthly(
  amount: number,
  frequency: 'monthly' | 'weekly' | 'annual'
): number {
  switch (frequency) {
    case 'weekly':
      return weeklyToMonthly(amount);
    case 'annual':
      return annualToMonthly(amount);
    case 'monthly':
    default:
      return amount;
  }
}
