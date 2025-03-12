import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <AnimatePresence mode="wait">
      <div className="relative min-h-screen w-full bg-hero-blue">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 20,
            duration: 0.3
          }}
          className="relative min-h-screen w-full overflow-y-auto"
        >
          {children}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}