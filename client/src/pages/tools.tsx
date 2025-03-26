import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StorageStatus } from "@/components/storage-status";
import { Database, Server, HardDrive, RefreshCw, Download, FileCog } from "lucide-react";
import { useLocation } from "wouter";

// Define data types
interface StorageData {
  timestamp: string;
  storage: {
    azure: {
      available: boolean;
      error: string | null;
      files: Array<{
        name: string;
        url: string;
        size: number;
        lastModified: string;
      }>;
      count: number;
    };
    local: {
      available: boolean;
      files: string[];
      count: number;
    };
    primary: "azure" | "local";
  };
}

interface HealthData {
  status: "healthy" | "degraded" | "unhealthy";
  services: {
    database: string;
    email: string;
    storage: {
      azure: string;
      local: string;
      primary: "azure" | "local";
    };
  };
  version: string;
  environment: string;
  uptime: number;
  timestamp: string;
  memory?: {
    [key: string]: number;
  };
}

function ToolsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("storage");
  
  // Check if user is logged in
  const [, navigate] = useLocation();
  const userDataString = localStorage.getItem("user");
  if (!userDataString) {
    navigate("/");
    return null;
  }
  
  // Parse user data
  let userData;
  try {
    userData = JSON.parse(userDataString);
  } catch (e) {
    console.error("Error parsing user data:", e);
    navigate("/");
    return null;
  }
  
  // Query storage status
  const { 
    data: storageData, 
    isLoading: storageLoading, 
    error: storageError,
    refetch: refetchStorage
  } = useQuery({
    queryKey: ["/api/storage/status"],
    refetchInterval: 60000, // Auto-refresh every minute
  });
  
  // Health status query
  const { 
    data: healthData, 
    isLoading: healthLoading, 
    error: healthError,
    refetch: refetchHealth
  } = useQuery({
    queryKey: ["/api/health"],
    refetchInterval: 60000, // Auto-refresh every minute
  });
  
  // Handle manual refresh button click
  const handleRefreshClick = () => {
    refetchStorage();
    refetchHealth();
  };
  
  // Function to format file size
  const formatFileSize = (sizeInBytes: number): string => {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} ${t('document.fileInfo.bytes')}`;
    } else if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(2)} ${t('document.fileInfo.kb')}`;
    } else {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} ${t('document.fileInfo.mb')}`;
    }
  };
  
  // Backup database
  const handleBackupDatabase = async () => {
    try {
      const response = await fetch('/api/test-backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Backup completed:', data);
      // Could show a success message here
      
      // Refresh storage data to show the new backup file
      setTimeout(() => {
        refetchStorage();
      }, 1000);
      
    } catch (error) {
      console.error('Backup failed:', error);
      // Could show an error message here
    }
  };
  
  return (
    <div className="container max-w-7xl mx-auto py-10">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">{t('tools.title')}</h1>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1"
              onClick={handleRefreshClick}
            >
              <RefreshCw className="h-4 w-4" />
              {t('tools.actions.refresh')}
            </Button>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="storage" className="gap-2">
              <Database className="h-4 w-4" />
              {t('tools.tabs.storage')}
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2">
              <Server className="h-4 w-4" />
              {t('tools.tabs.system')}
            </TabsTrigger>
          </TabsList>
          
          {/* Storage Management Tab */}
          <TabsContent value="storage" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Storage Status Card */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex justify-between items-center">
                    {t('tools.storage.status')}
                    <StorageStatus />
                  </CardTitle>
                  <CardDescription>
                    {t('tools.storage.statusDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StorageStatus showDetails={true} />
                </CardContent>
              </Card>
              
              {/* Storage Actions Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{t('tools.storage.actions')}</CardTitle>
                  <CardDescription>
                    {t('tools.storage.actionsDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    onClick={handleBackupDatabase}
                  >
                    <Download className="h-4 w-4" />
                    {t('tools.actions.backup')}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    onClick={() => window.open('/api/storage/status', '_blank')}
                  >
                    <FileCog className="h-4 w-4" />
                    {t('tools.actions.manageFiles')}
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            {/* Storage File List */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t('tools.storage.files')}</CardTitle>
                <CardDescription>
                  {t('tools.storage.filesDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {storageLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : storageError ? (
                  <Alert variant="destructive">
                    <AlertTitle>{t('tools.storage.errorTitle')}</AlertTitle>
                    <AlertDescription>
                      {t('tools.storage.errorDescription')}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-6">
                    {/* Azure Files */}
                    {storageData?.storage?.azure?.available && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                          <Server className="h-4 w-4 text-primary" />
                          {t('storage.azure.title')}
                          <span className="text-xs text-muted-foreground">
                            ({storageData.storage.azure.count} {t('tools.storage.fileCount')})
                          </span>
                        </h3>
                        
                        {storageData.storage.azure.count > 0 ? (
                          <div className="border rounded-md overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="text-left p-2 font-medium">{t('document.fileInfo.name')}</th>
                                  <th className="text-left p-2 font-medium">{t('document.fileInfo.size')}</th>
                                  <th className="text-left p-2 font-medium">{t('document.fileInfo.uploaded')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {storageData.storage.azure.files.slice(0, 10).map((file: any, index: number) => (
                                  <tr key={index} className="border-t">
                                    <td className="p-2 truncate max-w-[200px]">
                                      <a 
                                        href={file.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        {file.name}
                                      </a>
                                    </td>
                                    <td className="p-2">{formatFileSize(file.size)}</td>
                                    <td className="p-2 text-muted-foreground">
                                      {new Date(file.lastModified).toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            
                            {storageData.storage.azure.files.length > 10 && (
                              <div className="p-2 text-center text-sm text-muted-foreground bg-muted/20">
                                {t('tools.storage.showingLimited', { 
                                  showing: 10, 
                                  total: storageData.storage.azure.files.length 
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground p-4 border rounded-md bg-muted/10">
                            {t('tools.storage.noFiles')}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Local Files */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-primary" />
                        {t('storage.local.title')}
                        <span className="text-xs text-muted-foreground">
                          ({storageData?.storage?.local?.count || 0} {t('tools.storage.fileCount')})
                        </span>
                      </h3>
                      
                      {(storageData?.storage?.local?.count || 0) > 0 ? (
                        <div className="border rounded-md overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="text-left p-2 font-medium">{t('document.fileInfo.name')}</th>
                                <th className="text-left p-2 font-medium">{t('document.fileInfo.type')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {storageData?.storage?.local?.files.slice(0, 10).map((file: string, index: number) => {
                                const fileName = file.split('/').pop() || file;
                                const fileExt = fileName.split('.').pop() || '';
                                
                                return (
                                  <tr key={index} className="border-t">
                                    <td className="p-2 truncate max-w-[300px]">
                                      {fileName}
                                    </td>
                                    <td className="p-2 uppercase text-xs">
                                      {fileExt}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          
                          {(storageData?.storage?.local?.files.length || 0) > 10 && (
                            <div className="p-2 text-center text-sm text-muted-foreground bg-muted/20">
                              {t('tools.storage.showingLimited', { 
                                showing: 10, 
                                total: storageData?.storage?.local?.files.length 
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground p-4 border rounded-md bg-muted/10">
                          {t('tools.storage.noFiles')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* System Tab */}
          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t('tools.system.status')}</CardTitle>
                <CardDescription>
                  {t('tools.system.statusDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {healthLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : healthError ? (
                  <Alert variant="destructive">
                    <AlertTitle>{t('tools.system.errorTitle')}</AlertTitle>
                    <AlertDescription>
                      {t('tools.system.errorDescription')}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {/* Status Overview */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Overall Status */}
                      <div className="bg-muted/20 p-4 rounded-lg flex flex-col items-center justify-center">
                        <div className="text-lg font-semibold">{t('tools.system.overall')}</div>
                        <div className={`text-lg font-bold mt-2 ${
                          healthData?.status === 'healthy' 
                            ? 'text-green-500' 
                            : healthData?.status === 'degraded' 
                              ? 'text-amber-500' 
                              : 'text-red-500'
                        }`}>
                          {healthData?.status === 'healthy' 
                            ? t('tools.system.healthy') 
                            : healthData?.status === 'degraded'
                              ? t('tools.system.degraded')
                              : t('tools.system.unhealthy')}
                        </div>
                      </div>
                      
                      {/* Database Status */}
                      <div className="bg-muted/20 p-4 rounded-lg flex flex-col items-center justify-center">
                        <div className="text-lg font-semibold">{t('tools.system.database')}</div>
                        <div className={`text-lg font-bold mt-2 ${
                          healthData?.services?.database === 'healthy' 
                            ? 'text-green-500' 
                            : 'text-red-500'
                        }`}>
                          {healthData?.services?.database === 'healthy' 
                            ? t('tools.system.healthy') 
                            : t('tools.system.unhealthy')}
                        </div>
                      </div>
                      
                      {/* Email Status */}
                      <div className="bg-muted/20 p-4 rounded-lg flex flex-col items-center justify-center">
                        <div className="text-lg font-semibold">{t('tools.system.email')}</div>
                        <div className={`text-lg font-bold mt-2 ${
                          healthData?.services?.email === 'healthy' 
                            ? 'text-green-500' 
                            : healthData?.services?.email === 'misconfigured'
                              ? 'text-amber-500'
                              : 'text-red-500'
                        }`}>
                          {healthData?.services?.email === 'healthy' 
                            ? t('tools.system.healthy') 
                            : healthData?.services?.email === 'misconfigured'
                              ? t('tools.system.misconfigured')
                              : t('tools.system.unhealthy')}
                        </div>
                      </div>
                      
                      {/* Storage Status */}
                      <div className="bg-muted/20 p-4 rounded-lg flex flex-col items-center justify-center">
                        <div className="text-lg font-semibold">{t('tools.system.storage')}</div>
                        <div className={`text-lg font-bold mt-2 ${
                          healthData?.services?.storage?.azure === 'healthy' || 
                          healthData?.services?.storage?.local === 'healthy'
                            ? 'text-green-500' 
                            : 'text-red-500'
                        }`}>
                          {healthData?.services?.storage?.azure === 'healthy' || 
                          healthData?.services?.storage?.local === 'healthy'
                            ? t('tools.system.healthy') 
                            : t('tools.system.unhealthy')}
                        </div>
                      </div>
                    </div>
                    
                    {/* System Information */}
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <tbody>
                          <tr className="border-b">
                            <td className="p-2 font-medium bg-muted/30">{t('tools.system.version')}</td>
                            <td className="p-2">{healthData?.version || 'Unknown'}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 font-medium bg-muted/30">{t('tools.system.environment')}</td>
                            <td className="p-2">{healthData?.environment || 'development'}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 font-medium bg-muted/30">{t('tools.system.uptime')}</td>
                            <td className="p-2">
                              {healthData?.uptime 
                                ? `${Math.floor(healthData.uptime / 60)} ${t('tools.system.minutes')}`
                                : 'Unknown'}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2 font-medium bg-muted/30">{t('tools.system.lastChecked')}</td>
                            <td className="p-2">
                              {healthData?.timestamp 
                                ? new Date(healthData.timestamp).toLocaleString()
                                : new Date().toLocaleString()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Memory Usage (if available) */}
                    {healthData?.memory && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">{t('tools.system.memory')}</h3>
                        <div className="border rounded-md overflow-hidden">
                          <table className="w-full text-sm">
                            <tbody>
                              {Object.entries(healthData.memory).map(([key, value]: [string, any]) => (
                                <tr key={key} className="border-b last:border-b-0">
                                  <td className="p-2 font-medium bg-muted/30">{key}</td>
                                  <td className="p-2">
                                    {typeof value === 'number' 
                                      ? `${Math.round(value / 1024 / 1024 * 100) / 100} MB`
                                      : String(value)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1"
                  onClick={refetchHealth}
                >
                  <RefreshCw className="h-4 w-4" />
                  {t('tools.actions.refreshStatus')}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Export with authentication protection
export default function ToolsPageWithAuth() {
  // Check if user is logged in
  const [, navigate] = useLocation();
  const userDataString = localStorage.getItem("user");
  if (!userDataString) {
    navigate("/");
    return null;
  }
  
  return <ToolsPage />;
}