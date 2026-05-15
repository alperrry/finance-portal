-- Local/dev maintenance only.
-- Clears fetched market data while keeping reference rows, users, portfolios, news, and audit logs.
-- After running this script, restart the backend with app.startup-tasks.enabled=true to trigger backfill/fetch jobs.

TRUNCATE TABLE
    stock_technical_indicator,
    stock_price_snapshot,
    stock_price_history,
    macro_observation,
    viop_contract_price,
    exchange_rate,
    fund_allocation,
    fund_price,
    bond_rate_history
RESTART IDENTITY;
