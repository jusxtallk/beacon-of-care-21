import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Markdown } from "@/components/Markdown";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Msg { id?: string; role: "user" | "assistant"; content: string; }

const DebatePage = () => {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId || !user) return;
    (async () => {
      const { data: s } = await supabase.from("debate_sessions").select("topic_title").eq("id", sessionId).maybeSingle();
      if (s) setTopic(s.topic_title);
      const { data: ms } = await supabase.from("debate_messages")
        .select("id,role,content").eq("session_id", sessionId).order("created_at");
      if (ms) {
        setMessages(ms.filter((m: any) => m.role !== "system").map((m: any) => ({ id: m.id, role: m.role, content: m.content })));
        if (ms.length === 0) await openingMove(s?.topic_title ?? "");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const callDebate = async (history: Msg[], topicTitle: string) => {
    setStreaming(true);
    let assistant = "";
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-debate`;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Session expired — please sign in again.");
        setStreaming(false);
        return;
      }
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ sessionId, topic: topicTitle, messages: history }),
      });
      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Rate limit hit — wait a moment.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Add credits in Cloud settings.");
        else toast.error("Debate AI error");
        setStreaming(false);
        return;
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let done = false;
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += dec.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistant += delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: assistant };
                return copy;
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
      // persist messages (last user + this assistant)
      if (sessionId) {
        const lastUser = history[history.length - 1];
        if (lastUser?.role === "user") {
          await supabase.from("debate_messages").insert({ session_id: sessionId, role: "user", content: lastUser.content });
        }
        if (assistant) {
          await supabase.from("debate_messages").insert({ session_id: sessionId, role: "assistant", content: assistant });
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Connection error");
    } finally {
      setStreaming(false);
    }
  };

  const openingMove = async (topicTitle: string) => {
    await callDebate([{ role: "user", content: `Begin the debate on: ${topicTitle}` }], topicTitle);
  };

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    await callDebate(next, topic);
  };

  return (
    <main className="min-h-dvh bg-background flex flex-col">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur px-5 pt-6 pb-3 border-b border-border">
        <button onClick={() => navigate("/debate")} aria-label="Back" className="flex items-center gap-1 text-sm text-muted-foreground mb-2 min-h-11">
          <ArrowLeft className="w-4 h-4" /> Debates
        </button>
        <p className="text-[11px] uppercase tracking-widest text-primary">Active debate</p>
        <h1 className="font-display text-2xl line-clamp-2">{topic || "…"}</h1>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 max-w-2xl w-full mx-auto">
        <div className="space-y-4">
          {messages.map((m, i) => {
            const quality = m.role === "assistant"
              ? m.content.match(/\[\[QUALITY:\s*(substantive|shallow|off_topic|incoherent|bullshit)\s*\]\]/i)?.[1]?.toLowerCase()
              : null;
            const clean = m.role === "assistant"
              ? m.content
                  .replace(/\[\[GAP:[^\]]*\]\]/gi, "")
                  .replace(/\[\[QUALITY:[^\]]*\]\]/gi, "")
                  .trim()
              : m.content;
            const flagStyles: Record<string, string> = {
              shallow: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
              off_topic: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
              incoherent: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
              bullshit: "bg-destructive/15 text-destructive border-destructive/30",
            };
            const flagLabel: Record<string, string> = {
              shallow: "Low depth — not saved to your profile",
              off_topic: "Off-topic — not saved to your profile",
              incoherent: "Unclear logic — not saved to your profile",
              bullshit: "Unverified claim — not saved to your profile",
            };
            return (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                }`}>
                  {m.role === "assistant"
                    ? <div className="text-sm"><Markdown>{clean || "…"}</Markdown></div>
                    : <p className="text-sm whitespace-pre-wrap">{m.content}</p>}
                  {quality && quality !== "substantive" && (
                    <div className={`mt-2 inline-block text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded border ${flagStyles[quality]}`}>
                      {flagLabel[quality]}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {streaming && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </div>


      <div className="border-t border-border bg-background px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Make your argument…"
            rows={1}
            className="flex-1 resize-none rounded-lg border border-border bg-card px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring max-h-32"
          />
          <button
            onClick={send}
            disabled={!input.trim() || streaming}
            aria-label="Send"
            className="rounded-lg bg-primary text-primary-foreground px-4 disabled:opacity-40 min-h-11 min-w-11 grid place-items-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </main>
  );
};
export default DebatePage;
