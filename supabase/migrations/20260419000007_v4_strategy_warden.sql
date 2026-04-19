-- v4 Strategy Warden: Advanced Proprietary Trading Rule Enforcement
-- This trigger handles Martingale, Hedging, Grid/Arbitrage, and Stacking.

CREATE OR REPLACE FUNCTION check_trade_compliance()
RETURNS TRIGGER AS $$
DECLARE
    v_account_id uuid;
    v_account_status text;
    v_open_t timestamptz;
    v_close_t timestamptz;
    v_duration numeric;
    v_prev_volume numeric;
    v_prev_profit numeric;
    v_stack_count integer;
    v_hedging_count integer;
    v_burst_count integer;
BEGIN
    -- 1. Cast timestamps and calculate duration
    v_open_t := NEW.open_time::timestamptz;
    v_close_t := NEW.close_time::timestamptz;
    v_duration := EXTRACT(EPOCH FROM (v_close_t - v_open_t));

    -- 2. Find the live Account
    SELECT id, status INTO v_account_id, v_account_status
    FROM trading_accounts 
    WHERE mt5_login = NEW.mt5_id::text
    LIMIT 1;

    IF v_account_id IS NULL OR v_account_status != 'active' THEN
        RETURN NEW;
    END IF;

    -- RULE 1: Scalping / HFT Rule (Under 60s)
    IF v_duration < 60 THEN
        UPDATE trading_accounts SET status = 'breached', 
        breach_reason = 'Rule Violation: Trade duration under 60 seconds (Ticket: ' || NEW.ticket || ')'
        WHERE id = v_account_id;
        RETURN NEW;
    END IF;

    -- RULE 2: Burst / Arbitrage / HFT Detection
    -- Check if more than 5 trades were opened/closed in the last 10 seconds
    SELECT count(*) INTO v_burst_count
    FROM trade_history
    WHERE mt5_id = NEW.mt5_id 
    AND close_time > (v_close_t - interval '10 seconds');

    IF v_burst_count >= 5 THEN
        UPDATE trading_accounts SET status = 'breached', 
        breach_reason = 'Rule Violation: High-Frequency Trading (HFT) / Arbitrage burst detected'
        WHERE id = v_account_id;
        RETURN NEW;
    END IF;

    -- RULE 3: One-Sided Trading (Stacking)
    -- User specified: Max 3. Breach on 4.
    SELECT count(*) INTO v_stack_count
    FROM (
        SELECT type, symbol FROM trade_history 
        WHERE mt5_id = NEW.mt5_id ORDER BY close_time DESC LIMIT 4
    ) last_trades
    WHERE type = NEW.type AND symbol = NEW.symbol;

    IF v_stack_count >= 4 THEN
        UPDATE trading_accounts SET status = 'breached', 
        breach_reason = 'Rule Violation: More than 3 consecutive same-direction positions on ' || NEW.symbol
        WHERE id = v_account_id;
        RETURN NEW;
    END IF;

    -- RULE 4: Martingale Strategy Detection
    -- Check previous trade for loss + volume increase
    SELECT volume, profit INTO v_prev_volume, v_prev_profit
    FROM trade_history
    WHERE mt5_id = NEW.mt5_id AND symbol = NEW.symbol
    ORDER BY close_time DESC LIMIT 1;

    IF v_prev_profit < 0 AND NEW.volume > (v_prev_volume * 1.5) THEN
        UPDATE trading_accounts SET status = 'breached', 
        breach_reason = 'Rule Violation: Martingale Strategy (Increased lot size after loss on ' || NEW.symbol || ')'
        WHERE id = v_account_id;
        RETURN NEW;
    END IF;

    -- RULE 5: Hedging (Simultaneous Buy/Sell on same pair)
    -- [In MT5, Hedging usually means opposite positions open at once]
    -- Since we only get 'Close' events here, we can check if another trade on same pair
    -- was open during this trade's duration.
    SELECT count(*) INTO v_hedging_count
    FROM trade_history
    WHERE mt5_id = NEW.mt5_id 
    AND symbol = NEW.symbol 
    AND type != NEW.type
    AND (
        (open_time BETWEEN v_open_t AND v_close_t) OR
        (close_time BETWEEN v_open_t AND v_close_t)
    );

    IF v_hedging_count > 0 THEN
        UPDATE trading_accounts SET status = 'breached', 
        breach_reason = 'Rule Violation: Hedging (Simultaneous opposite positions on same pair)'
        WHERE id = v_account_id;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
