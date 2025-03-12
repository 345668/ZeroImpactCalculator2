import { HeroSection } from "@/components/hero-section";
import { CalculatorForm } from "@/components/calculator-form";
import { Layout } from "@/components/layout";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <Layout>
      <HeroSection />
      <main className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-3xl mx-auto text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-4">Calculate Your Carbon Credits</h2>
          <p className="text-lg text-muted-foreground">
            Enter your building's energy details to discover your potential carbon savings and financial returns.
          </p>
        </motion.div>
        <CalculatorForm />
      </main>
    </Layout>
  );
}
import React from "react";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-2rem)]">
      <h1 className="text-4xl font-bold mb-4">Carbon Credit Calculator</h1>
      <p className="text-xl mb-8">Calculate your carbon footprint and explore reduction strategies</p>
      <div className="grid gap-4">
        <a 
          href="/dashboard" 
          className="px-6 py-3 bg-primary text-primary-foreground rounded-md text-center hover:bg-primary/90"
        >
          Get Started
        </a>
      </div>
    </div>
  );
}
