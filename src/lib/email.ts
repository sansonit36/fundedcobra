import { supabase } from './supabase';

export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get SMTP config from database
    const { data: smtpData, error: smtpError } = await supabase
      .from('smtp_config')
      .select('*')
      .single();

    if (smtpError) throw new Error('Failed to get SMTP configuration');
    if (!smtpData) throw new Error('SMTP configuration not found');

    // Send test email using Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('send-test-email', {
      body: { 
        to,
        subject: 'Riverton Markets SMTP Test',
        html: `
          <h1>SMTP Test Successful</h1>
          <p>This email confirms that your SMTP configuration is working correctly.</p>
          <p>You can now use email notifications in your Riverton Markets platform.</p>
        `
      }
    });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('SMTP test error:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to send test email'
    };
  }
}