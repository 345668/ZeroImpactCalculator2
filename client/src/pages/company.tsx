import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Building2, BarChart2, Users, Mail } from "lucide-react";

export default function CompanyPage() {
  return (
    <Layout>
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Radical Zero Company Portal</h1>
        
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
              <Button className="w-full" variant="outline">Coming Soon</Button>
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
      </div>
    </Layout>
  );
}