import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
}

export function SuccessModal({ open, onClose }: SuccessModalProps) {
  const [, setLocation] = useLocation();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex justify-center mb-4"
            >
              <div className="bg-[#4CAF50]/10 rounded-full p-3">
                <Check className="h-6 w-6 text-[#4CAF50]" />
              </div>
            </motion.div>
            Submission Successful!
          </DialogTitle>
          <DialogDescription className="text-center pt-2 space-y-2">
            <p>
              Thank you for your submission! A detailed report has been sent to your email.
            </p>
            <p className="text-muted-foreground">
              A Radical Zero representative will be in touch with you shortly to discuss your energy savings potential.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={() => setLocation("/results")}
            className="bg-[#4CAF50] hover:bg-[#45a049]"
          >
            <Mail className="mr-2 h-4 w-4" />
            View Your Results
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
          >
            Return to Home
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
