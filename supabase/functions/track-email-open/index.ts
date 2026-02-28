import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = Uint8Array.from(
  atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),
  c => c.charCodeAt(0)
);

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const emailLogId = url.searchParams.get('id');

    if (!emailLogId) {
      return new Response(TRACKING_PIXEL, {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    // Update email log with opened timestamp
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabase
      .from('email_logs')
      .update({ opened_at: new Date().toISOString() })
      .eq('id', emailLogId)
      .is('opened_at', null); // Only update if not already opened

    return new Response(TRACKING_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Email tracking error:', error);
    return new Response(TRACKING_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif'
      }
    });
  }
});
