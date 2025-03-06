import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertSubmissionSchema } from "@shared/schema";
import type { InsertSubmission } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Check } from "lucide-react";
import { DocumentUpload } from "./document-upload";

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

interface ExtractedData {
  buildingSize?: number;
  currentConsumption?: number;
  projectedConsumption?: number;
  language?: string;
}

export function CalculatorForm() {
  const [step, setStep] = useState(1);
  const [documentLanguage, setDocumentLanguage] = useState<string>("en");
  const { toast } = useToast();

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
      acceptedTerms: "false"
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
  };

  const { mutate, isPending, data: result } = useMutation({
    mutationFn: async (data: InsertSubmission) => {
      const res = await apiRequest("POST", "/api/calculate", {
        ...data,
        documentLanguage,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your calculation has been submitted.",
      });
    },
    onError: (error) => {
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

  const nextStep = () => {
    setStep(step + 1);
  };

  const previousStep = () => {
    setStep(step - 1);
  };

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
            <>
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
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Upload Energy Certificate</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload your energy certificate or renovation plan to automatically fill the form
                </p>
                <DocumentUpload onDataExtracted={handleExtractedData} />
              </div>
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
                        checked={field.value === "true"}
                        onCheckedChange={(checked) => {
                          field.onChange(checked ? "true" : "false");
                        }}
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

        {result && (
          <div className="mt-8 space-y-6">
            <h2 className="text-2xl font-semibold text-center">Your Carbon Savings Results</h2>
            <p className="text-center text-muted-foreground">
              Here's the potential impact of your energy efficiency improvements
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-primary/5 rounded-lg p-6 text-center relative">
                <div className="absolute top-4 right-4 bg-primary/10 rounded-full p-1">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-primary font-semibold mb-2">CO₂ Savings</h3>
                <p className="text-3xl font-bold">{Number(result.co2Savings)}</p>
                <p className="text-sm text-muted-foreground">Tons of CO₂ per year</p>
              </div>
              <div className="bg-primary/5 rounded-lg p-6 text-center relative">
                <div className="absolute top-4 right-4 bg-primary/10 rounded-full p-1">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-primary font-semibold mb-2">Carbon Credits</h3>
                <p className="text-3xl font-bold">{Number(result.carbonCredits)}</p>
                <p className="text-sm text-muted-foreground">Credits (1:1 with CO₂)</p>
              </div>
              <div className="bg-primary/5 rounded-lg p-6 text-center relative">
                <div className="absolute top-4 right-4 bg-primary/10 rounded-full p-1">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-primary font-semibold mb-2">Financial Value</h3>
                <p className="text-3xl font-bold">€{Number(result.financialValue)}</p>
                <p className="text-sm text-muted-foreground">Potential market value</p>
              </div>
            </div>
            <div className="mt-6 p-6 bg-muted/20 rounded-lg">
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
                    {Number(result.currentConsumption) - Number(result.projectedConsumption)} kWh/year (
                    {Math.round(((Number(result.currentConsumption) - Number(result.projectedConsumption)) / Number(result.currentConsumption)) * 100)}%)
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 p-6 bg-muted/20 rounded-lg">
              <h3 className="font-semibold mb-4">10-Year Prognosis</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-muted-foreground">Total CO₂ Savings</p>
                    <p className="text-2xl font-bold">{(Number(result.co2Savings) * 10).toFixed(2)} tons</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Carbon Credits</p>
                    <p className="text-2xl font-bold">{(Number(result.carbonCredits) * 10).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Financial Value</p>
                    <p className="text-2xl font-bold">€{(Number(result.financialValue) * 10).toFixed(2)}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  * Projections assume consistent savings over 10 years. Actual results may vary based on market conditions and implementation.
                </p>
              </div>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}