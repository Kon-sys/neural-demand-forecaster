CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER
    LANGUAGE plpgsql
AS
$$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


CREATE TRIGGER departments_set_updated_at
    BEFORE UPDATE
    ON departments
    FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


CREATE TRIGGER positions_set_updated_at
    BEFORE UPDATE
    ON positions
    FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE
    ON users
    FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


CREATE TRIGGER products_set_updated_at
    BEFORE UPDATE
    ON products
    FOR EACH ROW
EXECUTE FUNCTION set_updated_at();