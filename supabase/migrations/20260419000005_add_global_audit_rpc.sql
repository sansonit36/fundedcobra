-- Global Compliance Audit RPC
-- This allows admins to scan the entire database for rule violations with 1 click

CREATE OR REPLACE FUNCTION run_global_compliance_audit()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_breach_count integer := 0;
    v_account_record RECORD;
    v_violation_record RECORD;
BEGIN
    -- Only allow admins to run this (if using Supabase Auth)
    -- IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;

    -- 1. Scan for 60-Second Violations
    FOR v_violation_record IN 
        SELECT DISTINCT mt5_id, ticket, EXTRACT(EPOCH FROM (close_time - open_time)) as duration
        FROM trade_history
        WHERE EXTRACT(EPOCH FROM (close_time - open_time)) < 60
    LOOP
        UPDATE trading_accounts 
        SET status = 'breached',
            breach_reason = 
              CASE 
                WHEN breach_reason IS NULL OR breach_reason = '' THEN 'Audit: Rule Violation - Trade held under 60s (Ticket: ' || v_violation_record.ticket || ' | ' || v_violation_record.duration || 's)'
                WHEN breach_reason NOT LIKE '%Ticket: ' || v_violation_record.ticket || '%' THEN breach_reason || ' | Rule Violation - Trade held under 60s (Ticket: ' || v_violation_record.ticket || ')'
                ELSE breach_reason
              END

        WHERE mt5_login = v_violation_record.mt5_id AND status = 'active';
        
        IF FOUND THEN
            v_breach_count := v_breach_count + 1;
        END IF;
    END LOOP;

    -- 2. Scan for Stacking Violations (Aggregated check)
    FOR v_account_record IN SELECT mt5_login FROM trading_accounts WHERE status = 'active'
    LOOP
        -- Look for any group of 4+ trades that stack
        IF EXISTS (
            SELECT 1 FROM (
                SELECT symbol, type, count(*) 
                FROM (
                    SELECT symbol, type, 
                           row_number() OVER (PARTITION BY mt5_id ORDER BY close_time DESC) as rn
                    FROM trade_history
                    WHERE mt5_id = v_account_record.mt5_login
                ) t
                WHERE rn <= 4
                GROUP BY symbol, type
                HAVING count(*) >= 4
            ) stacking_check
        ) THEN
            UPDATE trading_accounts 
            SET status = 'breached',
                breach_reason = 
                  CASE
                    WHEN breach_reason IS NULL OR breach_reason = '' THEN 'Audit: Rule Violation - Stacking pattern detected (System Audit)'
                    WHEN breach_reason NOT LIKE '%Stacking%' THEN breach_reason || ' | Rule Violation - Stacking pattern detected'
                    ELSE breach_reason
                  END
            WHERE mt5_login = v_account_record.mt5_login AND status = 'active';
            
            IF FOUND THEN
                v_breach_count := v_breach_count + 1;
            END IF;
        END IF;
    END LOOP;

    RETURN json_build_object(
        'status', 'success',
        'accounts_processed', (SELECT count(*) FROM trading_accounts),
        'new_breaches_found', v_breach_count,
        'timestamp', now()
    );
END;
$$;
