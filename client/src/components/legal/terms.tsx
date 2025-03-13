import { ScrollArea } from "@/components/ui/scroll-area";

export function TermsAndConditions() {
  return (
    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Terms and Conditions</h2>
        <p className="text-sm text-muted-foreground">Last updated: March 13, 2025</p>
        
        <section className="space-y-2">
          <h3 className="text-lg font-semibold">1. Agreement to Terms</h3>
          <p>By accessing and using the Carbon Credit Calculator, you agree to be bound by these Terms and Conditions.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-semibold">2. Service Description</h3>
          <p>Our service provides carbon credit calculations and energy efficiency analysis for buildings. The calculations are estimates and should not be considered as final financial or investment advice.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-semibold">3. User Responsibilities</h3>
          <p>You agree to:</p>
          <ul className="list-disc pl-6">
            <li>Provide accurate information</li>
            <li>Use the service for legitimate purposes</li>
            <li>Maintain the confidentiality of your account</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-semibold">4. Data Usage</h3>
          <p>We collect and process data in accordance with our Privacy Policy and GDPR guidelines. Your data will be used to:</p>
          <ul className="list-disc pl-6">
            <li>Calculate potential carbon credits</li>
            <li>Generate energy efficiency reports</li>
            <li>Improve our services</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-semibold">5. Limitation of Liability</h3>
          <p>Our calculations and recommendations are provided "as is" without any warranty. We are not liable for decisions made based on our calculations.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-semibold">6. Changes to Terms</h3>
          <p>We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of modified terms.</p>
        </section>
      </div>
    </ScrollArea>
  );
}
