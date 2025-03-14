import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Check, Mail, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout";
import { NavigationBar } from "@/components/navigation-bar";

export function ResultsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [emailSent, setEmailSent] = useState(false);
  const [isEmailSending, setIsEmailSending] = useState(false);

  // Get results from location state
  const result = history.state?.result;

  if (!result) {
    setLocation("/");
    return null;
  }

  // Format numbers with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);
  };

  const handleSendEmail = async () => {
    if (emailSent) return;

    setIsEmailSending(true);
    try {
      const response = await fetch('/api/email/send-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: result.email,
          firstName: result.firstName,
          lastName: result.lastName,
          buildingSize: result.buildingSize,
          currentConsumption: result.currentConsumption,
          projectedConsumption: result.projectedConsumption,
          co2Savings: result.co2Savings,
          carbonCredits: result.carbonCredits,
          financialValue: result.financialValue
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
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: "Failed to send email report",
        variant: "destructive",
      });
    } finally {
      setIsEmailSending(false);
    }
  };

  return (
    <Layout>
      <NavigationBar />
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-semibold text-center">Your Carbon Savings Results</h2>
          <p className="text-center text-muted-foreground mt-2 mb-8">
            Here's the potential impact of your energy efficiency improvements
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              className="bg-[#F8FAF8] rounded-lg p-6 text-center relative"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="absolute top-4 right-4 bg-[#4CAF50]/10 rounded-full p-1">
                <Check className="w-4 h-4 text-[#4CAF50]" />
              </div>
              <h3 className="text-[#4CAF50] font-semibold mb-2">CO<sub>2</sub> Savings</h3>
              <p className="text-3xl font-bold">{formatNumber(Number(result.co2Savings))}</p>
              <p className="text-sm text-muted-foreground">Tons of CO<sub>2</sub> per year</p>
            </motion.div>

            <motion.div
              className="bg-[#F8FAF8] rounded-lg p-6 text-center relative"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="absolute top-4 right-4 bg-[#4CAF50]/10 rounded-full p-1">
                <Check className="w-4 h-4 text-[#4CAF50]" />
              </div>
              <h3 className="text-[#4CAF50] font-semibold mb-2">Carbon Credits</h3>
              <p className="text-3xl font-bold">{formatNumber(Number(result.carbonCredits))}</p>
              <p className="text-sm text-muted-foreground">Credits (1:1 with CO<sub>2</sub>)</p>
            </motion.div>

            <motion.div
              className="bg-[#F8FAF8] rounded-lg p-6 text-center relative"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="absolute top-4 right-4 bg-[#4CAF50]/10 rounded-full p-1">
                <Check className="w-4 h-4 text-[#4CAF50]" />
              </div>
              <h3 className="text-[#4CAF50] font-semibold mb-2">Financial Value</h3>
              <p className="text-3xl font-bold">€{formatNumber(Number(result.financialValue))}</p>
              <p className="text-sm text-muted-foreground">Potential market value</p>
            </motion.div>
          </div>

          <motion.div
            className="bg-[#F8FAF8] rounded-lg p-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="font-semibold mb-4">Building Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Building Size</p>
                <p className="font-medium">{formatNumber(Number(result.buildingSize))} m²</p>
              </div>
              <div>
                <p className="text-muted-foreground">Current Consumption</p>
                <p className="font-medium">{formatNumber(Number(result.currentConsumption))} kWh/year</p>
              </div>
              <div>
                <p className="text-muted-foreground">Projected Consumption</p>
                <p className="font-medium">{formatNumber(Number(result.projectedConsumption))} kWh/year</p>
              </div>
              <div>
                <p className="text-muted-foreground">Energy Reduction</p>
                <p className="font-medium">
                  {formatNumber(Number(result.currentConsumption) - Number(result.projectedConsumption))} kWh/year (
                  {Math.round(((Number(result.currentConsumption) - Number(result.projectedConsumption)) / Number(result.currentConsumption)) * 100)}%)
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="flex flex-col items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={handleSendEmail}
              disabled={emailSent || isEmailSending}
              className="w-full max-w-md bg-[#4CAF50] hover:bg-[#45a049]"
            >
              {isEmailSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : emailSent ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Report Sent!
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Report to Email
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/")}
              className="w-full max-w-md"
            >
              Start New Calculation
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
}