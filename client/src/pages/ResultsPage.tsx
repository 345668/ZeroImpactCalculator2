import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function ResultsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [emailSent, setEmailSent] = useState(false);

  // Get results from location state
  const result = history.state?.result;

  if (!result) {
    setLocation("/");
    return null;
  }

  const handleSendEmail = async () => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId: result.id,
          email: result.email
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      setEmailSent(true);
      toast({
        title: "Success!",
        description: "Report has been sent to your email.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send email report",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h2 className="text-2xl font-semibold text-center">Your Carbon Savings Results</h2>
      <p className="text-center text-muted-foreground mt-2 mb-8">
        Here's the potential impact of your energy efficiency improvements
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-primary/5 rounded-lg p-6 text-center relative">
          <div className="absolute top-4 right-4 bg-primary/10 rounded-full p-1">
            <Check className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-primary font-semibold mb-2">CO₂ Savings</h3>
          <p className="text-3xl font-bold">{result.co2Savings.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">Tons of CO₂ per year</p>
        </div>

        <div className="bg-primary/5 rounded-lg p-6 text-center relative">
          <div className="absolute top-4 right-4 bg-primary/10 rounded-full p-1">
            <Check className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-primary font-semibold mb-2">Carbon Credits</h3>
          <p className="text-3xl font-bold">{result.carbonCredits.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">Credits (1:1 with CO₂)</p>
        </div>

        <div className="bg-primary/5 rounded-lg p-6 text-center relative">
          <div className="absolute top-4 right-4 bg-primary/10 rounded-full p-1">
            <Check className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-primary font-semibold mb-2">Financial Value</h3>
          <p className="text-3xl font-bold">€{result.financialValue.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">Potential market value</p>
        </div>
      </div>

      <div className="mt-8 p-6 bg-muted/20 rounded-lg">
        <h3 className="font-semibold mb-4">Building Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Ownership Type</p>
            <p className="font-medium capitalize">{result.buildingOwnership}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Building Size</p>
            <p className="font-medium">{result.buildingSize} m²</p>
          </div>
          <div>
            <p className="text-muted-foreground">Heating System</p>
            <p className="font-medium capitalize">{result.heatingSystem}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Energy Consumption Reduction</p>
            <p className="font-medium">
              {result.currentConsumption - result.projectedConsumption} kWh/year (
              {Math.round(((result.currentConsumption - result.projectedConsumption) / result.currentConsumption) * 100)}
              %)
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4">
        <Button 
          onClick={handleSendEmail} 
          disabled={emailSent}
          className="w-full max-w-md"
        >
          {emailSent ? "Report Sent!" : "Send Report to Email"}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setLocation("/")}
          className="w-full max-w-md"
        >
          Start New Calculation
        </Button>
      </div>
    </div>
  );
}
