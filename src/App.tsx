import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AuthPage from "./pages/AuthPage";
import CheckInPage from "./pages/CheckInPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import DashboardPage from "./pages/DashboardPage";
import ElderDetailPage from "./pages/ElderDetailPage";
import AlertsPage from "./pages/AlertsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-lg font-semibold">Loading...</p>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const isElder = role === "elder";

  return (
    <Routes>
      {/* Elder routes */}
      <Route path="/" element={isElder ? <CheckInPage /> : <Navigate to="/dashboard" />} />
      <Route path="/history" element={isElder ? <HistoryPage /> : <Navigate to="/dashboard" />} />

      {/* Caregiver routes */}
      <Route path="/dashboard" element={!isElder ? <DashboardPage /> : <Navigate to="/" />} />
      <Route path="/elder/:elderId" element={!isElder ? <ElderDetailPage /> : <Navigate to="/" />} />
      <Route path="/alerts" element={!isElder ? <AlertsPage /> : <Navigate to="/" />} />

      {/* Shared */}
      <Route path="/settings" element={<SettingsPage />} />
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
          <ProtectedRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
