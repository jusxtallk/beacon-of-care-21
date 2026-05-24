import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { MessageSquareQuote, Plus, Sparkles, AlertCircle, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Session { id: string; topic_title: string; created_at: string; }
interface Gap { id: string; concept: string; severity: number; created_at: string; }

const suggestedTopics = [
  "Should Singapore raise GST further to fund ageing?",
  "Is the GRC system still justified?",
  "Should NTUC be independent of the PAP?",
  "Is Singapore's foreign worker policy fair?",
  "Should HDB resale prices be capped?",
];

const DebateHubPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [customTopic, setCustomTopic] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: ss }, { data: gs }] = await Promise.all([
        supabase.from("debate_sessions").select("id,topic_title,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("knowledge_gaps").select("id,concept,severity,created_at").eq("user_id", user.id).eq("resolved", false).order("created_at", { ascending: false }).limit(10),
      ]);
      if (ss) setSessions(ss);
      if (gs) setGaps(gs);
    })();
  }, [user]);

  const startSession = async (title: string) => {
    if (!user || !title.trim()) return;
    const { data, error } = await supabase.from("debate_sessions")
      .insert({ user_id: user.id, topic_title: title.trim() })
      .select("id").single();
    if (error || !data) { toast.error("Could not start"); return; }
    navigate(`/debate/${data.id}`);
  };

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-2xl mx-auto px-5 pt-10">
        <h1 className="font-display text-4xl mb-1">Debate</h1>
        <p className="text-muted-foreground mb-8 text-sm">Argue with an AI that won't let you off easy. It'll log your weak spots.</p>

        {/* Start new */}
        <section className="mb-8">
          <h2 className="font-display text-2xl mb-3">Start a debate</h2>
          <div className="flex gap-2 mb-4">
            <input
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startSession(customTopic)}
              placeholder="What do you want to argue about?"
              className="flex-1 rounded-lg border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => startSession(customTopic)}
              disabled={!customTopic.trim()}
              aria-label="Start debate"
              className="rounded-lg bg-primary text-primary-foreground px-4 disabled:opacity-40 min-h-11 min-w-11 grid place-items-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Or try</p>
          <div className="space-y-2">
            {suggestedTopics.map((t) => (
              <button
                key={t}
                onClick={() => startSession(t)}
                className="w-full text-left rounded-lg bg-card border border-border p-3 hover:border-foreground/20 transition flex items-center gap-2 text-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="flex-1">{t}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        </section>

        {/* Knowledge gaps */}
        {gaps.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display text-2xl mb-3">Your open gaps</h2>
            <div className="space-y-2">
              {gaps.map((g) => (
                <div key={g.id} className="rounded-lg bg-card border border-border p-3 flex items-start gap-2">
                  <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${g.severity === 3 ? "text-destructive" : g.severity === 2 ? "text-warning" : "text-muted-foreground"}`} />
                  <p className="text-sm flex-1">{g.concept}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Past sessions */}
        {sessions.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display text-2xl mb-3">Past debates</h2>
            <div className="space-y-2">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/debate/${s.id}`)}
                  className="w-full text-left rounded-lg bg-card border border-border p-3 hover:border-foreground/20 transition flex items-center gap-3"
                >
                  <MessageSquareQuote className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{s.topic_title}</p>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
      <BottomNav />
    </main>
  );
};
export default DebateHubPage;
