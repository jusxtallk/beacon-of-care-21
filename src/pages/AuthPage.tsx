import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AppRole = "elder" | "care_staff";

const AuthPage = () => {
  const [step, setStep] = useState<"role" | "auth">("role");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleElderStart = async () => {
    setSubmitting(true);
    try {
      // Sign in anonymously — no email/password needed for elders
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;

      if (data.user) {
        await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: "elder" as const,
        });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCareStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, role: "care_staff" },
          },
        });
        if (error) throw error;

        toast({
          title: "Check your email",
          description: "We sent you a confirmation link.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-4">
            <Heart className="w-10 h-10 text-primary-foreground" fill="currentColor" />
          </div>
          <h1 className="text-4xl font-extrabold text-foreground">SafeCheck</h1>
        </div>

        {step === "role" ? (
          <div className="space-y-4">
            <p className="text-center text-muted-foreground text-xl font-semibold mb-6">
              Who are you?
            </p>

            {/* Elder — big, friendly, no login */}
            <button
              onClick={handleElderStart}
              disabled={submitting}
              className="w-full rounded-2xl border-3 border-border bg-card p-8 text-center transition-all hover:border-primary hover:shadow-md active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
              ) : (
                <>
                  <p className="text-5xl mb-3">👴</p>
                  <p className="font-extrabold text-card-foreground text-2xl">I'm an Elder</p>
                  <p className="text-muted-foreground text-lg mt-1">Tap here to get started</p>
                </>
              )}
            </button>

            {/* Care Staff */}
            <button
              onClick={() => { setStep("auth"); setIsSignUp(true); }}
              className="w-full rounded-2xl border-3 border-border bg-card p-6 text-left transition-all hover:border-primary hover:shadow-md active:scale-[0.98]"
            >
              <p className="text-3xl mb-1">🏥</p>
              <p className="font-extrabold text-card-foreground text-xl">Care Staff</p>
              <p className="text-muted-foreground text-base mt-1">I manage clients</p>
            </button>

            <p className="text-center text-muted-foreground mt-6 text-sm">
              Care staff?{" "}
              <button
                onClick={() => { setStep("auth"); setIsSignUp(false); }}
                className="text-primary font-bold underline"
              >
                Sign In
              </button>
            </p>
          </div>
        ) : (
          <>
            <p className="text-center text-muted-foreground text-lg mb-6 font-semibold">
              {isSignUp ? "Create Staff Account" : "Staff Sign In"}
            </p>
            <form onSubmit={handleCareStaffSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-lg text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Your name"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-lg text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-lg text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
              </button>
            </form>

            <p className="text-center text-muted-foreground mt-6">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary font-bold underline">
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>

            <button
              onClick={() => setStep("role")}
              className="w-full text-center text-muted-foreground mt-2 underline text-sm"
            >
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
