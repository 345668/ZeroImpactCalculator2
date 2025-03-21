import { motion } from "framer-motion";
import { memo } from "react";

interface RadicalZeroLogoProps {
  size?: number;
  className?: string;
}

export const RadicalZeroLogo = memo(({ size = 160, className = "" }: RadicalZeroLogoProps) => {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Eye Animation GIF with Motion Effects */}
      <motion.img
        src="/eye-animation.gif"
        alt="Eye Animation"
        className="w-full h-full object-contain"
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
});

RadicalZeroLogo.displayName = "RadicalZeroLogo";