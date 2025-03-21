import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { useEffect } from 'react';
import { fetchUserLanguage } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { toast } = useToast();
  
  useEffect(() => {
    // Detect user's language based on IP on component mount
    fetchUserLanguage();
  }, []);

  const changeLanguage = (lng: string) => {
    try {
      // Force language change and reload resources
      i18n.changeLanguage(lng);
      
      // Store language preference in localStorage for persistence
      localStorage.setItem('i18nextLng', lng);
      
      // Provide visual feedback
      const languageName = lng === 'en' ? 'English' : 'Deutsch';
      toast({
        title: "Language Changed",
        description: `The language has been changed to ${languageName}`,
        duration: 2000
      });
    } catch (error) {
      console.error('Language change error:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Globe className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => changeLanguage('en')}
          className={i18n.language === 'en' ? 'bg-muted' : ''}
        >
          🇺🇸 English
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeLanguage('de')}
          className={i18n.language === 'de' ? 'bg-muted' : ''}
        >
          🇩🇪 Deutsch
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}