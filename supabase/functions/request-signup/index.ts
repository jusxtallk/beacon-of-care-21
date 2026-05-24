// Public endpoint — accepts signup requests and emails the owner for approval.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OWNER_EMAIL = "justustohjunyi20@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { email, full_name } = await req.json();
    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: "email and full_name required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const emailNorm = String(email).trim().toLowerCase();
    const nameNorm = String(full_name).trim().slice(0, 120);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Reject if already pending or already a user
    const { data: existingPending } = await admin
      .from("signup_requests")
      .select("id")
      .eq("email", emailNorm)
      .eq("status", "pending")
      .maybeSingle();
    if (existingPending) {
      return new Response(JSON.stringify({ ok: true, message: "Request already pending. Await approval." }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: row, error } = await admin
      .from("signup_requests")
      .insert({ email: emailNorm, full_name: nameNorm })
      .select("id, approval_token")
      .single();
    if (error) throw error;

    const origin = req.headers.get("origin") || "";
    const approveUrl = `${SUPABASE_URL}/functions/v1/approve-signup?token=${row.approval_token}&action=approve&redirect=${encodeURIComponent(origin)}`;
    const denyUrl = `${SUPABASE_URL}/functions/v1/approve-signup?token=${row.approval_token}&action=deny&redirect=${encodeURIComponent(origin)}`;

    // Try to send approval email via Lovable transactional email (if configured).
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          to: OWNER_EMAIL,
          subject: `Athenaeum — signup request from ${emailNorm}`,
          html: `
            <h2>New signup request</h2>
            <p><strong>${nameNorm}</strong> &lt;${emailNorm}&gt; wants to join Athenaeum.</p>
            <p>
              <a href="${approveUrl}" style="background:#000;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block;margin-right:8px">Approve</a>
              <a href="${denyUrl}" style="background:#eee;color:#000;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Deny</a>
            </p>
            <p style="color:#888;font-size:12px">If you didn't expect this, click Deny.</p>
          `,
        }),
      });
    } catch (e) {
      console.error("email send failed (non-fatal):", e);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("request-signup error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
