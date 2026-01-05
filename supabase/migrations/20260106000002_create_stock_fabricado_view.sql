-- Create view for stock_fabricado with aggregated totals per product
CREATE OR REPLACE VIEW stock_fabricado_totals AS
SELECT
  sf.producto_id,
  sf.user_id,
  p.name AS producto_name,

  -- Total quantities
  SUM(sf.quantity_remaining) AS total_quantity_available,
  SUM(sf.quantity_fabricated) AS total_quantity_fabricated,

  -- Number of batches
  COUNT(*) AS total_batches,
  COUNT(*) FILTER (WHERE sf.quantity_remaining > 0) AS active_batches,

  -- Weighted averages (by quantity_remaining)
  COALESCE(
    SUM(sf.cost_unit * sf.quantity_remaining) / NULLIF(SUM(sf.quantity_remaining), 0),
    0
  ) AS avg_cost_unit,

  COALESCE(
    SUM(sf.price_sale * sf.quantity_remaining) / NULLIF(SUM(sf.quantity_remaining), 0),
    0
  ) AS avg_price_sale,

  COALESCE(
    SUM(sf.margin_percentage * sf.quantity_remaining) / NULLIF(SUM(sf.quantity_remaining), 0),
    0
  ) AS avg_margin_percentage,

  -- Most recent batch info (LIFO)
  (
    SELECT sf_lifo.cost_unit
    FROM stock_fabricado sf_lifo
    WHERE sf_lifo.producto_id = sf.producto_id
      AND sf_lifo.quantity_remaining > 0
    ORDER BY sf_lifo.production_date DESC, sf_lifo.created_at DESC
    LIMIT 1
  ) AS lifo_cost_unit,

  (
    SELECT sf_lifo.price_sale
    FROM stock_fabricado sf_lifo
    WHERE sf_lifo.producto_id = sf.producto_id
      AND sf_lifo.quantity_remaining > 0
    ORDER BY sf_lifo.production_date DESC, sf_lifo.created_at DESC
    LIMIT 1
  ) AS lifo_price_sale,

  (
    SELECT sf_lifo.margin_percentage
    FROM stock_fabricado sf_lifo
    WHERE sf_lifo.producto_id = sf.producto_id
      AND sf_lifo.quantity_remaining > 0
    ORDER BY sf_lifo.production_date DESC, sf_lifo.created_at DESC
    LIMIT 1
  ) AS lifo_margin_percentage,

  -- Latest production date
  MAX(sf.production_date) AS latest_production_date

FROM stock_fabricado sf
JOIN productos p ON sf.producto_id = p.id
GROUP BY sf.producto_id, sf.user_id, p.name;

COMMENT ON VIEW stock_fabricado_totals IS 'Aggregated view of manufactured stock per product with LIFO pricing and weighted averages';

-- Create detailed view with batch information
CREATE OR REPLACE VIEW stock_fabricado_with_details AS
SELECT
  sf.id,
  sf.user_id,
  sf.production_history_id,
  sf.producto_id,
  p.name AS producto_name,

  -- Quantities
  sf.quantity_fabricated,
  sf.quantity_remaining,
  sf.quantity_fabricated - sf.quantity_remaining AS quantity_sold,

  -- Financial
  sf.cost_unit,
  sf.margin_percentage,
  sf.price_sale,

  -- Calculated fields
  (sf.price_sale - sf.cost_unit) AS profit_per_unit,
  CASE
    WHEN sf.price_sale > 0 THEN
      ROUND(((sf.price_sale - sf.cost_unit) / sf.price_sale * 100)::NUMERIC, 2)
    ELSE 0
  END AS actual_margin_percentage,

  -- Total values
  sf.cost_unit * sf.quantity_remaining AS total_cost_remaining,
  sf.price_sale * sf.quantity_remaining AS total_value_remaining,
  (sf.price_sale - sf.cost_unit) * sf.quantity_remaining AS total_profit_potential,

  -- Dates
  sf.production_date,
  sf.created_at,
  sf.updated_at,

  -- Status
  CASE
    WHEN sf.quantity_remaining = 0 THEN 'sold_out'
    WHEN sf.quantity_remaining < sf.quantity_fabricated * 0.2 THEN 'low_stock'
    ELSE 'available'
  END AS stock_status

FROM stock_fabricado sf
JOIN productos p ON sf.producto_id = p.id;

COMMENT ON VIEW stock_fabricado_with_details IS 'Detailed view of manufactured stock batches with calculated metrics';
