import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LoginModal } from "@/components/login-modal";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ShieldAlert } from "lucide-react";

export function NavigationBar() {
  const [location] = useLocation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { t } = useTranslation();
  
  // Check if user is logged in on component mount
  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData && userData.id) {
          setIsLoggedIn(true);
          
          // Check if user has admin role
          if (userData.role === 'admin') {
            setIsAdmin(true);
          }
        }
      } catch (e) {
        console.error("Error parsing user data:", e);
        localStorage.removeItem("user");
      }
    }
  }, []);
  
  const handleCompanyClick = (e: React.MouseEvent) => {
    if (!isLoggedIn) {
      e.preventDefault();
      setShowLoginModal(true);
    }
  };
  
  return (
    <>
      <nav className="fixed top-0 right-0 px-6 py-4 z-50 flex items-center gap-3">
        <Link href="/">
          <Button 
            variant="link" 
            size="sm" 
            className="text-sm font-medium text-foreground/90 hover:text-foreground"
          >
            {t('navigation.home')}
          </Button>
        </Link>
        
        {isLoggedIn ? (
          <Link href="/company">
            <Button 
              variant="link" 
              size="sm" 
              className="text-sm font-medium text-foreground/90 hover:text-foreground"
            >
              {t('navigation.company')}
            </Button>
          </Link>
        ) : (
          <Button 
            variant="link" 
            size="sm" 
            className="text-sm font-medium text-foreground/90 hover:text-foreground"
            onClick={handleCompanyClick}
          >
            {t('navigation.company')}
          </Button>
        )}
        
        {/* Admin panel link - visible only for admin users */}
        {isAdmin && (
          <Link href="/admin">
            <Button 
              variant="link" 
              size="sm" 
              className="text-sm font-medium text-primary flex items-center gap-1 hover:text-primary/90"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              {t('navigation.admin')}
            </Button>
          </Link>
        )}
        
        {/* Language switcher */}
        <LanguageSwitcher />
      </nav>
      
      <LoginModal 
        open={showLoginModal} 
        onOpenChange={setShowLoginModal}
      />
    </>
  );
}