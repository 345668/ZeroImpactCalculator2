import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";

interface Step {
  title: string;
  description?: string;
}

interface MultiStepFormProps {
  currentStep: number;
  steps: Step[];
  children: ReactNode;
  onNext?: () => void;
  onPrevious?: () => void;
  isLastStep: boolean;
  isSubmitting?: boolean;
}

export function MultiStepForm({
  currentStep,
  steps,
  children,
  onNext,
  onPrevious,
  isLastStep,
  isSubmitting = false,
}: MultiStepFormProps) {
  return (
    <Card className="max-w-2xl mx-auto backdrop-blur-sm bg-white/95 dark:bg-gray-900/95 shadow-xl" id="calculator">
      <CardContent className="pt-6">
        {/* Step counter */}
        <div className="text-sm text-muted-foreground mb-4">
          Step {currentStep} of {steps.length}
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {steps.map((step, index) => (
              <div key={index} className="flex-1">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    index < currentStep
                      ? 'bg-green-500'
                      : index === currentStep
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  } mx-0.5`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between px-2">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex items-center justify-center ${
                  index < currentStep ? 'text-green-500' : 'text-gray-400'
                }`}
              >
                {index < currentStep ? (
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-6 h-6" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form content */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">{steps[currentStep - 1].title}</h2>
          <p className="text-muted-foreground mb-6">{steps[currentStep - 1].description}</p>
          {children}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6 gap-4">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={onPrevious}
              className="min-w-[100px]"
            >
              Back
            </Button>
          )}

          {!isLastStep && (
            <Button
              type="button"
              onClick={onNext}
              className="min-w-[100px] ml-auto bg-green-600 hover:bg-green-700"
            >
              Continue
            </Button>
          )}

          {isLastStep && (
            <Button
              type="submit"
              className="min-w-[100px] ml-auto bg-green-600 hover:bg-green-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export const formSteps: Step[] = [
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
    title: "Personal Information",
    description: "Tell us about yourself"
  },
  {
    title: "Review & Submit",
    description: "Review your information and submit"
  }
];