import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const certId = url.searchParams.get("id"); // Get single certificate by cert number

    // Single certificate lookup
    if (certId) {
      const { data, error } = await supabase
        .from("payout_certificates")
        .select("certificate_number, trader_name, account_type, account_size, payout_amount, payout_date, is_verified, verification_url")
        .eq("certificate_number", certId)
        .eq("is_verified", true)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Certificate not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mask full name: "Ryan Newman" -> "Ryan N."
      const nameParts = data.trader_name.split(" ");
      const maskedName = nameParts.length > 1
        ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
        : nameParts[0];

      return new Response(JSON.stringify({
        certificate: { ...data, trader_name: maskedName },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List all verified certificates (for the marketing wall)
    const { data: certificates, error, count } = await supabase
      .from("payout_certificates")
      .select("certificate_number, trader_name, account_type, account_size, payout_amount, payout_date, is_verified, verification_url", { count: "exact" })
      .eq("is_verified", true)
      .order("payout_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Mask trader names for privacy
    const maskedCertificates = (certificates || []).map((cert) => {
      const nameParts = cert.trader_name.split(" ");
      const maskedName = nameParts.length > 1
        ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
        : nameParts[0];
      return { ...cert, trader_name: maskedName };
    });

    // Get aggregate stats
    const { data: statsData } = await supabase
      .from("payout_certificates")
      .select("payout_amount")
      .eq("is_verified", true);

    const totalPaid = (statsData || []).reduce((sum, c) => sum + (c.payout_amount || 0), 0);
    const totalCerts = statsData?.length || 0;

    return new Response(JSON.stringify({
      certificates: maskedCertificates,
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (offset + limit) < (count || 0),
      },
      stats: {
        total_paid_out: totalPaid,
        total_certificates: totalCerts,
      },
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300", // Cache 5 minutes
      },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
