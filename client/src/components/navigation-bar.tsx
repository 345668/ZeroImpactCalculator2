import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function NavigationBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [loginData, setLoginData] = useState({ login: "", password: "" });
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Logged in successfully",
        });
        setIsOpen(false);
        // Redirect to dashboard after successful login
        window.location.href = '/dashboard';
      } else {
        toast({
          title: "Error",
          description: data.message || "Login failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    }
  };

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
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="link" 
            size="sm" 
            className="text-sm font-medium text-foreground/90 hover:text-foreground"
          >
            Company
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login</DialogTitle>
            <DialogDescription>
              Enter your credentials to access the company dashboard
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username or Email</label>
              <Input
                type="text"
                placeholder="Enter your username or email"
                value={loginData.login}
                onChange={(e) => setLoginData({ ...loginData, login: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </nav>
  );
}