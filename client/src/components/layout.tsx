import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

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
        {/* Add navigation header */}
        <header className="fixed top-0 right-0 p-4 z-50">
          <nav className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/">Home</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </nav>
        </header>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}