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
    const certId = url.searchParams.get("id");

    // Single certificate lookup
    if (certId) {
      const { data, error } = await supabase
        .from("payout_certificates")
        .select("certificate_number, trader_name, account_type, account_size, payout_amount, payout_date, is_verified, verification_url, user_id")
        .eq("certificate_number", certId)
        .eq("is_verified", true)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Certificate not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get avatar
      let avatar_url = null;
      if (data.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", data.user_id)
          .single();
        avatar_url = profile?.avatar_url || null;
      }

      // Mask full name
      const nameParts = data.trader_name.split(" ");
      const maskedName = nameParts.length > 1
        ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
        : nameParts[0];

      const { user_id, ...rest } = data;
      return new Response(JSON.stringify({
        certificate: { ...rest, trader_name: maskedName, avatar_url },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List all verified certificates
    const { data: certificates, error, count } = await supabase
      .from("payout_certificates")
      .select("certificate_number, trader_name, account_type, account_size, payout_amount, payout_date, is_verified, verification_url, user_id", { count: "exact" })
      .eq("is_verified", true)
      .order("payout_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Batch fetch avatars for all user_ids
    const userIds = [...new Set((certificates || []).map(c => c.user_id).filter(Boolean))];
    const avatarMap: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, avatar_url")
        .in("id", userIds);

      (profiles || []).forEach((p: any) => {
        if (p.avatar_url) avatarMap[p.id] = p.avatar_url;
      });
    }

    // Mask trader names and attach avatars
    const maskedCertificates = (certificates || []).map((cert) => {
      const nameParts = cert.trader_name.split(" ");
      const maskedName = nameParts.length > 1
        ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
        : nameParts[0];
      const { user_id, ...rest } = cert;
      return {
        ...rest,
        trader_name: maskedName,
        avatar_url: user_id ? (avatarMap[user_id] || null) : null,
      };
    });

    // Get aggregate stats
    const { data: statsData } = await supabase
      .from("payout_certificates")
      .select("payout_amount")
      .eq("is_verified", true);

    const totalPaid = (statsData || []).reduce((sum: number, c: any) => sum + (c.payout_amount || 0), 0);
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
        "Cache-Control": "public, max-age=300",
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
