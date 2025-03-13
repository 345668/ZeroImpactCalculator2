import { ScrollArea } from "@/components/ui/scroll-area";

export function GDPRConsent() {
  return (
    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">GDPR Privacy Notice</h2>
        <p className="text-sm text-muted-foreground">Last updated: March 13, 2025</p>

        <section className="space-y-2">
          <h3 className="text-lg font-semibold">1. Data Controller</h3>
          <p>Your data is controlled by Zero Impact Calculator ("we", "us", "our").</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-semibold">2. Personal Data We Collect</h3>
          <ul className="list-disc pl-6">
            <li>Name and contact information</li>
            <li>Building address and specifications</li>
            <li>Energy consumption data</li>
            <li>Technical data (IP address, browser type)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-semibold">3. How We Use Your Data</h3>
          <p>We process your data for the following purposes:</p>
          <ul className="list-disc pl-6">
            <li>Calculating carbon credits and energy savings</li>
            <li>Generating personalized reports</li>
            <li>Improving our services</li>
            <li>Complying with legal obligations</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-semibold">4. Legal Basis for Processing</h3>
          <ul className="list-disc pl-6">
            <li>Contract performance</li>
            <li>Legal obligations</li>
            <li>Legitimate interests</li>
            <li>Your consent</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-semibold">5. Your Rights</h3>
          <p>Under GDPR, you have the right to:</p>
          <ul className="list-disc pl-6">
            <li>Access your data</li>
            <li>Rectify inaccurate data</li>
            <li>Request data erasure</li>
            <li>Restrict processing</li>
            <li>Data portability</li>
            <li>Object to processing</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-semibold">6. Data Retention</h3>
          <p>We retain your personal data for as long as necessary to fulfill the purposes for which it was collected, or as required by applicable laws and regulations.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-semibold">7. Contact Us</h3>
          <p>For any GDPR-related queries, contact our Data Protection Officer at dpo@zeroimpact.com</p>
        </section>
      </div>
    </ScrollArea>
  );
}
