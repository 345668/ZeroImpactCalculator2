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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center mb-8"
          >
            <div className="bg-calmBlue-100 rounded-full p-4">
              <Check className="h-8 w-8 text-calmBlue-600" />
            </div>
          </motion.div>

          <h1 className="text-3xl font-bold mb-4">
            Submission Successful!
          </h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-4 mb-12"
          >
            <p className="text-lg">
              Thank you for your submission! A detailed report has been sent to your email.
            </p>
            <p className="text-muted-foreground">
              A Radical Zero representative will be in touch with you shortly to discuss your energy savings potential.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col gap-3"
          >
            <Button
              onClick={() => setLocation("/")}
              className="w-full max-w-md mx-auto bg-calmBlue-600 hover:bg-calmBlue-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Homepage
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
}