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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email');
      }

      setEmailSent(true);
      toast({
        title: "Success!",
        description: "Report has been sent to your email.",
      });
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send email report",
        variant: "destructive",
      });
    }
  };

  // Format numbers with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);
  };

  // Ensure numeric values
  const co2Savings = Number(result.co2Savings);
  const carbonCredits = Number(result.carbonCredits);
  const financialValue = Number(result.financialValue);
  const currentConsumption = Number(result.currentConsumption);
  const projectedConsumption = Number(result.projectedConsumption);

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h2 className="text-2xl font-semibold text-center">Your Carbon Savings Results</h2>
      <p className="text-center text-muted-foreground mt-2 mb-8">
        Here's the potential impact of your energy efficiency improvements
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#F8FAF8] rounded-lg p-6 text-center relative">
          <div className="absolute top-4 right-4 bg-[#4CAF50]/10 rounded-full p-1">
            <Check className="w-4 h-4 text-[#4CAF50]" />
          </div>
          <h3 className="text-[#4CAF50] font-semibold mb-2">CO<sub>2</sub> Savings</h3>
          <p className="text-3xl font-bold">{formatNumber(co2Savings)}</p>
          <p className="text-sm text-muted-foreground">Tons of CO<sub>2</sub> per year</p>
        </div>

        <div className="bg-[#F8FAF8] rounded-lg p-6 text-center relative">
          <div className="absolute top-4 right-4 bg-[#4CAF50]/10 rounded-full p-1">
            <Check className="w-4 h-4 text-[#4CAF50]" />
          </div>
          <h3 className="text-[#4CAF50] font-semibold mb-2">Carbon Credits</h3>
          <p className="text-3xl font-bold">{formatNumber(carbonCredits)}</p>
          <p className="text-sm text-muted-foreground">Credits (1:1 with CO<sub>2</sub>)</p>
        </div>

        <div className="bg-[#F8FAF8] rounded-lg p-6 text-center relative">
          <div className="absolute top-4 right-4 bg-[#4CAF50]/10 rounded-full p-1">
            <Check className="w-4 h-4 text-[#4CAF50]" />
          </div>
          <h3 className="text-[#4CAF50] font-semibold mb-2">Financial Value</h3>
          <p className="text-3xl font-bold">€{formatNumber(financialValue)}</p>
          <p className="text-sm text-muted-foreground">Potential market value</p>
        </div>
      </div>

      <div className="mt-8 p-6 bg-[#F8FAF8] rounded-lg">
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
              {formatNumber(currentConsumption - projectedConsumption)} kWh/year ({
                Math.round(((currentConsumption - projectedConsumption) / currentConsumption) * 100)
              }%)
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4">
        <Button
          onClick={handleSendEmail}
          disabled={emailSent}
          className="w-full max-w-md bg-[#4CAF50] hover:bg-[#45a049]"
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
import React from "react";

export default function ResultsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Carbon Calculation Results</h1>
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-medium">Current Carbon Emissions:</p>
            <p className="text-2xl font-bold">1,200 kg CO₂e/year</p>
          </div>
          <div>
            <p className="font-medium">Potential Reduction:</p>
            <p className="text-2xl font-bold text-green-600">-800 kg CO₂e/year</p>
          </div>
        </div>
      </div>
      
      <div className="bg-card rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
        <ul className="space-y-2">
          <li className="p-3 bg-background rounded-md">Upgrade heating system</li>
          <li className="p-3 bg-background rounded-md">Improve insulation</li>
          <li className="p-3 bg-background rounded-md">Install solar panels</li>
        </ul>
      </div>
    </div>
  );
}
