import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { InsertSubmission, insertSubmissionSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Check } from "lucide-react";
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
import { MultiStepForm, formSteps } from "./multi-step-form";
import { Button } from "@/components/ui/button";

interface ExtractedData {
  buildingSize?: number;
  currentConsumption?: number;
  projectedConsumption?: number;
  language?: string;
  heatingSystem?: string;
}

export function CalculatorForm() {
  const [step, setStep] = useState(1);
  const [documentLanguage, setDocumentLanguage] = useState<string>("en");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isDocumentUploaded, setIsDocumentUploaded] = useState(false);

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
      acceptedTerms: false
    }
  });

  const handleExtractedData = (data: ExtractedData) => {
    console.log('Received extracted data:', data);
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
    setIsDocumentUploaded(true);
    nextStep(); // Automatically move to next step after successful document upload
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: InsertSubmission) => {
      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          documentLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit calculation");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Navigate to results page with the calculation data
      setLocation("/results", { 
        state: { result: data }
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <MultiStepForm
          currentStep={step}
          steps={formSteps}
          onNext={nextStep}
          onPrevious={previousStep}
          isLastStep={step === 3}
          isSubmitting={isPending}
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
            <>
              <FormField
                control={form.control}
                name="heatingSystem"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel>What is your current heating system?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        {["gas", "oil", "pellet", "other"].map((value) => (
                          <FormItem
                            key={value}
                            className="relative flex items-center justify-between rounded-lg border-2 border-muted p-4 hover:border-primary"
                          >
                            <FormControl>
                              <RadioGroupItem value={value} className="absolute right-4" />
                            </FormControl>
                            <FormLabel className="text-base font-semibold capitalize">
                              {value}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentConsumption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What is your current annual energy consumption (kWh/year)?</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter current consumption"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="projectedConsumption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What is your projected annual energy consumption (kWh/year)?</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter projected consumption"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {step === 3 && (
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
            </>
          )}
        </MultiStepForm>
      </form>
    </Form>
  );
}