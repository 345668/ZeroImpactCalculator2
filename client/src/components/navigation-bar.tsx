import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, LayoutDashboard } from "lucide-react";

export function NavigationBar() {
  return (
    <nav className="fixed top-0 right-0 p-4 z-50 flex gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-bl-lg shadow-sm">
      <Link href="/">
        <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-accent">
          <Home className="w-4 h-4" />
          Home
        </Button>
      </Link>
      <Link href="/dashboard">
        <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-accent">
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Button>
      </Link>
    </nav>
  );
}