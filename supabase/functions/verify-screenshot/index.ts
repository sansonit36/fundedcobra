import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface VerificationRequest {
  imageUrl: string;
  amount: number;
  paymentMethod: string;
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageUrl, amount, paymentMethod, userId }: VerificationRequest = await req.json();

    console.log('🔍 [AI VERIFICATION] Received request', { imageUrl, amount, paymentMethod, userId });

    // Get OpenAI API key from environment
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured in Supabase Edge Function secrets');
    }

    console.log('🔑 [AI VERIFICATION] OpenAI API key found');

    // Call OpenAI Vision API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Latest GPT-4 with vision
        messages: [
          {
            role: 'system',
            content: `You are an expert payment screenshot verifier. Analyze the image and determine if it's a legitimate payment screenshot.

VERIFICATION CRITERIA:
1. Is this a genuine payment/transaction screenshot (not random image, meme, or fake)?
2. Does it show payment interface elements (amount, recipient, timestamp, transaction ID)?
3. Is it from a recognized payment app (banking app, crypto wallet, JazzCash, Nayapay, etc.)?
4. Are there visible transaction details (amount, date, status)?
5. Is the screenshot quality reasonable (not heavily edited or manipulated)?

IMPORTANT: The year 2025 is valid since we are in November 2025. Do not flag future dates in 2025 as suspicious.

COMMON FAKE INDICATORS:
- Random images unrelated to payments
- Screenshots of Google images or other websites
- Heavily photoshopped or edited images
- Screenshots of payment method selection (not actual confirmation)
- Memes, drawings, or AI-generated images
- Screenshots of payment amount entry (not confirmation)
- Selfies or personal photos

LOOK FOR THESE SPECIFIC ELEMENTS:
- Names: Husnain Ghani, Hussnain Ghani
- USDT addresses starting with T
- Payment amounts matching the expected amount
- Payment method names (JazzCash, Nayapay, Bank Transfer, USDT)

IMPORTANT: You MUST respond ONLY with valid JSON in this exact format:
{
  "isValid": true or false,
  "confidence": number from 0 to 100,
  "reason": "brief explanation",
  "paymentType": "bank_transfer", "crypto", "mobile_money", "unknown",
  "redFlags": ["list", "of", "suspicious", "elements"]
}

No other text, markdown, or explanation - just the JSON object.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Expected payment amount: $${amount} USD or equivalent in ${paymentMethod}. Verify if this is a real payment screenshot.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1 // Low temperature for consistent results
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      console.error('Status:', openaiResponse.status);
      console.error('Status Text:', openaiResponse.statusText);
      throw new Error(`AI verification failed: ${openaiResponse.status} - ${errorText}`);
    }

    const aiResult = await openaiResponse.json();
    const aiMessage = aiResult.choices[0]?.message?.content;

    console.log('🤖 [AI RESPONSE] Raw AI response:', JSON.stringify(aiResult, null, 2));

    if (!aiMessage) {
      throw new Error('No response from AI');
    }

    console.log('💬 [AI MESSAGE] AI message content:', aiMessage);

    // Parse AI response
    let verification;
    try {
      verification = JSON.parse(aiMessage);
    } catch {
      // If AI doesn't return valid JSON, try to extract verification from text
      // Look for JSON object in the response
      const jsonMatch = aiMessage.match(/\{[^}]+\}/s);
      if (jsonMatch) {
        try {
          verification = JSON.parse(jsonMatch[0]);
        } catch {
          // If still can't parse, use fallback logic
          const isValid = aiMessage.toLowerCase().includes('valid') && 
                         !aiMessage.toLowerCase().includes('not valid') &&
                         !aiMessage.toLowerCase().includes('invalid');
          verification = {
            isValid,
            confidence: isValid ? 70 : 30, // Higher confidence if valid
            reason: 'AI response parsing improved fallback',
            paymentType: 'unknown',
            redFlags: []
          };
        }
      } else {
        // No JSON found in response
        const isValid = aiMessage.toLowerCase().includes('valid') && 
                       !aiMessage.toLowerCase().includes('not valid') &&
                       !aiMessage.toLowerCase().includes('invalid');
        verification = {
          isValid,
          confidence: isValid ? 70 : 30,
          reason: 'AI response parsing fallback - no JSON found',
          paymentType: 'unknown',
          redFlags: []
        };
      }
    }

    console.log('✅ [PARSED RESULT] Parsed verification result:', JSON.stringify(verification, null, 2));

    // Log verification attempt
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from('screenshot_verifications').insert({
      user_id: userId,
      image_url: imageUrl,
      is_valid: verification.isValid,
      confidence: verification.confidence,
      ai_reason: verification.reason,
      payment_type: verification.paymentType,
      red_flags: verification.redFlags,
      expected_amount: amount,
      payment_method: paymentMethod,
      verified_at: new Date().toISOString()
    });

    // Don't suspend account immediately - send to admin for review instead
    // Only mark as suspicious for admin review
    if (!verification.isValid || verification.confidence < 40) {
      // Log suspicious activity but don't suspend
      console.log('⚠️ [SUSPICIOUS] Marking screenshot for admin review instead of suspending');
      // We could add a flag to the user profile or verification record here
    }

    return new Response(
      JSON.stringify({
        success: true,
        verification,
        accountSuspended: false // Don't suspend accounts, send to admin review instead
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Screenshot verification error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
