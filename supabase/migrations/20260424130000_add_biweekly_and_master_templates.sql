-- ============================================================
-- Add bi_weekly_payout_enabled column and insert master templates
-- ============================================================

-- 1. Add bi_weekly_payout_enabled column if it doesn't exist
ALTER TABLE account_rules
  ADD COLUMN IF NOT EXISTS bi_weekly_payout_enabled boolean NOT NULL DEFAULT false;

-- 2. Insert master template rules for each account model type
-- These drive the feature callouts and payout cycle display on BuyAccount page
-- Using ON CONFLICT to be idempotent

-- INSTANT model template: bi-weekly payouts, 80% split, 50% discount
INSERT INTO account_rules (
  account_package_name, account_type, is_template, rule_version,
  daily_payout_enabled, weekly_payout_enabled, bi_weekly_payout_enabled,
  payout_split_percent, discount_percent,
  profit_target_percent, profit_target_phase1, profit_target_phase2,
  withdrawal_target_percent, minimum_withdrawal_amount,
  daily_drawdown_percent, overall_drawdown_percent,
  daily_drawdown_phase1, overall_drawdown_phase1,
  minimum_trading_days, minimum_trading_days_phase1,
  news_trading_allowed, weekend_holding_allowed,
  drawdown_type, drawdown_basis
) VALUES (
  '__master_instant', 'instant', true, 'v2',
  false, false, true,
  80, 50,
  0, 0, 0,
  5, 20,
  3, 6,
  3, 6,
  0, 0,
  true, true,
  'trailing', 'balance'
) ON CONFLICT (account_package_name) DO UPDATE SET
  account_type = EXCLUDED.account_type,
  daily_payout_enabled = EXCLUDED.daily_payout_enabled,
  weekly_payout_enabled = EXCLUDED.weekly_payout_enabled,
  bi_weekly_payout_enabled = EXCLUDED.bi_weekly_payout_enabled,
  payout_split_percent = EXCLUDED.payout_split_percent,
  discount_percent = EXCLUDED.discount_percent,
  is_template = EXCLUDED.is_template;

-- 1-STEP model template: weekly payouts, 80% split
INSERT INTO account_rules (
  account_package_name, account_type, is_template, rule_version,
  daily_payout_enabled, weekly_payout_enabled, bi_weekly_payout_enabled,
  payout_split_percent, discount_percent,
  profit_target_percent, profit_target_phase1, profit_target_phase2,
  withdrawal_target_percent, minimum_withdrawal_amount,
  daily_drawdown_percent, overall_drawdown_percent,
  daily_drawdown_phase1, overall_drawdown_phase1,
  minimum_trading_days, minimum_trading_days_phase1,
  news_trading_allowed, weekend_holding_allowed,
  drawdown_type, drawdown_basis
) VALUES (
  '__master_1_step', '1_step', true, 'v2',
  false, true, false,
  80, 0,
  10, 10, 0,
  5, 20,
  4, 8,
  4, 8,
  4, 4,
  true, true,
  'trailing', 'balance'
) ON CONFLICT (account_package_name) DO UPDATE SET
  account_type = EXCLUDED.account_type,
  daily_payout_enabled = EXCLUDED.daily_payout_enabled,
  weekly_payout_enabled = EXCLUDED.weekly_payout_enabled,
  bi_weekly_payout_enabled = EXCLUDED.bi_weekly_payout_enabled,
  payout_split_percent = EXCLUDED.payout_split_percent,
  discount_percent = EXCLUDED.discount_percent,
  is_template = EXCLUDED.is_template;

-- 2-STEP model template: bi-weekly payouts, 80% split
INSERT INTO account_rules (
  account_package_name, account_type, is_template, rule_version,
  daily_payout_enabled, weekly_payout_enabled, bi_weekly_payout_enabled,
  payout_split_percent, discount_percent,
  profit_target_percent, profit_target_phase1, profit_target_phase2,
  withdrawal_target_percent, minimum_withdrawal_amount,
  daily_drawdown_percent, overall_drawdown_percent,
  daily_drawdown_phase1, overall_drawdown_phase1,
  minimum_trading_days, minimum_trading_days_phase1,
  news_trading_allowed, weekend_holding_allowed,
  drawdown_type, drawdown_basis
) VALUES (
  '__master_2_step', '2_step', true, 'v2',
  false, false, true,
  80, 0,
  8, 8, 5,
  5, 20,
  4, 10,
  4, 10,
  4, 4,
  true, true,
  'trailing', 'balance'
) ON CONFLICT (account_package_name) DO UPDATE SET
  account_type = EXCLUDED.account_type,
  daily_payout_enabled = EXCLUDED.daily_payout_enabled,
  weekly_payout_enabled = EXCLUDED.weekly_payout_enabled,
  bi_weekly_payout_enabled = EXCLUDED.bi_weekly_payout_enabled,
  payout_split_percent = EXCLUDED.payout_split_percent,
  discount_percent = EXCLUDED.discount_percent,
  is_template = EXCLUDED.is_template;
