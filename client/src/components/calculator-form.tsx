import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { InsertSubmission, insertSubmissionSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Check, Mail, RefreshCw } from "lucide-react";
import { DocumentUpload } from "./document-upload";
import { useLocation } from "wouter";

// Import necessary UI components
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiStepForm } from "./multi-step-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const formSteps = [
  {
    title: "Building Information",
    description: "Tell us about your building"
  },
  {
    title: "Current Energy Consumption",
    description: "Enter your current energy usage"
  },
  {
    title: "Projected Energy Consumption",
    description: "Enter your expected energy usage after improvements"
  },
  {
    title: "Results Preview",
    description: "Review your potential savings"
  },
  {
    title: "Personal Information",
    description: "Tell us about yourself"
  },
  {
    title: "Final Results",
    description: "Your detailed carbon savings report"
  }
];

export function CalculatorForm() {
  const [step, setStep] = useState(1);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<InsertSubmission>({
    resolver: zodResolver(insertSubmissionSchema),
    defaultValues: {
      buildingOwnership: "own",
      buildingSize: 0,
      heatingSystem: "gas",
      currentConsumption: 0,
      projectedConsumption: 0,
      firstName: "",
      lastName: "",
      email: "",
      address: "",
      acceptedTerms: false,
      gdprConsent: false
    }
  });

  const nextStep = () => setStep(step + 1);
  const previousStep = () => setStep(step - 1);
  const startNewCalculation = () => {
    setStep(1);
    setShowResults(false);
    form.reset();
  };

  const handleSendEmail = () => {
    setStep(5); // Show personal information form
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: InsertSubmission) => {
      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to submit calculation");
      }

      return response.json();
    },
    onSuccess: () => {
      setStep(6); // Show final results
      setShowResults(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertSubmission) => {
    console.log('Form submission started:', data);
    mutate(data);
  };

  function calculateCO2Savings(data: any): number {
    const savingsKwh = data.currentConsumption - data.projectedConsumption;
    return savingsKwh * 0.0002;
  }

  function calculateCarbonCredits(data: any): number {
    return calculateCO2Savings(data);
  }

  function calculateFinancialValue(data: any): number {
    return calculateCarbonCredits(data) * 50;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <MultiStepForm
          currentStep={step}
          steps={formSteps}
          onNext={nextStep}
          onPrevious={previousStep}
          isLastStep={step === formSteps.length}
          isSubmitting={isPending}
          onStartNew={startNewCalculation}
          onSendEmail={handleSendEmail}
        >
          {step === 1 && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="buildingOwnership"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel>Do you own the building or are you a tenant?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        <FormItem className="relative flex flex-col items-start space-y-3 rounded-lg border-2 border-muted p-4 hover:border-primary">
                          <FormControl>
                            <RadioGroupItem value="own" className="absolute right-4 top-4" />
                          </FormControl>
                          <FormLabel className="text-base font-semibold">Building Owner</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            I own the building and can implement energy efficiency measures.
                          </p>
                        </FormItem>
                        <FormItem className="relative flex flex-col items-start space-y-3 rounded-lg border-2 border-muted p-4 hover:border-primary">
                          <FormControl>
                            <RadioGroupItem value="rent" className="absolute right-4 top-4" />
                          </FormControl>
                          <FormLabel className="text-base font-semibold">Tenant</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            I rent the building and want to explore energy efficiency options.
                          </p>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="buildingSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What is the size of your building in square meters?</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter building size" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="currentConsumption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base mb-4">
                      What is your current annual energy consumption (excluding solar PV)?
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Current Consumption (kWh/year)"
                        {...field}
                        value={field.value || ''}
                        className="text-lg p-6"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="projectedConsumption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base mb-4">
                      What is your projected annual energy consumption after improvements?
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Projected Consumption (kWh/year)"
                        {...field}
                        value={field.value || ''}
                        className="text-lg p-6"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Your Carbon Savings Preview</h2>
                <p className="text-muted-foreground">Here's an overview of your potential impact</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card className="p-6 bg-calmBlue-50/50">
                  <div className="flex items-center justify-center mb-4">
                    <div className="rounded-full bg-calmBlue-100 p-3">
                      <Check className="w-6 h-6 text-calmBlue-600" />
                    </div>
                  </div>
                  <h3 className="text-center font-semibold mb-1">CO₂ Savings</h3>
                  <div className="text-3xl text-center font-bold mb-1">
                    {calculateCO2Savings(form.getValues()).toFixed(2)}
                  </div>
                  <p className="text-sm text-center text-muted-foreground">Tons of CO₂ per year</p>
                </Card>

                <Card className="p-6 bg-calmBlue-50/50">
                  <div className="flex items-center justify-center mb-4">
                    <div className="rounded-full bg-calmBlue-100 p-3">
                      <Check className="w-6 h-6 text-calmBlue-600" />
                    </div>
                  </div>
                  <h3 className="text-center font-semibold mb-1">Carbon Credits</h3>
                  <div className="text-3xl text-center font-bold mb-1">
                    {calculateCarbonCredits(form.getValues()).toFixed(2)}
                  </div>
                  <p className="text-sm text-center text-muted-foreground">Credits (1:1 with CO₂)</p>
                </Card>

                <Card className="p-6 bg-calmBlue-50/50">
                  <div className="flex items-center justify-center mb-4">
                    <div className="rounded-full bg-calmBlue-100 p-3">
                      <Check className="w-6 h-6 text-calmBlue-600" />
                    </div>
                  </div>
                  <h3 className="text-center font-semibold mb-1">Financial Value</h3>
                  <div className="text-3xl text-center font-bold mb-1">
                    €{calculateFinancialValue(form.getValues()).toFixed(2)}
                  </div>
                  <p className="text-sm text-center text-muted-foreground">Potential market value</p>
                </Card>
              </div>
              <div className="flex justify-center gap-4 pt-6">
                <Button
                  type="button"
                  onClick={handleSendEmail}
                  className="bg-calmBlue-600 hover:bg-calmBlue-700"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Send Report to Email
                </Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Personal Information</h2>
                <p className="text-muted-foreground">Please provide your details to receive the report</p>
              </div>

              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="acceptedTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I accept the terms and conditions and agree that Radical Zero can contact me via email
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gdprConsent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I consent to the processing of my personal data in accordance with GDPR regulations
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(4)}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="bg-calmBlue-600 hover:bg-calmBlue-700"
                  disabled={isPending}
                >
                  {isPending ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Your Carbon Savings Results</h2>
                <p className="text-muted-foreground">Here's the detailed impact of your energy efficiency improvements</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card className="p-6 bg-calmBlue-50/50">
                  <div className="flex items-center justify-center mb-4">
                    <div className="rounded-full bg-calmBlue-100 p-3">
                      <Check className="w-6 h-6 text-calmBlue-600" />
                    </div>
                  </div>
                  <h3 className="text-center font-semibold mb-1">CO₂ Savings</h3>
                  <div className="text-3xl text-center font-bold mb-1">
                    {calculateCO2Savings(form.getValues()).toFixed(2)}
                  </div>
                  <p className="text-sm text-center text-muted-foreground">Tons of CO₂ per year</p>
                </Card>

                <Card className="p-6 bg-calmBlue-50/50">
                  <div className="flex items-center justify-center mb-4">
                    <div className="rounded-full bg-calmBlue-100 p-3">
                      <Check className="w-6 h-6 text-calmBlue-600" />
                    </div>
                  </div>
                  <h3 className="text-center font-semibold mb-1">Carbon Credits</h3>
                  <div className="text-3xl text-center font-bold mb-1">
                    {calculateCarbonCredits(form.getValues()).toFixed(2)}
                  </div>
                  <p className="text-sm text-center text-muted-foreground">Credits (1:1 with CO₂)</p>
                </Card>

                <Card className="p-6 bg-calmBlue-50/50">
                  <div className="flex items-center justify-center mb-4">
                    <div className="rounded-full bg-calmBlue-100 p-3">
                      <Check className="w-6 h-6 text-calmBlue-600" />
                    </div>
                  </div>
                  <h3 className="text-center font-semibold mb-1">Financial Value</h3>
                  <div className="text-3xl text-center font-bold mb-1">
                    €{calculateFinancialValue(form.getValues()).toFixed(2)}
                  </div>
                  <p className="text-sm text-center text-muted-foreground">Potential market value</p>
                </Card>
              </div>

              <div className="flex justify-center gap-4 mt-8">
                <Button
                  variant="outline"
                  onClick={startNewCalculation}
                  className="px-6"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Start New Calculation
                </Button>
              </div>
            </div>
          )}
        </MultiStepForm>
      </form>
    </Form>
  );
}