import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface Topic { id: string; title: string; description: string; }
interface Course { id: string; topic_id: string; title: string; summary: string; level: string; }

const LibraryPage = () => {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: ts }, { data: cs }] = await Promise.all([
        supabase.from("topics").select("id,title,description").order("sort_order"),
        supabase.from("courses").select("id,topic_id,title,summary,level").order("sort_order"),
      ]);
      if (ts) setTopics(ts);
      if (cs) setCourses(cs);
    })();
  }, []);

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-2xl mx-auto px-5 pt-10">
        <h1 className="font-display text-4xl mb-1">Library</h1>
        <p className="text-muted-foreground mb-8 text-sm">Every course, organised by topic. Bloom-staged from <em>Remember</em> to <em>Create</em>.</p>

        {topics.map((t) => {
          const tCourses = courses.filter((c) => c.topic_id === t.id);
          if (!tCourses.length) return null;
          return (
            <section key={t.id} className="mb-10">
              <h2 className="font-display text-2xl">{t.title}</h2>
              <p className="text-sm text-muted-foreground mb-4">{t.description}</p>
              <div className="space-y-2">
                {tCourses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/course/${c.id}`)}
                    className="w-full text-left rounded-lg bg-card border border-border p-4 hover:border-foreground/20 transition flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{c.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{c.summary}</p>
                      <p className="text-[11px] uppercase tracking-wider text-primary mt-2">{c.level}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <BottomNav />
    </main>
  );
};
export default LibraryPage;
