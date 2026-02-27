-- Migration: Atomic create_venta_with_stock RPC
--
-- Problem: useCreateVenta in TypeScript makes 4+ sequential DB calls
-- (fetch stock → optional produce_producto → update stock → insert venta).
-- A partial failure leaves the DB in an inconsistent state
-- (e.g. stock deducted but no venta record created).
--
-- Solution: wrap the entire flow in a single PostgreSQL transaction via RPC.
-- The TypeScript client calls this one function instead of the multi-step chain.

CREATE OR REPLACE FUNCTION create_venta_with_stock(
  p_user_id             UUID,
  p_producto_id         UUID,
  p_producto_name       TEXT,
  p_quantity            INTEGER,
  p_price_sold          DECIMAL(10,2),
  p_cost_unit           DECIMAL(10,2),
  p_customer_name       TEXT            DEFAULT NULL,
  p_payment_status      TEXT            DEFAULT 'pagado',
  p_payment_destination TEXT            DEFAULT NULL,
  p_delivery_status     TEXT            DEFAULT 'entregado',
  p_sale_date           TIMESTAMPTZ     DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_finished_stock      INTEGER;
  v_quantity_to_produce INTEGER;
  v_uses_categorias     BOOLEAN;
  v_production_result   JSONB;
  v_venta_id            UUID;
  v_venta               JSONB;
BEGIN
  -- Lock the producto row for the duration of this transaction.
  -- Prevents two concurrent sales from both reading the same finished_stock
  -- and both thinking there is enough stock.
  SELECT finished_stock INTO v_finished_stock
  FROM productos
  WHERE id = p_producto_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado o no pertenece al usuario';
  END IF;

  -- Auto-produce if there is not enough finished stock
  IF COALESCE(v_finished_stock, 0) < p_quantity THEN

    -- Cannot auto-produce when the recipe uses categorias:
    -- the caller must manually choose which lots to consume.
    SELECT EXISTS(
      SELECT 1 FROM recipe_items
      WHERE producto_id = p_producto_id AND use_categorias = true
    ) INTO v_uses_categorias;

    IF v_uses_categorias THEN
      RAISE EXCEPTION 'Este producto usa ingredientes por categoría. Debes fabricarlo manualmente para elegir los lotes.';
    END IF;

    v_quantity_to_produce := p_quantity - COALESCE(v_finished_stock, 0);

    -- produce_producto runs inside this same transaction.
    -- If it fails (not enough insumos), the exception propagates and
    -- everything is rolled back automatically.
    SELECT produce_producto(
      p_producto_id := p_producto_id,
      p_quantity    := v_quantity_to_produce
    ) INTO v_production_result;

    IF v_production_result IS NULL OR NOT (v_production_result->>'success')::BOOLEAN THEN
      RAISE EXCEPTION '%', COALESCE(
        v_production_result->>'error',
        'No hay suficientes insumos para fabricar el producto'
      );
    END IF;

    -- Re-read finished_stock: produce_producto has updated it.
    SELECT finished_stock INTO v_finished_stock
    FROM productos
    WHERE id = p_producto_id;

  END IF;

  -- Deduct the sold quantity from finished_stock
  UPDATE productos
  SET finished_stock = COALESCE(v_finished_stock, 0) - p_quantity
  WHERE id = p_producto_id AND user_id = p_user_id;

  -- Insert the sale record
  INSERT INTO ventas (
    user_id,
    producto_id,
    producto_name,
    quantity,
    price_sold,
    cost_unit,
    customer_name,
    payment_status,
    payment_destination,
    delivery_status,
    sale_date
  ) VALUES (
    p_user_id,
    p_producto_id,
    p_producto_name,
    p_quantity,
    p_price_sold,
    p_cost_unit,
    p_customer_name,
    p_payment_status,
    p_payment_destination,
    p_delivery_status,
    p_sale_date
  )
  RETURNING id INTO v_venta_id;

  -- Return the full venta row (including computed columns) as JSONB
  SELECT row_to_json(v.*)::JSONB INTO v_venta
  FROM ventas v
  WHERE v.id = v_venta_id;

  RETURN v_venta;
END;
$$;

-- Grant execute permission to authenticated users (Supabase RLS users)
GRANT EXECUTE ON FUNCTION create_venta_with_stock(
  UUID, UUID, TEXT, INTEGER, DECIMAL(10,2), DECIMAL(10,2),
  TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
) TO authenticated;
