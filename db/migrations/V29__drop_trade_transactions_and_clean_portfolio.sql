-- Drop trade_transactions table (trading system removed)
DROP TABLE IF EXISTS trade_transactions;

-- Clean up Alper's portfolio data
-- Matches by email (alper.yilmaz9@ogr.sakarya.edu.tr) or username (alperrry)
DO $$
DECLARE
    target_user_id BIGINT;
BEGIN
    SELECT id INTO target_user_id
    FROM users
    WHERE email = 'alper.yilmaz9@ogr.sakarya.edu.tr'
       OR username = 'alperrry'
    LIMIT 1;

    IF target_user_id IS NOT NULL THEN
        DELETE FROM manual_positions
        WHERE portfolio_id IN (
            SELECT id FROM portfolios WHERE user_id = target_user_id
        );

        DELETE FROM portfolio_items
        WHERE portfolio_id IN (
            SELECT id FROM portfolios WHERE user_id = target_user_id
        );

        DELETE FROM portfolios WHERE user_id = target_user_id;
    END IF;
END $$;
