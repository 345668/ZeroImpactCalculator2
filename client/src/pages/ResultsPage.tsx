import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout";
import { NavigationBar } from "@/components/navigation-bar";

export function ResultsPage() {
  const [, setLocation] = useLocation();

  return (
    <Layout>
      <NavigationBar />
      <div className="container max-w-3xl mx-auto py-16 px-4">
        <div className="text-center backdrop-blur-md bg-white/10 rounded-lg p-8 border border-white/20">
          <div className="flex justify-center mb-8">
            <div className="bg-calmBlue-100 rounded-full p-4">
              <Check className="h-8 w-8 text-calmBlue-600" />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-4">
            Submission Successful!
          </h1>

          <div className="space-y-4 mb-12">
            <p className="text-lg">
              Thank you for your submission! A detailed report has been sent to your email.
            </p>
            <p className="text-muted-foreground">
              A Radical Zero representative will be in touch with you shortly to discuss your energy savings potential.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => setLocation("/")}
              className="w-full max-w-md mx-auto bg-calmBlue-600 hover:bg-calmBlue-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Homepage
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}