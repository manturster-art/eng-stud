import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppShell } from "@/components/AppShell";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import StudyLogPage from "@/pages/StudyLog";
import PeppaPage from "@/pages/Peppa";
import ToeicPage from "@/pages/Toeic";
import PredictPage from "@/pages/Predict";
import QuizPage from "@/pages/Quiz";
import SettingsPage from "@/pages/Settings";
import LoginPage from "@/pages/Login";
import { GraduationCap } from "lucide-react";

function AppRouter() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/log" component={StudyLogPage} />
        <Route path="/peppa" component={PeppaPage} />
        <Route path="/toeic" component={ToeicPage} />
        <Route path="/quiz" component={QuizPage} />
        <Route path="/predict" component={PredictPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <GraduationCap className="w-8 h-8 animate-pulse text-primary" />
          <p className="text-xs">불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Router hook={useHashLocation}>
      <AppRouter />
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <AuthProvider>
            <AuthGate />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
