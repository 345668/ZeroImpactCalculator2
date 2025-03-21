import { motion } from "framer-motion";
import { memo, useState, useEffect } from "react";

interface RadicalZeroLogoProps {
  size?: number;
  className?: string;
}

export const RadicalZeroLogo = memo(({ size = 160, className = "" }: RadicalZeroLogoProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  // This ensures the animation only plays after the image is loaded
  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  useEffect(() => {
    // Preload the image to ensure it's in the browser cache
    const img = new Image();
    img.src = "/eye-animation.gif";
    
    // Check if the image is already cached
    if (img.complete) {
      setIsLoaded(true);
    } else {
      img.onload = () => {
        setIsLoaded(true);
      };
    }
    
    return () => {
      img.onload = null;
    };
  }, []);

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Placeholder while loading */}
      {!isLoaded && (
        <div className="w-full h-full rounded-full bg-blue-100 animate-pulse"></div>
      )}
      
      {/* Static Eye Animation GIF (No Rotation/Tilt) with Transparency */}
      <motion.div
        className="w-full h-full overflow-hidden rounded-full bg-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        <img
          src="/eye-animation.gif"
          alt="Radical Zero Eye Animation"
          className="w-full h-full object-contain mix-blend-lighten"
          onLoad={handleImageLoad}
          style={{ 
            visibility: isLoaded ? 'visible' : 'hidden',
            filter: 'contrast(1.2) brightness(1.2)',
            mixBlendMode: 'screen' // This helps with transparency
          }}
        />
      </motion.div>
    </div>
  );
});

RadicalZeroLogo.displayName = "RadicalZeroLogo";