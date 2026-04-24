-- Add Global Category Discount to account_rules
ALTER TABLE account_rules ADD COLUMN IF NOT EXISTS discount_percent numeric DEFAULT 0;

-- Comment for clarity
COMMENT ON COLUMN account_rules.discount_percent IS 'Global discount for all sizes in this category, applied to the price display.';
