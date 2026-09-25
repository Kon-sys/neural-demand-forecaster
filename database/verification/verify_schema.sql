-- =========================================================
-- 1. PostgreSQL
-- =========================================================

SELECT version();


-- =========================================================
-- 2. Проверка таблиц
-- =========================================================

SELECT
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;


-- =========================================================
-- 3. Подразделения
-- =========================================================

SELECT
    id,
    name,
    is_active,
    created_at,
    updated_at
FROM departments
ORDER BY id;


-- =========================================================
-- 4. Должности и подразделения
-- =========================================================

SELECT
    p.id,
    p.name AS position_name,
    d.id AS department_id,
    d.name AS department_name,
    p.is_active
FROM positions p
         JOIN departments d
              ON d.id = p.department_id
ORDER BY
    d.name,
    p.name;


-- =========================================================
-- 5. Пользователи
-- =========================================================

SELECT
    u.id,
    u.name,
    u.email,
    u.role,
    u.status,
    p.name AS position_name,
    d.name AS department_name
FROM users u
         LEFT JOIN positions p
                   ON p.id = u.position_id
         LEFT JOIN departments d
                   ON d.id = p.department_id
ORDER BY u.id;


-- =========================================================
-- 6. Товары
-- =========================================================

SELECT
    id,
    sku,
    name,
    category
FROM products
ORDER BY id;


-- =========================================================
-- 7. Продажи
-- =========================================================

SELECT
    s.id,
    p.sku,
    p.name AS product_name,
    s.sale_date,
    s.quantity
FROM sales s
         JOIN products p
              ON p.id = s.product_id
ORDER BY
    p.id,
    s.sale_date;


-- =========================================================
-- 8. Прогнозы
-- =========================================================

SELECT
    f.id,
    u.email AS created_by,
    p.sku,
    p.name AS product_name,
    f.forecast_horizon,
    f.model_version,
    f.status,
    f.mae,
    f.rmse,
    f.mape,
    f.created_at,
    f.started_at,
    f.completed_at
FROM forecasts f
         JOIN users u
              ON u.id = f.user_id
         JOIN products p
              ON p.id = f.product_id
ORDER BY f.created_at DESC;


-- =========================================================
-- 9. Значения прогнозов
-- =========================================================

SELECT
    fv.forecast_id,
    fv.forecast_date,
    fv.predicted_quantity
FROM forecast_values fv
ORDER BY
    fv.forecast_id,
    fv.forecast_date;


-- =========================================================
-- 10. Количество записей
-- =========================================================

SELECT
    (SELECT COUNT(*) FROM departments) AS departments_count,
    (SELECT COUNT(*) FROM positions) AS positions_count,
    (SELECT COUNT(*) FROM users) AS users_count,
    (SELECT COUNT(*) FROM products) AS products_count,
    (SELECT COUNT(*) FROM sales) AS sales_count,
    (SELECT COUNT(*) FROM forecasts) AS forecasts_count,
    (SELECT COUNT(*) FROM forecast_values) AS forecast_values_count;