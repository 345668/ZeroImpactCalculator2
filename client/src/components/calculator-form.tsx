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
    title: "Results Analysis",
    description: "Review your potential savings"
  },
  {
    title: "Contact Details",
    description: "Please provide your contact information to receive the report"
  }
];

export function CalculatorForm() {
  const [step, setStep] = useState(1);
  const [documentLanguage, setDocumentLanguage] = useState<string>("en");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isDocumentUploaded, setIsDocumentUploaded] = useState(false);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);

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
      gdprConsent: false,
      energyConsultantName: "",
      energyConsultantCompany: "",
      energyConsultantId: "",
      energyConsultantBafaNumber: "",
      fileUrl: ""
    }
  });

  const handleExtractedData = (data: ExtractedData) => {
    if (data.language) {
      setDocumentLanguage(data.language);
    }
    if (data.buildingSize) {
      form.setValue("buildingSize", data.buildingSize);
    }
    if (data.currentConsumption) {
      form.setValue("currentConsumption", data.currentConsumption);
    }
    if (data.projectedConsumption) {
      form.setValue("projectedConsumption", data.projectedConsumption);
    }
    if (data.heatingSystem) {
      form.setValue("heatingSystem", data.heatingSystem.toLowerCase());
    }
    if (data.energyConsultantName) {
      form.setValue("energyConsultantName", data.energyConsultantName);
    }
    if (data.energyConsultantCompany) {
      form.setValue("energyConsultantCompany", data.energyConsultantCompany);
    }
    if (data.energyConsultantId) {
      form.setValue("energyConsultantId", data.energyConsultantId);
    }
    if (data.energyConsultantBafaNumber) {
      form.setValue("energyConsultantBafaNumber", data.energyConsultantBafaNumber);
    }
    if (data.fileUrl) {
      form.setValue("fileUrl", data.fileUrl);
    }
    setIsDocumentUploaded(true);
    nextStep();
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: InsertSubmission) => {
      const submissionData = {
        ...data,
        acceptedTerms: String(data.acceptedTerms),
        gdprConsent: String(data.gdprConsent),
        co2Savings: calculateCO2Savings(data),
        carbonCredits: calculateCarbonCredits(data),
        financialValue: calculateFinancialValue(data),
      };

      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit calculation");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setIsSubmitSuccess(true);
      toast({
        title: "Success!",
        description: "Your calculation has been submitted. A detailed report has been sent to your email.",
      });
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
    mutate(data);
  };

  const nextStep = () => setStep(step + 1);
  const previousStep = () => setStep(step - 1);
  const startNewCalculation = () => {
    form.reset();
    setStep(1);
    setIsSubmitSuccess(false);
  };
  const handleSendEmail = () => {
    setStep(5); // Update to go to the final step
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
          isLastStep={step === 5}
          isSubmitting={isPending}
          onStartNew={startNewCalculation}
          onSendEmail={handleSendEmail}
        >
          {step === 1 && (
            <div className="space-y-6">
              <div className="p-6 bg-primary/5 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Upload Energy Certificate</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  For faster results, upload your energy certificate or renovation plan to automatically fill the form
                </p>
                <DocumentUpload onDataExtracted={handleExtractedData} />
                {isDocumentUploaded && (
                  <p className="mt-2 text-sm text-primary">✓ Document processed successfully</p>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or fill manually</span>
                </div>
              </div>

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
                <h2 className="text-2xl font-bold mb-2">Your Carbon Savings Results</h2>
                <p className="text-muted-foreground mb-8">Here's the potential impact of your energy efficiency improvements</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card className="p-6 bg-primary/5 transition-all duration-300">
                  <div className="transition-all duration-300">
                    <div className="flex items-center justify-center mb-4">
                      <div className="rounded-full bg-calmBlue-100 p-3">
                        <Check className="w-6 h-6 text-calmBlue-600" />
                      </div>
                    </div>
                    <h3 className="text-center font-semibold mb-1">CO₂ Savings</h3>
                    <div className="text-3xl text-center font-bold mb-1 blur-lg">
                      {calculateCO2Savings({
                        currentConsumption: form.getValues("currentConsumption"),
                        projectedConsumption: form.getValues("projectedConsumption")
                      }).toFixed(2)}
                    </div>
                    <p className="text-sm text-center text-muted-foreground">Tons of CO₂ per year</p>
                  </div>
                </Card>

                <Card className="p-6 bg-primary/5 transition-all duration-300">
                  <div className="transition-all duration-300">
                    <div className="flex items-center justify-center mb-4">
                      <div className="rounded-full bg-calmBlue-100 p-3">
                        <Check className="w-6 h-6 text-calmBlue-600" />
                      </div>
                    </div>
                    <h3 className="text-center font-semibold mb-1">Carbon Credits</h3>
                    <div className="text-3xl text-center font-bold mb-1 blur-lg">
                      {calculateCarbonCredits({
                        currentConsumption: form.getValues("currentConsumption"),
                        projectedConsumption: form.getValues("projectedConsumption")
                      }).toFixed(2)}
                    </div>
                    <p className="text-sm text-center text-muted-foreground">Credits (1:1 with CO₂)</p>
                  </div>
                </Card>

                <Card className="p-6 bg-primary/5 transition-all duration-300">
                  <div className="transition-all duration-300">
                    <div className="flex items-center justify-center mb-4">
                      <div className="rounded-full bg-calmBlue-100 p-3">
                        <Check className="w-6 h-6 text-calmBlue-600" />
                      </div>
                    </div>
                    <h3 className="text-center font-semibold mb-1">Financial Value</h3>
                    <div className="text-3xl text-center font-bold mb-1 blur-lg">
                      €{calculateFinancialValue({
                        currentConsumption: form.getValues("currentConsumption"),
                        projectedConsumption: form.getValues("projectedConsumption")
                      }).toFixed(2)}
                    </div>
                    <p className="text-sm text-center text-muted-foreground">Potential market value</p>
                  </div>
                </Card>
              </div>

              <div className="mt-8 p-6 bg-gray-50 rounded-lg transition-all duration-300">
                <div className="transition-all duration-300">
                  <h3 className="text-lg font-semibold mb-4">Building Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Ownership Type</p>
                      <p className="font-medium capitalize">{form.getValues("buildingOwnership")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Building Size</p>
                      <p className="font-medium blur-lg">{form.getValues("buildingSize")} m²</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Heating System</p>
                      <p className="font-medium capitalize">{form.getValues("heatingSystem")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Energy Consumption Reduction</p>
                      <p className="font-medium blur-lg">
                        {(((form.getValues("currentConsumption") - form.getValues("projectedConsumption")) / form.getValues("currentConsumption")) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center mt-8">
                <p className="text-sm text-muted-foreground mb-4">
                  The detailed results will be sent to your email after completing the form.
                </p>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              {!isSubmitSuccess ? (
                <>
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
                  <Button type="submit" className="w-full">Submit</Button>
                </>
              ) : (
                <div className="text-center space-y-6">
                  <div className="rounded-full bg-calmBlue-100 w-16 h-16 mx-auto flex items-center justify-center mb-8">
                    <Check className="w-8 h-8 text-calmBlue-500" />
                  </div>

                  <h2 className="text-2xl font-bold mb-2">Submission Successful!</h2>

                  <p className="text-gray-600 max-w-md mx-auto">
                    Thank you for your interest in carbon credits. A detailed report has been sent to your email.
                    A Radical-Zero representative will contact you soon with more information about your potential carbon savings.
                  </p>
                </div>
              )}
            </div>
          )}
        </MultiStepForm>
      </form>
    </Form>
  );
}

interface ExtractedData {
  buildingSize?: number;
  currentConsumption?: number;
  projectedConsumption?: number;
  language?: string;
  heatingSystem?: string;
  energyConsultantName?: string;
  energyConsultantCompany?: string;
  energyConsultantId?: string;
  energyConsultantBafaNumber?: string;
  fileUrl?: string;
}