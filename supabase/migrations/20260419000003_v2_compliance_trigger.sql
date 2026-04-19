-- Improved Automated Trading Rules Enforcement Engine
-- This version handles missing package rules gracefully and adds debug logging

CREATE OR REPLACE FUNCTION check_trade_compliance()
RETURNS TRIGGER AS $$
DECLARE
    v_account_id uuid;
    v_account_status text;
    v_package_name text;
    v_initial_equity numeric;
    v_withdrawal_target_percent numeric;
    v_single_trade_limit_percent numeric;
    v_target_amount numeric;
    v_max_profit_per_trade numeric;
    v_trade_duration numeric;
    v_consecutive_count integer;
BEGIN
    -- 1. Fetch account basics (Independent of Rules join)
    SELECT id, status, package_name, starting_balance
    INTO v_account_id, v_account_status, v_package_name, v_initial_equity
    FROM trading_accounts 
    WHERE mt5_login = NEW.mt5_id
    LIMIT 1;

    -- If no account found, we can't enforce account-specific rules, but we should log it
    IF v_account_id IS NULL THEN
        RAISE NOTICE 'Compliance Check: No account found for mt5_id %', NEW.mt5_id;
        RETURN NEW;
    END IF;

    -- 2. UNIVERSAL RULE: 60-Second Rule (Applies to ALL accounts)
    v_trade_duration := EXTRACT(EPOCH FROM (NEW.close_time - NEW.open_time));
    RAISE NOTICE 'Compliance Check: Account %, Ticket %, Duration %s', NEW.mt5_id, NEW.ticket, v_trade_duration;

    IF v_trade_duration < 60 THEN
        RAISE NOTICE 'Compliance Check: BREACH DETECTED - 60s Rule on Ticket %', NEW.ticket;
        UPDATE trading_accounts 
        SET status = 'breached', 
            breach_reason = 'Rule Violation: Trade held under 60 seconds (Ticket: ' || NEW.ticket || ')'
        WHERE id = v_account_id AND status = 'active';
        RETURN NEW;
    END IF;

    -- 3. Fetch specific rule limits (Optional join)
    SELECT withdrawal_target_percent, single_trade_limit_percent
    INTO v_withdrawal_target_percent, v_single_trade_limit_percent
    FROM account_rules
    WHERE account_package_name = v_package_name
    LIMIT 1;

    -- 4. RULE: 25% Single Trade Limit (Requires rules found)
    IF v_withdrawal_target_percent IS NOT NULL AND v_single_trade_limit_percent IS NOT NULL THEN
        v_target_amount := v_initial_equity * (v_withdrawal_target_percent / 100);
        v_max_profit_per_trade := v_target_amount * (v_single_trade_limit_percent / 100);

        IF NEW.profit > v_max_profit_per_trade THEN
            RAISE NOTICE 'Compliance Check: LIMIT EXCEEDED - 25%% Profit Limit on Ticket %', NEW.ticket;
            UPDATE trading_accounts 
            SET has_25_percent_rule = true,
                breach_reason = COALESCE(breach_reason, '') || ' [Note: Single trade limit exceeded. Payout restricted. (Ticket: ' || NEW.ticket || ')]'
            WHERE id = v_account_id;
        END IF;
    END IF;

    -- 5. RULE: No Stacking (Universal pattern check)
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
        RAISE NOTICE 'Compliance Check: BREACH DETECTED - Stacking on %', NEW.symbol;
        UPDATE trading_accounts 
        SET status = 'breached', 
            breach_reason = 'Rule Violation: More than 3 consecutive same-direction trades on ' || NEW.symbol
        WHERE id = v_account_id AND status = 'active';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
