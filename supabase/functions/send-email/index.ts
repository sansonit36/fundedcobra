import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createTransport } from 'npm:nodemailer';
import { corsHeaders } from '../_shared/cors.ts';

interface EmailData {
  to: string;
  subject: string;
  html: string;
  userId?: string;
  template?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get SMTP config from environment variables
    const smtpConfig = {
      host: Deno.env.get('SMTP_HOST'),
      port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
      secure: Deno.env.get('SMTP_SECURE') === 'true',
      auth: {
        user: Deno.env.get('SMTP_USER'),
        pass: Deno.env.get('SMTP_PASS')
      }
    };

    const fromEmail = Deno.env.get('SMTP_FROM');
    if (!fromEmail) throw new Error('SMTP_FROM not configured');

    // Create transporter
    const transporter = createTransport(smtpConfig);

    // Get email data from request
    const emailData: EmailData = await req.json();

    // Send email
    await transporter.sendMail({
      from: fromEmail,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html
    });

    // Log email if userId and template are provided
    if (emailData.userId && emailData.template) {
      try {
        await supabase.from('email_logs').insert({
          user_id: emailData.userId,
          template: emailData.template,
          sent_at: new Date().toISOString()
        });
      } catch (logError) {
        console.error('Failed to log email:', logError);
        // Don't fail the request if logging fails
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});