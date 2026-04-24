-- Create a unique constraint for master templates per account type
-- This allows ON CONFLICT (account_type, is_template) upserts to work
-- We only want ONE template per account_type, so we use a partial index

CREATE UNIQUE INDEX IF NOT EXISTS unique_master_template_idx 
ON account_rules (account_type) 
WHERE (is_template = true);

-- Also ensure package_id is unique if it's not already
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'account_rules_package_id_key'
    ) THEN
        ALTER TABLE account_rules ADD CONSTRAINT account_rules_package_id_key UNIQUE (package_id);
    END IF;
END $$;
