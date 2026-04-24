-- CLEAN SLATE: Remove all non-legacy rules and packages so admin can rebuild from scratch
-- Categories (master templates) and individual packages will be re-created via the Admin panel

-- 1. Delete ALL non-legacy individual package rules (stale data)
DELETE FROM account_rules WHERE rule_version != 'legacy' OR rule_version IS NULL;

-- 2. Delete ALL account packages (sizes) — admin will recreate them
DELETE FROM account_packages;

-- NOTE: This does NOT touch trading_accounts, account_requests, or any user data.
-- Only the product catalog (packages + rules) is wiped.
