import { motion } from "framer-motion";
import { memo } from "react";

interface RadicalZeroLogoProps {
  size?: number;
  className?: string;
}

export const RadicalZeroLogo = memo(({ size = 160, className = "" }: RadicalZeroLogoProps) => {
  // Define colors for the gradient effect
  const primaryColor = "rgb(0, 200, 150)";
  const secondaryColor = "rgb(0, 100, 255)";
  
  // Variants for text animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };
  
  const letterVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring",
        stiffness: 120,
        damping: 12
      }
    }
  };
  
  // Split the company name for letter animations
  const radicalLetters = "RADICAL".split("");
  const zeroLetters = "ZERO".split("");

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-full overflow-hidden ${className}`}
      style={{ 
        width: size, 
        height: size,
        backgroundImage: `radial-gradient(circle, ${secondaryColor}22, ${primaryColor}55)`,
        border: `2px solid ${primaryColor}66`,
        boxShadow: `0 0 20px ${primaryColor}44, inset 0 0 15px ${secondaryColor}33`
      }}
    >
      {/* Orbital circle animation */}
      <motion.div
        className="absolute w-full h-full rounded-full border-2 border-dashed border-opacity-40"
        style={{ borderColor: primaryColor }}
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />
      
      <motion.div
        className="absolute w-[90%] h-[90%] rounded-full border-2 border-dotted border-opacity-30"
        style={{ borderColor: secondaryColor }}
        animate={{ rotate: -360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Company name with animations */}
      <motion.div 
        className="flex flex-col items-center justify-center"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* RADICAL text animation */}
        <div className="flex mb-1">
          {radicalLetters.map((letter, index) => (
            <motion.span
              key={`radical-${index}`}
              variants={letterVariants}
              className="text-2xl font-black tracking-tighter"
              style={{ 
                color: primaryColor,
                textShadow: `0 0 5px ${primaryColor}88`
              }}
            >
              {letter}
            </motion.span>
          ))}
        </div>
        
        {/* ZERO text animation with larger font */}
        <div className="flex">
          {zeroLetters.map((letter, index) => (
            <motion.span
              key={`zero-${index}`}
              variants={letterVariants}
              className="text-3xl font-black tracking-tight"
              style={{ 
                color: secondaryColor,
                textShadow: `0 0 8px ${secondaryColor}88` 
              }}
            >
              {letter}
            </motion.span>
          ))}
        </div>
      </motion.div>
      
      {/* Carbon neutral symbol */}
      <motion.div 
        className="absolute bottom-4 text-xs font-bold"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        style={{ color: `${primaryColor}cc` }}
      >
        CO₂ NEUTRAL
      </motion.div>
    </div>
  );
});

RadicalZeroLogo.displayName = "RadicalZeroLogo";