import { HeroSection } from "@/components/hero-section";
import { CalculatorForm } from "@/components/calculator-form";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <main className="container mx-auto px-4 py-12">
        <CalculatorForm />
      </main>
    </div>
  );
}
