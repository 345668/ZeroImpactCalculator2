import { motion, useMotionValue, useTransform, useSpring, useAnimation } from "framer-motion";
import { memo } from "react";

interface CoinProps {
  size?: number;
  className?: string;
}

export const Coin = memo(({ size = 120, className = "" }: CoinProps) => {
  const controls = useAnimation();
  const rotateY = useMotionValue(0);

  // Add spring physics for smooth rotation
  const springRotateY = useSpring(rotateY, {
    stiffness: 100,
    damping: 20
  });

  // Handle click to spin
  const handleClick = async () => {
    // Rotate 360 degrees
    await controls.start({
      rotateY: [0, 360],
      transition: {
        duration: 1.5,
        ease: "easeInOut"
      }
    });
    controls.set({ rotateY: 0 }); // Reset rotation
  };

  return (
    <div 
      className={`relative perspective-1000 ${className}`}
      style={{ width: size, height: size }}
    >
      <motion.div
        animate={controls}
        style={{
          width: size,
          height: size,
          rotateY: springRotateY,
        }}
        className="relative preserve-3d cursor-pointer"
        onClick={handleClick}
      >
        {/* Front of coin */}
        <motion.div
          className="absolute w-full h-full rounded-full bg-gradient-to-br from-gray-300 via-gray-100 to-gray-200 shadow-lg flex items-center justify-center backface-hidden border-4 border-gray-200/30"
          style={{ rotateY: 0 }}
        >
          <div className="text-4xl font-bold text-gray-700">€</div>
        </motion.div>

        {/* Back of coin */}
        <motion.div
          className="absolute w-full h-full rounded-full bg-gradient-to-br from-gray-200 via-gray-100 to-gray-300 shadow-lg flex items-center justify-center backface-hidden border-4 border-gray-200/30"
          style={{ rotateY: 180 }}
        >
          <div className="w-3/4 h-3/4 rounded-full border-4 border-gray-600/20 flex items-center justify-center">
            <div className="text-2xl font-semibold text-gray-700">2025</div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
});

Coin.displayName = "Coin";