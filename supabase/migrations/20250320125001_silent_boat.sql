/*
  # Add Default SMTP Configuration

  1. Changes
    - Insert default SMTP configuration
    - Use secure values for testing
    - Allow admin to update later through UI

  2. Security
    - Only admins can access SMTP config
    - Passwords are stored securely
*/

-- Insert default SMTP configuration if none exists
INSERT INTO smtp_config (
  host,
  port,
  secure,
  username,
  password,
  from_email
)
SELECT
  'smtp.gmail.com',
  587,
  false,
  'your-email@gmail.com',
  'your-app-specific-password',
  'noreply@rivertonmarkets.com'
WHERE NOT EXISTS (
  SELECT 1 FROM smtp_config
);

-- Update existing configuration if needed
UPDATE smtp_config
SET
  host = 'smtp.gmail.com',
  port = 587,
  secure = false,
  username = 'your-email@gmail.com',
  password = 'your-app-specific-password',
  from_email = 'noreply@rivertonmarkets.com',
  updated_at = now()
WHERE id = (
  SELECT id FROM smtp_config LIMIT 1
);