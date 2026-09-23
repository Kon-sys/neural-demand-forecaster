CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS users_update_updated_at
ON users;

CREATE TRIGGER users_update_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


DROP TRIGGER IF EXISTS departments_update_updated_at
ON departments;

CREATE TRIGGER departments_update_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


DROP TRIGGER IF EXISTS positions_update_updated_at
ON positions;

CREATE TRIGGER positions_update_updated_at
    BEFORE UPDATE ON positions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


DROP TRIGGER IF EXISTS products_update_updated_at
ON products;

CREATE TRIGGER products_update_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();