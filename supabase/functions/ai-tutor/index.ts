// AI Sharpen — in-lesson tutor that re-establishes core ideas, spots logical fallacies and biases.
// Non-streaming JSON response so the UI can render structured corrections.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are a precision tutor. The user is studying a specific lesson and just shared a thought, summary, or claim about it. Your job is to make them sharper — not nicer.

For their input, return a JSON object with this exact shape:
{
  "core_anchor": "<one sentence restating the lesson's true core idea, in plain words>",
  "alignment": "aligned | partial | off",
  "corrections": ["<concrete correction, max 2 sentences>", ...],
  "fallacies": [{"name":"<logical fallacy or cognitive bias name>","why":"<why it applies to their statement, 1-2 sentences>"}],
  "sharper_question": "<one question that forces them to stress-test their own claim>"
}

Rules:
- "core_anchor" must reflect THE LESSON, not the user's words. This re-establishes the core idea.
- "alignment" — "aligned" if they got it; "partial" if half-right; "off" if they missed the point.
- "corrections" — empty array if there is nothing to correct. Otherwise, specific, blunt, and grounded in the lesson content. No padding.
- "fallacies" — name real fallacies/biases only when present (e.g., "Survivorship bias", "Strawman", "Affirming the consequent", "Anchoring", "Sunk cost", "Hasty generalisation"). Include WHY for each. Empty array if none.
- "sharper_question" — one open question. Should make them defend or refine their position, not test recall.
- If their input is too vague or shallow to assess (e.g. "ok cool", "got it"), set alignment="partial", corrections=["Give me a real summary in your own words — one sentence on what the lesson actually argues."], fallacies=[], and sharper_question="What is the strongest objection to this lesson's main claim?"
- Output ONLY the JSON object. No prose, no markdown, no code fences.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { lessonId, userInput } = await req.json();
    if (!lessonId || typeof userInput !== "string" || !userInput.trim()) {
      return new Response(JSON.stringify({ error: "lessonId and userInput required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
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

    const { data: lesson } = await userClient
      .from("lessons")
      .select("title,tl_dr,nuances,content_md,bloom_level,course_id")
      .eq("id", lessonId).maybeSingle();
    if (!lesson) {
      return new Response(JSON.stringify({ error: "lesson not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lessonContext = `Lesson title: ${lesson.title}
TL;DR: ${lesson.tl_dr ?? "(none)"}
Nuances: ${lesson.nuances ?? "(none)"}
Body:
${(lesson.content_md ?? "").slice(0, 4000)}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `LESSON CONTEXT:\n${lessonContext}\n\nUSER SAID:\n${userInput.slice(0, 2000)}` },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("tutor upstream", resp.status, text);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { parsed = { core_anchor: "", alignment: "partial", corrections: [], fallacies: [], sharper_question: "" }; }

    // Log gap if alignment off and we have user
    if (userId && parsed.alignment === "off" && Array.isArray(parsed.corrections) && parsed.corrections.length) {
      await userClient.from("knowledge_gaps").insert({
        user_id: userId,
        lesson_id: lessonId,
        concept: (parsed.corrections[0] as string).slice(0, 240),
        severity: 3,
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-tutor fn error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
