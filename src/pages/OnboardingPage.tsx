import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Check } from "lucide-react";

interface Topic { id: string; title: string; description: string; }

const OnboardingPage = () => {
  const { user, refreshProfile } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [minutes, setMinutes] = useState(15);
  const [step, setStep] = useState<0 | 1>(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("topics").select("id,title,description").order("sort_order").then(({ data }) => {
      if (data) setTopics(data);
    });
  }, []);

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    if (selected.size > 0) {
      await supabase.from("user_interests").insert(
        Array.from(selected).map((topic_id) => ({ user_id: user.id, topic_id }))
      );
    }
    await supabase.from("profiles").update({
      daily_goal_minutes: minutes, onboarded: true,
    }).eq("user_id", user.id);
    await refreshProfile();
    toast.success("You're set. Let's begin.");
    setSaving(false);
  };

  return (
    <main className="min-h-dvh bg-background px-5 py-10">
      <div className="max-w-md mx-auto">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Step {step + 1} of 2</p>
        {step === 0 ? (
          <>
            <h1 className="font-display text-4xl mb-2">What pulls you in?</h1>
            <p className="text-muted-foreground mb-6 text-sm">Pick the topics you want to start with. You can change this any time.</p>
            <div className="space-y-2 mb-8">
              {topics.map((t) => {
                const on = selected.has(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggle(t.id)}
                    className={`w-full text-left p-4 rounded-lg border transition ${
                      on ? "border-primary bg-primary/5" : "border-border bg-card hover:border-foreground/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-5 h-5 rounded-full border-2 grid place-items-center flex-shrink-0 ${
                        on ? "border-primary bg-primary" : "border-muted-foreground/40"
                      }`}>
                        {on && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
                      </div>
                      <div>
                        <p className="font-semibold text-card-foreground">{t.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStep(1)}
              disabled={selected.size === 0}
              className="w-full rounded-lg bg-primary text-primary-foreground font-semibold py-3 disabled:opacity-40 min-h-11"
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-4xl mb-2">Daily learning goal</h1>
            <p className="text-muted-foreground mb-8 text-sm">Small and steady beats heroic and rare.</p>
            <div className="grid grid-cols-4 gap-2 mb-8">
              {[5, 10, 15, 30].map((m) => (
                <button
                  key={m}
                  onClick={() => setMinutes(m)}
                  className={`py-4 rounded-lg border transition ${
                    minutes === m ? "border-primary bg-primary/5 text-foreground" : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  <div className="font-display text-2xl">{m}</div>
                  <div className="text-[11px] uppercase tracking-wider">min</div>
                </button>
              ))}
            </div>
            <button
              onClick={finish}
              disabled={saving}
              className="w-full rounded-lg bg-primary text-primary-foreground font-semibold py-3 disabled:opacity-50 min-h-11"
            >
              {saving ? "…" : "Begin"}
            </button>
            <button onClick={() => setStep(0)} className="mt-3 w-full text-sm text-muted-foreground py-2">Back</button>
          </>
        )}
      </div>
    </main>
  );
};

export default OnboardingPage;
