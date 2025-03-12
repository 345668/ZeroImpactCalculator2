import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <div className="relative bg-gradient-to-br from-primary/90 via-primary/80 to-primary/70 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] opacity-20" />
      <div className="container mx-auto px-4 py-20 relative">
        <div className="flex flex-col-reverse lg:flex-row items-center justify-between gap-12">
          <div className="flex-1 text-left">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Transform Your Energy Savings into <span className="text-green-200">Carbon Credits</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
              Calculate your potential carbon savings and convert them into valuable carbon credits with our simple calculator.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="px-8 py-4 text-lg font-medium hover:bg-white/90 transition-colors"
              onClick={() => {
                document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Calculate Your Potential
            </Button>
          </div>

          <div className="flex-1 flex justify-center lg:justify-end">
            <div className="rounded-3xl p-8 sm:p-12 border border-white/10 bg-white/5 backdrop-blur-sm">
              <div className="w-full h-full min-h-[200px] flex items-center justify-center">
                <svg className="w-32 h-32 text-green-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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