import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Markdown } from "@/components/Markdown";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, MessageSquareQuote } from "lucide-react";
import { toast } from "sonner";

interface Lesson {
  id: string; course_id: string; title: string; bloom_level: number;
  bloom_label: string; content_md: string; est_minutes: number; sort_order: number;
  tl_dr: string | null; nuances: string | null;
  glossary: { term: string; definition: string }[];
  content_tags: string[];
  last_verified_at: string | null;
}
interface Quiz { id: string; prompt: string; choices: string[]; correct_index: number; explanation: string | null; bloom_level: number; }
interface Source { idx: number; title: string; url: string; publisher: string | null; }

const LessonPage = () => {
  const { lessonId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [nextLessonId, setNextLessonId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!lessonId) return;
    (async () => {
      const { data: l } = await supabase.from("lessons")
        .select("id,course_id,title,bloom_level,bloom_label,content_md,est_minutes,sort_order,tl_dr,nuances,glossary,content_tags,last_verified_at")
        .eq("id", lessonId).maybeSingle();
      if (!l) return;
      setLesson({ ...l, glossary: (l.glossary as any) ?? [], content_tags: (l.content_tags as any) ?? [] } as Lesson);

      const { data: srcs } = await supabase.from("lesson_sources")
        .select("idx,title,url,publisher").eq("lesson_id", lessonId).order("idx");
      if (srcs) setSources(srcs);

      const { data: qs } = await supabase.from("quiz_questions")
        .select("id,prompt,choices,correct_index,explanation,bloom_level")
        .eq("lesson_id", lessonId).order("sort_order");
      if (qs) setQuizzes(qs.map((q: any) => ({ ...q, choices: q.choices as string[] })));

      const { data: nl } = await supabase.from("lessons")
        .select("id").eq("course_id", l.course_id).gt("sort_order", l.sort_order)
        .order("sort_order").limit(1).maybeSingle();
      setNextLessonId(nl?.id ?? null);

      if (user) {
        const { data: prog } = await supabase.from("lesson_progress")
          .select("completed_at").eq("user_id", user.id).eq("lesson_id", lessonId).maybeSingle();
        if (prog?.completed_at) setCompleted(true);
        await supabase.from("lesson_progress").upsert({
          user_id: user.id, lesson_id: lessonId, last_seen_at: new Date().toISOString(),
        }, { onConflict: "user_id,lesson_id" });
      }
    })();
  }, [lessonId, user]);

  const submitQuiz = async (q: Quiz) => {
    if (answers[q.id] === undefined || !user || !lessonId) return;
    setSubmitted({ ...submitted, [q.id]: true });
    await supabase.from("quiz_attempts").insert({
      user_id: user.id, question_id: q.id, lesson_id: lessonId,
      selected_index: answers[q.id], is_correct: answers[q.id] === q.correct_index,
      bloom_level: q.bloom_level,
    });
  };

  const markComplete = async () => {
    if (!user || !lessonId || !lesson) return;
    const minutes = Math.max(1, Math.round((Date.now() - startTime) / 60000));
    await supabase.from("lesson_progress").upsert({
      user_id: user.id, lesson_id: lessonId,
      completed_at: new Date().toISOString(),
      minutes_spent: minutes, last_seen_at: new Date().toISOString(),
    }, { onConflict: "user_id,lesson_id" });

    // bump daily activity
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase.from("daily_activity")
      .select("minutes,lessons_completed").eq("user_id", user.id).eq("activity_date", today).maybeSingle();
    if (existing) {
      await supabase.from("daily_activity").update({
        minutes: existing.minutes + minutes,
        lessons_completed: existing.lessons_completed + 1,
      }).eq("user_id", user.id).eq("activity_date", today);
    } else {
      await supabase.from("daily_activity").insert({
        user_id: user.id, activity_date: today,
        minutes, lessons_completed: 1,
      });
      // streak bump
      const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const { data: profile } = await supabase.from("profiles")
        .select("current_streak,last_active_date").eq("user_id", user.id).maybeSingle();
      const newStreak = (profile?.last_active_date === yest) ? (profile.current_streak + 1) : 1;
      await supabase.from("profiles").update({
        current_streak: newStreak, last_active_date: today,
      }).eq("user_id", user.id);
    }

    setCompleted(true);
    toast.success("Lesson complete");
  };

  const startDebate = async () => {
    if (!user || !lesson) return;
    const { data, error } = await supabase.from("debate_sessions").insert({
      user_id: user.id, lesson_id: lesson.id, topic_title: lesson.title,
    }).select("id").single();
    if (error || !data) { toast.error("Could not start debate"); return; }
    navigate(`/debate/${data.id}`);
  };

  if (!lesson) return <main className="min-h-dvh grid place-items-center bg-background"><p className="text-muted-foreground">Loading…</p></main>;

  return (
    <main className="min-h-dvh bg-background pb-20">
      <div className="max-w-2xl mx-auto px-5 pt-8">
        <button onClick={() => navigate(`/course/${lesson.course_id}`)} aria-label="Back" className="flex items-center gap-1 text-sm text-muted-foreground mb-6 min-h-11">
          <ArrowLeft className="w-4 h-4" /> Back to course
        </button>

        <p className="text-[11px] uppercase tracking-widest text-primary mb-2">
          Bloom L{lesson.bloom_level} · {lesson.bloom_label} · {lesson.est_minutes} min
        </p>
        <h1 className="font-display text-4xl mb-4">{lesson.title}</h1>

        {lesson.content_tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {lesson.content_tags.map((t) => (
              <span key={t} className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-muted text-muted-foreground">{t}</span>
            ))}
          </div>
        )}

        {lesson.tl_dr && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 mb-4">
            <p className="text-[11px] uppercase tracking-widest text-primary mb-1">In one sentence</p>
            <p className="text-foreground">{lesson.tl_dr}</p>
          </div>
        )}

        <article className="mb-6">
          <Markdown>{lesson.content_md}</Markdown>
        </article>

        {lesson.nuances && (
          <div className="rounded-lg bg-card border-l-4 border-l-primary border border-border p-4 mb-6">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">It's more complicated because…</p>
            <p className="text-sm text-foreground">{lesson.nuances}</p>
          </div>
        )}

        {lesson.glossary?.length > 0 && (
          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Glossary</p>
            <div className="space-y-2">
              {lesson.glossary.map((g) => (
                <div key={g.term} className="text-sm rounded-md bg-muted/40 px-3 py-2">
                  <span className="font-semibold">{g.term}</span>
                  <span className="text-muted-foreground"> — {g.definition}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {quizzes.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display text-2xl mb-3">Check yourself</h2>
            <div className="space-y-4">
              {quizzes.map((q) => {
                const sub = submitted[q.id];
                const sel = answers[q.id];
                const correct = sel === q.correct_index;
                return (
                  <div key={q.id} className="rounded-lg bg-card border border-border p-4">
                    <p className="font-semibold mb-3">{q.prompt}</p>
                    <div className="space-y-2 mb-3">
                      {q.choices.map((choice, i) => {
                        const isSel = sel === i;
                        const isCorrect = sub && i === q.correct_index;
                        const isWrong = sub && isSel && i !== q.correct_index;
                        return (
                          <button
                            key={i}
                            onClick={() => !sub && setAnswers({ ...answers, [q.id]: i })}
                            disabled={sub}
                            className={`w-full text-left p-3 rounded-md border text-sm transition flex items-center gap-2 min-h-11 ${
                              isCorrect ? "border-success bg-success/10 text-foreground"
                                : isWrong ? "border-destructive bg-destructive/10 text-foreground"
                                : isSel ? "border-primary bg-primary/5"
                                : "border-border bg-background"
                            }`}
                          >
                            {sub
                              ? (isCorrect ? <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                                 : isWrong ? <Circle className="w-4 h-4 text-destructive flex-shrink-0 fill-current" />
                                 : <Circle className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />)
                              : <Circle className={`w-4 h-4 flex-shrink-0 ${isSel ? "text-primary fill-current" : "text-muted-foreground/40"}`} />}
                            <span>{choice}</span>
                          </button>
                        );
                      })}
                    </div>
                    {!sub ? (
                      <button
                        onClick={() => submitQuiz(q)}
                        disabled={sel === undefined}
                        className="text-sm font-semibold text-primary disabled:opacity-40"
                      >
                        Submit
                      </button>
                    ) : (
                      <p className={`text-sm ${correct ? "text-success" : "text-foreground"}`}>
                        {correct ? "✓ Correct. " : "Not quite. "}
                        {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="space-y-2 mb-8">
          <button
            onClick={startDebate}
            className="w-full rounded-lg bg-foreground text-background p-4 flex items-center gap-3 text-left hover:opacity-95 transition"
          >
            <MessageSquareQuote className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="font-semibold">Debate this with the AI</p>
              <p className="text-xs opacity-70">It'll push back and find your blind spots</p>
            </div>
            <ArrowRight className="w-4 h-4 opacity-60" />
          </button>

          {!completed ? (
            <button onClick={markComplete} className="w-full rounded-lg bg-primary text-primary-foreground font-semibold py-3 min-h-11">
              Mark as complete
            </button>
          ) : nextLessonId ? (
            <button onClick={() => navigate(`/lesson/${nextLessonId}`)} className="w-full rounded-lg bg-primary text-primary-foreground font-semibold py-3 min-h-11 flex items-center justify-center gap-2">
              Next lesson <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => navigate(`/course/${lesson.course_id}`)} className="w-full rounded-lg bg-primary text-primary-foreground font-semibold py-3 min-h-11">
              Back to course
            </button>
          )}
        </div>
      </div>
    </main>
  );
};
export default LessonPage;
