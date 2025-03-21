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
import { useTranslation } from "react-i18next";

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
}

export function SuccessModal({ open, onClose }: SuccessModalProps) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

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
            {t("calculator.success.title")}
          </DialogTitle>
          <DialogDescription className="text-center pt-2 space-y-2">
            <p>
              {t("calculator.success.message")}
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={() => setLocation("/results")}
            className="bg-[#4CAF50] hover:bg-[#45a049]"
          >
            <Mail className="mr-2 h-4 w-4" />
            {t("common.viewResults")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
          >
            {t("common.returnHome")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
