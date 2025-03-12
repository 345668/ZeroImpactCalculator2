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