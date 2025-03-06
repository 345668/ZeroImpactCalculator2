import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <div className="relative bg-gradient-to-b from-primary/90 to-primary/70 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]" />
      <div className="container mx-auto px-4 py-20 relative">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Transform Your Energy Savings into Carbon Credits
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90">
            Discover how your energy efficiency upgrades can reduce CO2 emissions and generate financial returns through carbon credits.
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Calculate Your Potential
          </Button>
        </div>
      </div>
    </div>
  );
}
