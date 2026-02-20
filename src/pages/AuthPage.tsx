import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AppRole = "elder" | "care_staff";

const AuthPage = () => {
  const [step, setStep] = useState<"role" | "auth">("role");
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleRoleSelect = (role: AppRole) => {
    setSelectedRole(role);
    if (role === "elder") {
      // Elders go straight to sign-up (setup wizard handles the rest)
      setIsSignUp(true);
      setStep("auth");
    } else {
      setStep("auth");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;

        if (data.user && selectedRole) {
          await supabase.from("user_roles").insert({
            user_id: data.user.id,
            role: selectedRole,
          });
        }

        toast({
          title: "Check your email",
          description: "We sent you a confirmation link. Please verify your email to continue.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
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
          <p className="text-muted-foreground mt-2 text-lg">
            {step === "role" ? "Who are you?" : isSignUp ? "Create your account" : "Welcome back"}
          </p>
        </div>

        {step === "role" ? (
          <div className="space-y-4">
            <button
              onClick={() => handleRoleSelect("elder")}
              className="w-full rounded-2xl border-3 border-border bg-card p-6 text-left transition-all hover:border-primary hover:shadow-md active:scale-[0.98]"
            >
              <p className="text-3xl mb-1">👴</p>
              <p className="font-extrabold text-card-foreground text-2xl">I'm an Elder</p>
              <p className="text-muted-foreground text-lg mt-1">I want to check in daily</p>
            </button>

            <button
              onClick={() => handleRoleSelect("care_staff")}
              className="w-full rounded-2xl border-3 border-border bg-card p-6 text-left transition-all hover:border-primary hover:shadow-md active:scale-[0.98]"
            >
              <p className="text-3xl mb-1">🏥</p>
              <p className="font-extrabold text-card-foreground text-2xl">Care Staff</p>
              <p className="text-muted-foreground text-lg mt-1">I manage clients</p>
            </button>

            <p className="text-center text-muted-foreground mt-6">
              Already have an account?{" "}
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
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && selectedRole === "care_staff" && (
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

              {isSignUp && selectedRole === "elder" && (
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1">Your Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full rounded-2xl border-2 border-border bg-card px-5 py-4 text-xl text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Enter your name"
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
                  className={`w-full rounded-xl border border-border bg-card px-4 py-3 text-lg text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                    selectedRole === "elder" ? "rounded-2xl border-2 px-5 py-4 text-xl" : ""
                  }`}
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
                  className={`w-full rounded-xl border border-border bg-card px-4 py-3 text-lg text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                    selectedRole === "elder" ? "rounded-2xl border-2 px-5 py-4 text-xl" : ""
                  }`}
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 ${
                  selectedRole === "elder" ? "font-extrabold text-xl py-5 rounded-2xl" : ""
                }`}
              >
                {submitting ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
              </button>
            </form>

            <p className="text-center text-muted-foreground mt-6">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary font-bold underline"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>

            {step === "auth" && (
              <button
                onClick={() => { setStep("role"); setSelectedRole(null); }}
                className="w-full text-center text-muted-foreground mt-2 underline text-sm"
              >
                ← Back to role selection
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
