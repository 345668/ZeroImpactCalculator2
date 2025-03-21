import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { LoginModal } from "@/components/login-modal";

export function NavigationBar() {
  const [location] = useLocation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Check if user is logged in on component mount
  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData && userData.id) {
          setIsLoggedIn(true);
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
            Home
          </Button>
        </Link>
        
        {isLoggedIn ? (
          <Link href="/company">
            <Button 
              variant="link" 
              size="sm" 
              className="text-sm font-medium text-foreground/90 hover:text-foreground"
            >
              Company
            </Button>
          </Link>
        ) : (
          <Button 
            variant="link" 
            size="sm" 
            className="text-sm font-medium text-foreground/90 hover:text-foreground"
            onClick={handleCompanyClick}
          >
            Company
          </Button>
        )}
      </nav>
      
      <LoginModal 
        open={showLoginModal} 
        onOpenChange={setShowLoginModal}
      />
    </>
  );
}