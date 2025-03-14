import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TermsModal({ open, onOpenChange }: TermsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Terms and Conditions</DialogTitle>
          <DialogDescription>
            Last updated: March 14, 2025
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4 text-sm">
            <h2 className="text-lg font-semibold">1. Introduction</h2>
            <p>
              Welcome to Radical Zero's Carbon Credit Calculator. By using our service, you agree to these terms and conditions.
            </p>

            <h2 className="text-lg font-semibold">2. Services Description</h2>
            <p>
              Our platform provides carbon credit calculation and energy efficiency analysis services. The calculations are estimates based on provided information and industry standards.
            </p>

            <h2 className="text-lg font-semibold">3. User Obligations</h2>
            <p>
              Users must:
              - Provide accurate information
              - Maintain confidentiality of their account
              - Use the service in compliance with applicable laws
            </p>

            <h2 className="text-lg font-semibold">4. Data Usage</h2>
            <p>
              We collect and process data in accordance with our Privacy Policy and applicable data protection laws.
            </p>

            <h2 className="text-lg font-semibold">5. Intellectual Property</h2>
            <p>
              All content, trademarks, and intellectual property on the platform belong to Radical Zero or its licensors.
            </p>

            <h2 className="text-lg font-semibold">6. Limitation of Liability</h2>
            <p>
              Radical Zero provides calculations as estimates only. We are not liable for decisions made based on these calculations.
            </p>

            <h2 className="text-lg font-semibold">7. Modifications</h2>
            <p>
              We reserve the right to modify these terms at any time. Users will be notified of significant changes.
            </p>

            <h2 className="text-lg font-semibold">8. Governing Law</h2>
            <p>
              These terms are governed by the laws of Germany and the European Union.
            </p>

            <h2 className="text-lg font-semibold">9. Contact</h2>
            <p>
              For questions about these terms, contact us at legal@radicalzero.com
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
