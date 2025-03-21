import { motion } from "framer-motion";
import { memo } from "react";

interface RadicalZeroLogoProps {
  size?: number;
  className?: string;
}

export const RadicalZeroLogo = memo(({ size = 160, className = "" }: RadicalZeroLogoProps) => {
  // Color definitions - using white and blue as requested
  const textWhite = "rgb(255, 255, 255)";
  const textBlue = "rgb(0, 122, 255)";
  const circleSize = size * 1.2; // Making the circle larger than the container
  
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

  // SVG for origami people holding hands in a circle
  const createOrigamiPeopleCircle = () => {
    const numPeople = 12; // Number of origami people
    const radius = circleSize / 2 - 10; // Radius of the circle
    const people = [];
    
    for (let i = 0; i < numPeople; i++) {
      const angle = (i / numPeople) * Math.PI * 2;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      
      // Create an origami person figure at this position
      people.push(
        <g key={i} transform={`translate(${x}, ${y}) rotate(${angle * (180 / Math.PI) + 90})`}>
          {/* Origami person body */}
          <polygon 
            points="0,-8 -5,-3 -5,3 0,8 5,3 5,-3" 
            fill="white" 
            stroke={textBlue} 
            strokeWidth="1"
            opacity="0.9"
          />
          {/* Origami person head */}
          <circle cx="0" cy="-10" r="3" fill="white" stroke={textBlue} strokeWidth="1" />
          
          {/* Arms stretching out to hold hands with neighbors */}
          <line x1="-8" y1="0" x2="-15" y2="0" stroke="white" strokeWidth="1.5" />
          <line x1="8" y1="0" x2="15" y2="0" stroke="white" strokeWidth="1.5" />
        </g>
      );
    }
    
    return people;
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-full overflow-hidden ${className}`}
      style={{ 
        width: size, 
        height: size,
        background: `radial-gradient(circle, rgba(0,122,255,0.1), rgba(0,122,255,0.2))`,
        border: `2px solid ${textBlue}66`,
        boxShadow: `0 0 20px ${textBlue}44, inset 0 0 15px ${textBlue}33`
      }}
    >
      {/* Origami people holding hands in a circle */}
      <motion.div
        className="absolute"
        style={{ width: circleSize, height: circleSize }}
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        <svg 
          width={circleSize} 
          height={circleSize} 
          viewBox={`-${circleSize/2} -${circleSize/2} ${circleSize} ${circleSize}`}
        >
          {createOrigamiPeopleCircle()}
        </svg>
      </motion.div>
      
      {/* Company name with animations */}
      <motion.div 
        className="flex flex-col items-center justify-center z-10"
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
              className="text-3xl font-black tracking-tighter"
              style={{ 
                color: textWhite,
                textShadow: `0 0 6px ${textBlue}cc`
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
              className="text-4xl font-black tracking-tight"
              style={{ 
                color: textBlue,
                textShadow: `0 0 10px ${textBlue}88` 
              }}
            >
              {letter}
            </motion.span>
          ))}
        </div>
      </motion.div>
      
      {/* Carbon neutral symbol */}
      <motion.div 
        className="absolute bottom-4 text-sm font-bold z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        style={{ color: textWhite, textShadow: `0 0 5px ${textBlue}` }}
      >
        CO₂ NEUTRAL
      </motion.div>
    </div>
  );
});

RadicalZeroLogo.displayName = "RadicalZeroLogo";