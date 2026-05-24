import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import { LogOut, Flame, Target, BookOpen, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Topic { id: string; title: string; }
interface Gap { id: string; concept: string; severity: number; }

const ProfilePage = () => {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [interests, setInterests] = useState<Set<string>>(new Set());
  const [completedCount, setCompletedCount] = useState(0);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [goal, setGoal] = useState(profile?.daily_goal_minutes ?? 15);

  useEffect(() => { if (profile) setGoal(profile.daily_goal_minutes); }, [profile]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: ts }, { data: ints }, { count }, { data: gs }] = await Promise.all([
        supabase.from("topics").select("id,title").order("sort_order"),
        supabase.from("user_interests").select("topic_id").eq("user_id", user.id),
        supabase.from("lesson_progress").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).not("completed_at", "is", null),
        supabase.from("knowledge_gaps").select("id,concept,severity")
          .eq("user_id", user.id).eq("resolved", false).order("created_at", { ascending: false }),
      ]);
      if (ts) setTopics(ts);
      if (ints) setInterests(new Set(ints.map((i) => i.topic_id)));
      setCompletedCount(count ?? 0);
      if (gs) setGaps(gs);
    })();
  }, [user]);

  const toggleInterest = async (topicId: string) => {
    if (!user) return;
    if (interests.has(topicId)) {
      await supabase.from("user_interests").delete().eq("user_id", user.id).eq("topic_id", topicId);
      const next = new Set(interests); next.delete(topicId); setInterests(next);
    } else {
      await supabase.from("user_interests").insert({ user_id: user.id, topic_id: topicId });
      setInterests(new Set([...interests, topicId]));
    }
  };

  const saveGoal = async (m: number) => {
    if (!user) return;
    setGoal(m);
    await supabase.from("profiles").update({ daily_goal_minutes: m }).eq("user_id", user.id);
    await refreshProfile();
    toast.success("Goal updated");
  };

  const resolveGap = async (id: string) => {
    await supabase.from("knowledge_gaps").update({ resolved: true }).eq("id", id);
    setGaps(gaps.filter((g) => g.id !== id));
  };

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-2xl mx-auto px-5 pt-10">
        <h1 className="font-display text-4xl mb-1">{profile?.full_name || "You"}</h1>
        <p className="text-muted-foreground text-sm mb-8">{user?.email}</p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="rounded-lg bg-card border border-border p-3">
            <Flame className="w-4 h-4 text-primary mb-1" />
            <p className="font-display text-2xl">{profile?.current_streak ?? 0}</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Streak</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-3">
            <BookOpen className="w-4 h-4 text-primary mb-1" />
            <p className="font-display text-2xl">{completedCount}</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Lessons</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-3">
            <AlertCircle className="w-4 h-4 text-primary mb-1" />
            <p className="font-display text-2xl">{gaps.length}</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Open gaps</p>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="font-display text-2xl mb-3 flex items-center gap-2"><Target className="w-4 h-4" /> Daily goal</h2>
          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 15, 30].map((m) => (
              <button
                key={m}
                onClick={() => saveGoal(m)}
                className={`py-3 rounded-lg border transition ${
                  goal === m ? "border-primary bg-primary/5" : "border-border bg-card text-muted-foreground"
                }`}
              >
                <div className="font-display text-xl">{m}</div>
                <div className="text-[10px] uppercase tracking-wider">min</div>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl mb-3">Topics you follow</h2>
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => {
              const on = interests.has(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleInterest(t.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition min-h-11 ${
                    on ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground"
                  }`}
                >
                  {t.title}
                </button>
              );
            })}
          </div>
        </section>

        {gaps.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display text-2xl mb-3">Knowledge gaps</h2>
            <div className="space-y-2">
              {gaps.map((g) => (
                <div key={g.id} className="rounded-lg bg-card border border-border p-3 flex items-start gap-2">
                  <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${g.severity === 3 ? "text-destructive" : g.severity === 2 ? "text-warning" : "text-muted-foreground"}`} />
                  <p className="text-sm flex-1">{g.concept}</p>
                  <button onClick={() => resolveGap(g.id)} aria-label="Mark resolved" className="text-muted-foreground hover:text-foreground min-w-11 min-h-11 grid place-items-center">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <button
          onClick={signOut}
          className="w-full rounded-lg border border-border bg-card text-foreground py-3 flex items-center justify-center gap-2 min-h-11"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
      <BottomNav />
    </main>
  );
};
export default ProfilePage;
