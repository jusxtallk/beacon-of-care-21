import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all elders
    const { data: elders } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "elder");

    if (!elders || elders.length === 0) {
      return new Response(JSON.stringify({ message: "No elders found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const alertsSent: string[] = [];

    for (const elder of elders) {
      // Get latest check-in
      const { data: lastCheckIn } = await supabase
        .from("check_ins")
        .select("checked_in_at")
        .eq("user_id", elder.user_id)
        .order("checked_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const isOverdue =
        !lastCheckIn ||
        new Date(lastCheckIn.checked_in_at) < twoDaysAgo;

      if (!isOverdue) continue;

      // Check if we already sent an alert in the last 24 hours for this elder
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const { data: recentAlert } = await supabase
        .from("alerts")
        .select("id")
        .eq("elder_id", elder.user_id)
        .eq("alert_type", "high_priority_missed")
        .gte("created_at", oneDayAgo.toISOString())
        .limit(1)
        .maybeSingle();

      if (recentAlert) continue; // Already alerted recently

      // Get elder's name
      const { data: elderProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", elder.user_id)
        .maybeSingle();

      const elderName = elderProfile?.full_name || "Unknown Elder";

      // Get caregivers for this elder
      const { data: caregivers } = await supabase
        .from("care_relationships")
        .select("caregiver_id")
        .eq("elder_id", elder.user_id);

      if (!caregivers || caregivers.length === 0) continue;

      // Create alert record
      await supabase.from("alerts").insert({
        elder_id: elder.user_id,
        alert_type: "high_priority_missed",
        message: `HIGH PRIORITY: ${elderName} has not checked in for over 2 days. Immediate attention required.`,
      });

      // Send email to each caregiver
      for (const cg of caregivers) {
        // Get caregiver's email from auth
        const { data: userData } = await supabase.auth.admin.getUserById(
          cg.caregiver_id
        );

        if (userData?.user?.email) {
          // Send email using Supabase's built-in email via edge function
          const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-alert-email`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: userData.user.email,
              elderName,
              lastCheckIn: lastCheckIn?.checked_in_at || null,
            }),
          });

          if (emailRes.ok) {
            alertsSent.push(userData.user.email);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Checked all elders. Alerts sent to: ${alertsSent.length} caregivers`,
        emails: alertsSent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in check-missed-checkins:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
