import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle, CloudOff, Database, HardDrive, Server } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface StorageStatusProps {
  showDetails?: boolean;
  className?: string;
}

export function StorageStatus({ showDetails = false, className = "" }: StorageStatusProps) {
  const { t } = useTranslation();
  
  // Define the expected health data type
  interface HealthData {
    status: string;
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
    timestamp: string;
  }
  
  const { data: healthData, isLoading: healthLoading, error: healthError } = useQuery<HealthData>({
    queryKey: ["/api/health"],
    refetchInterval: 60000, // Refresh every minute
  });
  
  if (healthLoading) {
    return <Skeleton className={`h-8 w-36 ${className}`} />;
  }
  
  if (healthError || !healthData || !healthData.services?.storage) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className={`gap-1 ${className}`}>
              <CloudOff className="h-3.5 w-3.5" />
              {t('storage.status.error')}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('storage.status.errorMessage')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  const { storage } = healthData.services;
  const primaryStorage = storage.primary;
  const isAzureHealthy = storage.azure === "healthy";
  const isLocalHealthy = storage.local === "healthy";
  
  if (!showDetails) {
    // Simple badge indicating storage status
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={isAzureHealthy || isLocalHealthy ? "outline" : "destructive"} className={`gap-1 ${className}`}>
              {primaryStorage === "azure" ? (
                <Server className="h-3.5 w-3.5" />
              ) : (
                <HardDrive className="h-3.5 w-3.5" />
              )}
              {t(`storage.status.${primaryStorage}`)}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isAzureHealthy 
                ? t('storage.status.azureAvailable') 
                : t('storage.status.azureUnavailable')}
              <br />
              {isLocalHealthy 
                ? t('storage.status.localAvailable') 
                : t('storage.status.localUnavailable')}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  // Detailed card showing storage status and options
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between">
          {t('storage.title')}
          <Badge variant={isAzureHealthy || isLocalHealthy ? "outline" : "destructive"} className="gap-1">
            {primaryStorage === "azure" ? (
              <Server className="h-3.5 w-3.5" />
            ) : (
              <HardDrive className="h-3.5 w-3.5" />
            )}
            {t(`storage.status.${primaryStorage}`)}
          </Badge>
        </CardTitle>
        <CardDescription>
          {t('storage.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Azure Storage Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              <span className="font-medium">{t('storage.azure.title')}</span>
              {isAzureHealthy ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <Alert variant={isAzureHealthy ? "default" : "destructive"} className="py-2">
              <AlertTitle className="text-xs font-medium">
                {isAzureHealthy 
                  ? t('storage.azure.available') 
                  : t('storage.azure.unavailable')}
              </AlertTitle>
              <AlertDescription className="text-xs">
                {isAzureHealthy 
                  ? t('storage.azure.availableDescription') 
                  : t('storage.azure.unavailableDescription')}
              </AlertDescription>
            </Alert>
          </div>
          
          {/* Local Storage Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-primary" />
              <span className="font-medium">{t('storage.local.title')}</span>
              {isLocalHealthy ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <Alert variant={isLocalHealthy ? "default" : "destructive"} className="py-2">
              <AlertTitle className="text-xs font-medium">
                {isLocalHealthy 
                  ? t('storage.local.available') 
                  : t('storage.local.unavailable')}
              </AlertTitle>
              <AlertDescription className="text-xs">
                {isLocalHealthy 
                  ? t('storage.local.availableDescription') 
                  : t('storage.local.unavailableDescription')}
              </AlertDescription>
            </Alert>
          </div>
        </div>
        
        {/* Storage management actions */}
        <div className="pt-2 flex justify-end gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('/api/storage/status', '_blank')}
          >
            <Database className="h-4 w-4 mr-1" />
            {t('storage.actions.viewFiles')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}