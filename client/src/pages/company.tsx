import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Building2, BarChart2, Users, Mail, Home, Globe, Loader2, ShieldAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { GlobeMap } from "@/components/globe-map";
import { motion } from "framer-motion";
import type { Submission } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagementTable } from "@/components/user-management-table";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from "@/lib/queryClient";

export default function CompanyPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // Check if the current user is logged in and get their role
  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        setIsLoading(true);
        const userData = await fetchApi<{
          id: number;
          email: string;
          username: string;
          role: string;
        }>('/api/auth/me', { method: 'GET' });
        
        if (!userData) {
          toast({
            title: "Authentication Error",
            description: "Please log in to access this page",
            variant: "destructive",
          });
          setLocation('/');
          return;
        }
        
        // Set admin status based on user role
        setIsAdmin(userData.role === 'admin');
      } catch (error) {
        console.error('Error checking user status:', error);
        toast({
          title: "Authentication Error",
          description: "Please log in to access this page",
          variant: "destructive",
        });
        setLocation('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkUserStatus();
  }, [setLocation, toast]);
  
  // Fetch submissions data for the globe map
  const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ['/api/submissions'],
    queryFn: async () => {
      console.log("Fetching submissions for company page");
      const response = await fetch('/api/submissions');
      
      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }
      
      return response.json();
    }
  });
  
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="mb-4 text-primary">
              <Loader2 className="h-12 w-12 mx-auto animate-spin" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Loading...</h2>
            <p className="text-muted-foreground">Please wait while we load your company portal.</p>
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Radical Zero Company Portal</h1>
          <Link href="/">
            <Button variant="outline" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Home
            </Button>
          </Link>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="mb-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Overview
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                User Management
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="overview">
            {/* Global Impact Map - Full width card at the top */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="transition-all duration-200 hover:shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Global Carbon Impact
                  </CardTitle>
                  <CardDescription>
                    Worldwide view of carbon reduction impact
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-6">
                  <div className="w-full" style={{ height: 'auto', minHeight: '400px', maxHeight: '500px', position: 'relative' }}>
                    {submissionsLoading ? (
                      <div className="flex h-[400px] items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <GlobeMap submissions={submissions as Submission[]} isLoading={submissionsLoading} />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Dashboard Card */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-primary" />
                    Analytics Dashboard
                  </CardTitle>
                  <CardDescription>
                    View and analyze carbon credit data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Access comprehensive analytics, visualize trends, and monitor carbon credit performance.
                  </p>
                  <Link href="/dashboard">
                    <Button className="w-full">Go to Dashboard</Button>
                  </Link>
                </CardContent>
              </Card>
              
              {/* User Management Card */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    User Management
                  </CardTitle>
                  <CardDescription>
                    Manage consultants and customers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add, edit, and manage user access and roles for the carbon calculator platform.
                  </p>
                  {isAdmin ? (
                    <Button 
                      className="w-full" 
                      onClick={() => setActiveTab("users")}
                    >
                      Manage Users
                    </Button>
                  ) : (
                    <Button className="w-full" variant="outline" disabled>
                      Admin Access Required
                    </Button>
                  )}
                </CardContent>
              </Card>
              
              {/* Settings Card */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Company Settings
                  </CardTitle>
                  <CardDescription>
                    Manage company profile and settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Update company information, customize branding, and configure notification preferences.
                  </p>
                  <Button className="w-full" variant="outline">Coming Soon</Button>
                </CardContent>
              </Card>
              
              {/* Email Templates Card */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Email Templates
                  </CardTitle>
                  <CardDescription>
                    Customize customer communications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create and edit email templates for carbon credit reports and customer notifications.
                  </p>
                  <Button className="w-full" variant="outline">Coming Soon</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* User Management Tab Content */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-primary" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Manage user accounts and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserManagementTable />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}