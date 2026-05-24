import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import HomePage from "./pages/HomePage";
import LibraryPage from "./pages/LibraryPage";
import CoursePage from "./pages/CoursePage";
import LessonPage from "./pages/LessonPage";
import DebateHubPage from "./pages/DebateHubPage";
import DebatePage from "./pages/DebatePage";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Gate = () => {
  const { user, profile, loading } = useAuth();
  if (loading) {
    return (
      <main className="min-h-dvh grid place-items-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }
  if (!user) return <AuthPage />;
  if (profile && !profile.onboarded) return <OnboardingPage />;
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/library" element={<LibraryPage />} />
      <Route path="/course/:courseId" element={<CoursePage />} />
      <Route path="/lesson/:lessonId" element={<LessonPage />} />
      <Route path="/debate" element={<DebateHubPage />} />
      <Route path="/debate/:sessionId" element={<DebatePage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
