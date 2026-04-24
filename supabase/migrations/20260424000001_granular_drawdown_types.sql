-- Syncing database with modern naming scheme used in code
ALTER TABLE account_rules
  -- Funded stage specific drawdown values
  ADD COLUMN IF NOT EXISTS daily_drawdown_funded numeric,
  ADD COLUMN IF NOT EXISTS overall_drawdown_funded numeric,
  
  -- Daily Drawdown Types
  ADD COLUMN IF NOT EXISTS daily_drawdown_type_phase1 text DEFAULT 'static',
  ADD COLUMN IF NOT EXISTS daily_drawdown_type_phase2 text DEFAULT 'static',
  ADD COLUMN IF NOT EXISTS daily_drawdown_type_funded text DEFAULT 'static',
  
  -- Overall Drawdown Types
  ADD COLUMN IF NOT EXISTS overall_drawdown_type_phase1 text DEFAULT 'static',
  ADD COLUMN IF NOT EXISTS overall_drawdown_type_phase2 text DEFAULT 'static',
  ADD COLUMN IF NOT EXISTS overall_drawdown_type_funded text DEFAULT 'static',
  
  -- Rule Template Flag
  ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false;

-- Initialize from existing columns
UPDATE account_rules
SET 
  daily_drawdown_funded = COALESCE(daily_drawdown_percent, 5),
  overall_drawdown_funded = COALESCE(overall_drawdown_percent, 12),
  daily_drawdown_type_phase1 = COALESCE(drawdown_type, 'static'),
  daily_drawdown_type_funded = COALESCE(drawdown_type, 'static'),
  overall_drawdown_type_phase1 = COALESCE(drawdown_type, 'static'),
  overall_drawdown_type_funded = COALESCE(drawdown_type, 'static');
