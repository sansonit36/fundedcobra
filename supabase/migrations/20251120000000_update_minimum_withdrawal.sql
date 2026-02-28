-- Update minimum withdrawal amount from $50 to $20 for all account types

-- Update all v2 account rules (new accounts)
UPDATE account_rules
SET 
  minimum_withdrawal_amount = 20,
  updated_at = now()
WHERE rule_version = 'v2';

-- Update legacy account rules
UPDATE account_rules
SET 
  minimum_withdrawal_amount = 20,
  updated_at = now()
WHERE account_package_name = 'LEGACY_ALL_ACCOUNTS' 
AND rule_version = 'legacy';
