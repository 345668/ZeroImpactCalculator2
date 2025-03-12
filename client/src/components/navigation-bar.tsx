import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, LayoutDashboard } from "lucide-react";

export function NavigationBar() {
  return (
    <nav className="fixed top-0 right-0 px-6 py-4 z-50 flex items-center gap-3 bg-background/40 backdrop-blur-sm rounded-bl-2xl">
      <Link href="/">
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-2 text-sm font-medium transition-colors hover:bg-accent/50 hover:text-accent-foreground"
        >
          <Home className="w-4 h-4" />
          Home
        </Button>
      </Link>
      <Link href="/dashboard">
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-2 text-sm font-medium transition-colors hover:bg-accent/50 hover:text-accent-foreground"
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Button>
      </Link>
    </nav>
  );
}