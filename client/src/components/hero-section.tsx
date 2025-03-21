import { Button } from "@/components/ui/button.tsx";
import { ArrowRight, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";
import { Coin } from "@/components/ui/coin.tsx";

export function HeroSection() {
  return (
    <div className="relative overflow-hidden">
      <motion.div 
        className="absolute inset-0 bg-gradient-to-br from-calmBlue-600 via-calmBlue-500 to-calmBlue-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <motion.div 
          className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          transition={{ duration: 1, delay: 0.5 }}
        />
      </motion.div>

      <div className="container mx-auto px-4 py-24 relative">
        <div className="flex flex-col-reverse lg:flex-row items-center justify-between gap-12">
          <div className="flex-1 text-left">
            <motion.h1 
              className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              We transform the energy efficiency of your home in{" "}
              <motion.span 
                className="text-radicalBlue-200"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                earnings
              </motion.span>
            </motion.h1>

            <motion.p 
              className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Get an estimate of the earnings with our calculator:
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Button
                size="lg"
                variant="secondary"
                className="px-8 py-6 text-lg font-medium bg-white hover:bg-white/90 text-calmBlue-600 transition-all duration-300 group"
                onClick={() => {
                  document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Calculate Your Potential
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>
          </div>

          <motion.div 
            className="flex-1 flex justify-center lg:justify-end"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <motion.div 
              className="rounded-3xl p-8 sm:p-12 border border-white/10 bg-white/5 backdrop-blur-sm shadow-xl"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-full h-full min-h-[300px] flex items-center justify-center relative group">
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-br from-calmBlue-500/20 to-radicalBlue-500/20 rounded-2xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                />
                <Coin size={160} className="relative z-10" />
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Down arrow indicator for calculator section */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.5, 
            delay: 1,
            repeat: Infinity,
            repeatType: "reverse",
            repeatDelay: 0.5
          }}
          onClick={() => {
            document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <div className="cursor-pointer p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all">
            <ArrowDown className="h-8 w-8 text-white" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}