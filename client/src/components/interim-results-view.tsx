import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface InterimResultsViewProps {
  data: {
    buildingSize: number;
    currentConsumption: number;
    projectedConsumption: number;
    co2Savings: number;
    carbonCredits: number;
    financialValue: number;
    buildingOwnership: string;
    heatingSystem: string;
  };
  onContinue: () => void;
}

export function InterimResultsView({ data, onContinue }: InterimResultsViewProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [emailSent, setEmailSent] = useState(false);

  // Format numbers with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-center">Your Carbon Savings Results</h2>
      <p className="text-center text-muted-foreground">
        Here's the potential impact of your energy efficiency improvements
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#F8FAF8] rounded-lg p-6 text-center relative">
          <div className="absolute top-4 right-4 bg-[#4CAF50]/10 rounded-full p-1">
            <Check className="w-4 h-4 text-[#4CAF50]" />
          </div>
          <h3 className="text-[#4CAF50] font-semibold mb-2">CO<sub>2</sub> Savings</h3>
          <p className="text-3xl font-bold">{formatNumber(data.co2Savings)}</p>
          <p className="text-sm text-muted-foreground">Tons of CO<sub>2</sub> per year</p>
        </div>

        <div className="bg-[#F8FAF8] rounded-lg p-6 text-center relative">
          <div className="absolute top-4 right-4 bg-[#4CAF50]/10 rounded-full p-1">
            <Check className="w-4 h-4 text-[#4CAF50]" />
          </div>
          <h3 className="text-[#4CAF50] font-semibold mb-2">Carbon Credits</h3>
          <p className="text-3xl font-bold">{formatNumber(data.carbonCredits)}</p>
          <p className="text-sm text-muted-foreground">Credits (1:1 with CO<sub>2</sub>)</p>
        </div>

        <div className="bg-[#F8FAF8] rounded-lg p-6 text-center relative">
          <div className="absolute top-4 right-4 bg-[#4CAF50]/10 rounded-full p-1">
            <Check className="w-4 h-4 text-[#4CAF50]" />
          </div>
          <h3 className="text-[#4CAF50] font-semibold mb-2">Financial Value</h3>
          <p className="text-3xl font-bold">€{formatNumber(data.financialValue)}</p>
          <p className="text-sm text-muted-foreground">Potential market value</p>
        </div>
      </div>

      <div className="mt-8 p-6 bg-[#F8FAF8] rounded-lg">
        <h3 className="font-semibold mb-4">Building Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Ownership Type</p>
            <p className="font-medium capitalize">{data.buildingOwnership}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Building Size</p>
            <p className="font-medium">{data.buildingSize} m²</p>
          </div>
          <div>
            <p className="text-muted-foreground">Heating System</p>
            <p className="font-medium capitalize">{data.heatingSystem}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Energy Consumption Reduction</p>
            <p className="font-medium">
              {formatNumber(data.currentConsumption - data.projectedConsumption)} kWh/year ({
                Math.round(((data.currentConsumption - data.projectedConsumption) / data.currentConsumption) * 100)
              }%)
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 mt-8">
        <Button
          onClick={onContinue}
          className="w-full max-w-md bg-[#4CAF50] hover:bg-[#45a049]"
        >
          Continue to Contact Information
        </Button>
        <Button
          variant="outline"
          onClick={() => setLocation("/")}
          className="w-full max-w-md"
        >
          Start New Calculation
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Continue to provide your contact information and learn how to monetize your carbon credits
      </p>
    </div>
  );
}
