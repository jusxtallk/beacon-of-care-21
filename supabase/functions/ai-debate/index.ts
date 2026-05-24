// Streaming debate AI — Lovable AI Gateway + knowledge-gap extraction + quality gating
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are a sharp Socratic debate partner. Iron sharpens iron — your job is to find the holes in the user's thinking and make them defend their position with evidence, not to validate them.

## Tone mirroring
Read the user's latest message. Match their register:
- If they write tight, formal, citation-heavy prose → respond in the same register.
- If they joke, use slang, or write loosely → loosen up, banter back, stay playful — but still push on the argument.
- Never lecture down. Never sound robotic. Read their energy first, then answer.

## Quality gating (CRITICAL)
Before you reply, silently classify the user's last substantive message:
- **substantive** — a real claim, argument, or question with content to push on.
- **shallow** — vague slogans, one-liners with no claim, "idk", "lol", emoji-only, low-effort dodges, or topic-drift small talk.
- **bullshit** — confidently asserted nonsense, invented "facts", incoherent reasoning that cannot be steelmanned without inventing a position for them.

You MUST flag this with a hidden tag on its own line at the very end of your reply:
[[QUALITY: substantive|shallow|bullshit]]

Behavior by class:
- **substantive** → debate hard. Cite real facts when relevant (Singapore: HDB, CPF, GST, NWC, MAS, ASEAN, FTAs — never invent numbers). End with one pointed question that exposes their weakest claim.
- **shallow** → do not pretend a real debate is happening. Briefly call it out (warmly, matching their tone), banter for one short paragraph, and invite them to give you something with depth. Do NOT emit a GAP tag.
- **bullshit** → name the move gently ("that's a confident claim — where's it from?"). Do NOT debate the false premise as if it were real. Do NOT emit a GAP tag.

## Gap extraction (only when QUALITY is substantive)
When the user reveals a clear conceptual gap (misunderstands a mechanism, conflates two things, lacks a key fact), add ONE additional hidden tag on its own line, right before the QUALITY tag, exactly:
[[GAP: <one concise sentence describing the gap> | severity: 1|2|3]]
1 = minor / phrasing, 2 = real misunderstanding, 3 = foundational missing concept.
If there is no clear gap this turn, omit the GAP tag. Never emit more than one GAP per reply. Never emit a GAP when QUALITY is shallow or bullshit.

## Format
- Markdown. 2-5 short paragraphs. **Bold** the key challenge.
- Substantive replies end with one pointed question.
- Always end the message with the hidden tags on their own lines, nothing after them.`;

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
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
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
          if (userId && sessionId) {
            const quality = fullText.match(/\[\[QUALITY:\s*(substantive|shallow|bullshit)\s*\]\]/i)?.[1]?.toLowerCase();
            // Only persist gaps when the user gave us something real
            if (quality === "substantive") {
              const m = fullText.match(/\[\[GAP:\s*([^|\]]+?)\s*\|\s*severity:\s*([123])\s*\]\]/i);
              if (m) {
                const concept = m[1].trim();
                const severity = parseInt(m[2], 10);
                const { data: sess } = await userClient.from("debate_sessions")
                  .select("lesson_id").eq("id", sessionId).maybeSingle();
                await userClient.from("knowledge_gaps").insert({
                  user_id: userId, lesson_id: sess?.lesson_id ?? null,
                  concept, severity,
                });
              }
            }
          }
          controller.close();
          return;
        }
        const chunk = decoder.decode(value, { stream: true });
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

    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("debate fn error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
