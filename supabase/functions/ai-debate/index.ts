// Streaming debate AI — Lovable AI Gateway + knowledge-gap extraction
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are a relentless Socratic debate partner for a learner studying Singapore — its economy, governance, law, NTUC/tripartism, diplomacy, and ministries. Your job is NOT to validate them; it is to find the holes in their thinking and force them to defend their position with evidence.

Rules:
- Always pick the strongest counter-position, even if you privately agree. Steelman the other side.
- Cite real Singapore facts when possible (HDB, CPF, GST, NWC, MAS, ASEAN, FTAs, etc.) but never invent statistics.
- Push on assumptions. Ask "how do you know?", "what would change your mind?", "what does that imply for X?"
- Stay tight: 3-6 short paragraphs max per reply, written in Markdown. Use **bold** for the key challenge.
- End every message with ONE pointed question that exposes their weakest claim.
- When the user reveals a clear conceptual gap (misunderstands a mechanism, conflates two things, lacks a key fact), you MUST flag it at the very end of your message in a hidden tag exactly like this — on its own line, no other text in the tag:
[[GAP: <one concise sentence describing the gap> | severity: 1|2|3]]
Severity: 1 = minor / phrasing, 2 = real misunderstanding, 3 = foundational missing concept.
If there is no clear gap this turn, do not emit the tag. Never emit more than one gap per reply.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { sessionId, topic, messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sysContent = `${SYSTEM_PROMPT}\n\nDebate topic: ${topic || "general"}.`;
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [{ role: "system", content: sysContent }, ...messages],
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error("upstream error", upstream.status, text);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!upstream.body) {
      return new Response(JSON.stringify({ error: "no body" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tap the stream: forward to client, accumulate full text to extract GAP tag at end.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    // get user id from jwt
    let userId: string | null = null;
    try {
      const jwt = authHeader.replace("Bearer ", "");
      const { data } = await userClient.auth.getUser(jwt);
      userId = data.user?.id ?? null;
    } catch (_) {}

    let fullText = "";
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const reader = upstream.body.getReader();

    const stream = new ReadableStream({
      async pull(controller) {
        const { value, done } = await reader.read();
        if (done) {
          // post-process: extract [[GAP: ... | severity: N]]
          if (userId && sessionId) {
            const m = fullText.match(/\[\[GAP:\s*([^|\]]+?)\s*\|\s*severity:\s*([123])\s*\]\]/i);
            if (m) {
              const concept = m[1].trim();
              const severity = parseInt(m[2], 10);
              // fetch lesson_id from session
              const { data: sess } = await userClient.from("debate_sessions")
                .select("lesson_id").eq("id", sessionId).maybeSingle();
              await userClient.from("knowledge_gaps").insert({
                user_id: userId, lesson_id: sess?.lesson_id ?? null,
                concept, severity,
              });
            }
          }
          controller.close();
          return;
        }
        const chunk = decoder.decode(value, { stream: true });
        // try to extract content deltas to accumulate
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload);
            const d = j.choices?.[0]?.delta?.content;
            if (d) fullText += d;
          } catch { /* ignore partials */ }
        }
        controller.enqueue(encoder.encode(chunk));
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("debate fn error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
