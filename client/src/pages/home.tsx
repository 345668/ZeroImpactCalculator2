import { HeroSection } from "@/components/hero-section";
import { CalculatorForm } from "@/components/calculator-form";
import { Layout } from "@/components/layout";
import { NavigationBar } from "@/components/navigation-bar";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();
  
  return (
    <Layout>
      <NavigationBar />
      <HeroSection />
      <main id="calculator" className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-3xl mx-auto text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-4">{t('calculator.heading')}</h2>
          <p className="text-lg text-muted-foreground">
            {t('calculator.intro')}
          </p>
        </motion.div>
        <CalculatorForm />
      </main>
    </Layout>
  );
}