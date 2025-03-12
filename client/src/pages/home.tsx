import { HeroSection } from "@/components/hero-section";
import { CalculatorForm } from "@/components/calculator-form";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      <HeroSection />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Calculate Your Carbon Credits</h2>
          <p className="text-lg text-muted-foreground">
            Enter your building's energy details to discover your potential carbon savings and financial returns.
          </p>
        </div>
        <CalculatorForm />
      </main>
    </div>
  );
}