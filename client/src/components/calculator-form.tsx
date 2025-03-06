import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertSubmissionSchema } from "@shared/schema";
import type { InsertSubmission } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

export function CalculatorForm() {
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  
  const form = useForm<InsertSubmission>({
    resolver: zodResolver(insertSubmissionSchema),
    defaultValues: {
      buildingOwnership: "own",
      buildingSize: "",
      heatingSystem: "gas",
      currentConsumption: "",
      projectedConsumption: "",
      firstName: "",
      lastName: "",
      email: "",
      acceptedTerms: "false"
    }
  });

  const { mutate, isPending, data: result } = useMutation({
    mutationFn: async (data: InsertSubmission) => {
      const res = await apiRequest("POST", "/api/calculate", data);
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

  return (
    <Card className="max-w-2xl mx-auto" id="calculator">
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 && (
              <>
                <FormField
                  control={form.control}
                  name="buildingOwnership"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you own or rent the building?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="own" />
                            </FormControl>
                            <FormLabel className="font-normal">Own</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="rent" />
                            </FormControl>
                            <FormLabel className="font-normal">Rent</FormLabel>
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
                      <FormLabel>Building size (sqm)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="button" onClick={() => setStep(2)}>Next</Button>
              </>
            )}

            {step === 2 && (
              <>
                <FormField
                  control={form.control}
                  name="heatingSystem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What is your heating system?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-2"
                        >
                          {["gas", "oil", "pellet", "other"].map((value) => (
                            <FormItem key={value} className="flex items-center space-x-2">
                              <FormControl>
                                <RadioGroupItem value={value} />
                              </FormControl>
                              <FormLabel className="font-normal capitalize">
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
                      <FormLabel>Current annual energy consumption (kWh)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
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
                      <FormLabel>Projected annual energy consumption (kWh)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Previous
                  </Button>
                  <Button type="button" onClick={() => setStep(3)}>Next</Button>
                </div>
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

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    Previous
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Calculating..." : "Calculate Savings"}
                  </Button>
                </div>
              </>
            )}
          </form>
        </Form>

        {result && (
          <div className="mt-8 space-y-4">
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <h3 className="text-lg font-semibold">CO2 Savings</h3>
                <p className="text-2xl font-bold">{result.co2Savings.toFixed(2)} tons/year</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Carbon Credits</h3>
                <p className="text-2xl font-bold">{result.carbonCredits.toFixed(2)} credits</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Financial Value</h3>
                <p className="text-2xl font-bold">€{result.financialValue.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
