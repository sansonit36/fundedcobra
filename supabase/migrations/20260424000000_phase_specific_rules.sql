-- Add phase-specific rule columns to account_rules
ALTER TABLE account_rules
  ADD COLUMN IF NOT EXISTS daily_drawdown_phase1 numeric,
  ADD COLUMN IF NOT EXISTS daily_drawdown_phase2 numeric,
  ADD COLUMN IF NOT EXISTS overall_drawdown_phase1 numeric,
  ADD COLUMN IF NOT EXISTS overall_drawdown_phase2 numeric,
  ADD COLUMN IF NOT EXISTS minimum_trading_days_phase1 integer,
  ADD COLUMN IF NOT EXISTS minimum_trading_days_phase2 integer;

-- Update existing records with defaults based on current global values
UPDATE account_rules
SET 
  daily_drawdown_phase1 = COALESCE(daily_drawdown_phase1, daily_drawdown_percent),
  daily_drawdown_phase2 = CASE WHEN account_type = '2_step' THEN COALESCE(daily_drawdown_phase2, daily_drawdown_percent) ELSE NULL END,
  overall_drawdown_phase1 = COALESCE(overall_drawdown_phase1, overall_drawdown_percent),
  overall_drawdown_phase2 = CASE WHEN account_type = '2_step' THEN COALESCE(overall_drawdown_phase2, overall_drawdown_percent) ELSE NULL END,
  minimum_trading_days_phase1 = COALESCE(minimum_trading_days_phase1, minimum_trading_days),
  minimum_trading_days_phase2 = CASE WHEN account_type = '2_step' THEN COALESCE(minimum_trading_days_phase2, minimum_trading_days) ELSE NULL END;
