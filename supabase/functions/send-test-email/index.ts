import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get SMTP config
    const { data: smtpData, error: smtpError } = await supabaseClient
      .from('smtp_config')
      .select('*')
      .single();

    if (smtpError) throw new Error('Failed to get SMTP configuration');
    if (!smtpData) throw new Error('SMTP configuration not found');

    // Get email data from request
    const { to, subject, html } = await req.json();

    // Create SMTP client
    const client = new SmtpClient();

    // Connect to SMTP server
    await client.connectTLS({
      hostname: smtpData.host,
      port: smtpData.port,
      username: smtpData.username,
      password: smtpData.password
    });

    // Send email
    await client.send({
      from: smtpData.from_email,
      to: to,
      subject: subject,
      content: html,
      html: html
    });

    // Close connection
    await client.close();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error('Test email error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to send test email',
        details: error instanceof Error ? error.stack : undefined
      }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});