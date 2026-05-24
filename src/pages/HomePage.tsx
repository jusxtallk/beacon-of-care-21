import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Flame, Target, MessageSquareQuote, Sparkles, CheckCircle2 } from "lucide-react";

interface ContinueItem {
  lesson_id: string;
  title: string;
  bloom_label: string;
  course_title: string;
}
interface RecommendedCourse {
  id: string;
  title: string;
  summary: string;
  topic_title: string;
}

const HomePage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [continueItems, setContinueItems] = useState<ContinueItem[]>([]);
  const [recommended, setRecommended] = useState<RecommendedCourse[]>([]);
  const [openGaps, setOpenGaps] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: act } = await supabase
        .from("daily_activity").select("minutes")
        .eq("user_id", user.id).eq("activity_date", today).maybeSingle();
      setTodayMinutes(act?.minutes ?? 0);

      // continue: in-progress lessons
      const { data: prog } = await supabase
        .from("lesson_progress")
        .select("lesson_id, lessons(title, bloom_label, courses(title))")
        .eq("user_id", user.id).is("completed_at", null)
        .order("last_seen_at", { ascending: false }).limit(3);
      if (prog) {
        setContinueItems(prog.map((p: any) => ({
          lesson_id: p.lesson_id,
          title: p.lessons?.title ?? "Lesson",
          bloom_label: p.lessons?.bloom_label ?? "",
          course_title: p.lessons?.courses?.title ?? "",
        })));
      }

      // recommended: courses in interest topics
      const { data: ints } = await supabase
        .from("user_interests").select("topic_id").eq("user_id", user.id);
      const topicIds = (ints ?? []).map((i) => i.topic_id);
      if (topicIds.length) {
        const { data: courses } = await supabase
          .from("courses").select("id, title, summary, topics(title)")
          .in("topic_id", topicIds).order("sort_order").limit(4);
        if (courses) {
          setRecommended(courses.map((c: any) => ({
            id: c.id, title: c.title, summary: c.summary,
            topic_title: c.topics?.title ?? "",
          })));
        }
      } else {
        const { data: courses } = await supabase
          .from("courses").select("id, title, summary, topics(title)").limit(4);
        if (courses) setRecommended(courses.map((c: any) => ({
          id: c.id, title: c.title, summary: c.summary, topic_title: c.topics?.title ?? "",
        })));
      }

      const { count } = await supabase
        .from("knowledge_gaps").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("resolved", false);
      setOpenGaps(count ?? 0);
    })();
  }, [user]);

  const goal = profile?.daily_goal_minutes ?? 15;
  const pct = Math.min(100, Math.round((todayMinutes / goal) * 100));

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-2xl mx-auto px-5 pt-10">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{new Date().toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="font-display text-4xl mt-1 mb-1">Hello, {profile?.full_name?.split(" ")[0] || "friend"}.</h1>
        <p className="text-muted-foreground mb-6 text-sm">What will you learn today?</p>

        {/* Goal + streak */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="rounded-lg bg-card border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Target className="w-3.5 h-3.5" /> TODAY
            </div>
            <div className="font-display text-3xl">{todayMinutes}<span className="text-base text-muted-foreground">/{goal}m</span></div>
            <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="rounded-lg bg-card border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Flame className="w-3.5 h-3.5" /> STREAK
            </div>
            <div className="font-display text-3xl">{profile?.current_streak ?? 0}<span className="text-base text-muted-foreground"> days</span></div>
            <p className="text-xs text-muted-foreground mt-2">{(profile?.current_streak ?? 0) > 0 ? "Keep going" : "Start today"}</p>
          </div>
        </div>

        {/* Continue */}
        {continueItems.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display text-2xl mb-3">Continue where you left off</h2>
            <div className="space-y-2">
              {continueItems.map((c) => (
                <button
                  key={c.lesson_id}
                  onClick={() => navigate(`/lesson/${c.lesson_id}`)}
                  className="w-full text-left rounded-lg bg-card border border-border p-4 hover:border-foreground/20 transition flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-primary">{c.bloom_label}</p>
                    <p className="font-semibold truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.course_title}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Debate CTA */}
        <button
          onClick={() => navigate("/debate")}
          className="w-full rounded-lg bg-foreground text-background p-5 mb-8 flex items-center gap-4 text-left hover:opacity-95 transition"
        >
          <div className="w-11 h-11 rounded-full bg-primary grid place-items-center flex-shrink-0">
            <MessageSquareQuote className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-display text-xl">Debate the AI</p>
            <p className="text-xs opacity-70">{openGaps > 0 ? `${openGaps} knowledge gap${openGaps === 1 ? "" : "s"} flagged` : "Find the holes in your thinking"}</p>
          </div>
          <ArrowRight className="w-4 h-4 opacity-60" />
        </button>

        {/* Recommended */}
        <section className="mb-8">
          <div className="flex items-end justify-between mb-3">
            <h2 className="font-display text-2xl">For you</h2>
            <button onClick={() => navigate("/library")} className="text-sm text-primary font-medium">Full library →</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {recommended.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/course/${c.id}`)}
                className="text-left rounded-lg bg-card border border-border p-5 hover:border-foreground/20 transition group"
              >
                <p className="text-[11px] uppercase tracking-wider text-primary mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> {c.topic_title}
                </p>
                <p className="font-display text-xl mb-1 group-hover:text-primary transition">{c.title}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{c.summary}</p>
              </button>
            ))}
          </div>
        </section>
      </div>
      <BottomNav />
    </main>
  );
};
export default HomePage;
