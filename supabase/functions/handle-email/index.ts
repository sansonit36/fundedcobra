import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";
import { corsHeaders } from '../_shared/cors.ts';

const SITE_URL = Deno.env.get('SITE_URL') ?? '';
const PROJECT_NAME = Deno.env.get('PROJECT_NAME') ?? 'FundedCobra';


serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 204,
      headers: corsHeaders 
    });
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

    const { type, email, template } = await req.json();

    // Create SMTP client
    const client = new SmtpClient();

    // Connect to SMTP server
    await client.connectTLS({
      hostname: smtpData.host,
      port: smtpData.port,
      username: smtpData.username,
      password: smtpData.password
    });

    // Customize email template based on type
    let subject = '';
    let html = '';

    switch (type) {
      case 'signup':
        subject = `Welcome to ${PROJECT_NAME}`;
        html = template.replace(/http:\/\/localhost:3000/g, SITE_URL);
        break;
      case 'magiclink':
        subject = 'Your Magic Link';
        html = template.replace(/http:\/\/localhost:3000/g, SITE_URL);
        break;
      case 'recovery':
        subject = 'Reset Your Password';
        html = template.replace(/http:\/\/localhost:3000/g, SITE_URL);
        break;
      default:
        throw new Error('Invalid email type');
    }

    // Send email
    await client.send({
      from: smtpData.from_email,
      to: email,
      subject,
      content: html,
      html
    });

    // Close connection
    await client.close();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error('Email error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to send email',
        details: error instanceof Error ? error.stack : undefined
      }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});