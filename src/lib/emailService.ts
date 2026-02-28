import { supabase } from './supabase';

export type EmailTemplate = 
  | 'welcome'
  | 'kyc_reminder'
  | 'account_purchase_reminder'
  | 'account_approved'
  | 'account_breached'
  | 'kyc_pending'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'payout_approved'
  | 'payout_rejected'
  | 'inactive_user'
  | 'no_purchase_7days'
  | 'no_purchase_14days'
  | 'no_kyc_reminder'
  | 'admin_payout_requested'
  | 'account_purchase_submitted'
  | 'admin_account_purchase_notification';

interface EmailParams {
  to: string;
  template: EmailTemplate;
  data?: Record<string, any>;
}

const EMAIL_TEMPLATES = {
  welcome: {
    subject: 'Welcome to Riverton Markets - Start Your Trading Journey',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #1e3a8a; margin: 0; font-size: 32px;">Welcome to Riverton Markets</h1>
        </div>
        
        <div style="background: #f3f4f6; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hi ${data.name},</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Thank you for joining Riverton Markets! We're excited to help you achieve your trading goals.
          </p>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #1f2937; font-size: 20px;">Next Steps to Get Started:</h3>
          <ol style="color: #4b5563; font-size: 16px; line-height: 1.8;">
            <li><strong>Complete Your KYC Verification</strong> - Verify your identity to unlock all features</li>
            <li><strong>Choose Your Trading Account</strong> - Select from our range of funded accounts</li>
            <li><strong>Start Trading</strong> - Begin your journey to profitable trading</li>
          </ol>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="https://account.rivertonmarkets.com/dashboard" 
             style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
            Go to Dashboard
          </a>
        </div>

        <div style="background: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <p style="margin: 0; color: #1e40af; font-size: 14px;">
            <strong>Pro Tip:</strong> Complete your KYC verification now to get instant access to account purchases!
          </p>
        </div>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            Need help? Contact us at support@rivertonmarkets.com
          </p>
        </div>
      </div>
    `
  },

  kyc_reminder: {
    subject: 'Complete Your KYC Verification - Unlock Your Trading Account',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #1e3a8a; margin: 0; font-size: 28px;">Complete Your Verification</h1>
        </div>
        
        <div style="background: #fef3c7; padding: 30px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
          <h2 style="color: #92400e; margin-top: 0;">Hi ${data.name},</h2>
          <p style="color: #78350f; font-size: 16px; line-height: 1.6;">
            You're almost there! Complete your KYC verification to start trading with Riverton Markets.
          </p>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #1f2937;">Why KYC is Required:</h3>
          <ul style="color: #4b5563; font-size: 16px; line-height: 1.8;">
            <li>Regulatory compliance and security</li>
            <li>Protect your account from unauthorized access</li>
            <li>Enable withdrawals and payouts</li>
            <li>Access to all premium features</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="https://account.rivertonmarkets.com/kyc" 
             style="background: #f59e0b; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
            Complete KYC Now
          </a>
        </div>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
          <p style="margin: 0; color: #4b5563; font-size: 14px;">
            <strong>Quick & Easy:</strong> Verification takes less than 5 minutes. Have your ID ready!
          </p>
        </div>
      </div>
    `
  },

  account_purchase_reminder: {
    subject: 'Ready to Start Trading? Choose Your Account',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #1e3a8a; margin: 0; font-size: 28px;">Your Trading Journey Awaits</h1>
        </div>
        
        <div style="background: #f3f4f6; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hi ${data.name},</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            You're registered with Riverton Markets, but haven't chosen your trading account yet. 
            Don't miss out on this opportunity!
          </p>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #1f2937;">Popular Account Sizes:</h3>
          <div style="display: grid; gap: 15px;">
            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <strong style="color: #1e40af; font-size: 18px;">$5,000 Account</strong>
              <p style="color: #1e40af; margin: 5px 0;">Perfect for beginners - One-time fee: $49</p>
            </div>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
              <strong style="color: #065f46; font-size: 18px;">$25,000 Account</strong>
              <p style="color: #065f46; margin: 5px 0;">Most popular choice - One-time fee: $199</p>
            </div>
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <strong style="color: #92400e; font-size: 18px;">$100,000 Account</strong>
              <p style="color: #92400e; margin: 5px 0;">Professional traders - One-time fee: $499</p>
            </div>
          </div>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="https://account.rivertonmarkets.com/buy-account" 
             style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
            View All Accounts
          </a>
        </div>

        <div style="background: #dcfce7; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
          <p style="margin: 0; color: #065f46; font-size: 14px;">
            <strong>Limited Time:</strong> Get started today and receive exclusive trading resources!
          </p>
        </div>
      </div>
    `
  },

  account_approved: {
    subject: 'Congratulations! Your Trading Account is Approved',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #059669; margin: 0; font-size: 32px;">Account Approved!</h1>
        </div>
        
        <div style="background: #d1fae5; padding: 30px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #059669;">
          <h2 style="color: #065f46; margin-top: 0;">Hi ${data.name},</h2>
          <p style="color: #047857; font-size: 16px; line-height: 1.6;">
            Great news! Your trading account has been approved and is ready to use.
          </p>
        </div>

        <div style="background: #f3f4f6; padding: 25px; border-radius: 8px; margin-bottom: 30px;">
          <h3 style="color: #1f2937; margin-top: 0;">Your Account Details:</h3>
          <table style="width: 100%; color: #4b5563;">
            <tr>
              <td style="padding: 10px 0;"><strong>Account Size:</strong></td>
              <td style="text-align: right;">$${data.accountBalance?.toLocaleString() || '0'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>MT5 Login:</strong></td>
              <td style="text-align: right; font-family: monospace;">${data.mt5Login || 'See Dashboard'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>MT5 Password:</strong></td>
              <td style="text-align: right; font-family: monospace;">${data.mt5Password || 'See Dashboard'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Server:</strong></td>
              <td style="text-align: right;">${data.mt5Server || 'RivertonMarkets-Live'}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="https://account.rivertonmarkets.com/trading-accounts" 
             style="background: #059669; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
            View Account Details
          </a>
        </div>

        <div style="background: #eff6ff; padding: 20px; border-radius: 8px;">
          <p style="margin: 0; color: #1e40af; font-size: 14px;">
            <strong>Next Step:</strong> Download MetaTrader 5 and start trading with your new account!
          </p>
        </div>
      </div>
    `
  },

  account_breached: {
    subject: 'Important: Trading Account Alert',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #dc2626; margin: 0; font-size: 28px;">Account Alert</h1>
        </div>
        
        <div style="background: #fee2e2; padding: 30px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #dc2626;">
          <h2 style="color: #991b1b; margin-top: 0;">Hi ${data.name},</h2>
          <p style="color: #7f1d1d; font-size: 16px; line-height: 1.6;">
            Your trading account has been flagged due to a rule violation.
          </p>
        </div>

        <div style="background: #f3f4f6; padding: 25px; border-radius: 8px; margin-bottom: 30px;">
          <h3 style="color: #1f2937; margin-top: 0;">Breach Details:</h3>
          <p style="color: #4b5563; margin: 10px 0;"><strong>Reason:</strong> ${data.breachReason || 'Rule violation detected'}</p>
          <p style="color: #4b5563; margin: 10px 0;"><strong>Account:</strong> ${data.accountLogin || 'N/A'}</p>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #1f2937;">What This Means:</h3>
          <ul style="color: #4b5563; font-size: 16px; line-height: 1.8;">
            <li>Trading on this account has been suspended</li>
            <li>Please review our trading rules</li>
            <li>You can purchase a new account to continue trading</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="https://account.rivertonmarkets.com/rules" 
             style="background: #dc2626; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; margin-right: 10px;">
            Review Rules
          </a>
          <a href="https://account.rivertonmarkets.com/buy-account" 
             style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
            Get New Account
          </a>
        </div>
      </div>
    `
  },

  kyc_pending: {
    subject: 'KYC Verification Received - Under Review',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #1e3a8a; margin: 0; font-size: 28px;">KYC Under Review</h1>
        </div>
        
        <div style="background: #fef3c7; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #92400e; margin-top: 0;">Hi ${data.name},</h2>
          <p style="color: #78350f; font-size: 16px; line-height: 1.6;">
            We've received your KYC documents and our team is reviewing them. This usually takes 24-48 hours.
          </p>
        </div>

        <div style="background: #eff6ff; padding: 20px; border-radius: 8px;">
          <p style="margin: 0; color: #1e40af; font-size: 14px;">
            We'll notify you as soon as your verification is complete. Thank you for your patience!
          </p>
        </div>
      </div>
    `
  },

  kyc_approved: {
    subject: 'KYC Verification Approved - You\'re All Set!',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #059669; margin: 0; font-size: 32px;">KYC Approved!</h1>
        </div>
        
        <div style="background: #d1fae5; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #065f46; margin-top: 0;">Hi ${data.name},</h2>
          <p style="color: #047857; font-size: 16px; line-height: 1.6;">
            Congratulations! Your identity has been verified. You now have full access to all Riverton Markets features.
          </p>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="https://account.rivertonmarkets.com/buy-account" 
             style="background: #059669; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
            Choose Your Trading Account
          </a>
        </div>
      </div>
    `
  },

  kyc_rejected: {
    subject: 'KYC Verification - Additional Information Required',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #dc2626; margin: 0; font-size: 28px;">KYC Update Required</h1>
        </div>
        
        <div style="background: #fee2e2; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #991b1b; margin-top: 0;">Hi ${data.name},</h2>
          <p style="color: #7f1d1d; font-size: 16px; line-height: 1.6;">
            We need additional information to complete your verification.
          </p>
          <p style="color: #7f1d1d; margin-top: 15px;"><strong>Reason:</strong> ${data.reason || 'Document quality issue'}</p>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="https://account.rivertonmarkets.com/kyc" 
             style="background: #dc2626; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
            Resubmit Documents
          </a>
        </div>
      </div>
    `
  },

  no_purchase_7days: {
    subject: 'Still Thinking? Here\'s What You\'re Missing',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #1e3a8a; margin: 0; font-size: 28px;">Don't Miss Out</h1>
        </div>
        
        <div style="background: #f3f4f6; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hi ${data.name},</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            It's been a week since you joined Riverton Markets. We noticed you haven't selected your trading account yet.
          </p>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #1f2937;">What Our Traders Are Saying:</h3>
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #3b82f6;">
            <p style="color: #1e40af; margin: 0; font-style: italic;">
              "Best decision I made. Passed my first challenge in 3 weeks!" - Michael R.
            </p>
          </div>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981;">
            <p style="color: #065f46; margin: 0; font-style: italic;">
              "Professional platform, fast payouts. Highly recommended!" - Sarah T.
            </p>
          </div>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="https://account.rivertonmarkets.com/buy-account" 
             style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
            Start Trading Today
          </a>
        </div>
      </div>
    `
  },

  no_purchase_14days: {
    subject: 'Last Chance: Exclusive Offer Inside',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #7c3aed; margin: 0; font-size: 32px;">Special Offer for You</h1>
        </div>
        
        <div style="background: #f5f3ff; padding: 30px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #7c3aed;">
          <h2 style="color: #5b21b6; margin-top: 0;">Hi ${data.name},</h2>
          <p style="color: #6d28d9; font-size: 16px; line-height: 1.6;">
            It's been 2 weeks since you registered. We want to help you get started with a special offer!
          </p>
        </div>

        <div style="background: #dcfce7; padding: 30px; border-radius: 8px; margin-bottom: 30px; text-align: center; border: 2px solid #10b981;">
          <h2 style="color: #065f46; margin: 0 0 15px 0; font-size: 24px;">Limited Time Offer</h2>
          <p style="color: #047857; font-size: 28px; font-weight: bold; margin: 0;">Get 10% OFF</p>
          <p style="color: #065f46; margin: 15px 0 0 0;">On your first trading account</p>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="https://account.rivertonmarkets.com/buy-account" 
             style="background: #7c3aed; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
            Claim Your Offer
          </a>
        </div>

        <div style="background: #fef3c7; padding: 20px; border-radius: 8px;">
          <p style="margin: 0; color: #92400e; font-size: 14px; text-align: center;">
            <strong>Hurry!</strong> This offer expires in 48 hours.
          </p>
        </div>
      </div>
    `
  },

  inactive_user: {
    subject: 'We Miss You! Come Back to Riverton Markets',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #1e3a8a; margin: 0; font-size: 28px;">We Miss You!</h1>
        </div>
        
        <div style="background: #f3f4f6; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hi ${data.name},</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            We noticed you haven't been active lately. We'd love to have you back!
          </p>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #1f2937;">What's New at Riverton Markets:</h3>
          <ul style="color: #4b5563; font-size: 16px; line-height: 1.8;">
            <li>New account sizes available</li>
            <li>Improved trading conditions</li>
            <li>Faster payout processing</li>
            <li>Enhanced support team</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="https://account.rivertonmarkets.com/dashboard" 
             style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
            Return to Dashboard
          </a>
        </div>
      </div>
    `
  },

  payout_approved: {
    subject: 'Payout Approved - Funds on the Way!',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #059669; margin: 0; font-size: 32px;">Payout Approved!</h1>
        </div>
        
        <div style="background: #d1fae5; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #065f46; margin-top: 0;">Hi ${data.name},</h2>
          <p style="color: #047857; font-size: 16px; line-height: 1.6;">
            Great news! Your payout request has been approved and processed.
          </p>
        </div>

        <div style="background: #f3f4f6; padding: 25px; border-radius: 8px; margin-bottom: 30px;">
          <h3 style="color: #1f2937; margin-top: 0;">Payout Details:</h3>
          <table style="width: 100%; color: #4b5563;">
            <tr>
              <td style="padding: 10px 0;"><strong>Amount:</strong></td>
              <td style="text-align: right;">$${data.amount?.toLocaleString() || '0'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Method:</strong></td>
              <td style="text-align: right;">${data.method || 'Bank Transfer'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Est. Arrival:</strong></td>
              <td style="text-align: right;">2-3 business days</td>
            </tr>
          </table>
        </div>

        <div style="background: #eff6ff; padding: 20px; border-radius: 8px;">
          <p style="margin: 0; color: #1e40af; font-size: 14px;">
            Funds will be transferred to your registered payment method shortly.
          </p>
        </div>
      </div>
    `
  },

  payout_rejected: {
    subject: 'Payout Request Update Required',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #dc2626; margin: 0; font-size: 28px;">Payout Update Required</h1>
        </div>
        
        <div style="background: #fee2e2; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #991b1b; margin-top: 0;">Hi ${data.name},</h2>
          <p style="color: #7f1d1d; font-size: 16px; line-height: 1.6;">
            We need additional information to process your payout request.
          </p>
          <p style="color: #7f1d1d; margin-top: 15px;"><strong>Reason:</strong> ${data.reason || 'Additional verification required'}</p>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="https://account.rivertonmarkets.com/payouts" 
             style="background: #dc2626; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
            Update Payout Request
          </a>
        </div>
      </div>
    `
  },

  no_kyc_reminder: {
    subject: 'Complete Your Verification - Quick & Easy!',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #1e3a8a; margin: 0; font-size: 28px;">Just One More Step!</h1>
        </div>
        
        <div style="background: #fef3c7; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #92400e; margin-top: 0;">Hi ${data.name},</h2>
          <p style="color: #78350f; font-size: 16px; line-height: 1.6;">
            You're so close! Complete your KYC verification to unlock full access to trading accounts.
          </p>
        </div>

        <div style="background: #dcfce7; padding: 25px; border-radius: 8px; margin-bottom: 30px; text-align: center;">
          <p style="color: #065f46; margin: 0; font-size: 18px; font-weight: bold;">Takes Less Than 5 Minutes</p>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="https://account.rivertonmarkets.com/kyc" 
             style="background: #f59e0b; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
            Complete Verification
          </a>
        </div>
      </div>
    `
  },

  admin_payout_requested: {
    subject: '📢 New Payout Request - Action Required',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #3b82f6; margin: 0; font-size: 28px;">📢 New Payout Request</h1>
        </div>
        
        <div style="background: #dbeafe; padding: 30px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #3b82f6;">
          <h2 style="color: #1e40af; margin-top: 0;">Payout Request Details</h2>
          <p style="color: #1e40af; font-size: 16px; line-height: 1.6;">
            A trader has requested a payout. Please review and process.
          </p>
        </div>

        <div style="background: #f3f4f6; padding: 25px; border-radius: 8px; margin-bottom: 30px;">
          <h3 style="color: #1f2937; margin-top: 0;">Request Information:</h3>
          <table style="width: 100%; color: #4b5563;">
            <tr>
              <td style="padding: 10px 0;"><strong>Trader Name:</strong></td>
              <td style="text-align: right;">${data.userName || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>User Email:</strong></td>
              <td style="text-align: right;">${data.userEmail || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>MT5 Account:</strong></td>
              <td style="text-align: right; font-family: monospace;">${data.mt5Login || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Account Package:</strong></td>
              <td style="text-align: right;">${data.packageName || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Amount Requested:</strong></td>
              <td style="text-align: right; font-size: 20px; font-weight: bold; color: #059669;">$${data.amount?.toLocaleString() || '0'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Wallet Address:</strong></td>
              <td style="text-align: right; font-family: monospace; font-size: 12px;">${data.walletAddress || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Current Profit:</strong></td>
              <td style="text-align: right;">$${data.currentProfit?.toLocaleString() || '0'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Initial Equity:</strong></td>
              <td style="text-align: right;">$${data.initialEquity?.toLocaleString() || '0'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Running Equity:</strong></td>
              <td style="text-align: right;">$${data.runningEquity?.toLocaleString() || '0'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Request ID:</strong></td>
              <td style="text-align: right; font-family: monospace; font-size: 12px;">${data.requestId || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Request Time:</strong></td>
              <td style="text-align: right;">${data.requestTime || new Date().toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="https://account.rivertonmarkets.com/admin/payouts" 
             style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
            Review Payout Request
          </a>
        </div>

        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>Note:</strong> Please verify all account details before approving the payout.
          </p>
        </div>
      </div>
    `
  },

  account_purchase_submitted: {
    subject: 'Payment Received - Account Under Review',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #1e3a8a; margin: 0; font-size: 28px;">Payment Received!</h1>
        </div>
        
        <div style="background: #dbeafe; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1e40af; margin-top: 0;">Hi ${data.name},</h2>
          <p style="color: #1e40af; font-size: 16px; line-height: 1.6;">
            Thank you for your purchase! We've received your payment proof and our team is reviewing it now.
          </p>
        </div>

        <div style="background: #f3f4f6; padding: 25px; border-radius: 8px; margin-bottom: 30px;">
          <h3 style="color: #1f2937; margin-top: 0;">Purchase Details:</h3>
          <table style="width: 100%; color: #4b5563;">
            <tr>
              <td style="padding: 10px 0;"><strong>Account Package:</strong></td>
              <td style="text-align: right;">${data.packageName || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Account Size:</strong></td>
              <td style="text-align: right;">$${data.packageBalance?.toLocaleString() || '0'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Fee Paid:</strong></td>
              <td style="text-align: right; font-size: 18px; font-weight: bold; color: #059669;">$${data.amount?.toFixed(2) || '0.00'}</td>
            </tr>
          </table>
        </div>

        <div style="background: #eff6ff; padding: 25px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #3b82f6;">
          <h3 style="color: #1e40af; margin-top: 0;">What Happens Next?</h3>
          <ol style="color: #1e40af; font-size: 16px; line-height: 1.8; margin: 10px 0;">
            <li>Our team reviews your payment proof (usually within 24 hours)</li>
            <li>You'll receive your MT5 login credentials via email</li>
            <li>Download MetaTrader 5 and start trading!</li>
          </ol>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="https://account.rivertonmarkets.com/dashboard" 
             style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
            Go to Dashboard
          </a>
        </div>

        <div style="background: #dcfce7; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
          <p style="margin: 0; color: #065f46; font-size: 14px;">
            <strong>Pro Tip:</strong> While waiting, download MetaTrader 5 so you can start trading immediately once approved!
          </p>
        </div>
      </div>
    `
  },

  admin_account_purchase_notification: {
    subject: '🔔 New Account Purchase - Payment Submitted',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #3b82f6; margin: 0; font-size: 28px;">🔔 New Account Purchase</h1>
        </div>
        
        <div style="background: #dbeafe; padding: 30px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #3b82f6;">
          <h2 style="color: #1e40af; margin-top: 0;">Payment Proof Submitted</h2>
          <p style="color: #1e40af; font-size: 16px; line-height: 1.6;">
            A user has submitted payment for an account purchase. Please review and approve.
          </p>
        </div>

        <div style="background: #f3f4f6; padding: 25px; border-radius: 8px; margin-bottom: 30px;">
          <h3 style="color: #1f2937; margin-top: 0;">Purchase Information:</h3>
          <table style="width: 100%; color: #4b5563;">
            <tr>
              <td style="padding: 10px 0;"><strong>User Name:</strong></td>
              <td style="text-align: right;">${data.userName || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>User Email:</strong></td>
              <td style="text-align: right;">${data.userEmail || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Package:</strong></td>
              <td style="text-align: right;">${data.packageName || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Amount Paid:</strong></td>
              <td style="text-align: right; font-size: 20px; font-weight: bold; color: #059669;">$${data.amount?.toFixed(2) || '0.00'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Request ID:</strong></td>
              <td style="text-align: right; font-family: monospace; font-size: 12px;">${data.requestId || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Submission Time:</strong></td>
              <td style="text-align: right;">${data.requestTime || new Date().toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="https://account.rivertonmarkets.com/admin/approvals" 
             style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
            Review Purchase Request
          </a>
        </div>

        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>Action Required:</strong> Please verify the payment proof and approve the account creation.
          </p>
        </div>
      </div>
    `
  }
};

export async function sendEmail({ to, template, data = {}, userId }: EmailParams & { userId?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const templateConfig = EMAIL_TEMPLATES[template];
    if (!templateConfig) {
      throw new Error(`Unknown email template: ${template}`);
    }

    const { data: response, error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject: templateConfig.subject,
        html: templateConfig.html(data),
        userId,
        template
      }
    });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Email send error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send email'
    };
  }
}

// Track email sends to avoid duplicates
export async function logEmailSent(userId: string, template: EmailTemplate) {
  try {
    await supabase.from('email_logs').insert({
      user_id: userId,
      template,
      sent_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error logging email:', err);
  }
}

// Check if email was already sent
export async function wasEmailSent(userId: string, template: EmailTemplate, withinDays: number = 7): Promise<boolean> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - withinDays);

    const { data, error } = await supabase
      .from('email_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('template', template)
      .gte('sent_at', cutoffDate.toISOString())
      .limit(1);

    if (error) throw error;
    return (data?.length ?? 0) > 0;
  } catch (err) {
    console.error('Error checking email log:', err);
    return false;
  }
}
