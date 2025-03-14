import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GDPRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GDPRModal({ open, onOpenChange }: GDPRModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Privacy Policy & GDPR Compliance</DialogTitle>
          <DialogDescription>
            Last updated: March 14, 2025
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4 text-sm">
            <h2 className="text-lg font-semibold">1. Data Controller</h2>
            <p>
              Radical Zero GmbH
              Musterstraße 123
              10115 Berlin, Germany
              privacy@radicalzero.com
            </p>

            <h2 className="text-lg font-semibold">2. Data We Collect</h2>
            <p>
              We collect and process the following personal data:
              - Name and contact information
              - Building information and energy consumption data
              - Technical data (IP address, browser type)
            </p>

            <h2 className="text-lg font-semibold">3. Legal Basis for Processing</h2>
            <p>
              We process your data based on:
              - Your consent (Article 6(1)(a) GDPR)
              - Contract performance (Article 6(1)(b) GDPR)
              - Legal obligations (Article 6(1)(c) GDPR)
            </p>

            <h2 className="text-lg font-semibold">4. Data Retention</h2>
            <p>
              We retain your personal data only for as long as necessary to fulfill the purposes for which it was collected.
            </p>

            <h2 className="text-lg font-semibold">5. Your Rights</h2>
            <p>
              Under GDPR, you have the right to:
              - Access your data
              - Rectify inaccurate data
              - Erase your data
              - Restrict processing
              - Data portability
              - Object to processing
              - Withdraw consent
            </p>

            <h2 className="text-lg font-semibold">6. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal data.
            </p>

            <h2 className="text-lg font-semibold">7. International Transfers</h2>
            <p>
              Data is processed within the EU/EEA. Any transfers outside this area comply with GDPR requirements.
            </p>

            <h2 className="text-lg font-semibold">8. Contact DPO</h2>
            <p>
              For privacy concerns, contact our Data Protection Officer:
              dpo@radicalzero.com
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
