import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";
import { NavigationBar } from "./navigation-bar";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <AnimatePresence mode="wait">
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
        className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90"
      >
        <NavigationBar />
        {children}
      </motion.div>
    </AnimatePresence>
  );
}