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
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 
                    ${
                      index < currentStep
                        ? "bg-primary text-primary-foreground border-primary"
                        : index === currentStep
                        ? "border-primary text-primary"
                        : "border-muted-foreground text-muted-foreground"
                    }`}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-[2px] w-12 mx-2 
                      ${
                        index < currentStep
                          ? "bg-primary"
                          : "bg-muted-foreground"
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`text-sm ${
                  index === currentStep - 1
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                }`}
                style={{ width: "33.33%" }}
              >
                {step.title}
              </div>
            ))}
          </div>
        </div>

        {/* Form content */}
        <div className="mb-6">{children}</div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={onPrevious}
              className="px-6"
            >
              Previous
            </Button>
          )}
          
          {!isLastStep ? (
            <Button
              type="button"
              onClick={onNext}
              className="px-6 ml-auto"
            >
              Next
            </Button>
          ) : (
            <Button
              type="submit"
              className="px-6 ml-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Calculating..." : "Calculate Savings"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export const formSteps: Step[] = [
  {
    title: "Building Details",
    description: "Tell us about your building"
  },
  {
    title: "Energy Usage",
    description: "Enter your energy consumption"
  },
  {
    title: "Contact Info",
    description: "Complete your submission"
  }
];
