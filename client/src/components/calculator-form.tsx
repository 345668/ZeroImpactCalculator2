import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { InsertSubmission, insertSubmissionSchema, calculationSchema, contactSchema, consultantSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { DocumentUpload } from "./document-upload";
import { useLocation } from "wouter";
import { InterimResultsView } from "./interim-results-view";

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
import * as z from 'zod';

export function CalculatorForm() {
  const [step, setStep] = useState(1);
  const [documentLanguage, setDocumentLanguage] = useState<string>("en");
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isDocumentUploaded, setIsDocumentUploaded] = useState(false);
  const [interimResults, setInterimResults] = useState<any>(null);

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
      acceptedTerms: false,
      acceptedGDPR: false,
      consultantName: "",
      consultantCompany: "",
      consultantId: "",
      consultantBafaNumber: "",
      address: ""
    }
  });

  const handleExtractedData = (data: any) => {
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
    nextStep();
  };

  const calculateResults = async () => {
    const data = form.getValues();
    try {
      const calculationData = {
        buildingOwnership: data.buildingOwnership,
        buildingSize: data.buildingSize,
        heatingSystem: data.heatingSystem,
        currentConsumption: data.currentConsumption,
        projectedConsumption: data.projectedConsumption,
      };

      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(calculationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to calculate results");
      }

      const results = await response.json();
      setInterimResults(results);
      nextStep();
    } catch (error) {
      console.error('Calculation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to calculate results",
        variant: "destructive",
      });
    }
  };

  // Validation for the current step before proceeding
  const validateStep = async () => {
    try {
      const values = form.getValues();

      switch (step) {
        case 1:
          // Building Information
          await calculationSchema.pick({
            buildingSize: true,
            buildingOwnership: true
          }).parseAsync(values);
          break;
        case 2:
          // Current Consumption
          await calculationSchema.pick({
            currentConsumption: true
          }).parseAsync(values);
          break;
        case 3:
          // Projected Consumption
          await calculationSchema.pick({
            projectedConsumption: true
          }).parseAsync(values);
          break;
        case 4:
          // Heating System - only validate heating system selection
          await calculationSchema.pick({
            heatingSystem: true
          }).parseAsync(values);
          // After validation, proceed to calculation
          await calculateResults();
          return false; // prevent default next step
          break;
        case 6:
          // Contact Information
          await contactSchema.parseAsync(values);
          break;
        case 7:
          // Consultant Information
          await consultantSchema.parseAsync(values);
          break;
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          form.setError(err.path[0] as any, {
            type: 'manual',
            message: err.message
          });
        });
      }
      return false;
    }
  };

  const handleNext = async () => {
    if (await validateStep()) {
      nextStep();
    }
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: InsertSubmission) => {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          acceptedTerms: data.acceptedTerms === true,
          acceptedGDPR: data.acceptedGDPR === true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit form");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: "Your information has been submitted successfully.",
      });
      navigate("/success", { replace: true });
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
    console.log("Submitting form data:", data);
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
          onNext={handleNext}
          onPrevious={previousStep}
          isLastStep={step === formSteps.length}
          isSubmitting={isPending}
        >
          {/* Step 1: Building Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="p-6 bg-primary/5 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Upload Energy Certificate</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  For faster results, upload your energy certificate or renovation plan
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
                            I own the building and can implement energy efficiency measures
                          </p>
                        </FormItem>
                        <FormItem className="relative flex flex-col items-start space-y-3 rounded-lg border-2 border-muted p-4 hover:border-primary">
                          <FormControl>
                            <RadioGroupItem value="rent" className="absolute right-4 top-4" />
                          </FormControl>
                          <FormLabel className="text-base font-semibold">Tenant</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            I rent the building and want to explore energy efficiency options
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
                      <Input
                        type="number"
                        placeholder="Enter building size"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Step 2: Current Energy Consumption */}
          {step === 2 && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="currentConsumption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      What is your current annual energy consumption (excluding solar PV)?
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Current Consumption (kWh/year)"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="text-lg p-6"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Step 3: Projected Energy Consumption */}
          {step === 3 && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="projectedConsumption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      What is your projected annual energy consumption after improvements?
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Projected Consumption (kWh/year)"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="text-lg p-6"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Step 4: Heating System */}
          {step === 4 && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="heatingSystem"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel>What type of heating system do you use?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        <FormItem className="relative flex flex-col items-start space-y-3 rounded-lg border-2 border-muted p-4 hover:border-primary">
                          <FormControl>
                            <RadioGroupItem value="gas" className="absolute right-4 top-4" />
                          </FormControl>
                          <FormLabel className="text-base font-semibold">Gas Heating</FormLabel>
                          <p className="text-sm text-muted-foreground">Natural gas or LPG heating system</p>
                        </FormItem>
                        <FormItem className="relative flex flex-col items-start space-y-3 rounded-lg border-2 border-muted p-4 hover:border-primary">
                          <FormControl>
                            <RadioGroupItem value="oil" className="absolute right-4 top-4" />
                          </FormControl>
                          <FormLabel className="text-base font-semibold">Oil Heating</FormLabel>
                          <p className="text-sm text-muted-foreground">Oil-based heating system</p>
                        </FormItem>
                        <FormItem className="relative flex flex-col items-start space-y-3 rounded-lg border-2 border-muted p-4 hover:border-primary">
                          <FormControl>
                            <RadioGroupItem value="electric" className="absolute right-4 top-4" />
                          </FormControl>
                          <FormLabel className="text-base font-semibold">Electric Heating</FormLabel>
                          <p className="text-sm text-muted-foreground">Electric heating system</p>
                        </FormItem>
                        <FormItem className="relative flex flex-col items-start space-y-3 rounded-lg border-2 border-muted p-4 hover:border-primary">
                          <FormControl>
                            <RadioGroupItem value="other" className="absolute right-4 top-4" />
                          </FormControl>
                          <FormLabel className="text-base font-semibold">Other</FormLabel>
                          <p className="text-sm text-muted-foreground">Other heating system type</p>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Step 5: Results Preview */}
          {step === 5 && interimResults && (
            <InterimResultsView
              data={interimResults}
              onContinue={nextStep}
            />
          )}

          {/* Step 6: Contact Information */}
          {step === 6 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
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
                    <FormLabel>Email Address</FormLabel>
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
                  <FormItem className="flex flex-col space-y-4">
                    <div className="flex items-start space-x-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I accept the <a href="/terms" className="text-primary hover:underline">terms and conditions</a>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="acceptedGDPR"
                render={({ field }) => (
                  <FormItem className="flex flex-col space-y-4">
                    <div className="flex items-start space-x-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I understand and agree that my personal data will be processed in accordance with the <a href="/privacy" className="text-primary hover:underline">GDPR privacy policy</a>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Step 7: Energy Consultant Details */}
          {step === 7 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Energy Consultant Details</h2>
              <FormField
                control={form.control}
                name="consultantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consultant Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="consultantCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consultant Company</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="consultantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consultant ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="consultantBafaNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BAFA Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </MultiStepForm>
      </form>
    </Form>
  );
}