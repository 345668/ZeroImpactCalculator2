import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import { ResultsPage } from "@/pages/ResultsPage";
import { SidebarProvider, Sidebar, SidebarContent, SidebarInset } from "@/components/ui/sidebar";
import { Link } from "wouter";

function Navigation() {
  return (
    <Sidebar>
      <SidebarContent>
        <nav className="flex flex-col space-y-2 p-2">
          <Link href="/" className="px-4 py-2 rounded-md hover:bg-accent">Home</Link>
          <Link href="/dashboard" className="px-4 py-2 rounded-md hover:bg-accent">Dashboard</Link>
        </nav>
      </SidebarContent>
    </Sidebar>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/results" component={ResultsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <div className="flex min-h-screen">
          <Navigation />
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