import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AppRole = "elder" | "family" | "care_staff";

const roleOptions: { value: AppRole; label: string; description: string }[] = [
  { value: "elder", label: "👴 I'm an Elder", description: "I want to check in daily" },
  { value: "family", label: "👨‍👩‍👧 Family Member", description: "I want to monitor a loved one" },
  { value: "care_staff", label: "🏥 Care Staff", description: "I manage multiple clients" },
];

const AuthPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("elder");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

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

        if (data.user) {
          // Assign role
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
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-4">
            <Heart className="w-8 h-8 text-primary-foreground" fill="currentColor" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground">SafeCheck</h1>
          <p className="text-muted-foreground mt-1">
            {isSignUp ? "Create your account" : "Welcome back"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
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

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">I am a...</label>
                <div className="space-y-2">
                  {roleOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedRole(opt.value)}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-colors ${
                        selectedRole === opt.value
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card"
                      }`}
                    >
                      <p className="font-bold text-card-foreground">{opt.label}</p>
                      <p className="text-sm text-muted-foreground">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
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
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary font-bold underline"
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
