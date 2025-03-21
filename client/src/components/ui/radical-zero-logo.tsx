import { motion } from "framer-motion";
import { memo } from "react";

interface RadicalZeroLogoProps {
  size?: number;
  className?: string;
}

export const RadicalZeroLogo = memo(({ size = 160, className = "" }: RadicalZeroLogoProps) => {
  return (
    <div
      className={`relative perspective-1000 ${className}`}
      style={{ width: size, height: size }}
    >
      <motion.div
        className="relative w-full h-full rounded-full bg-gradient-to-br from-green-600/90 to-blue-600/90 shadow-lg flex items-center justify-center cursor-pointer"
        animate={{
          rotateY: [0, 180, 360],
          y: [0, 15, 0]
        }}
        transition={{
          rotateY: {
            duration: 8,
            repeat: Infinity,
            ease: "linear"
          },
          y: {
            duration: 3,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }
        }}
        whileHover={{ scale: 1.05 }}
      >
        {/* Logo content */}
        <div className="flex flex-col items-center justify-center text-white">
          <span className="text-4xl font-bold tracking-tight">RADICAL</span>
          <span className="text-5xl font-extrabold tracking-tighter">ZERO</span>
          
          {/* Orbit ring around the text */}
          <motion.div 
            className="absolute w-[92%] h-[92%] rounded-full border-4 border-white/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Inner glow effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/20 to-green-400/20 blur-md" />
        </div>
      </motion.div>
    </div>
  );
});

RadicalZeroLogo.displayName = "RadicalZeroLogo";