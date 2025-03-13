import { motion, useMotionValue, useTransform, useSpring, useAnimation } from "framer-motion";
import { memo } from "react";

interface CoinProps {
  size?: number;
  className?: string;
}

export const Coin = memo(({ size = 120, className = "" }: CoinProps) => {
  const x = useMotionValue(0);
  const rotateY = useTransform(x, [-200, 200], [-180, 180]);
  const rotateX = useMotionValue(0);
  
  // Add spring physics for smooth rotation
  const springRotateY = useSpring(rotateY, {
    stiffness: 100,
    damping: 20
  });

  // Handle drag gestures
  const handleDragEnd = () => {
    x.set(0);
  };

  return (
    <div 
      className={`relative perspective-1000 ${className}`}
      style={{ width: size, height: size }}
    >
      <motion.div
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        onDragEnd={handleDragEnd}
        style={{
          width: size,
          height: size,
          rotateY: springRotateY,
          rotateX,
        }}
        className="relative preserve-3d cursor-grab active:cursor-grabbing"
      >
        {/* Front of coin */}
        <motion.div
          className="absolute w-full h-full rounded-full bg-gradient-to-br from-primary/90 to-primary shadow-lg flex items-center justify-center backface-hidden"
          style={{ rotateY: 0 }}
        >
          <svg 
            viewBox="0 0 24 24" 
            className="w-3/4 h-3/4 text-primary-foreground"
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7" />
          </svg>
        </motion.div>

        {/* Back of coin */}
        <motion.div
          className="absolute w-full h-full rounded-full bg-gradient-to-br from-primary/80 to-primary shadow-lg flex items-center justify-center backface-hidden"
          style={{ rotateY: 180 }}
        >
          <svg 
            viewBox="0 0 24 24" 
            className="w-3/4 h-3/4 text-primary-foreground"
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
});

Coin.displayName = "Coin";
