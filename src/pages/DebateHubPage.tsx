import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { MessageSquareQuote, Plus, Sparkles, AlertCircle, ArrowRight, Trash2, X, CheckSquare, Square } from "lucide-react";
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
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadAll = async () => {
    if (!user) return;
    const [{ data: ss }, { data: gs }] = await Promise.all([
      supabase.from("debate_sessions").select("id,topic_title,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("knowledge_gaps").select("id,concept,severity,created_at").eq("user_id", user.id).eq("resolved", false).order("created_at", { ascending: false }).limit(10),
    ]);
    if (ss) setSessions(ss);
    if (gs) setGaps(gs);
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [user]);

  const startSession = async (title: string) => {
    if (!user || !title.trim()) return;
    const { data, error } = await supabase.from("debate_sessions")
      .insert({ user_id: user.id, topic_title: title.trim() })
      .select("id").single();
    if (error || !data) { toast.error("Could not start"); return; }
    navigate(`/debate/${data.id}`);
  };

  const deleteSessions = async (ids: string[]) => {
    if (ids.length === 0) return;
    // delete messages first, then sessions
    const { error: mErr } = await supabase.from("debate_messages").delete().in("session_id", ids);
    if (mErr) { toast.error("Could not delete messages"); return; }
    const { error: sErr } = await supabase.from("debate_sessions").delete().in("id", ids);
    if (sErr) { toast.error("Could not delete debates"); return; }
    setSessions((prev) => prev.filter((s) => !ids.includes(s.id)));
    setSelected(new Set());
    setSelectMode(false);
    toast.success(`Deleted ${ids.length} debate${ids.length > 1 ? "s" : ""}`);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-2xl">Past debates</h2>
              {!selectMode ? (
                <button
                  onClick={() => setSelectMode(true)}
                  className="text-xs text-muted-foreground hover:text-foreground min-h-9 px-2"
                >
                  Select
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (selected.size === sessions.length) setSelected(new Set());
                      else setSelected(new Set(sessions.map(s => s.id)));
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground min-h-9 px-2"
                  >
                    {selected.size === sessions.length ? "None" : "All"}
                  </button>
                  <button
                    onClick={() => {
                      if (selected.size === 0) return;
                      if (confirm(`Delete ${selected.size} debate${selected.size > 1 ? "s" : ""}? This cannot be undone.`)) {
                        deleteSessions(Array.from(selected));
                      }
                    }}
                    disabled={selected.size === 0}
                    aria-label="Delete selected"
                    className="text-xs text-destructive disabled:opacity-30 min-h-9 px-2 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {selected.size || ""}
                  </button>
                  <button
                    onClick={() => { setSelectMode(false); setSelected(new Set()); }}
                    aria-label="Cancel"
                    className="text-muted-foreground hover:text-foreground min-h-9 min-w-9 grid place-items-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {sessions.map((s) => {
                const isSel = selected.has(s.id);
                return (
                  <div
                    key={s.id}
                    className={`group rounded-lg bg-card border p-3 flex items-center gap-3 transition ${
                      isSel ? "border-primary" : "border-border hover:border-foreground/20"
                    }`}
                  >
                    {selectMode ? (
                      <button
                        onClick={() => toggleSelect(s.id)}
                        aria-label={isSel ? "Deselect" : "Select"}
                        className="min-h-9 min-w-9 grid place-items-center"
                      >
                        {isSel ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    ) : (
                      <MessageSquareQuote className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                    <button
                      onClick={() => selectMode ? toggleSelect(s.id) : navigate(`/debate/${s.id}`)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="font-semibold text-sm truncate">{s.topic_title}</p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}</p>
                    </button>
                    {!selectMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this debate? This cannot be undone.")) {
                            deleteSessions([s.id]);
                          }
                        }}
                        aria-label="Delete debate"
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-destructive min-h-9 min-w-9 grid place-items-center transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
      <BottomNav />
    </main>
  );
};
export default DebateHubPage;
