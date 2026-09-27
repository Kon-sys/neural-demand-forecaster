\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE demo_sales_import (
    product_sku TEXT NOT NULL,
    sale_date DATE NOT NULL,
    quantity INTEGER NOT NULL
) ON COMMIT DROP;

\copy demo_sales_import(product_sku, sale_date, quantity) FROM '/tmp/demand_forecast_demo_sales.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM demo_sales_import
        GROUP BY product_sku, sale_date
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Demo CSV contains duplicate (product_sku, sale_date) rows';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM demo_sales_import s
        LEFT JOIN products p ON p.sku = s.product_sku
        WHERE p.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Demo CSV contains SKU values that are absent from products';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM demo_sales_import
        WHERE quantity < 0
    ) THEN
        RAISE EXCEPTION 'Demo CSV contains negative quantity';
    END IF;
END
$$;

INSERT INTO sales (product_id, sale_date, quantity)
SELECT p.id, s.sale_date, s.quantity
FROM demo_sales_import s
JOIN products p ON p.sku = s.product_sku
ORDER BY p.id, s.sale_date
ON CONFLICT (product_id, sale_date)
DO UPDATE SET quantity = EXCLUDED.quantity;

COMMIT;
