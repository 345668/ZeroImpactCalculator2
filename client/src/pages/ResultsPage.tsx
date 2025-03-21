import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout";
import { NavigationBar } from "@/components/navigation-bar";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

export function ResultsPage() {
  const [, setLocation] = useLocation();
  const { t, i18n } = useTranslation();

  // Force re-render when language changes to refresh translations
  useEffect(() => {
    // Get current language from localStorage or use default
    const savedLanguage = localStorage.getItem('i18nextLng');
    if (savedLanguage && ['en', 'de'].includes(savedLanguage) && i18n.language !== savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    }
    
    // Make sure all translations are loaded for current page
    if (i18n.language) {
      i18n.loadNamespaces('translation');
    }
    
    // Listen for language changes
    const handleLanguageChanged = (lng: string) => {
      console.log('Language changed to:', lng);
      // Force component update
      i18n.loadNamespaces('translation');
    };

    i18n.on('languageChanged', handleLanguageChanged);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);

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
            {t('calculator.success.title')}
          </h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-4 mb-12"
          >
            <p className="text-lg">
              {t('calculator.success.message')}
            </p>
            <p className="text-muted-foreground">
              {t('calculator.results.emailDetails')}
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
              {t('common.returnHome')}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
}