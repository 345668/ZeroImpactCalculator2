import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import CompanyPage from "@/pages/company";
import AdminPage from "@/pages/admin";
import { ResultsPage } from "@/pages/ResultsPage";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { fetchApi } from "@/lib/queryClient";

interface ProtectedRouteProps {
  component: React.ComponentType;
  requiredRole?: string;
}

// Protected route component that checks user authentication and redirects if needed
function ProtectedRoute({ component: Component, requiredRole }: ProtectedRouteProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    async function checkAuth() {
      try {
        const userData = await fetchApi<{
          id: number;
          email: string;
          username: string;
          role: string;
        }>('/api/auth/me', { method: 'GET' });
        
        if (!userData) {
          toast({
            title: "Authentication Required",
            description: "Please log in to access this page",
            variant: "destructive",
          });
          setIsAuthorized(false);
          setLocation('/');
          return;
        }
        
        // If a specific role is required, check for it
        if (requiredRole && userData.role !== requiredRole) {
          toast({
            title: "Access Denied",
            description: `You need ${requiredRole} privileges to access this page`,
            variant: "destructive",
          });
          setIsAuthorized(false);
          setLocation('/company');
          return;
        }
        
        setIsAuthorized(true);
      } catch (error) {
        console.error('Auth check error:', error);
        toast({
          title: "Authentication Error",
          description: "Please log in to access this page",
          variant: "destructive",
        });
        setIsAuthorized(false);
        setLocation('/');
      }
    }
    
    checkAuth();
  }, [setLocation, toast, requiredRole]);

  if (isAuthorized === null) {
    // Still loading
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  return isAuthorized ? <Component /> : null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/company">
        <ProtectedRoute component={CompanyPage} />
      </Route>
      {/* Admin route is protected and requires admin role */}
      <Route path="/admin">
        <ProtectedRoute component={AdminPage} requiredRole="admin" />
      </Route>
      <Route path="/results" component={ResultsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider defaultOpen={false}>
        <div className="flex min-h-screen">
          <SidebarInset>
            <Router />
          </SidebarInset>
        </div>
        <Toaster />
      </SidebarProvider>
    </QueryClientProvider>
  );
}

export default App;