-- v3 Advanced Compliance Trigger
-- Explicitly handles string-to-timestamp casting for MT5 data

CREATE OR REPLACE FUNCTION check_trade_compliance()
RETURNS TRIGGER AS $$
DECLARE
    v_account_id uuid;
    v_open_t timestamptz;
    v_close_t timestamptz;
    v_trade_duration numeric;
    v_mt5_login text;
BEGIN
    -- 1. Identity normalization
    v_mt5_login := NEW.mt5_id;
    
    -- 2. Cast timestamps explicitly (Handle strings from PHP bridge)
    BEGIN
        v_open_t := NEW.open_time::timestamptz;
        v_close_t := NEW.close_time::timestamptz;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Compliance Check: Timestamp cast failed for Ticket %', NEW.ticket;
        RETURN NEW;
    END;

    -- 3. Calculate Duration
    v_trade_duration := EXTRACT(EPOCH FROM (v_close_t - v_open_t));
    
    -- 4. Find the Account
    SELECT id INTO v_account_id
    FROM trading_accounts 
    WHERE mt5_login = v_mt5_login
    LIMIT 1;

    -- Log findings for Supabase Dashboard Logs
    RAISE NOTICE 'Compliance Audit: Account=% Ticket=% Duration=%s', v_mt5_login, NEW.ticket, v_trade_duration;

    -- 5. ENFORCE: 60-Second Rule
    IF v_trade_duration < 60 THEN
        IF v_account_id IS NOT NULL THEN
            UPDATE trading_accounts 
            SET status = 'breached', 
                breach_reason = 'Rule Violation: Trade held under 60 seconds (Ticket: ' || NEW.ticket || ' | Duration: ' || v_trade_duration || 's)'
            WHERE id = v_account_id AND status = 'active';
            
            RAISE NOTICE 'Compliance Audit: BREACH APPLIED to Account %', v_mt5_login;
        ELSE
            RAISE NOTICE 'Compliance Audit: 60s Violation detected but no matching account found for MT5 Login %', v_mt5_login;
        END IF;
    END IF;

    -- Continue with other checks...
    -- (Omitted for brevity in this manual fix, but keep them in your main migration)
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
