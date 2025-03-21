import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function NavigationBar() {
  return (
    <nav className="fixed top-0 right-0 px-6 py-4 z-50 flex items-center gap-3">
      <Link href="/">
        <Button 
          variant="link" 
          size="sm" 
          className="text-sm font-medium text-foreground/90 hover:text-foreground"
        >
          Home
        </Button>
      </Link>
      <Link href="/company">
        <Button 
          variant="link" 
          size="sm" 
          className="text-sm font-medium text-foreground/90 hover:text-foreground"
        >
          Company
        </Button>
      </Link>
    </nav>
  );
}