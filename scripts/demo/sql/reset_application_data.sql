\set ON_ERROR_STOP on

BEGIN;

-- Forecasts and sales are regenerated from scratch for the demo environment.
DELETE FROM forecast_values;
DELETE FROM forecasts;
DELETE FROM sales;
DELETE FROM products;

-- Preserve real administrator accounts so the operator does not lose access.
-- Old demo accounts and all ordinary users are intentionally replaced.
UPDATE users
SET position_id = NULL
WHERE role = 'ADMIN'
  AND LOWER(BTRIM(email)) <> 'admin.demo@example.com'
  AND LOWER(BTRIM(email)) NOT LIKE '%@demo.demand.local';

DELETE FROM users
WHERE role <> 'ADMIN'
   OR LOWER(BTRIM(email)) = 'admin.demo@example.com'
   OR LOWER(BTRIM(email)) = 'analyst.demo@example.com'
   OR LOWER(BTRIM(email)) LIKE '%@demo.demand.local';

DELETE FROM positions;
DELETE FROM departments;

COMMIT;
