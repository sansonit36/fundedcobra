-- Dynamic multi-step account model support
-- Supports: instant, 1_step, 2_step with package-level rule configuration.

-- 1) account_packages: model + active status
ALTER TABLE account_packages
  ADD COLUMN IF NOT EXISTS account_type text;

UPDATE account_packages
SET account_type = 'instant'
WHERE account_type IS NULL OR account_type = '';

ALTER TABLE account_packages
  ALTER COLUMN account_type SET DEFAULT 'instant';

ALTER TABLE account_packages
  ALTER COLUMN account_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'account_packages_account_type_check'
  ) THEN
    ALTER TABLE account_packages
      ADD CONSTRAINT account_packages_account_type_check
      CHECK (account_type IN ('instant', '1_step', '2_step'));
  END IF;
END $$;

ALTER TABLE account_packages
  ADD COLUMN IF NOT EXISTS is_active boolean;

UPDATE account_packages
SET is_active = true
WHERE is_active IS NULL;

ALTER TABLE account_packages
  ALTER COLUMN is_active SET DEFAULT true;

ALTER TABLE account_packages
  ALTER COLUMN is_active SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_account_packages_type_active
  ON account_packages (account_type, is_active);

-- 2) account_rules: phase targets + dynamic toggles + explicit package mapping
ALTER TABLE account_rules
  ADD COLUMN IF NOT EXISTS package_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'account_rules_package_id_fkey'
  ) THEN
    ALTER TABLE account_rules
      ADD CONSTRAINT account_rules_package_id_fkey
      FOREIGN KEY (package_id)
      REFERENCES account_packages(id)
      ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE account_rules
  ADD COLUMN IF NOT EXISTS account_type text;

UPDATE account_rules ar
SET account_type = ap.account_type
FROM account_packages ap
WHERE ar.account_package_name = ap.name
  AND (ar.account_type IS NULL OR ar.account_type = '');

UPDATE account_rules
SET account_type = 'instant'
WHERE account_type IS NULL OR account_type = '';

ALTER TABLE account_rules
  ALTER COLUMN account_type SET DEFAULT 'instant';

ALTER TABLE account_rules
  ALTER COLUMN account_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'account_rules_account_type_check'
  ) THEN
    ALTER TABLE account_rules
      ADD CONSTRAINT account_rules_account_type_check
      CHECK (account_type IN ('instant', '1_step', '2_step'));
  END IF;
END $$;

ALTER TABLE account_rules
  ADD COLUMN IF NOT EXISTS profit_target_phase1 numeric;

ALTER TABLE account_rules
  ADD COLUMN IF NOT EXISTS profit_target_phase2 numeric;

UPDATE account_rules
SET profit_target_phase1 = COALESCE(
  profit_target_phase1,
  profit_target_percent,
  withdrawal_target_percent,
  5
)
WHERE profit_target_phase1 IS NULL;

ALTER TABLE account_rules
  ALTER COLUMN profit_target_phase1 SET DEFAULT 5;

ALTER TABLE account_rules
  ALTER COLUMN profit_target_phase1 SET NOT NULL;

ALTER TABLE account_rules
  ADD COLUMN IF NOT EXISTS news_trading_allowed boolean;

UPDATE account_rules
SET news_trading_allowed = true
WHERE news_trading_allowed IS NULL;

ALTER TABLE account_rules
  ALTER COLUMN news_trading_allowed SET DEFAULT true;

ALTER TABLE account_rules
  ALTER COLUMN news_trading_allowed SET NOT NULL;

ALTER TABLE account_rules
  ADD COLUMN IF NOT EXISTS weekend_holding_allowed boolean;

UPDATE account_rules
SET weekend_holding_allowed = true
WHERE weekend_holding_allowed IS NULL;

ALTER TABLE account_rules
  ALTER COLUMN weekend_holding_allowed SET DEFAULT true;

ALTER TABLE account_rules
  ALTER COLUMN weekend_holding_allowed SET NOT NULL;

ALTER TABLE account_rules
  ADD COLUMN IF NOT EXISTS payout_split_percent numeric;

UPDATE account_rules
SET payout_split_percent = 80
WHERE payout_split_percent IS NULL;

ALTER TABLE account_rules
  ALTER COLUMN payout_split_percent SET DEFAULT 80;

ALTER TABLE account_rules
  ALTER COLUMN payout_split_percent SET NOT NULL;

UPDATE account_rules
SET minimum_trading_days = 0
WHERE minimum_trading_days IS NULL;

ALTER TABLE account_rules
  ALTER COLUMN minimum_trading_days SET DEFAULT 0;

ALTER TABLE account_rules
  ALTER COLUMN minimum_trading_days SET NOT NULL;

UPDATE account_rules ar
SET package_id = ap.id
FROM account_packages ap
WHERE ar.package_id IS NULL
  AND ar.account_package_name = ap.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_rules_package_id_unique
  ON account_rules(package_id)
  WHERE package_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_account_rules_type_package
  ON account_rules(account_type, package_id);

-- Keep legacy phase2 empty unless explicitly configured for 2-step packages
UPDATE account_rules
SET profit_target_phase2 = NULL
WHERE account_type <> '2_step'
  AND account_package_name = 'LEGACY_ALL_ACCOUNTS';

-- 3) trading_accounts: track model and current phase
ALTER TABLE trading_accounts
  ADD COLUMN IF NOT EXISTS current_phase integer;

UPDATE trading_accounts
SET current_phase = 1
WHERE current_phase IS NULL;

ALTER TABLE trading_accounts
  ALTER COLUMN current_phase SET DEFAULT 1;

ALTER TABLE trading_accounts
  ALTER COLUMN current_phase SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trading_accounts_current_phase_check'
  ) THEN
    ALTER TABLE trading_accounts
      ADD CONSTRAINT trading_accounts_current_phase_check
      CHECK (current_phase >= 1);
  END IF;
END $$;

ALTER TABLE trading_accounts
  ADD COLUMN IF NOT EXISTS model_type text;

UPDATE trading_accounts
SET model_type = 'instant'
WHERE model_type IS NULL OR model_type = '';

UPDATE trading_accounts ta
SET model_type = ap.account_type
FROM account_packages ap
WHERE ta.package_name = ap.name
  AND ta.model_type = 'instant';

ALTER TABLE trading_accounts
  ALTER COLUMN model_type SET DEFAULT 'instant';

ALTER TABLE trading_accounts
  ALTER COLUMN model_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trading_accounts_model_type_check'
  ) THEN
    ALTER TABLE trading_accounts
      ADD CONSTRAINT trading_accounts_model_type_check
      CHECK (model_type IN ('instant', '1_step', '2_step'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_trading_accounts_model_phase
  ON trading_accounts(model_type, current_phase);

-- 4) Keep model logic snapshot on approval
CREATE OR REPLACE FUNCTION approve_account_request(
  request_id uuid,
  mt5_login text,
  mt5_password text,
  mt5_server text DEFAULT 'FundedCobra-Live'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid;
  v_request account_requests%ROWTYPE;
  v_package account_packages%ROWTYPE;
  v_model_type text;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_request
  FROM account_requests
  WHERE id = request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_request.status != 'payment_submitted' THEN
    RAISE EXCEPTION 'Invalid request status';
  END IF;

  SELECT * INTO v_package
  FROM account_packages
  WHERE id = v_request.package_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Package not found';
  END IF;

  v_model_type := COALESCE(v_package.account_type, 'instant');

  INSERT INTO trading_accounts (
    user_id,
    mt5_login,
    mt5_password,
    mt5_server,
    balance,
    equity,
    starting_balance,
    daily_loss_limit,
    overall_loss_limit,
    status,
    package_name,
    created_rule_version,
    model_type,
    current_phase
  )
  VALUES (
    v_request.user_id,
    mt5_login,
    mt5_password,
    mt5_server,
    v_package.balance,
    v_package.balance,
    v_package.balance,
    v_package.daily_loss_limit,
    v_package.overall_loss_limit,
    'active',
    v_package.name,
    'v2',
    v_model_type,
    1
  )
  RETURNING id INTO v_account_id;

  UPDATE account_requests
  SET
    status = 'approved',
    processed_at = now()
  WHERE id = request_id;

  RETURN v_account_id;
END;
$$;
