import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let emailsSent = 0;

    // Get SMTP config
    const { data: smtpConfig } = await supabase
      .from('smtp_config')
      .select('*')
      .single();

    if (!smtpConfig) {
      throw new Error('SMTP configuration not found');
    }

    // --- 7-DAY NO PURCHASE EMAIL ---
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const { data: users7days } = await supabase
      .from('profiles')
      .select('id, name, email, created_at')
      .gte('created_at', eightDaysAgo.toISOString())
      .lte('created_at', sevenDaysAgo.toISOString());

    for (const user of users7days || []) {
      // Check if they have purchased
      const { data: purchases } = await supabase
        .from('account_requests')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (!purchases?.length) {
        // Check if email already sent
        const { data: emailLog } = await supabase
          .from('email_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('template', 'no_purchase_7days')
          .limit(1);

        if (!emailLog?.length) {
          // Send 7-day email
          await supabase.functions.invoke('send-email', {
            body: {
              to: user.email,
              subject: 'Still Thinking? Here\'s What You\'re Missing',
              html: get7DayEmailHTML(user.name)
            }
          });

          // Log email sent
          await supabase.from('email_logs').insert({
            user_id: user.id,
            template: 'no_purchase_7days'
          });

          emailsSent++;
        }
      }
    }

    // --- 14-DAY DISCOUNT OFFER EMAIL ---
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const { data: users14days } = await supabase
      .from('profiles')
      .select('id, name, email, created_at')
      .gte('created_at', fifteenDaysAgo.toISOString())
      .lte('created_at', fourteenDaysAgo.toISOString());

    for (const user of users14days || []) {
      // Check if they have purchased
      const { data: purchases } = await supabase
        .from('account_requests')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (!purchases?.length) {
        // Check if email already sent
        const { data: emailLog } = await supabase
          .from('email_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('template', 'no_purchase_14days')
          .limit(1);

        if (!emailLog?.length) {
          // Send 14-day email
          await supabase.functions.invoke('send-email', {
            body: {
              to: user.email,
              subject: 'Last Chance: Exclusive Offer Inside',
              html: get14DayEmailHTML(user.name)
            }
          });

          // Log email sent
          await supabase.from('email_logs').insert({
            user_id: user.id,
            template: 'no_purchase_14days'
          });

          emailsSent++;
        }
      }
    }

    // --- KYC REMINDER (3 days after signup, no KYC) ---
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    const { data: users3days } = await supabase
      .from('profiles')
      .select('id, name, email, created_at')
      .gte('created_at', fourDaysAgo.toISOString())
      .lte('created_at', threeDaysAgo.toISOString());

    for (const user of users3days || []) {
      // Check if they have KYC
      const { data: kyc } = await supabase
        .from('kyc_verifications')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (!kyc?.length) {
        // Check if email already sent
        const { data: emailLog } = await supabase
          .from('email_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('template', 'no_kyc_reminder')
          .limit(1);

        if (!emailLog?.length) {
          // Send KYC reminder
          await supabase.functions.invoke('send-email', {
            body: {
              to: user.email,
              subject: 'Complete Your Verification - Quick & Easy!',
              html: getKYCReminderHTML(user.name)
            }
          });

          // Log email sent
          await supabase.from('email_logs').insert({
            user_id: user.id,
            template: 'no_kyc_reminder'
          });

          emailsSent++;
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent,
        message: `Sent ${emailsSent} marketing emails`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Marketing email error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function get7DayEmailHTML(name: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #1e3a8a; margin: 0; font-size: 28px;">Don't Miss Out</h1>
      </div>
      
      <div style="background: #f3f4f6; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
        <h2 style="color: #1f2937; margin-top: 0;">Hi ${name},</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          It's been a week since you joined FundedCobra. We noticed you haven't selected your trading account yet.
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
        <a href="https://account.fundedcobra.com/buy-account" 
           style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
          Start Trading Today
        </a>
      </div>
    </div>
  `;
}

function get14DayEmailHTML(name: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #7c3aed; margin: 0; font-size: 32px;">Special Offer for You</h1>
      </div>
      
      <div style="background: #f5f3ff; padding: 30px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #7c3aed;">
        <h2 style="color: #5b21b6; margin-top: 0;">Hi ${name},</h2>
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
        <a href="https://account.fundedcobra.com/buy-account" 
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
  `;
}

function getKYCReminderHTML(name: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #1e3a8a; margin: 0; font-size: 28px;">Just One More Step!</h1>
      </div>
      
      <div style="background: #fef3c7; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
        <h2 style="color: #92400e; margin-top: 0;">Hi ${name},</h2>
        <p style="color: #78350f; font-size: 16px; line-height: 1.6;">
          You're so close! Complete your KYC verification to unlock full access to trading accounts.
        </p>
      </div>

      <div style="background: #dcfce7; padding: 25px; border-radius: 8px; margin-bottom: 30px; text-align: center;">
        <p style="color: #065f46; margin: 0; font-size: 18px; font-weight: bold;">Takes Less Than 5 Minutes</p>
      </div>

      <div style="text-align: center; margin: 40px 0;">
        <a href="https://account.fundedcobra.com/kyc" 
           style="background: #f59e0b; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
          Complete Verification
        </a>
      </div>
    </div>
  `;
}
