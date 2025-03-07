import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
    <Card className="max-w-2xl mx-auto" id="calculator">
      <CardContent className="pt-6">
        {/* Step counter */}
        <div className="text-sm text-muted-foreground mb-4">
          Step {currentStep} of {steps.length}
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between">
            {steps.map((_, index) => (
              <div key={index} className="flex-1">
                <div
                  className={`h-2 rounded-full ${
                    index < currentStep
                      ? "bg-[#4CAF50]" // Completed steps (green)
                      : index === currentStep - 1
                      ? "bg-[#4CAF50]" // Current step (green)
                      : "bg-gray-200" // Future steps (gray)
                  } mx-0.5`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Form content */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">{steps[currentStep - 1].title}</h2>
          {steps[currentStep - 1].description && (
            <p className="text-muted-foreground mb-6">{steps[currentStep - 1].description}</p>
          )}
          {children}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={onPrevious}
              className="px-6"
            >
              Back
            </Button>
          )}

          <Button
            type={isLastStep ? "submit" : "button"}
            onClick={!isLastStep ? onNext : undefined}
            className="px-6 ml-auto bg-[#4CAF50] hover:bg-[#45a049]"
            disabled={isSubmitting}
          >
            {isLastStep 
              ? (isSubmitting ? "Submitting..." : "Submit") 
              : currentStep === 5 ? "Continue" : "Next"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export const formSteps: Step[] = [
  {
    title: "Building Information",
    description: "Tell us about your building or upload your energy certificate"
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
    title: "Heating System",
    description: "Tell us about your heating system"
  },
  {
    title: "Results Preview",
    description: "Review your potential savings"
  },
  {
    title: "Contact Information",
    description: "Tell us how to reach you"
  },
  {
    title: "Energy Consultant Details",
    description: "Provide your energy consultant information"
  }
];