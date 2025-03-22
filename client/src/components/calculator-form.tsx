import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { InsertSubmission, insertSubmissionSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { 
  Check, Mail, RefreshCw, Loader2, 
  Droplet, Flame, Cylinder, Network, Zap, Box,
  TreePine, Trees, Leaf, Thermometer,
  ThermometerSun, Sun, SunDim, PanelTop
} from "lucide-react";
import { DocumentUpload } from "./document-upload.tsx";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { SuccessModal } from "./success-modal.tsx";
import { TermsModal } from "./terms-modal.tsx";
import { GDPRModal } from "./gdpr-modal.tsx";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { MultiStepForm } from "./multi-step-form.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";

// Update energySourceIcons mapping with corrected icons
const energySourceIcons: Record<string, React.ElementType> = {
  "heating oil": Droplet,
  "natural gas": Flame,
  "liquefied petroleum gas": Cylinder,
  "district heating": Network,
  "electricity mix": Zap,
  "coal heating": Box,
  "wood pellets": TreePine,
  "firewood": Trees,
  "biogas": Leaf,
  "heat pump (electricity mix)": Thermometer,
  "heat pump (green electricity)": ThermometerSun,
  "green electricity": Sun,
  "solar thermal": SunDim,
  "pv self-consumption": PanelTop
};

// Energy source options - these will be translated in the component
const getEnergySourceOptions = (t: any) => [
  { value: "heating oil", label: t('calculator.energySource.options.heatingOil', "Heating Oil") },
  { value: "natural gas", label: t('calculator.energySource.options.naturalGas', "Natural Gas") },
  { value: "liquefied petroleum gas", label: t('calculator.energySource.options.propane', "Propane/LPG") },
  { value: "district heating", label: t('calculator.energySource.options.district', "District Heating") },
  { value: "electricity mix", label: t('calculator.energySource.options.electricity', "Electricity") },
  { value: "coal heating", label: t('calculator.energySource.options.coal', "Coal") },
  { value: "wood pellets", label: t('calculator.energySource.options.wood', "Wood/Pellets") },
  { value: "biogas", label: t('calculator.energySource.options.biogas', "Biogas") },
  { value: "heat pump (electricity mix)", label: t('calculator.energySource.options.heatPump', "Heat Pump") },
  { value: "heat pump (green electricity)", label: t('calculator.energySource.options.heatPump', "Heat Pump") },
  { value: "green electricity", label: t('calculator.energySource.options.electricity', "Electricity") },
  { value: "solar thermal", label: t('calculator.energySource.options.solar', "Solar Thermal") },
  { value: "pv self-consumption", label: t('calculator.energySource.options.pvSelf', "PV Self-Consumption") }
];

// Update the form state type
interface FormState extends InsertSubmission {
  tenYearProjection?: {
    co2Savings: number;
    carbonCredits: number;
    financialValue: number;
  };
}

// Type for extracted data
interface ExtractedData {
  language?: string;
  buildingSize?: number;
  currentConsumption?: number;
  projectedConsumption?: number;
  heatingSystem?: string;
  energyConsultantName?: string;
  energyConsultantCompany?: string;
  energyConsultantId?: string;
  energyConsultantBafaNumber?: string;
  fileUrl?: string;
}

// Update form steps to include energy source selection
// We'll create the translated steps within the component to access the translation function
const getFormSteps = (t: any) => [
  {
    title: t('calculator.buildingInfo.title'),
    description: t('calculator.buildingInfo.description')
  },
  {
    title: t('calculator.energySource.title'),
    description: t('calculator.energySource.description')
  },
  {
    title: t('calculator.currentConsumption.title', 'Current Energy Consumption'),
    description: t('calculator.currentConsumption.description', 'Enter your current energy usage')
  },
  {
    title: t('calculator.projectedConsumption.title', 'Projected Energy Consumption'),
    description: t('calculator.projectedConsumption.description', 'Enter your expected energy usage after improvements')
  },
  {
    title: t('calculator.results.title', 'Results Analysis'),
    description: t('calculator.results.description', 'Review your potential savings')
  },
  {
    title: t('calculator.contactDetails.title', 'Contact Details'),
    description: t('calculator.contactDetails.description', 'Please provide your contact information to receive the report')
  }
];

export function CalculatorForm() {
  const [step, setStep] = useState(1);
  const [documentLanguage, setDocumentLanguage] = useState<string>("en");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [isDocumentUploaded, setIsDocumentUploaded] = useState(false);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showGDPRModal, setShowGDPRModal] = useState(false);
  
  // Get translations
  const formSteps = getFormSteps(t);
  const energySourceOptions = getEnergySourceOptions(t);

  const form = useForm<FormState>({
    resolver: zodResolver(insertSubmissionSchema),
    defaultValues: {
      buildingOwnership: "own",
      buildingSize: 0,
      heatingSystem: "gas",
      currentEnergySource: "natural gas",
      currentConsumption: 0,
      projectedConsumption: 0,
      firstName: "",
      lastName: "",
      email: "",
      streetName: "",
      postalCode: "",
      country: "germany",
      region: "",
      acceptedTerms: "false",
      gdprConsent: "false",
      energyConsultantName: "",
      energyConsultantCompany: "",
      energyConsultantId: "",
      energyConsultantBafaNumber: "",
      fileUrl: ""
    }
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: FormState) => {
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

      return await response.json();
    },
    onSuccess: (data) => {
      console.log('Form submission successful:', data);

      // Update form with calculation results
      form.setValue("co2Savings", data.co2Savings);
      form.setValue("carbonCredits", data.carbonCredits);
      form.setValue("financialValue", data.financialValue);
      form.setValue("tenYearProjection", data.tenYearProjection);

      setIsSubmitSuccess(true);
      setLocation("/results");
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

  const onSubmit = async (data: FormState) => {
    console.log('Form submit triggered with data:', data);
    try {
      await mutate(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // When moving to step 5 (results), trigger the calculation
  const nextStep = () => {
    if (step === 4) {
      // Trigger calculation before showing results
      form.handleSubmit(onSubmit)();
    } else if (step === 5) {
      // Validate personal information before submission
      form.trigger(["firstName", "lastName", "email", "streetName", "postalCode", "country", "region", "acceptedTerms", "gdprConsent"]);
      
      // Only proceed if there are no errors in the personal information fields
      const hasErrors = Object.keys(form.formState.errors).length > 0;
      if (hasErrors) {
        console.log("Form validation errors:", form.formState.errors);
        toast({
          title: t('calculator.errors.validationFailed'),
          description: t('calculator.errors.checkFields'),
          variant: "destructive",
        });
        return; // Don't proceed to next step
      }
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
                <h3 className="text-lg font-medium mb-2">{t('calculator.uploadTitle')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('calculator.uploadDescription')}
                </p>
                <DocumentUpload 
                  onDataExtracted={handleExtractedData} 
                  email={form.getValues("email")} 
                />
                {isDocumentUploaded && (
                  <p className="mt-2 text-sm text-primary">✓ {t('calculator.uploadSuccess')}</p>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">{t('calculator.orFillManually')}</span>
                </div>
              </div>

              <FormField
                control={form.control}
                name="buildingOwnership"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel>{t('calculator.buildingInfo.ownership.question')}</FormLabel>
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
                          <FormLabel className="text-base font-semibold">{t('calculator.buildingInfo.ownership.owner')}</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            {t('calculator.buildingInfo.ownership.ownerDesc')}
                          </p>
                        </FormItem>
                        <FormItem className="relative flex flex-col items-start space-y-3 rounded-lg border-2 border-muted p-4 hover:border-primary">
                          <FormControl>
                            <RadioGroupItem value="rent" className="absolute right-4 top-4" />
                          </FormControl>
                          <FormLabel className="text-base font-semibold">{t('calculator.buildingInfo.ownership.tenant')}</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            {t('calculator.buildingInfo.ownership.tenantDesc')}
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
                    <FormLabel>{t('calculator.buildingInfo.size')}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder={t('calculator.buildingInfo.size')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="currentEnergySource"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <FormLabel className="text-2xl font-bold block mb-2">{t('calculator.energySource.question')}</FormLabel>
                      <p className="text-muted-foreground mb-6">{t('calculator.energySource.subheading')}</p>
                    </motion.div>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        {getEnergySourceOptions(t).map((option, index) => {
                          const IconComponent = energySourceIcons[option.value];
                          return (
                            <motion.div
                              key={option.value}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              <FormItem className="relative">
                                <FormControl>
                                  <label
                                    className={`
                                      relative flex flex-col items-start rounded-lg border-2 p-4 cursor-pointer
                                      transition-all duration-200 ease-in-out
                                      ${field.value === option.value 
                                        ? 'border-primary bg-primary/5 shadow-lg transform scale-[1.02]' 
                                        : 'border-muted hover:border-primary/50 hover:bg-muted/5'}
                                    `}
                                  >
                                    <RadioGroupItem 
                                      value={option.value} 
                                      className="absolute right-4 top-4"
                                    />
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className={`
                                        rounded-full p-2
                                        ${field.value === option.value ? 'bg-primary/20' : 'bg-muted'}
                                      `}>
                                        <IconComponent
                                          className={`
                                            w-5 h-5
                                            ${field.value === option.value ? 'text-primary' : 'text-muted-foreground'}
                                          `}
                                        />
                                      </div>
                                      <FormLabel className="text-base font-semibold cursor-pointer">
                                        {option.label}
                                      </FormLabel>
                                    </div>
                                    {field.value === option.value && (
                                      <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-sm text-primary"
                                      >
                                        {t('calculator.energySource.selected')}
                                      </motion.div>
                                    )}
                                  </label>
                                </FormControl>
                              </FormItem>
                            </motion.div>
                          );
                        })}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="currentConsumption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base mb-4">
                      {t('calculator.currentConsumption.question')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder={t('calculator.currentConsumption.placeholder')}
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
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-2xl font-bold mb-2">{t('calculator.projectedConsumption.title')}</h2>
                <p className="text-muted-foreground mb-8">{t('calculator.projectedConsumption.description')}</p>
              </motion.div>
              
              <FormField
                control={form.control}
                name="projectedConsumption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base mb-4">
                      {t('calculator.projectedConsumption.question')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder={t('calculator.projectedConsumption.placeholder')}
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

          {step === 5 && (
            <div className="space-y-6">
              {/* Results section with restored styling */}
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-2xl font-bold mb-2">{t('calculator.results.title')}</h2>
                <p className="text-muted-foreground mb-8">{t('calculator.results.description')}</p>
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
                        <h3 className="text-center font-semibold mb-1">{t('calculator.results.co2Savings')}</h3>
                        <div className="text-3xl text-center font-bold mb-1 blur-md">
                          {isPending ? (
                            <span className="animate-pulse">{t('common.loading')}</span>
                          ) : (
                            `${Number(form.getValues("co2Savings") || 0).toFixed(2)} ${t('calculator.results.tonsCO2')}`
                          )}
                        </div>
                        <p className="text-sm text-center text-muted-foreground">{t('common.perYear')}</p>
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
                        <h3 className="text-center font-semibold mb-1">{t('calculator.results.carbonCredits')}</h3>
                        <div className="text-3xl text-center font-bold mb-1 blur-md">
                          {isPending ? (
                            <span className="animate-pulse">{t('common.loading')}</span>
                          ) : (
                            Number(form.getValues("carbonCredits") || 0).toFixed(2)
                          )}
                        </div>
                        <p className="text-sm text-center text-muted-foreground">{t('calculator.results.creditValue')}</p>
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
                        <h3 className="text-center font-semibold mb-1">{t('calculator.results.financialValue')}</h3>
                        <div className="text-3xl text-center font-bold mb-1 blur-md">
                          {isPending ? (
                            <span className="animate-pulse">{t('common.loading')}</span>
                          ) : (
                            `€${Number(form.getValues("financialValue") || 0).toFixed(2)}`
                          )}
                        </div>
                        <p className="text-sm text-center text-muted-foreground">{t('common.potentialMarketValue')}</p>
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
                    <h3 className="text-lg font-semibold mb-4">{t('calculator.buildingInfo.title')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{t('common.ownershipType')}</p>
                        <p className="font-medium capitalize blur-md">{form.getValues("buildingOwnership")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('calculator.buildingInfo.size')}</p>
                        <p className="font-medium blur-md">{form.getValues("buildingSize")} m²</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('calculator.currentConsumption.title')}</p>
                        <p className="font-medium blur-md">{form.getValues("currentConsumption")} kWh/year</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('calculator.projectedConsumption.title')}</p>
                        <p className="font-medium blur-md">{form.getValues("projectedConsumption")} kWh/year</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('common.energyConsumptionReduction')}</p>
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
                        <p className="font-medium mt-2 blur-md">
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
                <h3 className="text-xl font-semibold mb-4">{t('calculator.tenYearProjection.title')}</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('calculator.tenYearProjection.totalCO2Savings')}</p>
                    <p className="text-2xl font-bold blur-md">
                      {isPending ? (
                        <span className="animate-pulse">{t('common.loading')}</span>
                      ) : (
                        `${Number(form.getValues("tenYearProjection.co2Savings") || 0).toFixed(2)} ${t('calculator.results.tonsCO2')}`
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('calculator.tenYearProjection.totalCarbonCredits')}</p>
                    <p className="text-2xl font-bold blur-md">
                      {isPending ? (
                        <span className="animate-pulse">{t('common.loading')}</span>
                      ) : (
                        Number(form.getValues("tenYearProjection.carbonCredits") || 0).toFixed(2)
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('calculator.tenYearProjection.totalFinancialValue')}</p>
                    <p className="text-2xl font-bold blur-md">
                      {isPending ? (
                        <span className="animate-pulse">{t('common.loading')}</span>
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
                  {t('calculator.results.emailDetails')}
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
                        <FormLabel>{t('calculator.contactDetails.firstName')}</FormLabel>
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
                        <FormLabel>{t('calculator.contactDetails.lastName')}</FormLabel>
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
                        <FormLabel>{t('calculator.contactDetails.email')}</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="streetName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('calculator.contactDetails.street')}</FormLabel>
                        <FormControl>
                          <Input placeholder="Street name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('calculator.contactDetails.postalCode')}</FormLabel>
                        <FormControl>
                          <Input placeholder="Postal code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('calculator.contactDetails.country')}</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset region when country changes
                            form.setValue('region', '');
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('calculator.contactDetails.selectCountry')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white dark:bg-gray-950">
                            <SelectItem value="germany">Germany</SelectItem>
                            <SelectItem value="austria">Austria</SelectItem>
                            <SelectItem value="switzerland">Switzerland</SelectItem>
                            <SelectItem value="france">France</SelectItem>
                            <SelectItem value="netherlands">Netherlands</SelectItem>
                            <SelectItem value="belgium">Belgium</SelectItem>
                            <SelectItem value="luxembourg">Luxembourg</SelectItem>
                            <SelectItem value="uk">United Kingdom</SelectItem>
                            <SelectItem value="italy">Italy</SelectItem>
                            <SelectItem value="spain">Spain</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => {
                      const country = form.watch('country');
                      let regionOptions = [];
                      
                      // Populate regions based on selected country
                      switch (country) {
                        case 'germany':
                          regionOptions = [
                            { value: 'baden-wuerttemberg', label: 'Baden-Württemberg' },
                            { value: 'bayern', label: 'Bayern' },
                            { value: 'berlin', label: 'Berlin' },
                            { value: 'brandenburg', label: 'Brandenburg' },
                            { value: 'bremen', label: 'Bremen' },
                            { value: 'hamburg', label: 'Hamburg' },
                            { value: 'hessen', label: 'Hessen' },
                            { value: 'mecklenburg-vorpommern', label: 'Mecklenburg-Vorpommern' },
                            { value: 'niedersachsen', label: 'Niedersachsen' },
                            { value: 'nordrhein-westfalen', label: 'Nordrhein-Westfalen' },
                            { value: 'rheinland-pfalz', label: 'Rheinland-Pfalz' },
                            { value: 'saarland', label: 'Saarland' },
                            { value: 'sachsen', label: 'Sachsen' },
                            { value: 'sachsen-anhalt', label: 'Sachsen-Anhalt' },
                            { value: 'schleswig-holstein', label: 'Schleswig-Holstein' },
                            { value: 'thueringen', label: 'Thüringen' }
                          ];
                          break;
                        case 'austria':
                          regionOptions = [
                            { value: 'vienna', label: 'Vienna' },
                            { value: 'lower-austria', label: 'Lower Austria' },
                            { value: 'upper-austria', label: 'Upper Austria' },
                            { value: 'styria', label: 'Styria' },
                            { value: 'tyrol', label: 'Tyrol' },
                            { value: 'carinthia', label: 'Carinthia' },
                            { value: 'salzburg', label: 'Salzburg' },
                            { value: 'vorarlberg', label: 'Vorarlberg' },
                            { value: 'burgenland', label: 'Burgenland' }
                          ];
                          break;
                        case 'switzerland':
                          regionOptions = [
                            { value: 'zurich', label: 'Zurich' },
                            { value: 'bern', label: 'Bern' },
                            { value: 'vaud', label: 'Vaud' },
                            { value: 'geneva', label: 'Geneva' },
                            { value: 'ticino', label: 'Ticino' },
                            { value: 'st-gallen', label: 'St. Gallen' },
                            { value: 'basel-stadt', label: 'Basel-Stadt' },
                            { value: 'basel-landschaft', label: 'Basel-Landschaft' },
                            { value: 'lucerne', label: 'Lucerne' },
                            { value: 'valais', label: 'Valais' },
                            { value: 'aargau', label: 'Aargau' },
                            { value: 'graubunden', label: 'Graubünden' },
                            { value: 'thurgau', label: 'Thurgau' },
                            { value: 'fribourg', label: 'Fribourg' },
                            { value: 'solothurn', label: 'Solothurn' },
                            { value: 'neuchatel', label: 'Neuchâtel' },
                            { value: 'schwyz', label: 'Schwyz' },
                            { value: 'zug', label: 'Zug' },
                            { value: 'schaffhausen', label: 'Schaffhausen' },
                            { value: 'jura', label: 'Jura' },
                            { value: 'appenzell-ausserrhoden', label: 'Appenzell Ausserrhoden' },
                            { value: 'nidwalden', label: 'Nidwalden' },
                            { value: 'glarus', label: 'Glarus' },
                            { value: 'obwalden', label: 'Obwalden' },
                            { value: 'uri', label: 'Uri' },
                            { value: 'appenzell-innerrhoden', label: 'Appenzell Innerrhoden' }
                          ];
                          break;
                        case 'france':
                          regionOptions = [
                            { value: 'ile-de-france', label: 'Île-de-France' },
                            { value: 'auvergne-rhone-alpes', label: 'Auvergne-Rhône-Alpes' },
                            { value: 'nouvelle-aquitaine', label: 'Nouvelle-Aquitaine' },
                            { value: 'occitanie', label: 'Occitanie' },
                            { value: 'hauts-de-france', label: 'Hauts-de-France' },
                            { value: 'grand-est', label: 'Grand Est' },
                            { value: 'provence-alpes-cote-dazur', label: 'Provence-Alpes-Côte d\'Azur' },
                            { value: 'pays-de-la-loire', label: 'Pays de la Loire' },
                            { value: 'normandy', label: 'Normandy' },
                            { value: 'brittany', label: 'Brittany' },
                            { value: 'bourgogne-franche-comte', label: 'Bourgogne-Franche-Comté' },
                            { value: 'centre-val-de-loire', label: 'Centre-Val de Loire' },
                            { value: 'corsica', label: 'Corsica' }
                          ];
                          break;
                        case 'netherlands':
                          regionOptions = [
                            { value: 'north-holland', label: 'North Holland' },
                            { value: 'south-holland', label: 'South Holland' },
                            { value: 'north-brabant', label: 'North Brabant' },
                            { value: 'gelderland', label: 'Gelderland' },
                            { value: 'utrecht', label: 'Utrecht' },
                            { value: 'limburg', label: 'Limburg' },
                            { value: 'overijssel', label: 'Overijssel' },
                            { value: 'friesland', label: 'Friesland' },
                            { value: 'groningen', label: 'Groningen' },
                            { value: 'drenthe', label: 'Drenthe' },
                            { value: 'flevoland', label: 'Flevoland' },
                            { value: 'zeeland', label: 'Zeeland' }
                          ];
                          break;
                        case 'belgium':
                          regionOptions = [
                            { value: 'brussels-capital', label: 'Brussels-Capital Region' },
                            { value: 'flanders', label: 'Flanders' },
                            { value: 'wallonia', label: 'Wallonia' }
                          ];
                          break;
                        case 'luxembourg':
                          regionOptions = [
                            { value: 'luxembourg-district', label: 'Luxembourg District' },
                            { value: 'diekirch-district', label: 'Diekirch District' },
                            { value: 'grevenmacher-district', label: 'Grevenmacher District' }
                          ];
                          break;
                        case 'uk':
                          regionOptions = [
                            { value: 'england', label: 'England' },
                            { value: 'scotland', label: 'Scotland' },
                            { value: 'wales', label: 'Wales' },
                            { value: 'northern-ireland', label: 'Northern Ireland' }
                          ];
                          break;
                        case 'italy':
                          regionOptions = [
                            { value: 'lombardy', label: 'Lombardy' },
                            { value: 'lazio', label: 'Lazio' },
                            { value: 'campania', label: 'Campania' },
                            { value: 'sicily', label: 'Sicily' },
                            { value: 'veneto', label: 'Veneto' },
                            { value: 'emilia-romagna', label: 'Emilia-Romagna' },
                            { value: 'piedmont', label: 'Piedmont' },
                            { value: 'apulia', label: 'Apulia' },
                            { value: 'tuscany', label: 'Tuscany' },
                            { value: 'calabria', label: 'Calabria' },
                            { value: 'sardinia', label: 'Sardinia' },
                            { value: 'liguria', label: 'Liguria' },
                            { value: 'marche', label: 'Marche' },
                            { value: 'abruzzo', label: 'Abruzzo' },
                            { value: 'friuli-venezia-giulia', label: 'Friuli-Venezia Giulia' },
                            { value: 'trentino-alto-adige', label: 'Trentino-Alto Adige' },
                            { value: 'umbria', label: 'Umbria' },
                            { value: 'basilicata', label: 'Basilicata' },
                            { value: 'molise', label: 'Molise' },
                            { value: 'valle-daosta', label: 'Valle d\'Aosta' }
                          ];
                          break;
                        case 'spain':
                          regionOptions = [
                            { value: 'andalusia', label: 'Andalusia' },
                            { value: 'catalonia', label: 'Catalonia' },
                            { value: 'madrid', label: 'Community of Madrid' },
                            { value: 'valencia', label: 'Valencian Community' },
                            { value: 'galicia', label: 'Galicia' },
                            { value: 'castile-and-leon', label: 'Castile and León' },
                            { value: 'basque-country', label: 'Basque Country' },
                            { value: 'castilla-la-mancha', label: 'Castilla-La Mancha' },
                            { value: 'canary-islands', label: 'Canary Islands' },
                            { value: 'murcia', label: 'Region of Murcia' },
                            { value: 'aragon', label: 'Aragon' },
                            { value: 'balearic-islands', label: 'Balearic Islands' },
                            { value: 'extremadura', label: 'Extremadura' },
                            { value: 'asturias', label: 'Principality of Asturias' },
                            { value: 'navarre', label: 'Navarre' },
                            { value: 'cantabria', label: 'Cantabria' },
                            { value: 'la-rioja', label: 'La Rioja' },
                            { value: 'ceuta', label: 'Ceuta' },
                            { value: 'melilla', label: 'Melilla' }
                          ];
                          break;
                        // For other countries, allow text entry
                        default:
                          regionOptions = [
                            { value: 'other_city', label: 'Type your city' }
                          ];
                      }
                      
                      return (
                        <FormItem>
                          <FormLabel>{t('calculator.contactDetails.region')}</FormLabel>
                          {regionOptions.length > 1 ? (
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('calculator.contactDetails.selectRegion')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white dark:bg-gray-950">
                                {regionOptions.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <FormControl>
                              <Input placeholder="Enter your region" {...field} />
                            </FormControl>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="acceptedTerms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value === "true"}
                            onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            {t('calculator.consent.terms.beforeLink')}{" "}
                            <button
                              type="button"
                              onClick={() => setShowTermsModal(true)}
                              className="text-calmBlue-600 hover:text-calmBlue-700 underline"
                            >
                              {t('calculator.consent.terms.link')}
                            </button>{" "}
                            {t('calculator.consent.terms.afterLink')}
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
                            checked={field.value === "true"}
                            onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            {t('calculator.consent.gdpr.beforeLink')}{" "}
                            <button
                              type="button"
                              onClick={() => setShowGDPRModal(true)}
                              className="text-calmBlue-600 hover:text-calmBlue-700 underline"
                            >
                              {t('calculator.consent.gdpr.link')}
                            </button>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">{t('calculator.submit')}</Button>
                </>
              ) : (
                <div className="text-center space-y-6">
                  <div className="rounded-full bg-calmBlue-100 w-16 h-16 mx-auto flex items-center justify-center mb-8">
                    <Check className="w-8 h-8 text-calmBlue-500" />
                  </div>

                  <h2 className="text-2xl font-bold mb-2">{t('calculator.success.title')}</h2>

                  <p className="text-gray-600 max-w-md mx-auto">
                    {t('calculator.success.message')}
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
                            {t('calculator.emailReport.sending')}
                          </motion.div>
                        ) : isEmailSent ? (
                          <motion.div
                            key="success"
                            initial={{ opacity:0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center"
                          >
                            <Check className="mr-2 h-4 w-4" />
                            {t('calculator.emailReport.sent')}
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
                            {t('calculator.emailReport.send')}
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
        open={false}
        onClose={() => {
          //setShowSuccessModal(false);
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