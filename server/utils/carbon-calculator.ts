import { z } from "zod";

// Energy consumption factors based on heating system type
const emissionFactors = {
  gas: 0.202, // kg CO2 per kWh
  oil: 0.266, // kg CO2 per kWh
  pellet: 0.023, // kg CO2 per kWh
  other: 0.15, // kg CO2 per kWh (average)
};

// Conversion factors to kWh
const conversionFactors = {
  gas: 10, // 1 m³ of natural gas ≈ 10 kWh
  oil: 10.5, // 1 liter of heating oil ≈ 10.5 kWh
  pellet: 4.9, // 1 kg of wood pellets ≈ 4.9 kWh
  other: 1, // already in kWh
};

// Carbon credit value in EUR per ton of CO2
const carbonCreditValue = 50;

// Convert original fuel consumption to kWh
export function convertToKWh(
  fuelType: keyof typeof conversionFactors,
  amount: number
): number {
  return amount * conversionFactors[fuelType];
}

// Calculate CO2 savings based on input data
export function calculateCO2Savings(
  oldSystem: keyof typeof emissionFactors,
  oldConsumption: number,
  newConsumption: number
): number {
  // Convert old consumption to kWh first
  const oldConsumptionInKWh = convertToKWh(oldSystem, oldConsumption);
  
  // Calculate CO2 emissions in tons (converting from kg)
  const oldEmissions = (oldConsumptionInKWh * emissionFactors[oldSystem]) / 1000;
  
  // For new consumption (electricity), use average emission factor
  const electricityEmissionFactor = 0.25; // kg CO2 per kWh
  const newEmissions = (newConsumption * electricityEmissionFactor) / 1000;
  
  // Calculate savings (tons of CO2)
  return Math.max(0, oldEmissions - newEmissions);
}

// Calculate carbon credits (1:1 with CO2 savings)
export function calculateCarbonCredits(co2Savings: number): number {
  return co2Savings;
}

// Calculate financial value in EUR
export function calculateFinancialValue(carbonCredits: number): number {
  return carbonCredits * carbonCreditValue;
}

// Format numbers to have 2 decimal places
export function formatNumber(num: number): string {
  return num.toLocaleString("en-US", { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  });
}

// Format currency values
export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { 
    style: "currency", 
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

// Validate heating system type
export const heatingSystemSchema = z.enum(['gas', 'oil', 'pellet', 'other']);
export type HeatingSystem = z.infer<typeof heatingSystemSchema>;
