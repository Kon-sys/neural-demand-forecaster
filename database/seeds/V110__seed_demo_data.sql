-- =========================================================
-- DEMO USERS
-- password_hash intentionally contains a non-authentication
-- placeholder. Real password hashing will be implemented
-- together with authentication in KP-16.
-- =========================================================

INSERT INTO users (
    name,
    email,
    password_hash,
    role,
    status,
    position_id
)
SELECT
    'Демо Аналитик',
    'analyst.demo@example.com',
    'DEMO_HASH_NOT_FOR_AUTH',
    'USER',
    'ACTIVE',
    p.id
FROM positions p
         JOIN departments d
              ON d.id = p.department_id
WHERE p.name = 'Data Analyst'
  AND d.name = 'Отдел аналитики'
  AND NOT EXISTS (
    SELECT 1
    FROM users u
    WHERE LOWER(BTRIM(u.email)) =
          LOWER(BTRIM('analyst.demo@example.com'))
);


INSERT INTO users (
    name,
    email,
    password_hash,
    role,
    status,
    position_id
)
SELECT
    'Демо Администратор',
    'admin.demo@example.com',
    'DEMO_HASH_NOT_FOR_AUTH',
    'ADMIN',
    'ACTIVE',
    p.id
FROM positions p
         JOIN departments d
              ON d.id = p.department_id
WHERE p.name = 'Senior Developer'
  AND d.name = 'Отдел разработки'
  AND NOT EXISTS (
    SELECT 1
    FROM users u
    WHERE LOWER(BTRIM(u.email)) =
          LOWER(BTRIM('admin.demo@example.com'))
);


-- =========================================================
-- DEMO PRODUCTS
-- =========================================================

INSERT INTO products (
    sku,
    name,
    category
)
VALUES
    (
        'NB-ASUS-001',
        'Ноутбук ASUS',
        'Ноутбуки'
    ),
    (
        'PH-SAMSUNG-001',
        'Смартфон Samsung',
        'Смартфоны'
    )
ON CONFLICT (sku) DO NOTHING;


-- =========================================================
-- DEMO SALES
-- =========================================================

INSERT INTO sales (
    product_id,
    sale_date,
    quantity
)
SELECT
    p.id,
    v.sale_date,
    v.quantity
FROM products p
         CROSS JOIN (
    VALUES
        (DATE '2026-09-13', 118),
        (DATE '2026-09-14', 121),
        (DATE '2026-09-15', 126),
        (DATE '2026-09-16', 120),
        (DATE '2026-09-17', 132),
        (DATE '2026-09-18', 137),
        (DATE '2026-09-19', 141)
) AS v(sale_date, quantity)
WHERE p.sku = 'NB-ASUS-001'
ON CONFLICT (product_id, sale_date)
    DO UPDATE SET
    quantity = EXCLUDED.quantity;


INSERT INTO sales (
    product_id,
    sale_date,
    quantity
)
SELECT
    p.id,
    v.sale_date,
    v.quantity
FROM products p
         CROSS JOIN (
    VALUES
        (DATE '2026-09-13', 84),
        (DATE '2026-09-14', 91),
        (DATE '2026-09-15', 89),
        (DATE '2026-09-16', 97),
        (DATE '2026-09-17', 102),
        (DATE '2026-09-18', 106),
        (DATE '2026-09-19', 110)
) AS v(sale_date, quantity)
WHERE p.sku = 'PH-SAMSUNG-001'
ON CONFLICT (product_id, sale_date)
    DO UPDATE SET
    quantity = EXCLUDED.quantity;


-- =========================================================
-- DEMO FORECAST
-- =========================================================

INSERT INTO forecasts (
    user_id,
    product_id,
    forecast_horizon,
    model_version,
    status,
    mae,
    rmse,
    mape,
    started_at,
    completed_at
)
SELECT
    u.id,
    p.id,
    7,
    'lstm-demo-1.0.0',
    'COMPLETED',
    5.420000,
    6.810000,
    4.370000,
    CURRENT_TIMESTAMP - INTERVAL '10 seconds',
    CURRENT_TIMESTAMP
FROM users u
         JOIN products p
              ON p.sku = 'NB-ASUS-001'
WHERE LOWER(BTRIM(u.email)) =
      LOWER(BTRIM('analyst.demo@example.com'))
  AND NOT EXISTS (
    SELECT 1
    FROM forecasts f
    WHERE f.user_id = u.id
      AND f.product_id = p.id
      AND f.model_version = 'lstm-demo-1.0.0'
);


-- =========================================================
-- DEMO FORECAST VALUES
-- =========================================================

INSERT INTO forecast_values (
    forecast_id,
    forecast_date,
    predicted_quantity
)
SELECT
    f.id,
    f.created_at::DATE + v.day_offset,
    v.predicted_quantity
FROM forecasts f
         JOIN users u
              ON u.id = f.user_id
         JOIN products p
              ON p.id = f.product_id
         CROSS JOIN (
    VALUES
        (1, 143.2100),
        (2, 146.7300),
        (3, 148.1200),
        (4, 151.8800),
        (5, 154.2400),
        (6, 157.6100),
        (7, 160.3300)
) AS v(day_offset, predicted_quantity)
WHERE LOWER(BTRIM(u.email)) =
      LOWER(BTRIM('analyst.demo@example.com'))
  AND p.sku = 'NB-ASUS-001'
  AND f.model_version = 'lstm-demo-1.0.0'
ON CONFLICT (forecast_id, forecast_date)
    DO UPDATE SET
    predicted_quantity = EXCLUDED.predicted_quantity;