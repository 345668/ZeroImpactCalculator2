
/*
 * COMBINED CODE FOR RADICAL ZERO CARBON CALCULATOR APPLICATION
 * This file contains all the code from the application merged into a single file.
 * It's intended for reference or download purposes only and is not meant to be used directly in the application.
 */

// ========================= IMPORTS =========================
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { toast } from 'sonner';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ========================= UTILITY FUNCTIONS =========================

// CALCULATION UTILITIES
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
const convertToKWh = (
  fuelType: keyof typeof conversionFactors,
  amount: number
): number => {
  return amount * conversionFactors[fuelType];
};

// Calculate CO2 savings based on input data
const calculateCO2Savings = (
  oldSystem: keyof typeof emissionFactors,
  oldConsumption: number,
  newConsumption: number
): number => {
  // Convert old consumption to kWh first
  const oldConsumptionInKWh = convertToKWh(oldSystem, oldConsumption);
  
  // Calculate CO2 emissions in tons (converting from kg)
  const oldEmissions = (oldConsumptionInKWh * emissionFactors[oldSystem]) / 1000;
  
  // For new consumption (electricity), use average emission factor
  // The emission factor for electricity varies by country and energy mix
  const electricityEmissionFactor = 0.25; // kg CO2 per kWh (example value, can be adjusted)
  const newEmissions = (newConsumption * electricityEmissionFactor) / 1000;
  
  // Calculate savings (tons of CO2)
  return Math.max(0, oldEmissions - newEmissions);
};

// Calculate carbon credits (1:1 with CO2 savings)
const calculateCarbonCredits = (co2Savings: number): number => {
  return co2Savings;
};

// Calculate financial value in EUR
const calculateFinancialValue = (carbonCredits: number): number => {
  return carbonCredits * carbonCreditValue;
};

// Format numbers to have 2 decimal places
const formatNumber = (num: number): string => {
  return num.toLocaleString("en-US", { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  });
};

// Format currency values
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString("en-US", { 
    style: "currency", 
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

// GENERAL UTILITY FUNCTIONS
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ========================= TYPES =========================

interface CalculationResults {
  ownershipType: 'owner' | 'tenant';
  buildingSize: number;
  heatingSystem: 'gas' | 'oil' | 'pellet' | 'other';
  currentConsumption: number;
  projectedConsumption: number;
  co2Savings: number;
  carbonCredits: number;
  financialValue: number;
  consumptionUnit: string;
  newEnergySystem: string;
}

interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  message?: string;
}

// ========================= COMPONENTS =========================

// HERO COMPONENT
const Hero = ({ onGetStarted }: { onGetStarted: () => void }) => {
  return (
    <div className="flex flex-col-reverse lg:flex-row items-center justify-between py-16 gap-12">
      <div className="flex-1 text-left">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Convert Energy Savings to <span className="text-radicalBlue-600">Carbon Credits</span>
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
          Calculate your potential carbon savings and convert them into valuable carbon credits with our simple calculator.
        </p>
        <button
          onClick={onGetStarted}
          className="px-8 py-4 rounded-xl text-lg font-medium bg-radicalBlue-600 text-white 
                   hover:bg-radicalBlue-700 transition-colors shadow-md flex items-center gap-2"
        >
          Get Started <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      
      <div className="flex-1 flex justify-center lg:justify-end">
        <div className="hero-pattern rounded-3xl p-8 sm:p-20 border border-gray-100 bg-white shadow-xl">
          <img 
            src="/lovable-uploads/68ed5295-f319-4617-9268-139ff01c89b9.png" 
            alt="Radical-Zero Logo" 
            className="max-w-xs lg:max-w-md"
          />
        </div>
      </div>
    </div>
  );
};

// CARBON CALCULATOR COMPONENT
const CarbonCalculator = ({ onComplete }: { onComplete: (results: CalculationResults) => void }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Omit<CalculationResults, 'co2Savings' | 'carbonCredits' | 'financialValue'>>({
    ownershipType: 'owner',
    buildingSize: 0,
    heatingSystem: 'gas',
    currentConsumption: 0,
    projectedConsumption: 0,
    consumptionUnit: 'm³',
    newEnergySystem: 'electricity',
  });
  
  const consumptionUnits: {[key: string]: string} = {
    'gas': 'm³',
    'oil': 'liters',
    'pellet': 'kg',
    'other': 'kWh',
  };
  
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      consumptionUnit: consumptionUnits[prev.heatingSystem]
    }));
  }, [formData.heatingSystem]);
  
  const formRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentStep]);
  
  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };
  
  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };
  
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!formData.ownershipType;
      case 2:
        return !!formData.buildingSize && formData.buildingSize > 0;
      case 3:
        return !!formData.heatingSystem;
      case 4:
        return !!formData.currentConsumption && formData.currentConsumption > 0;
      case 5:
        return !!formData.projectedConsumption && formData.projectedConsumption >= 0;
      default:
        return true;
    }
  };
  
  const handleSubmit = () => {
    if (validateCurrentStep()) {
      const co2Savings = calculateCO2Savings(
        formData.heatingSystem,
        formData.currentConsumption,
        formData.projectedConsumption
      );
      
      const carbonCredits = calculateCarbonCredits(co2Savings);
      const financialValue = calculateFinancialValue(carbonCredits);
      
      onComplete({
        ...formData,
        co2Savings,
        carbonCredits,
        financialValue,
      });
    }
  };
  
  return (
    <div ref={formRef} className="form-container">
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {[1, 2, 3, 4, 5].map((step) => (
            <div 
              key={step}
              className={`h-2 rounded-full transition-all duration-500 flex-1 mx-1 ${
                step === currentStep
                  ? 'bg-radicalBlue-500'
                  : step < currentStep
                  ? 'bg-radicalBlue-300'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <div className="text-sm text-muted-foreground text-right">
          Step {currentStep} of 5
        </div>
      </div>
      
      {/* Step 1: Ownership Type */}
      <div className={`form-step ${currentStep === 1 ? 'active' : 'inactive'}`}>
        <h2 className="form-title">Building Ownership</h2>
        <p className="form-subtitle">Do you own the building or are you a tenant?</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div
            className={`input-container cursor-pointer flex items-center p-6 ${
              formData.ownershipType === 'owner'
                ? 'ring-2 ring-radicalBlue-500 border-radicalBlue-200'
                : ''
            }`}
            onClick={() => handleInputChange('ownershipType', 'owner')}
          >
            <div className="w-full">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-medium">Building Owner</h3>
                {formData.ownershipType === 'owner' && (
                  <div className="h-6 w-6 rounded-full bg-radicalBlue-500 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              <p className="text-muted-foreground mt-2">
                I own the building and can implement energy efficiency measures.
              </p>
            </div>
          </div>
          
          <div
            className={`input-container cursor-pointer flex items-center p-6 ${
              formData.ownershipType === 'tenant'
                ? 'ring-2 ring-radicalBlue-500 border-radicalBlue-200'
                : ''
            }`}
            onClick={() => handleInputChange('ownershipType', 'tenant')}
          >
            <div className="w-full">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-medium">Tenant</h3>
                {formData.ownershipType === 'tenant' && (
                  <div className="h-6 w-6 rounded-full bg-radicalBlue-500 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              <p className="text-muted-foreground mt-2">
                I rent the building and want to explore energy efficiency options.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end mt-8">
          <button
            onClick={handleNext}
            disabled={!validateCurrentStep()}
            className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
              validateCurrentStep()
                ? 'bg-radicalBlue-600 text-white hover:bg-radicalBlue-700 transition-colors'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Step 2: Building Size */}
      <div className={`form-step ${currentStep === 2 ? 'active' : 'inactive'}`}>
        <h2 className="form-title">Building Size</h2>
        <p className="form-subtitle">What is the size of your building in square meters?</p>
        
        <div className="input-container p-6">
          <label htmlFor="buildingSize" className="block text-sm font-medium text-muted-foreground mb-2">
            Building Size (m²)
          </label>
          <input
            type="number"
            id="buildingSize"
            min="1"
            value={formData.buildingSize || ''}
            onChange={(e) => handleInputChange('buildingSize', Number(e.target.value))}
            className="w-full text-2xl font-medium focus:outline-none bg-transparent"
            placeholder="Enter building size"
          />
        </div>
        
        <div className="flex justify-between mt-8">
          <button
            onClick={handlePrevious}
            className="px-6 py-3 rounded-xl font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          
          <button
            onClick={handleNext}
            disabled={!validateCurrentStep()}
            className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
              validateCurrentStep()
                ? 'bg-radicalBlue-600 text-white hover:bg-radicalBlue-700 transition-colors'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Step 3: Heating System */}
      <div className={`form-step ${currentStep === 3 ? 'active' : 'inactive'}`}>
        <h2 className="form-title">Current Heating System</h2>
        <p className="form-subtitle">What is your current heating system?</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {['gas', 'oil', 'pellet', 'other'].map((type) => (
            <div
              key={type}
              className={`input-container cursor-pointer flex items-center p-6 ${
                formData.heatingSystem === type
                  ? 'ring-2 ring-radicalBlue-500 border-radicalBlue-200'
                  : ''
              }`}
              onClick={() => handleInputChange('heatingSystem', type)}
            >
              <div className="w-full">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-medium capitalize">{type}</h3>
                  {formData.heatingSystem === type && (
                    <div className="h-6 w-6 rounded-full bg-radicalBlue-500 flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between mt-8">
          <button
            onClick={handlePrevious}
            className="px-6 py-3 rounded-xl font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          
          <button
            onClick={handleNext}
            disabled={!validateCurrentStep()}
            className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
              validateCurrentStep()
                ? 'bg-radicalBlue-600 text-white hover:bg-radicalBlue-700 transition-colors'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Step 4: Current Energy Consumption */}
      <div className={`form-step ${currentStep === 4 ? 'active' : 'inactive'}`}>
        <h2 className="form-title">Current Energy Consumption</h2>
        <p className="form-subtitle">
          What is your current annual energy consumption for {formData.heatingSystem}?
        </p>
        
        <div className="input-container p-6">
          <label htmlFor="currentConsumption" className="block text-sm font-medium text-muted-foreground mb-2">
            Current Consumption ({formData.consumptionUnit}/year)
          </label>
          <input
            type="number"
            id="currentConsumption"
            min="1"
            value={formData.currentConsumption || ''}
            onChange={(e) => handleInputChange('currentConsumption', Number(e.target.value))}
            className="w-full text-2xl font-medium focus:outline-none bg-transparent"
            placeholder={`Enter current consumption in ${formData.consumptionUnit}`}
          />
        </div>
        
        <div className="flex justify-between mt-8">
          <button
            onClick={handlePrevious}
            className="px-6 py-3 rounded-xl font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          
          <button
            onClick={handleNext}
            disabled={!validateCurrentStep()}
            className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
              validateCurrentStep()
                ? 'bg-radicalBlue-600 text-white hover:bg-radicalBlue-700 transition-colors'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Step 5: Projected Energy Consumption after switching to electricity */}
      <div className={`form-step ${currentStep === 5 ? 'active' : 'inactive'}`}>
        <h2 className="form-title">Projected Energy Consumption</h2>
        <p className="form-subtitle">
          What is your projected annual electricity consumption after switching to an electric heat pump?
        </p>
        
        <div className="input-container p-6">
          <label htmlFor="projectedConsumption" className="block text-sm font-medium text-muted-foreground mb-2">
            Projected Electricity Consumption (kWh/year)
          </label>
          <input
            type="number"
            id="projectedConsumption"
            min="0"
            value={formData.projectedConsumption || ''}
            onChange={(e) => handleInputChange('projectedConsumption', Number(e.target.value))}
            className="w-full text-2xl font-medium focus:outline-none bg-transparent"
            placeholder="Enter projected electricity consumption in kWh"
          />
        </div>
        
        <div className="flex justify-between mt-8">
          <button
            onClick={handlePrevious}
            className="px-6 py-3 rounded-xl font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={!validateCurrentStep()}
            className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
              validateCurrentStep()
                ? 'bg-radicalBlue-600 text-white hover:bg-radicalBlue-700 transition-colors'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            See Results <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// CONTACT FORM COMPONENT
const ContactForm = ({ onSubmit }: { onSubmit: (data: ContactFormData) => void }) => {
  const [formData, setFormData] = useState<ContactFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    message: ''
  });
  
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const validate = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      onSubmit(formData);
    }
  };
  
  return (
    <div className="form-container animate-slide-up">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-4">Contact Information</h2>
        <p className="text-lg text-muted-foreground">
          Please provide your contact details to receive your carbon credit calculation
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-muted-foreground mb-2">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-lg border ${errors.firstName ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-radicalBlue-500/50`}
              placeholder="Enter your first name"
            />
            {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
          </div>
          
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-muted-foreground mb-2">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-lg border ${errors.lastName ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-radicalBlue-500/50`}
              placeholder="Enter your last name"
            />
            {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-lg border ${errors.email ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-radicalBlue-500/50`}
              placeholder="Enter your email address"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-muted-foreground mb-2">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-lg border ${errors.phone ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-radicalBlue-500/50`}
              placeholder="Enter your phone number"
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
          </div>
        </div>
        
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-muted-foreground mb-2">
            Company
          </label>
          <input
            type="text"
            id="company"
            name="company"
            value={formData.company}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-radicalBlue-500/50"
            placeholder="Enter your company name (optional)"
          />
        </div>
        
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-muted-foreground mb-2">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-radicalBlue-500/50"
            placeholder="Enter additional information (optional)"
          />
        </div>
        
        <div className="flex justify-center pt-6">
          <button
            type="submit"
            className="px-8 py-4 rounded-xl font-medium bg-radicalBlue-600 text-white hover:bg-radicalBlue-700 transition-colors shadow-md flex items-center gap-2 w-full md:w-auto justify-center"
          >
            Submit <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

// RESULTS COMPONENT
const Results = ({ results, onNext }: { results: CalculationResults, onNext: () => void }) => {
  // Calculate the original energy consumption in kWh
  const originalConsumptionInKWh = results.currentConsumption * conversionFactors[results.heatingSystem];
  
  // Calculate the percentage reduction
  const reductionPercentage = Math.round(
    (1 - results.projectedConsumption / originalConsumptionInKWh) * 100
  );

  return (
    <div className="form-container animate-slide-up">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-4">Your Carbon Savings Results</h2>
        <p className="text-lg text-muted-foreground">
          Here's the potential impact of your energy efficiency improvements
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="results-card flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-radicalBlue-100 flex items-center justify-center mb-4">
            <div className="h-10 w-10 rounded-full bg-radicalBlue-500 flex items-center justify-center">
              <Check className="h-6 w-6 text-white" />
            </div>
          </div>
          <h3 className="text-xl font-medium mb-2">CO₂ Savings</h3>
          <div className="text-4xl font-bold text-radicalBlue-700 mb-2">
            {formatNumber(results.co2Savings)}
          </div>
          <p className="text-muted-foreground">Tons of CO₂ per year</p>
        </div>
        
        <div className="results-card flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-radicalBlue-100 flex items-center justify-center mb-4">
            <div className="h-10 w-10 rounded-full bg-radicalBlue-500 flex items-center justify-center">
              <Check className="h-6 w-6 text-white" />
            </div>
          </div>
          <h3 className="text-xl font-medium mb-2">Carbon Credits</h3>
          <div className="text-4xl font-bold text-radicalBlue-700 mb-2">
            {formatNumber(results.carbonCredits)}
          </div>
          <p className="text-muted-foreground">Credits (1:1 with CO₂)</p>
        </div>
        
        <div className="results-card flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-radicalBlue-100 flex items-center justify-center mb-4">
            <div className="h-10 w-10 rounded-full bg-radicalBlue-500 flex items-center justify-center">
              <Check className="h-6 w-6 text-white" />
            </div>
          </div>
          <h3 className="text-xl font-medium mb-2">Financial Value</h3>
          <div className="text-4xl font-bold text-radicalBlue-700 mb-2">
            {formatCurrency(results.financialValue)}
          </div>
          <p className="text-muted-foreground">Potential market value</p>
        </div>
      </div>
      
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-8">
        <h3 className="text-xl font-medium mb-4">Building Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Ownership Type</p>
            <p className="font-medium capitalize">{results.ownershipType}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Building Size</p>
            <p className="font-medium">{results.buildingSize} m²</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Original Heating System</p>
            <p className="font-medium capitalize">{results.heatingSystem}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Energy Consumption</p>
            <p className="font-medium">
              From {formatNumber(results.currentConsumption)} {results.consumptionUnit} 
              {" → "} 
              {formatNumber(results.projectedConsumption)} kWh (electricity)
              {reductionPercentage > 0 ? ` (${reductionPercentage}% reduction)` : ''}
            </p>
          </div>
        </div>
      </div>
      
      <div className="text-center">
        <p className="mb-6 text-muted-foreground">
          Thank you for using our carbon savings calculator.
        </p>
        <button
          onClick={onNext}
          className="px-8 py-4 rounded-xl font-medium bg-radicalBlue-600 text-white 
                    hover:bg-radicalBlue-700 transition-colors shadow-md flex items-center 
                    gap-2 mx-auto"
        >
          Continue <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

// ========================= APP =========================
// INDEX PAGE COMPONENT
const Index = () => {
  const [currentView, setCurrentView] = useState<'hero' | 'calculator' | 'contact' | 'results' | 'completion'>('hero');
  const [calculationResults, setCalculationResults] = useState<CalculationResults | null>(null);
  const calculatorRef = useRef<HTMLDivElement>(null);
  
  const handleGetStarted = () => {
    setCurrentView('calculator');
    setTimeout(() => {
      calculatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };
  
  const handleCalculationComplete = (results: CalculationResults) => {
    setCalculationResults(results);
    setCurrentView('contact');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleContactSubmit = (contactData: ContactFormData) => {
    // In a real application, you would send this data to your backend
    console.log('Contact form submitted:', contactData);
    console.log('Calculation results:', calculationResults);
    
    // Now show results after contact form
    setCurrentView('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleViewCompletion = () => {
    setCurrentView('completion');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success('Thank you for your submission!');
  };
  
  return (
    <div className="min-h-screen bg-gradient">
      <header className="w-full p-6 flex justify-between items-center z-20 relative">
        <div className="font-bold text-xl">
          <img 
            src="/lovable-uploads/68ed5295-f319-4617-9268-139ff01c89b9.png" 
            alt="Radical-Zero Logo" 
            className="h-10"
          />
        </div>
        <nav>
          <button 
            onClick={() => {
              setCurrentView('hero');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/80 transition-colors"
          >
            Home
          </button>
        </nav>
      </header>
      
      <main className="container px-4 pb-20">
        {currentView === 'hero' && <Hero onGetStarted={handleGetStarted} />}
        
        <div ref={calculatorRef} className={currentView !== 'hero' ? 'mt-12' : 'hidden'}>
          {currentView === 'calculator' && (
            <CarbonCalculator onComplete={handleCalculationComplete} />
          )}
          
          {currentView === 'contact' && calculationResults && (
            <ContactForm onSubmit={handleContactSubmit} />
          )}
          
          {currentView === 'results' && calculationResults && (
            <Results 
              results={calculationResults} 
              onNext={handleViewCompletion} 
            />
          )}
          
          {currentView === 'completion' && (
            <div className="form-container animate-slide-up text-center">
              <div className="mx-auto mb-6 w-48">
                <img 
                  src="/lovable-uploads/68ed5295-f319-4617-9268-139ff01c89b9.png" 
                  alt="Radical-Zero Logo" 
                  className="w-full"
                />
              </div>
              
              <div className="h-24 w-24 rounded-full bg-radicalBlue-100 flex items-center justify-center mx-auto mb-8">
                <div className="h-16 w-16 rounded-full bg-radicalBlue-500 flex items-center justify-center">
                  <div className="text-white text-4xl">✓</div>
                </div>
              </div>
              
              <h2 className="text-3xl font-bold mb-4">Submission Successful!</h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Thank you for your interest in carbon credits. A Radical-Zero representative will contact you 
                soon with more information about your potential carbon savings.
              </p>
              
              <button
                onClick={() => {
                  setCurrentView('hero');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-8 py-4 rounded-xl font-medium bg-radicalBlue-600 text-white hover:bg-radicalBlue-700 transition-colors shadow-md mx-auto"
              >
                Back to Home
              </button>
            </div>
          )}
        </div>
      </main>
      
      <footer className="w-full py-8 px-4 bg-white border-t border-gray-100">
        <div className="container mx-auto flex justify-between items-center">
          <p className="text-sm text-muted-foreground text-[12px]">
            Radical Zero 2025
          </p>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Radical-Zero.com. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

// NOT FOUND PAGE COMPONENT
const NotFound = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-radicalBlue-50 via-white to-radicalBlue-50 px-4">
    <div className="text-center mb-8">
      <h1 className="text-6xl font-bold text-radicalBlue-600 mb-4">404</h1>
      <h2 className="text-2xl font-medium mb-2">Page Not Found</h2>
      <p className="text-muted-foreground mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <a 
        href="/"
        className="px-6 py-3 rounded-xl font-medium bg-radicalBlue-600 text-white hover:bg-radicalBlue-700 transition-colors"
      >
        Back to Home
      </a>
    </div>
  </div>
);

// APP COMPONENT
const App = () => {
  const queryClient = new QueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

// RENDER APP
createRoot(document.getElementById("root")!).render(<App />);

// ========================= CSS STYLES =========================
/*
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;

    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    --primary: 217 60% 40%;
    --primary-foreground: 210 40% 98%;

    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;

    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;

    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 217 60% 40%;

    --radius: 0.8rem;

    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 240 5.9% 10%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;

    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;

    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;

    --primary: 217 60% 40%;
    --primary-foreground: 222.2 47.4% 11.2%;

    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;

    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;

    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;

    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;

    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
    --sidebar-background: 240 5.9% 10%;
    --sidebar-foreground: 240 4.8% 95.9%;
    --sidebar-primary: 224.3 76.3% 48%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 240 3.7% 15.9%;
    --sidebar-accent-foreground: 240 4.8% 95.9%;
    --sidebar-border: 240 3.7% 15.9%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-family: 'Inter', sans-serif;
  }

  .glass-card {
    @apply bg-white/80 backdrop-blur-md border border-white/20 shadow-lg;
  }

  .form-container {
    @apply w-full max-w-4xl p-8 rounded-2xl glass-card transition-all duration-500 ease-in-out mx-auto;
  }

  .form-step {
    @apply animate-fade-in transition-opacity duration-500 ease-in-out;
  }

  .form-step.inactive {
    @apply hidden;
  }

  .form-step.active {
    @apply flex flex-col gap-6;
  }

  .form-title {
    @apply text-3xl font-medium text-foreground mb-4;
  }

  .form-subtitle {
    @apply text-lg text-muted-foreground mb-8;
  }

  .question-label {
    @apply text-xl font-medium text-foreground mb-4;
  }

  .input-container {
    @apply w-full rounded-xl bg-white border border-border p-4 focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-200;
  }

  .results-card {
    @apply p-8 rounded-2xl glass-card bg-gradient-to-br from-radicalBlue-50 to-radicalBlue-100 border border-radicalBlue-100;
  }

  .hero-pattern {
    background-color: #ffffff;
    background-image: radial-gradient(#3d96e7 0.5px, #ffffff 0.5px);
    background-size: 20px 20px;
  }

  .bg-gradient {
    @apply bg-gradient-to-br from-radicalBlue-50 via-white to-radicalBlue-50;
  }
}
*/
