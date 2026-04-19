-- Automated Trading Rules Enforcement Engine
-- This trigger runs on every new trade record to ensure compliance with firm rules

CREATE OR REPLACE FUNCTION check_trade_compliance()
RETURNS TRIGGER AS $$
DECLARE
    v_account_id uuid;
    v_package_name text;
    v_initial_equity numeric;
    v_withdrawal_target_percent numeric;
    v_single_trade_limit_percent numeric;
    v_target_amount numeric;
    v_max_profit_per_trade numeric;
    v_trade_duration numeric;
    v_consecutive_count integer;
BEGIN
    -- 1. Fetch account and rule details
    SELECT ta.id, ta.package_name, ta.starting_balance, ar.withdrawal_target_percent, ar.single_trade_limit_percent
    INTO v_account_id, v_package_name, v_initial_equity, v_withdrawal_target_percent, v_single_trade_limit_percent
    FROM trading_accounts ta
    JOIN account_rules ar ON ta.package_name = ar.account_package_name
    WHERE ta.mt5_login = NEW.mt5_id
    LIMIT 1;

    -- If no account found, exit early
    IF v_account_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- 2. RULE: 60-Second Rule (No trades held under 1 minute)
    v_trade_duration := EXTRACT(EPOCH FROM (NEW.close_time - NEW.open_time));
    IF v_trade_duration < 60 THEN
        UPDATE trading_accounts 
        SET status = 'breached', 
            breach_reason = 'Rule Violation: Trade held under 60 seconds (Ticket: ' || NEW.ticket || ')'
        WHERE id = v_account_id AND status = 'active';
        RETURN NEW;
    END IF;

    -- 3. RULE: 25% Single Trade Limit
    -- Calculate target: (Starting Balance * Payout Target %)
    v_target_amount := v_initial_equity * (v_withdrawal_target_percent / 100);
    -- Calculate max profit per trade: (Target * Limit %)
    v_max_profit_per_trade := v_target_amount * (v_single_trade_limit_percent / 100);

    IF NEW.profit > v_max_profit_per_trade THEN
        -- According to rules: "payout is reduced from 50% to 25% for that cycle" 
        -- We'll mark the account or flag it. For now, let's mark it for review or breach if strict.
        -- User said "breach accounts automatically", but the rule says "payout reduced".
        -- Let's stick to the stricter "breach" if you prefer, or add a 'review' status.
        -- For this demo, we'll log it as a rule violation that needs admin review.
        UPDATE trading_accounts 
        SET has_25_percent_rule = true, -- Flag this for the payout calculation
            breach_reason = 'Note: Single trade limit exceeded. Payout reduced to 25%. (Ticket: ' || NEW.ticket || ')'
        WHERE id = v_account_id;
    END IF;

    -- 4. RULE: No Stacking (More than 3 consecutive same-direction trades)
    SELECT count(*) INTO v_consecutive_count
    FROM (
        SELECT type, symbol 
        FROM trade_history 
        WHERE mt5_id = NEW.mt5_id 
        ORDER BY close_time DESC 
        LIMIT 4
    ) last_trades
    WHERE type = NEW.type AND symbol = NEW.symbol;

    IF v_consecutive_count >= 4 THEN
        UPDATE trading_accounts 
        SET status = 'breached', 
            breach_reason = 'Rule Violation: More than 3 consecutive same-direction trades on ' || NEW.symbol
        WHERE id = v_account_id AND status = 'active';
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_check_trade_compliance ON trade_history;
CREATE TRIGGER trg_check_trade_compliance
AFTER INSERT ON trade_history
FOR EACH ROW
EXECUTE FUNCTION check_trade_compliance();
