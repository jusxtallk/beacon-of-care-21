// Public endpoint hit from owner's email. Validates token, then invites the user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function page(title: string, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0a0a;color:#fff}
  .card{max-width:420px;padding:32px;border:1px solid #222;border-radius:12px;background:#111}
  h1{margin:0 0 12px;font-size:22px}p{color:#aaa;line-height:1.6}</style></head>
  <body><div class="card">${body}</div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const action = url.searchParams.get("action");
  const redirect = url.searchParams.get("redirect") || "";

  const html = (status: number, t: string, b: string) =>
    new Response(page(t, b), { status, headers: { ...cors, "Content-Type": "text/html; charset=utf-8" } });

  if (!token || (action !== "approve" && action !== "deny")) {
    return html(400, "Invalid link", `<h1>Invalid link</h1><p>Missing or malformed parameters.</p>`);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: row } = await admin
      .from("signup_requests")
      .select("id, email, full_name, status")
      .eq("approval_token", token)
      .maybeSingle();

    if (!row) return html(404, "Not found", `<h1>Token not found</h1><p>This link is invalid or has been revoked.</p>`);
    if (row.status !== "pending") {
      return html(409, "Already handled", `<h1>Already ${row.status}</h1><p>This request has already been processed.</p>`);
    }

    if (action === "deny") {
      await admin.from("signup_requests").update({ status: "denied", processed_at: new Date().toISOString() }).eq("id", row.id);
      return html(200, "Denied", `<h1>Request denied</h1><p>${row.email} will not be sent an invite.</p>`);
    }

    // Approve → send Supabase invite email to user
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(row.email, {
      data: { full_name: row.full_name },
      redirectTo: redirect || undefined,
    });
    if (inviteErr) {
      console.error("invite failed", inviteErr);
      return html(500, "Invite failed", `<h1>Invite failed</h1><p>${inviteErr.message}</p>`);
    }

    await admin.from("signup_requests").update({ status: "approved", processed_at: new Date().toISOString() }).eq("id", row.id);
    return html(200, "Approved", `<h1>Approved ✓</h1><p>An invite email has been sent to <strong>${row.email}</strong>.</p>`);
  } catch (e) {
    console.error("approve-signup error", e);
    return html(500, "Error", `<h1>Error</h1><p>${String(e)}</p>`);
  }
});
