import { createRoot } from "react-dom/client";
import { Suspense } from "react";
import App from "./App.tsx";
import "./index.css";
// Import i18n configuration
import "./lib/i18n";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

// Add a loading state for translation loading
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <Suspense fallback={
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading translations...</div>
      </div>
    }>
      <App />
    </Suspense>
    <Toaster />
  </QueryClientProvider>
);