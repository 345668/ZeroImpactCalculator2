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
          className="absolute w-full h-full rounded-full bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600 shadow-lg flex items-center justify-center backface-hidden border-4 border-amber-400/30"
          style={{ rotateY: 0 }}
        >
          <div className="text-4xl font-bold text-amber-900/80">€</div>
        </motion.div>

        {/* Back of coin */}
        <motion.div
          className="absolute w-full h-full rounded-full bg-gradient-to-br from-amber-400 via-yellow-600 to-amber-700 shadow-lg flex items-center justify-center backface-hidden border-4 border-amber-400/30"
          style={{ rotateY: 180 }}
        >
          <div className="w-3/4 h-3/4 rounded-full border-4 border-amber-900/20 flex items-center justify-center">
            <div className="text-2xl font-semibold text-amber-900/80">2025</div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
});

Coin.displayName = "Coin";