import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LoginFormValues {
  login: string;
  password: string;
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    defaultValues: {
      login: "",
      password: ""
    }
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Login failed");
      }

      // Store user info in localStorage or sessionStorage
      localStorage.setItem("user", JSON.stringify(result.user));
      
      toast({
        title: "Success",
        description: "You've successfully logged in!",
      });
      
      // Close the modal and navigate to the company page
      onOpenChange(false);
      setLocation("/company");
      
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to login. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sign In to Company Portal</DialogTitle>
          <DialogDescription>
            Enter your username and password to access the company dashboard
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="login">Username</Label>
            <Input
              id="login"
              placeholder="Enter your username"
              {...register("login", { required: "Username is required" })}
            />
            {errors.login && (
              <p className="text-sm text-red-500">{errors.login.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...register("password", { required: "Password is required" })}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}