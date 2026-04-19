-- Create email_templates table for storing customizable email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_templates_key ON email_templates(template_key);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Admin can read all templates
CREATE POLICY "Admins can view email templates"
  ON email_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can update templates
CREATE POLICY "Admins can update email templates"
  ON email_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can insert templates
CREATE POLICY "Admins can insert email templates"
  ON email_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default templates
INSERT INTO email_templates (template_key, subject, html_body) VALUES
('welcome', 'Welcome to Propfirm - Start Your Trading Journey', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
  <h1 style="color: #1e3a8a; text-align: center;">Welcome to Propfirm</h1>
  <p>Hi {{name}},</p>
  <p>Thank you for joining Propfirm! We''re excited to help you achieve your trading goals.</p>
  <h3>Next Steps to Get Started:</h3>
  <ol>
    <li>Complete Your KYC Verification</li>
    <li>Choose Your Trading Account</li>
    <li>Start Trading</li>
  </ol>
  <div style="text-align: center; margin: 40px 0;">
    <a href="https://account.propfirm.com/dashboard" style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block;">Go to Dashboard</a>
  </div>
</div>'),

('account_approved', 'Congratulations! Your Trading Account is Approved', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
  <h1 style="color: #059669; text-align: center;">Account Approved!</h1>
  <p>Hi {{name}},</p>
  <p>Great news! Your trading account has been approved and is ready to use.</p>
  <p><strong>Account Size:</strong> ${{accountBalance}}</p>
  <p><strong>MT5 Login:</strong> {{mt5Login}}</p>
  <p><strong>Server:</strong> {{mt5Server}}</p>
  <div style="text-align: center; margin: 40px 0;">
    <a href="https://account.propfirm.com/trading-accounts" style="background: #059669; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block;">View Account Details</a>
  </div>
</div>'),

('kyc_approved', 'KYC Verification Approved', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
  <h1 style="color: #059669; text-align: center;">KYC Verified!</h1>
  <p>Hi {{name}},</p>
  <p>Your identity verification has been approved. You can now purchase trading accounts and request payouts.</p>
</div>'),

('kyc_rejected', 'KYC Verification Update', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
  <h1 style="color: #dc2626; text-align: center;">KYC Update Required</h1>
  <p>Hi {{name}},</p>
  <p>Unfortunately, we couldn''t verify your documents. Reason: {{reason}}</p>
  <p>Please resubmit with correct information.</p>
</div>'),

('account_breached', 'Important: Trading Account Alert', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
  <h1 style="color: #dc2626; text-align: center;">Account Alert</h1>
  <p>Hi {{name}},</p>
  <p>Your trading account has been flagged due to a rule violation.</p>
  <p><strong>Reason:</strong> {{breachReason}}</p>
  <p><strong>Account:</strong> {{accountLogin}}</p>
</div>'),

('kyc_reminder', 'Complete Your KYC Verification', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
  <h1 style="color: #1e3a8a; text-align: center;">Complete Your Verification</h1>
  <p>Hi {{name}},</p>
  <p>You''re almost there! Complete your KYC verification to start trading with Propfirm.</p>
  <div style="text-align: center; margin: 40px 0;">
    <a href="https://account.propfirm.com/kyc" style="background: #f59e0b; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block;">Complete KYC Now</a>
  </div>
</div>'),

('account_purchase_reminder', 'Ready to Start Trading?', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
  <h1 style="color: #1e3a8a; text-align: center;">Choose Your Trading Account</h1>
  <p>Hi {{name}},</p>
  <p>You''re registered with Propfirm, but haven''t chosen your trading account yet.</p>
  <div style="text-align: center; margin: 40px 0;">
    <a href="https://account.propfirm.com/buy-account" style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block;">View All Accounts</a>
  </div>
</div>'),

('kyc_pending', 'KYC Under Review', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
  <h1 style="color: #1e3a8a; text-align: center;">KYC Verification Pending</h1>
  <p>Hi {{name}},</p>
  <p>Thank you for submitting your KYC documents. We are currently reviewing them and will notify you once complete.</p>
</div>'),

('payout_approved', 'Payout Approved', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
  <h1 style="color: #059669; text-align: center;">Payout Approved!</h1>
  <p>Hi {{name}},</p>
  <p>Your payout request has been approved and will be processed within 1-3 business days.</p>
  <p><strong>Amount:</strong> ${{amount}}</p>
</div>'),

('payout_rejected', 'Payout Update', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
  <h1 style="color: #dc2626; text-align: center;">Payout Status Update</h1>
  <p>Hi {{name}},</p>
  <p>Your payout request has been reviewed. Reason: {{reason}}</p>
  <p>Please contact support if you have questions.</p>
</div>'),

('inactive_user', 'We Miss You at Propfirm', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
  <h1 style="color: #1e3a8a; text-align: center;">Come Back to Trading</h1>
  <p>Hi {{name}},</p>
  <p>We noticed you haven''t been active lately. Your trading account is waiting for you!</p>
  <div style="text-align: center; margin: 40px 0;">
    <a href="https://account.propfirm.com/dashboard" style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block;">Back to Dashboard</a>
  </div>
</div>'),

('no_purchase_7days', 'Still Thinking? Here''s What You''re Missing', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
  <h1 style="color: #1e3a8a; text-align: center;">Don''t Miss Out</h1>
  <p>Hi {{name}},</p>
  <p>It''s been a week since you joined. Don''t let this opportunity pass by!</p>
  <div style="text-align: center; margin: 40px 0;">
    <a href="https://account.propfirm.com/buy-account" style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block;">Start Trading Today</a>
  </div>
</div>'),

('no_purchase_14days', 'Last Chance: Exclusive Offer Inside', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
  <h1 style="color: #7c3aed; text-align: center;">Special Offer for You</h1>
  <p>Hi {{name}},</p>
  <p>Get 10% OFF on your first trading account!</p>
  <div style="text-align: center; margin: 40px 0;">
    <a href="https://account.propfirm.com/buy-account" style="background: #7c3aed; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block;">Claim Your Offer</a>
  </div>
</div>'),

('no_kyc_reminder', 'Complete Your Verification - Quick & Easy!', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
  <h1 style="color: #1e3a8a; text-align: center;">Just One More Step!</h1>
  <p>Hi {{name}},</p>
  <p>You''re so close! Complete your KYC verification to unlock full access.</p>
  <div style="text-align: center; margin: 40px 0;">
    <a href="https://account.propfirm.com/kyc" style="background: #f59e0b; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block;">Complete Verification</a>
  </div>
</div>')

ON CONFLICT (template_key) DO NOTHING;
