import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export function SuccessPage() {
  const [, navigate] = useLocation();

  return (
    <div className="max-w-md mx-auto mt-16 p-6 text-center">
      {/* Logo */}
      <img 
        src="/radical-zero-logo.png" 
        alt="Radical-Zero Logo" 
        className="mx-auto mb-8 h-8"
      />

      {/* Success Icon */}
      <div className="w-20 h-20 bg-[#4CAF50]/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <Check className="w-10 h-10 text-[#4CAF50]" />
      </div>

      <h1 className="text-2xl font-semibold mb-4">
        Submission Successful!
      </h1>

      <p className="text-muted-foreground mb-8">
        Thank you for your interest in carbon credits. A Radical-Zero 
        representative will contact you soon with more information about your 
        potential carbon savings.
      </p>

      <Button
        onClick={() => navigate("/")}
        className="bg-[#4CAF50] hover:bg-[#45a049] w-full"
      >
        Back to Home
      </Button>
    </div>
  );
}
