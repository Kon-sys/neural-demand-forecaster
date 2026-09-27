\set ON_ERROR_STOP on

\echo '=== DEMO DATA COUNTS ==='
SELECT 'departments' AS entity, COUNT(*) AS rows FROM departments
UNION ALL SELECT 'positions', COUNT(*) FROM positions
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'sales', COUNT(*) FROM sales
UNION ALL SELECT 'forecasts', COUNT(*) FROM forecasts
UNION ALL SELECT 'forecast_values', COUNT(*) FROM forecast_values
ORDER BY entity;

\echo '=== USERS ==='
SELECT role, status, COUNT(*) AS users
FROM users
GROUP BY role, status
ORDER BY role, status;

\echo '=== SALES COVERAGE ==='
SELECT
    MIN(s.sale_date) AS date_from,
    MAX(s.sale_date) AS date_to,
    COUNT(DISTINCT s.product_id) AS products,
    COUNT(*) AS rows
FROM sales s;

\echo '=== CATEGORY COVERAGE ==='
SELECT
    p.category,
    COUNT(DISTINCT p.id) AS products,
    COUNT(s.id) AS sales_rows,
    ROUND(AVG(s.quantity)::numeric, 2) AS avg_daily_quantity
FROM products p
LEFT JOIN sales s ON s.product_id = p.id
GROUP BY p.category
ORDER BY p.category;

\echo '=== SERIES CONTINUITY ==='
WITH coverage AS (
    SELECT
        p.sku,
        MIN(s.sale_date) AS min_date,
        MAX(s.sale_date) AS max_date,
        COUNT(*) AS actual_days
    FROM products p
    JOIN sales s ON s.product_id = p.id
    GROUP BY p.sku
), checked AS (
    SELECT
        sku,
        actual_days,
        (max_date - min_date + 1) AS expected_days
    FROM coverage
)
SELECT
    COUNT(*) AS product_series,
    COUNT(*) FILTER (WHERE actual_days = expected_days) AS continuous_series,
    COUNT(*) FILTER (WHERE actual_days <> expected_days) AS series_with_gaps,
    MIN(actual_days) AS min_days,
    MAX(actual_days) AS max_days
FROM checked;
