import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { InsertSubmission, insertSubmissionSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Check, Mail, RefreshCw, Loader2 } from "lucide-react";
import { DocumentUpload } from "./document-upload";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { SuccessModal } from "./success-modal";
import { TermsModal } from "./terms-modal";
import { GDPRModal } from "./gdpr-modal";

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
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showGDPRModal, setShowGDPRModal] = useState(false);

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
      console.log('Submitting form data:', data);
      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit calculation");
      }

      const result = await response.json();
      console.log('Calculation result:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Form submission successful:', data);

      // Set the calculation results in the form
      form.setValue("co2Savings", data.co2Savings);
      form.setValue("carbonCredits", data.carbonCredits);
      form.setValue("financialValue", data.financialValue);

      // Set the 10-year projection data
      form.setValue("tenYearProjection", {
        co2Savings: data.tenYearProjection.co2Savings,
        carbonCredits: data.tenYearProjection.carbonCredits,
        financialValue: data.tenYearProjection.financialValue
      });

      setIsSubmitSuccess(true);

      // Store result data for the results page
      const result = {
        ...form.getValues(),
        co2Savings: data.co2Savings,
        carbonCredits: data.carbonCredits,
        financialValue: data.financialValue,
        tenYearProjection: data.tenYearProjection
      };

      console.log('Storing result:', result);
      window.history.pushState({ result }, '', '/results');
    },
    onError: (error: Error) => {
      console.error('Form submission error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit calculation",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: InsertSubmission) => {
    console.log('Form submit triggered with data:', data);
    try {
      await mutate(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // When moving to step 4, trigger the calculation
  const nextStep = () => {
    if (step === 3) {
      // Trigger calculation before showing results
      form.handleSubmit(onSubmit)();
    }
    setStep(step + 1);
  };
  const previousStep = () => setStep(step - 1);
  const startNewCalculation = () => {
    form.reset();
    setStep(1);
    setIsSubmitSuccess(false);
  };
  const handleSendEmail = async () => {
    if (isEmailSent) return;

    setIsEmailSending(true);
    try {
      const response = await fetch("/api/email/send-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: form.getValues("firstName"),
          lastName: form.getValues("lastName"),
          email: form.getValues("email"),
          co2Savings: calculateCO2Savings(form.getValues()),
          carbonCredits: calculateCarbonCredits(form.getValues()),
          financialValue: calculateFinancialValue(form.getValues()),
          buildingSize: form.getValues("buildingSize"),
          currentConsumption: form.getValues("currentConsumption"),
          projectedConsumption: form.getValues("projectedConsumption"),
          heatingSystem: form.getValues("heatingSystem")
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      setIsEmailSent(true);
      toast({
        title: "Success!",
        description: "The detailed report has been sent to your email.",
      });
    } catch (error) {
      console.error('Email sending error:', error);
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEmailSending(false);
    }
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
              {/* Results section with restored styling */}
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-2xl font-bold mb-2">Your Carbon Savings Results</h2>
                <p className="text-muted-foreground mb-8">Here's the potential impact of your energy efficiency improvements</p>
              </motion.div>

              <div className="grid gap-4 md:grid-cols-3">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Card className="p-6 bg-primary/5 relative overflow-hidden">
                    <div className="transition-all duration-300">
                      <div className="relative z-10">
                        <div className="flex items-center justify-center mb-4">
                          <motion.div
                            className="rounded-full bg-calmBlue-100 p-3"
                            initial={{ rotate: -180, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                          >
                            <Check className="w-6 h-6 text-calmBlue-600" />
                          </motion.div>
                        </div>
                        <h3 className="text-center font-semibold mb-1">CO₂ Savings</h3>
                        <div className="text-3xl text-center font-bold mb-1 blur-md hover:blur-none transition-all duration-300">
                          {isPending ? (
                            <span className="animate-pulse">Calculating...</span>
                          ) : (
                            `${Number(form.getValues("co2Savings") || 0).toFixed(2)} tons`
                          )}
                        </div>
                        <p className="text-sm text-center text-muted-foreground">Per year</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <Card className="p-6 bg-primary/5 relative overflow-hidden">
                    <div className="transition-all duration-300">
                      <div className="relative z-10">
                        <div className="flex items-center justify-center mb-4">
                          <motion.div
                            className="rounded-full bg-calmBlue-100 p-3"
                            initial={{ rotate: -180, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                          >
                            <Check className="w-6 h-6 text-calmBlue-600" />
                          </motion.div>
                        </div>
                        <h3 className="text-center font-semibold mb-1">Carbon Credits</h3>
                        <div className="text-3xl text-center font-bold mb-1 blur-md hover:blur-none transition-all duration-300">
                          {isPending ? (
                            <span className="animate-pulse">Calculating...</span>
                          ) : (
                            Number(form.getValues("carbonCredits") || 0).toFixed(2)
                          )}
                        </div>
                        <p className="text-sm text-center text-muted-foreground">Credits (1:1 with CO₂)</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <Card className="p-6 bg-primary/5 relative overflow-hidden">
                    <div className="transition-all duration-300">
                      <div className="relative z-10">
                        <div className="flex items-center justify-center mb-4">
                          <motion.div
                            className="rounded-full bg-calmBlue-100 p-3"
                            initial={{ rotate: -180, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.7 }}
                          >
                            <Check className="w-6 h-6 text-calmBlue-600" />
                          </motion.div>
                        </div>
                        <h3 className="text-center font-semibold mb-1">Financial Value</h3>
                        <div className="text-3xl text-center font-bold mb-1 blur-md hover:blur-none transition-all duration-300">
                          {isPending ? (
                            <span className="animate-pulse">Calculating...</span>
                          ) : (
                            `€${Number(form.getValues("financialValue") || 0).toFixed(2)}`
                          )}
                        </div>
                        <p className="text-sm text-center text-muted-foreground">Potential market value</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </div>

              <motion.div
                className="mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <div className="p-6 bg-gray-50 rounded-lg transition-all duration-300">
                  <div className="transition-all duration-300">
                    <h3 className="text-lg font-semibold mb-4">Building Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Ownership Type</p>
                        <p className="font-medium capitalize">{form.getValues("buildingOwnership")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Building Size</p>
                        <p className="font-medium blur-md hover:blur-none transition-all duration-300">{form.getValues("buildingSize")} m²</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Current Consumption</p>
                        <p className="font-medium blur-md hover:blur-none transition-all duration-300">{form.getValues("currentConsumption")} kWh/year</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Projected Consumption</p>
                        <p className="font-medium blur-md hover:blur-none transition-all duration-300">{form.getValues("projectedConsumption")} kWh/year</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Energy Consumption Reduction</p>
                        <motion.div
                          className="h-2 bg-calmBlue-100 rounded-full mt-2 overflow-hidden"
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 1, delay: 1 }}
                        >
                          <motion.div
                            className="h-full bg-calmBlue-500"
                            initial={{ width: "0%" }}
                            animate={{ 
                              width: `${(((form.getValues("currentConsumption") - form.getValues("projectedConsumption")) / form.getValues("currentConsumption")) * 100).toFixed(1)}%` 
                            }}
                            transition={{ duration: 1.5, delay: 1.2 }}
                          />
                        </motion.div>
                        <p className="font-medium mt-2 blur-md hover:blur-none transition-all duration-300">
                          {(((form.getValues("currentConsumption") - form.getValues("projectedConsumption")) / form.getValues("currentConsumption")) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="mt-8 p-6 bg-primary/5 rounded-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1 }}
              >
                <h3 className="text-xl font-semibold mb-4">10-Year Projection</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total CO₂ Savings</p>
                    <p className="text-2xl font-bold blur-md hover:blur-none transition-all duration-300">
                      {isPending ? (
                        <span className="animate-pulse">Calculating...</span>
                      ) : (
                        `${Number(form.getValues("tenYearProjection.co2Savings") || 0).toFixed(2)} tons`
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Carbon Credits</p>
                    <p className="text-2xl font-bold blur-md hover:blur-none transition-all duration-300">
                      {isPending ? (
                        <span className="animate-pulse">Calculating...</span>
                      ) : (
                        Number(form.getValues("tenYearProjection.carbonCredits") || 0).toFixed(2)
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Financial Value</p>
                    <p className="text-2xl font-bold blur-md hover:blur-none transition-all duration-300">
                      {isPending ? (
                        <span className="animate-pulse">Calculating...</span>
                      ) : (
                        `€${Number(form.getValues("tenYearProjection.financialValue") || 0).toFixed(2)}`
                      )}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="text-center mt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 1.4 }}
              >
                <p className="text-sm text-muted-foreground mb-4">
                  The detailed results will be sent to your email after completing the form.
                </p>
              </motion.div>
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
                            I accept the{" "}
                            <button
                              type="button"
                              onClick={() => setShowTermsModal(true)}
                              className="text-calmBlue-600 hover:text-calmBlue-700 underline"
                            >
                              terms and conditions
                            </button>{" "}
                            and agree that Radical Zero can contact me via email
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
                            I consent to the processing of my personal data in accordance with the{" "}
                            <button
                              type="button"
                              onClick={() => setShowGDPRModal(true)}
                              className="text-calmBlue-600 hover:text-calmBlue-700 underline"
                            >
                              GDPR regulations
                            </button>
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

                  <div className="flex justify-center gap-4 mt-8">
                    <Button
                      type="button"
                      variant="default"
                      onClick={handleSendEmail}
                      className={`bg-calmBlue-600 hover:bg-calmBlue-700 px-6 relative ${
                        isEmailSent ? 'bg-calmBlue-700 hover:bg-calmBlue-800' : ''
                      }`}
                      disabled={isEmailSending || isEmailSent}
                    >
                      <AnimatePresence mode="wait">
                        {isEmailSending ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center"
                          >
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending Report...
                          </motion.div>
                        ) : isEmailSent ? (
                          <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center"
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Report Sent
                          </motion.div>
                        ) : (
                          <motion.div
                            key="default"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center"
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Send Report to Email
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </MultiStepForm>
      </form>

      <SuccessModal
        open={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setLocation('/results');
        }}
      />
      <TermsModal
        open={showTermsModal}
        onOpenChange={setShowTermsModal}
      />
      <GDPRModal
        open={showGDPRModal}
        onOpenChange={setShowGDPRModal}
      />
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