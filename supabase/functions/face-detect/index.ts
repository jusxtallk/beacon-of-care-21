import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a face detection system for a check-in app. Analyze the camera image and return a JSON object with these fields:
- "face_detected": boolean - true if a human face is clearly visible
- "face_in_oval": boolean - true if the face is roughly centered and fills the frame well
- "is_dark": boolean - true if the image is too dark/black to see anything
- "is_bright": boolean - true if the image is too bright/white/washed out
- "guidance": string - one short instruction for the user. Options:
  - "Perfect! Hold still" (face is well positioned)
  - "Move closer" (face is too small/far)
  - "Move further back" (face is too close/large, taking up most of the frame)
  - "Move left" (face is too far right)
  - "Move right" (face is too far left)
  - "Move up" (face is too low)
  - "Move down" (face is too high)
  - "Show your face" (no face detected but image is clear)
  - "Too dark, find better lighting" (image is mostly black)
  - "Too bright, reduce lighting" (image is mostly white)
- "confidence": number 0-100 - how confident you are a real human face is present

The image is from a front-facing selfie camera (mirrored). Consider the face centered if it's roughly in the middle 60% of the frame horizontally and vertically.
Return ONLY the JSON object, no other text.`
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: image }
              },
              {
                type: "text",
                text: "Analyze this camera frame for face detection. Return only JSON."
              }
            ]
          }
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response (handle markdown code blocks)
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { face_detected: false, guidance: "Unable to analyze", confidence: 0 };
    } catch {
      result = { face_detected: false, guidance: "Unable to analyze", confidence: 0 };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("face-detect error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
