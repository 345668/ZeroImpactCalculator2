// Conversion factors from fuel volume to kWh
const FUEL_TO_KWH = {
  "natural gas": 10.4,   // m³ to kWh
  "heating oil": 9.4,    // L to kWh
  "wood pellets": 4.8    // kg to kWh
};

// Emission factors (kg CO₂/kWh) for 2024
export const EMISSION_FACTORS = {
  "heating oil": 0.266,
  "natural gas": 0.202,
  "liquefied petroleum gas": 0.234,
  "district heating": 0.195,
  "electricity mix": 0.343,
  "coal heating": 0.351,
  "wood pellets": 0.020,
  "firewood": 0.015,
  "biogas": 0.045,
  "heat pump (electricity mix)": 0.086,  // COP 4.0
  "heat pump (green electricity)": 0.000,
  "green electricity": 0.000,
  "solar thermal": 0.000,
  "pv self-consumption": 0.000
};

export const CARBON_PRICE_PER_TON = 50;  // EUR per ton
export const CREDITING_PERIOD_YEARS = 10;  // Credit period

// Calculate carbon credits given kWh consumption
export function calculateCarbonCredits(
  currentConsumptionKWh: number,
  projectedConsumptionKWh: number,
  currentEnergySource: string,
  futureEnergySource: string = "heat pump (electricity mix)",
  mixedFutureSources?: { [source: string]: number }
) {
  if (!(currentEnergySource in EMISSION_FACTORS)) {
    throw new Error(`Invalid current energy source: ${currentEnergySource}`);
  }

  const currentCO2Emissions = currentConsumptionKWh * EMISSION_FACTORS[currentEnergySource];

  // Calculate future emissions (supports hybrid systems)
  let futureEmissionFactor = EMISSION_FACTORS[futureEnergySource];
  if (mixedFutureSources) {
    futureEmissionFactor = Object.entries(mixedFutureSources)
      .reduce((total, [source, fraction]) => total + (EMISSION_FACTORS[source] * fraction), 0);
  }

  const futureCO2Emissions = projectedConsumptionKWh * futureEmissionFactor;

  // Annual carbon credits calculation
  const annualCO2Savings = (currentCO2Emissions - futureCO2Emissions) / 1000;  // to tons
  const financialValue = Number((annualCO2Savings * CARBON_PRICE_PER_TON).toFixed(2));
  const tenYearCO2Savings = Number((annualCO2Savings * CREDITING_PERIOD_YEARS).toFixed(2));
  const tenYearFinancialValue = Number((financialValue * CREDITING_PERIOD_YEARS).toFixed(2));

  return { annualCO2Savings, tenYearCO2Savings, financialValue, tenYearFinancialValue };
}

// Calculate carbon credits directly from fuel units (m³, L, kg)
export function calculateCarbonCreditsFromFuel(
  fuelType: string,
  fuelConsumption: number,
  projectedElectricityKWh: number,
  futureEnergySource: string = "heat pump (electricity mix)",
  mixedFutureSources?: { [source: string]: number }
) {
  if (!(fuelType in FUEL_TO_KWH)) {
    throw new Error(`Invalid fuel type: ${fuelType}`);
  }

  const currentConsumptionKWh = fuelConsumption * FUEL_TO_KWH[fuelType];
  return calculateCarbonCredits(currentConsumptionKWh, projectedElectricityKWh, fuelType, futureEnergySource, mixedFutureSources);
}

// Calculate carbon credits from emissions per building area (kg CO₂/m²a)
export function calculateCarbonCreditsByArea(
  currentCO2PerSqm: number,
  futureCO2PerSqm: number,
  buildingAreaSqm: number
) {
  const currentEmissions = currentCO2PerSqm * buildingAreaSqm;
  const futureEmissions = futureCO2PerSqm * buildingAreaSqm;

  const annualCO2Savings = (currentEmissions - futureEmissions) / 1000;  // Convert kg to tons

  const financialValue = Number((annualCO2Savings * CARBON_PRICE_PER_TON).toFixed(2));
  const tenYearCO2Savings = Number((annualCO2Savings * CREDITING_PERIOD_YEARS).toFixed(2));
  const tenYearFinancialValue = Number((financialValue * CREDITING_PERIOD_YEARS).toFixed(2));

  return { annualCO2Savings, tenYearCO2Savings, financialValue, tenYearFinancialValue };
}