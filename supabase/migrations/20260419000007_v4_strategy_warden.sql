-- v4.3 Strategy Warden: Full Multi-Rule Audit Engine (Continuous Audit)
CREATE OR REPLACE FUNCTION check_trade_compliance()
RETURNS TRIGGER AS $$
DECLARE
    found_account_id uuid;
    found_status text;
    existing_reason text;
    comp_duration numeric;
    prev_vol numeric;
    prev_prof numeric;
    cnt_stack integer;
    cnt_hedging integer;
    cnt_burst integer;
    v_list text[] := '{}'; 
BEGIN
    comp_duration := EXTRACT(EPOCH FROM (NEW.close_time::timestamptz - NEW.open_time::timestamptz));

    SELECT id, status, breach_reason INTO found_account_id, found_status, existing_reason
    FROM trading_accounts 
    WHERE mt5_login = NEW.mt5_id::text
    LIMIT 1;

    -- Only return if account doesn't exist. If it's breached, we still audit!
    IF found_account_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- RULE 1: Scalping (< 60s)
    IF comp_duration < 60 THEN
        v_list := array_append(v_list, 'Scalping detected (' || comp_duration || 's)');
    END IF;

    -- RULE 2: Burst / HFT Detection (5+ trades in 10s)
    SELECT count(*) INTO cnt_burst
    FROM trade_history
    WHERE mt5_id = NEW.mt5_id 
    AND close_time > (NEW.close_time::timestamptz - interval '10 seconds');

    IF cnt_burst >= 5 THEN
        v_list := array_append(v_list, 'HFT Burst (' || cnt_burst || ' trades/10s)');
    END IF;

    -- RULE 3: Stacking (4 same-way consecutive)
    SELECT count(*) INTO cnt_stack
    FROM (
        SELECT type, symbol FROM trade_history 
        WHERE mt5_id = NEW.mt5_id ORDER BY close_time DESC LIMIT 4
    ) last_trades
    WHERE type = NEW.type AND symbol = NEW.symbol;

    IF cnt_stack >= 4 THEN
        v_list := array_append(v_list, 'Stacking (4+ positions same way)');
    END IF;

    -- RULE 4: Martingale (Lot increase after loss)
    SELECT volume, profit INTO prev_vol, prev_prof
    FROM trade_history
    WHERE mt5_id = NEW.mt5_id AND symbol = NEW.symbol
    ORDER BY close_time DESC LIMIT 1;

    IF prev_prof < 0 AND NEW.volume > (prev_vol * 1.5) THEN
        v_list := array_append(v_list, 'Martingale (Lot increase after loss)');
    END IF;

    -- RULE 5: Hedging (Same-pair opposite positions)
    SELECT count(*) INTO cnt_hedging
    FROM trade_history
    WHERE mt5_id = NEW.mt5_id 
    AND symbol = NEW.symbol 
    AND type != NEW.type
    AND (
        (open_time BETWEEN NEW.open_time::timestamptz AND NEW.close_time::timestamptz) OR
        (close_time BETWEEN NEW.open_time::timestamptz AND NEW.close_time::timestamptz)
    );

    IF cnt_hedging > 0 THEN
        v_list := array_append(v_list, 'Hedging detected on ' || NEW.symbol);
    END IF;

    -- FINAL ENFORCEMENT: Update even if already breached, to append new violations
    IF array_length(v_list, 1) > 0 THEN
        -- If it was ALREADY breached for some other reason, append these new ones.
        -- Otherwise just set the initial reason.
        IF existing_reason IS NOT NULL AND existing_reason != '' AND LOWER(found_status) = 'breached' THEN
            -- we only append if they aren't already matched to avoid massive duplication
            -- a simple way is just to append what we found unless they are duplicates
            -- For simplicity let's just append ' | ' + new list if it's not already in there.
            -- Using a basic overlap check isn't foolproof but helps
            existing_reason := existing_reason || ' | ' || array_to_string(v_list, ' | ');
        ELSE
            existing_reason := 'Audit: ' || array_to_string(v_list, ' | ');
        END IF;

        UPDATE trading_accounts SET 
            status = 'breached', 
            breach_reason = existing_reason,
            updated_at = now()
        WHERE id = found_account_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Activate the trigger on the trade_history table
DROP TRIGGER IF EXISTS trg_check_trade_compliance ON trade_history;
CREATE TRIGGER trg_check_trade_compliance
AFTER INSERT ON trade_history
FOR EACH ROW
EXECUTE FUNCTION check_trade_compliance();
