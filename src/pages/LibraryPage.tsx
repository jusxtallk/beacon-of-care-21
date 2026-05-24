import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";

interface Topic { id: string; title: string; description: string; }
interface Course { id: string; topic_id: string; title: string; summary: string; level: string; }

const LibraryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"all" | "completed">("all");

  useEffect(() => {
    (async () => {
      const [{ data: ts }, { data: cs }] = await Promise.all([
        supabase.from("topics").select("id,title,description").order("sort_order"),
        supabase.from("courses").select("id,topic_id,title,summary,level").order("sort_order"),
      ]);
      if (ts) setTopics(ts);
      if (cs) setCourses(cs);

      if (user && cs?.length) {
        const courseIds = cs.map((c) => c.id);
        const [{ data: totals }, { data: done }] = await Promise.all([
          supabase.from("lessons").select("course_id").in("course_id", courseIds),
          supabase.from("lesson_progress")
            .select("lesson_id, lessons(course_id)")
            .eq("user_id", user.id).not("completed_at", "is", null),
        ]);
        const totalBy: Record<string, number> = {};
        (totals ?? []).forEach((l: any) => { totalBy[l.course_id] = (totalBy[l.course_id] ?? 0) + 1; });
        const doneBy: Record<string, number> = {};
        (done ?? []).forEach((p: any) => {
          const cid = p.lessons?.course_id;
          if (cid) doneBy[cid] = (doneBy[cid] ?? 0) + 1;
        });
        const ids = new Set<string>();
        for (const cid of courseIds) {
          if (totalBy[cid] && doneBy[cid] >= totalBy[cid]) ids.add(cid);
        }
        setCompletedIds(ids);
      }
    })();
  }, [user]);

  const completedCourses = courses.filter((c) => completedIds.has(c.id));
  const fromState = tab === "completed" ? "/library?tab=completed" : "/library";

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-2xl mx-auto px-5 pt-10">
        <h1 className="font-display text-4xl mb-1">Library</h1>
        <p className="text-muted-foreground mb-6 text-sm">Every course, organised by topic. Bloom-staged from <em>Remember</em> to <em>Create</em>.</p>

        <div className="flex gap-1 mb-8 p-1 bg-muted rounded-lg w-fit">
          <button
            onClick={() => setTab("all")}
            className={`px-4 py-1.5 text-sm rounded-md transition ${tab === "all" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
          >
            All courses
          </button>
          <button
            onClick={() => setTab("completed")}
            className={`px-4 py-1.5 text-sm rounded-md transition flex items-center gap-1.5 ${tab === "completed" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed {completedCourses.length > 0 && `(${completedCourses.length})`}
          </button>
        </div>

        {tab === "completed" ? (
          completedCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No completed courses yet. Finish a course to see it here.</p>
          ) : (
            <div className="space-y-2">
              {completedCourses.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/course/${c.id}`, { state: { from: fromState } })}
                  className="w-full text-left rounded-lg bg-card border border-border p-4 hover:border-foreground/20 transition flex items-start gap-3"
                >
                  <CheckCircle2 className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{c.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{c.summary}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                </button>
              ))}
            </div>
          )
        ) : (
          topics.map((t) => {
            const tCourses = courses.filter((c) => c.topic_id === t.id);
            if (!tCourses.length) return null;
            return (
              <section key={t.id} className="mb-10">
                <h2 className="font-display text-2xl">{t.title}</h2>
                <p className="text-sm text-muted-foreground mb-4">{t.description}</p>
                <div className="space-y-2">
                  {tCourses.map((c) => {
                    const isDone = completedIds.has(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => navigate(`/course/${c.id}`, { state: { from: fromState } })}
                        className="w-full text-left rounded-lg bg-card border border-border p-4 hover:border-foreground/20 transition flex items-start gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold flex items-center gap-2">
                            {c.title}
                            {isDone && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{c.summary}</p>
                          <p className="text-[11px] uppercase tracking-wider text-primary mt-2">{c.level}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
      <BottomNav />
    </main>
  );
};
export default LibraryPage;
