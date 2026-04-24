const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wdgqsltxvpjyghjuavvf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZ3FzbHR4dnBqeWdoanVhdnZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzY3MzU2MCwiZXhwIjoyMDUzMjQ5NTYwfQ.hp5lF6Bmz3CwGFOw1aT8FJE7M3d-P4DkZ_6-KyYK1ew';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addPromotionTemplate() {
  const template = {
    template_key: 'account_phase_promotion',
    subject: 'Congratulations! You Have Promoted to {{newPhase}}',
    html_body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px;">
  <h1 style="color: #bd4dd6; text-align: center;">Next Step Achieved!</h1>
  <p>Hi {{name}},</p>
  <p>Congratulations! Your trading performance has been reviewed and you have successfully moved to the next stage of your {{packageName}}.</p>
  <p><strong>New Status:</strong> {{newPhase}}</p>
  <p><strong>Account Login:</strong> {{accountLogin}}</p>
  <p>Your trading credentials remain the same. If you have reached "Funded" status, you can now start earning real profit splits!</p>
  <div style="text-align: center; margin: 40px 0;">
    <a href="https://account.fundedcobra.com/trading-accounts" style="background: #bd4dd6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block;">View My Account</a>
  </div>
  <p style="color: #808080; font-size: 12px; text-align: center;">Keep up the great work!</p>
</div>`
  };

  const { error } = await supabase.from('email_templates').upsert([template]);
  if (error) {
    console.error('Error adding template:', error);
  } else {
    console.log('✅ Account promotion email template added successfully!');
  }
}

addPromotionTemplate();
