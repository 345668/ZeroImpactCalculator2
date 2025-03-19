// CO₂ emission factors (kg CO₂/kWh) for 2024
export const EMISSION_FACTORS = {
  "heating oil": 0.266,
  "natural gas": 0.202,
  "liquefied petroleum gas": 0.234,
  "district heating": 0.195,
  "electricity mix": 0.343,
  "heat pump (electricity mix)": 0.086  // COP 4.0
};

export const CARBON_PRICE_PER_TON = 50;  // EUR per ton
export const CREDITING_PERIOD_YEARS = 10;

export function calculateCarbonCredits(currentConsumptionKWh: number, projectedConsumptionKWh: number) {
  // Calculate current CO₂ emissions using natural gas factor (kg CO₂)
  const currentCO2Emissions = currentConsumptionKWh * EMISSION_FACTORS["natural gas"];
  
  // Calculate new system CO₂ emissions using heat pump factor (kg CO₂)
  const newCO2Emissions = projectedConsumptionKWh * EMISSION_FACTORS["heat pump (electricity mix)"];
  
  // Calculate annual CO₂ savings in tons (1000 kg = 1 ton)
  const annualCO2Savings = (currentCO2Emissions - newCO2Emissions) / 1000;
  
  // Calculate values for single year (with 2 decimal precision)
  const co2Savings = annualCO2Savings.toFixed(2);
  const carbonCredits = co2Savings; // 1:1 ratio with CO2 savings
  const financialValue = (Number(carbonCredits) * CARBON_PRICE_PER_TON).toFixed(2);
  
  // Calculate 10-year projections
  const tenYearCO2Savings = (annualCO2Savings * CREDITING_PERIOD_YEARS).toFixed(2);
  const tenYearCarbonCredits = tenYearCO2Savings;
  const tenYearFinancialValue = (Number(tenYearCO2Savings) * CARBON_PRICE_PER_TON).toFixed(2);

  return {
    annual: {
      co2Savings,
      carbonCredits,
      financialValue
    },
    tenYear: {
      co2Savings: tenYearCO2Savings,
      carbonCredits: tenYearCarbonCredits, 
      financialValue: tenYearFinancialValue
    },
    details: {
      currentCO2Emissions: currentCO2Emissions.toFixed(2),
      newCO2Emissions: newCO2Emissions.toFixed(2),
      annualCO2Savings: annualCO2Savings.toFixed(2),
      energyReductionPercent: ((currentConsumptionKWh - projectedConsumptionKWh) / currentConsumptionKWh * 100).toFixed(1)
    }
  };
}
