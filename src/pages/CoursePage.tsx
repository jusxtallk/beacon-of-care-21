import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, CheckCircle2, Circle, Clock } from "lucide-react";

interface Course { id: string; title: string; summary: string; }
interface Lesson { id: string; title: string; bloom_level: number; bloom_label: string; est_minutes: number; sort_order: number; }

const CoursePage = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!courseId) return;
    (async () => {
      const [{ data: c }, { data: ls }] = await Promise.all([
        supabase.from("courses").select("id,title,summary").eq("id", courseId).maybeSingle(),
        supabase.from("lessons").select("id,title,bloom_level,bloom_label,est_minutes,sort_order")
          .eq("course_id", courseId).order("sort_order"),
      ]);
      if (c) setCourse(c);
      if (ls) setLessons(ls);
      if (user && ls?.length) {
        const { data: prog } = await supabase.from("lesson_progress")
          .select("lesson_id").eq("user_id", user.id)
          .in("lesson_id", ls.map((l) => l.id)).not("completed_at", "is", null);
        if (prog) setCompleted(new Set(prog.map((p) => p.lesson_id)));
      }
    })();
  }, [courseId, user]);

  if (!course) return <main className="min-h-dvh grid place-items-center bg-background"><p className="text-muted-foreground">Loading…</p></main>;

  const done = completed.size;
  const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-2xl mx-auto px-5 pt-8">
        <button onClick={() => navigate(-1)} aria-label="Back" className="flex items-center gap-1 text-sm text-muted-foreground mb-6 min-h-11">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="font-display text-4xl mb-2">{course.title}</h1>
        <p className="text-muted-foreground mb-6">{course.summary}</p>
        <div className="flex items-center gap-3 mb-8 text-sm">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-muted-foreground tabular-nums">{done}/{lessons.length}</span>
        </div>

        <ol className="space-y-2">
          {lessons.map((l, idx) => {
            const isDone = completed.has(l.id);
            return (
              <li key={l.id}>
                <button
                  onClick={() => navigate(`/lesson/${l.id}`)}
                  className="w-full text-left rounded-lg bg-card border border-border p-4 hover:border-foreground/20 transition flex items-start gap-3"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {isDone
                      ? <CheckCircle2 className="w-5 h-5 text-primary" />
                      : <Circle className="w-5 h-5 text-muted-foreground/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-primary">
                      Bloom L{l.bloom_level} · {l.bloom_label}
                    </p>
                    <p className="font-semibold">{idx + 1}. {l.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {l.est_minutes} min
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      <BottomNav />
    </main>
  );
};
export default CoursePage;
