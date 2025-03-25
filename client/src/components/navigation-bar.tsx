import React, { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LoginModal } from "@/components/login-modal";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ShieldAlert } from "lucide-react";

export function NavigationBar() {
  const [location, setLocation] = useLocation();
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
    e.preventDefault();
    
    if (!isLoggedIn) {
      // Only show login modal when not logged in and clicking Company button
      console.log("Opening login modal for company access");
      setShowLoginModal(true);
    } else {
      // If already logged in, navigate to company page
      setLocation("/company");
    }
  };
  
  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    // Check if user has admin role after successful login
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        setIsAdmin(userData.role === 'admin');
        // Navigate to company page after successful login
        setLocation("/company");
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
  };
  
  return (
    <>
      <nav className="fixed top-0 right-0 px-6 py-4 z-50 flex items-center gap-3">
        {/* Home button - always accessible */}
        <Link href="/">
          <Button 
            variant="link" 
            size="sm" 
            className="text-sm font-medium text-foreground/90 hover:text-foreground"
          >
            {t('navigation.home')}
          </Button>
        </Link>
        
        {/* Company button - protected with login */}
        <Button 
          variant="link" 
          size="sm" 
          className="text-sm font-medium text-foreground/90 hover:text-foreground"
          onClick={handleCompanyClick}
        >
          {t('navigation.company')}
        </Button>
        
        {/* Language switcher */}
        <LanguageSwitcher />
      </nav>
      
      {/* Login modal only shows when Company button is clicked while not logged in */}
      <LoginModal 
        open={showLoginModal} 
        onOpenChange={setShowLoginModal}
        onSuccess={handleLoginSuccess}
      />
    </>
  );
}