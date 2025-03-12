import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-radicalGreen-600 via-radicalGreen-500 to-radicalGreen-400">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] opacity-20" />
      </div>

      <div className="container mx-auto px-4 py-24 relative">
        <div className="flex flex-col-reverse lg:flex-row items-center justify-between gap-12">
          <div className="flex-1 text-left animate-slide-up">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-white">
              Transform Your Energy Savings into{" "}
              <span className="text-radicalBlue-200">Carbon Credits</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
              Calculate your potential carbon savings and convert them into valuable carbon credits with our simple calculator.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="px-8 py-6 text-lg font-medium bg-white hover:bg-white/90 text-radicalGreen-600 transition-all duration-300 group"
              onClick={() => {
                document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Calculate Your Potential
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          <div className="flex-1 flex justify-center lg:justify-end animate-slide-down">
            <div className="rounded-3xl p-8 sm:p-12 border border-white/10 bg-white/5 backdrop-blur-sm shadow-xl">
              <div className="w-full h-full min-h-[300px] flex items-center justify-center relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-radicalGreen-500/20 to-radicalBlue-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <svg className="w-40 h-40 text-white opacity-90 group-hover:scale-110 transition-transform duration-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}