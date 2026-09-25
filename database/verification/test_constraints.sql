BEGIN;

DO
$$
    DECLARE
        v_department_id BIGINT;
        v_position_id   BIGINT;
        v_user_id       BIGINT;
        v_product_id    BIGINT;
        v_forecast_id   BIGINT;

        v_failed BOOLEAN;
    BEGIN

        -- =====================================================
        -- TEST FIXTURES
        -- =====================================================

        INSERT INTO departments (
            name
        )
        VALUES (
                   '__KP14_TEST_DEPARTMENT__'
               )
        RETURNING id
            INTO v_department_id;


        INSERT INTO positions (
            department_id,
            name
        )
        VALUES (
                   v_department_id,
                   '__KP14_TEST_POSITION__'
               )
        RETURNING id
            INTO v_position_id;


        INSERT INTO users (
            name,
            email,
            password_hash,
            role,
            status,
            position_id
        )
        VALUES (
                   '__KP14_TEST_USER__',
                   '__kp14_test_user__@example.com',
                   'TEST_HASH',
                   'USER',
                   'ACTIVE',
                   v_position_id
               )
        RETURNING id
            INTO v_user_id;


        INSERT INTO products (
            sku,
            name
        )
        VALUES (
                   '__KP14_TEST_SKU__',
                   '__KP14_TEST_PRODUCT__'
               )
        RETURNING id
            INTO v_product_id;


        INSERT INTO sales (
            product_id,
            sale_date,
            quantity
        )
        VALUES (
                   v_product_id,
                   DATE '2099-01-01',
                   10
               );


        INSERT INTO forecasts (
            user_id,
            product_id,
            forecast_horizon,
            model_version,
            status
        )
        VALUES (
                   v_user_id,
                   v_product_id,
                   7,
                   '__KP14_TEST_MODEL__',
                   'COMPLETED'
               )
        RETURNING id
            INTO v_forecast_id;


        -- =====================================================
        -- TEST 1
        -- Blank Department name must fail
        -- =====================================================

        v_failed := FALSE;

        BEGIN
            INSERT INTO departments (name)
            VALUES ('   ');
        EXCEPTION
            WHEN check_violation THEN
                v_failed := TRUE;
        END;

        IF NOT v_failed THEN
            RAISE EXCEPTION
                'FAIL: blank department name was accepted';
        END IF;

        RAISE NOTICE
            'PASS: blank department name rejected';


        -- =====================================================
        -- TEST 2
        -- Department uniqueness must be case-insensitive
        -- =====================================================

        v_failed := FALSE;

        BEGIN
            INSERT INTO departments (name)
            VALUES ('__kp14_test_department__');
        EXCEPTION
            WHEN unique_violation THEN
                v_failed := TRUE;
        END;

        IF NOT v_failed THEN
            RAISE EXCEPTION
                'FAIL: duplicate department name was accepted';
        END IF;

        RAISE NOTICE
            'PASS: case-insensitive duplicate department rejected';


        -- =====================================================
        -- TEST 3
        -- Position without Department must fail
        -- =====================================================

        v_failed := FALSE;

        BEGIN
            INSERT INTO positions (
                department_id,
                name
            )
            VALUES (
                       NULL,
                       '__INVALID_POSITION__'
                   );
        EXCEPTION
            WHEN not_null_violation THEN
                v_failed := TRUE;
        END;

        IF NOT v_failed THEN
            RAISE EXCEPTION
                'FAIL: position without department was accepted';
        END IF;

        RAISE NOTICE
            'PASS: position without department rejected';


        -- =====================================================
        -- TEST 4
        -- Unknown Department FK must fail
        -- =====================================================

        v_failed := FALSE;

        BEGIN
            INSERT INTO positions (
                department_id,
                name
            )
            VALUES (
                       9223372036854775807,
                       '__INVALID_POSITION_FK__'
                   );
        EXCEPTION
            WHEN foreign_key_violation THEN
                v_failed := TRUE;
        END;

        IF NOT v_failed THEN
            RAISE EXCEPTION
                'FAIL: invalid department FK was accepted';
        END IF;

        RAISE NOTICE
            'PASS: invalid department FK rejected';


        -- =====================================================
        -- TEST 5
        -- Invalid User role must fail
        -- =====================================================

        v_failed := FALSE;

        BEGIN
            INSERT INTO users (
                name,
                email,
                password_hash,
                role,
                status
            )
            VALUES (
                       '__INVALID_ROLE_USER__',
                       '__invalid_role__@example.com',
                       'TEST_HASH',
                       'SUPER_ADMIN',
                       'ACTIVE'
                   );
        EXCEPTION
            WHEN check_violation THEN
                v_failed := TRUE;
        END;

        IF NOT v_failed THEN
            RAISE EXCEPTION
                'FAIL: invalid role was accepted';
        END IF;

        RAISE NOTICE
            'PASS: invalid user role rejected';


        -- =====================================================
        -- TEST 6
        -- BLOCKED without blocked_at must fail
        -- =====================================================

        v_failed := FALSE;

        BEGIN
            INSERT INTO users (
                name,
                email,
                password_hash,
                role,
                status,
                blocked_at
            )
            VALUES (
                       '__INVALID_BLOCKED_USER__',
                       '__invalid_blocked__@example.com',
                       'TEST_HASH',
                       'USER',
                       'BLOCKED',
                       NULL
                   );
        EXCEPTION
            WHEN check_violation THEN
                v_failed := TRUE;
        END;

        IF NOT v_failed THEN
            RAISE EXCEPTION
                'FAIL: BLOCKED user without blocked_at was accepted';
        END IF;

        RAISE NOTICE
            'PASS: invalid BLOCKED state rejected';


        -- =====================================================
        -- TEST 7
        -- Negative Sale quantity must fail
        -- =====================================================

        v_failed := FALSE;

        BEGIN
            INSERT INTO sales (
                product_id,
                sale_date,
                quantity
            )
            VALUES (
                       v_product_id,
                       DATE '2099-01-02',
                       -1
                   );
        EXCEPTION
            WHEN check_violation THEN
                v_failed := TRUE;
        END;

        IF NOT v_failed THEN
            RAISE EXCEPTION
                'FAIL: negative sale quantity was accepted';
        END IF;

        RAISE NOTICE
            'PASS: negative sale quantity rejected';


        -- =====================================================
        -- TEST 8
        -- Duplicate Product/date Sale must fail
        -- =====================================================

        v_failed := FALSE;

        BEGIN
            INSERT INTO sales (
                product_id,
                sale_date,
                quantity
            )
            VALUES (
                       v_product_id,
                       DATE '2099-01-01',
                       20
                   );
        EXCEPTION
            WHEN unique_violation THEN
                v_failed := TRUE;
        END;

        IF NOT v_failed THEN
            RAISE EXCEPTION
                'FAIL: duplicate product/date sale was accepted';
        END IF;

        RAISE NOTICE
            'PASS: duplicate product/date sale rejected';


        -- =====================================================
        -- TEST 9
        -- Forecast horizon <= 0 must fail
        -- =====================================================

        v_failed := FALSE;

        BEGIN
            INSERT INTO forecasts (
                user_id,
                product_id,
                forecast_horizon,
                model_version,
                status
            )
            VALUES (
                       v_user_id,
                       v_product_id,
                       0,
                       '__INVALID_MODEL__',
                       'PENDING'
                   );
        EXCEPTION
            WHEN check_violation THEN
                v_failed := TRUE;
        END;

        IF NOT v_failed THEN
            RAISE EXCEPTION
                'FAIL: forecast horizon = 0 was accepted';
        END IF;

        RAISE NOTICE
            'PASS: invalid forecast horizon rejected';


        -- =====================================================
        -- TEST 10
        -- Negative forecast value must fail
        -- =====================================================

        v_failed := FALSE;

        BEGIN
            INSERT INTO forecast_values (
                forecast_id,
                forecast_date,
                predicted_quantity
            )
            VALUES (
                       v_forecast_id,
                       DATE '2099-01-02',
                       -10.5000
                   );
        EXCEPTION
            WHEN check_violation THEN
                v_failed := TRUE;
        END;

        IF NOT v_failed THEN
            RAISE EXCEPTION
                'FAIL: negative forecast value was accepted';
        END IF;

        RAISE NOTICE
            'PASS: negative forecast value rejected';


        -- =====================================================
        -- TEST 11
        -- Duplicate Forecast/date must fail
        -- =====================================================

        INSERT INTO forecast_values (
            forecast_id,
            forecast_date,
            predicted_quantity
        )
        VALUES (
                   v_forecast_id,
                   DATE '2099-01-03',
                   100.0000
               );

        v_failed := FALSE;

        BEGIN
            INSERT INTO forecast_values (
                forecast_id,
                forecast_date,
                predicted_quantity
            )
            VALUES (
                       v_forecast_id,
                       DATE '2099-01-03',
                       110.0000
                   );
        EXCEPTION
            WHEN unique_violation THEN
                v_failed := TRUE;
        END;

        IF NOT v_failed THEN
            RAISE EXCEPTION
                'FAIL: duplicate forecast/date value was accepted';
        END IF;

        RAISE NOTICE
            'PASS: duplicate forecast/date value rejected';


        RAISE NOTICE
            '=================================================';

        RAISE NOTICE
            'ALL KP-14 DATABASE CONSTRAINT TESTS PASSED';

        RAISE NOTICE
            '=================================================';

    END;
$$;

ROLLBACK;