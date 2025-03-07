import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { InsertSubmission, insertSubmissionSchema, calculationSchema } from "@shared/schema";
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
      buildingSize: "",
      currentConsumption: "",
      projectedConsumption: "",
      heatingSystem: "gas",
      firstName: "",
      lastName: "",
      email: "",
      address: "",
      acceptedTerms: false,
      acceptedGDPR: false,
      consultantName: "",
      consultantCompany: "",
      consultantId: "",
      consultantBafaNumber: "",
    }
  });

  const handleExtractedData = (data: any) => {
    console.log('Extracted data:', data);

    if (data.building_size) {
      const size = Number(data.building_size);
      if (!isNaN(size)) {
        form.setValue("buildingSize", size.toString());
      }
    }

    if (data.current_consumption) {
      const consumption = Number(data.current_consumption);
      if (!isNaN(consumption)) {
        form.setValue("currentConsumption", consumption.toString());
      }
    }

    if (data.projected_consumption) {
      const projected = Number(data.projected_consumption);
      if (!isNaN(projected)) {
        form.setValue("projectedConsumption", projected.toString());
      }
    }

    if (data.heating_system_type) {
      let heatingType = 'other';
      const type = data.heating_system_type.toLowerCase();
      if (type.includes('gas')) heatingType = 'gas';
      else if (type.includes('oil')) heatingType = 'oil';
      else if (type.includes('electric')) heatingType = 'electric';
      form.setValue("heatingSystem", heatingType);
    }

    // Set default values
    form.setValue("buildingOwnership", "own");

    // Set consultant details if available
    if (data.consultant_name) form.setValue("consultantName", data.consultant_name);
    if (data.consultant_company) form.setValue("consultantCompany", data.consultant_company);
    if (data.consultant_id) form.setValue("consultantId", data.consultant_id);
    if (data.consultant_bafa_number) form.setValue("consultantBafaNumber", data.consultant_bafa_number);

    if (data.language) {
      setDocumentLanguage(data.language);
    }

    setIsDocumentUploaded(true);
    nextStep();
  };

  const calculateResults = async () => {
    try {
      const values = form.getValues();

      // Only validate calculation-related fields
      const calculationData = await calculationSchema.parseAsync({
        buildingSize: Number(values.buildingSize),
        currentConsumption: Number(values.currentConsumption),
        projectedConsumption: Number(values.projectedConsumption),
        buildingOwnership: values.buildingOwnership,
        heatingSystem: values.heatingSystem
      });

      console.log('Sending calculation data:', calculationData);

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

  const nextStep = () => setStep(step + 1);
  const previousStep = () => setStep(step - 1);

  const handleNext = async () => {
    if (step === 4) {
      await calculateResults();
    } else {
      nextStep();
    }
  };

  const onSubmit = (data: InsertSubmission) => {
    mutate(data);
  };

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
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value ? value : '');
                        }}
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
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value ? value : '');
                        }}
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
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value ? value : '');
                        }}
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