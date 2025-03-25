import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, AlertCircle, FileText, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";

interface DocumentUploadProps {
  onDataExtracted: (data: {
    buildingSize?: number;
    currentConsumption?: number;
    projectedConsumption?: number;
    language?: string;
    heatingSystem?: string;
    energyConsultantName?: string;
    energyConsultantCompany?: string;
    energyConsultantId?: string;
    energyConsultantBafaNumber?: string;
    // Enhanced file properties
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    fileUploadedAt?: string;
    fileMetadata?: string;
  }) => void;
  email?: string; // Optional email to associate with upload
  submissionId?: number; // Optional submission ID to associate with upload
}

// Add file size constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

export function DocumentUpload({ onDataExtracted, email, submissionId }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{
    name?: string;
    size?: number;
    type?: string;
    url?: string;
    uploadedAt?: string;
  } | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const validateFile = useCallback((file: File): boolean => {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t('document.errors.fileType'));
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(t('document.errors.fileSize'));
      return false;
    }

    return true;
  }, [t]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (formData: FormData) => {
      // Add contextual data to the upload if available
      if (email) {
        formData.append('email', email);
      }
      
      if (submissionId) {
        formData.append('submissionId', submissionId.toString());
      }

      const res = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error uploading document');
      }

      return res.json();
    },
    onSuccess: (data) => {
      // Handle success with enhanced file information
      const fileInfo = data.fileInfo || {};
      const extractedData = data.extractedData || {};
      
      // Store uploaded file path for display
      const filePath = fileInfo.url || extractedData.fileUrl;
      console.log('File path received:', filePath);
      
      // Set in local state for display purposes - we'll get the actual URL via API
      setUploadedFileInfo({
        name: fileInfo.name || file?.name,
        size: fileInfo.size || file?.size,
        type: fileInfo.type || file?.type,
        url: filePath, // This is now a path/identifier, not a direct URL
        uploadedAt: fileInfo.uploadedAt || new Date().toISOString()
      });
      
      toast({
        title: t('document.toast.success'),
        description: t('document.toast.processedSuccessfully', { language: extractedData.language || t('document.toast.unknownLanguage') }),
      });

      // Prepare data for parent component with enhanced file information
      const processedData = {
        language: extractedData.language,
        buildingSize: extractedData.building_size,
        currentConsumption: extractedData.current_consumption,
        projectedConsumption: extractedData.projected_consumption,
        heatingSystem: extractedData.heating_system_type,
        energyConsultantName: extractedData.energy_consultant_name,
        energyConsultantCompany: extractedData.energy_consultant_company,
        energyConsultantId: extractedData.energy_consultant_id,
        energyConsultantBafaNumber: extractedData.energy_consultant_bafa_number,
        // Enhanced file details - use the previously validated filePath
        fileUrl: filePath,
        fileName: fileInfo.name || file?.name,
        fileSize: fileInfo.size || file?.size,
        fileType: fileInfo.type || file?.type,
        fileUploadedAt: fileInfo.uploadedAt || new Date().toISOString(),
        fileMetadata: extractedData.extractionMetadata ? 
          JSON.stringify(extractedData.extractionMetadata) : undefined
      };
      
      console.log('Processed data being sent to parent:', processedData);

      onDataExtracted(processedData);
      setFile(null); // Reset file after successful upload
    },
    onError: (error: Error) => {
      console.error('Upload error:', error);
      setError(error.message);
      toast({
        title: t('document.toast.error'),
        description: error.message,
        variant: "destructive",
      });
      setFile(null);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = e.target.files?.[0];

    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile);
    }
  };

  const handleUpload = () => {
    if (!file) {
      setError(t('document.errors.noFile'));
      return;
    }

    const formData = new FormData();
    formData.append("document", file);
    mutate(formData);
  };

  // Format file size for display
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return t('document.fileInfo.unknownSize');
    if (bytes < 1024) return bytes + ' ' + t('document.fileInfo.bytes');
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' ' + t('document.fileInfo.kb');
    return (bytes / (1024 * 1024)).toFixed(1) + ' ' + t('document.fileInfo.mb');
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-4">
        <Input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileChange}
          className="flex-1"
          disabled={isPending}
        />
        <Button
          onClick={handleUpload}
          disabled={!file || isPending}
          className="w-32"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('document.actions.processing')}
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {t('document.actions.upload')}
            </>
          )}
        </Button>
      </div>

      {file && !error && !uploadedFileInfo && (
        <p className="text-sm text-muted-foreground">
          {t('document.fileInfo.selectedFile')}: {file.name}
        </p>
      )}

      {/* Display uploaded file information if available */}
      {uploadedFileInfo && uploadedFileInfo.url && (
        <div className="mt-4 p-4 border rounded-lg border-border bg-muted/30">
          <div className="flex items-start space-x-3">
            <FileText className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-1 flex-1">
              <h4 className="font-medium text-sm">{t('document.fileInfo.uploadedDocument')}</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  <span className="font-semibold">{t('document.fileInfo.name')}:</span> {uploadedFileInfo.name}
                </p>
                {uploadedFileInfo.size && (
                  <p>
                    <span className="font-semibold">{t('document.fileInfo.size')}:</span> {formatFileSize(uploadedFileInfo.size)}
                  </p>
                )}
                {uploadedFileInfo.type && (
                  <p>
                    <span className="font-semibold">{t('document.fileInfo.type')}:</span> {uploadedFileInfo.type}
                  </p>
                )}
                {uploadedFileInfo.uploadedAt && (
                  <p>
                    <span className="font-semibold">{t('document.fileInfo.uploaded')}:</span> {new Date(uploadedFileInfo.uploadedAt).toLocaleString()}
                  </p>
                )}
              </div>
              {uploadedFileInfo.url && (
                <a 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    console.log('Accessing document via API endpoint');
                    
                    // Make a fetch request to get the document URL through our API endpoint
                    fetch(`/api/documents/url?path=${encodeURIComponent(uploadedFileInfo.url || '')}`)
                      .then(response => {
                        if (!response.ok) {
                          // Check specific error status
                          if (response.status === 404) {
                            throw new Error('DOCUMENT_NOT_FOUND');
                          } else if (response.status === 503) {
                            throw new Error('STORAGE_UNAVAILABLE');
                          } else {
                            throw new Error(t('document.errors.failedFetchUrl'));
                          }
                        }
                        return response.json();
                      })
                      .then(data => {
                        if (data.url) {
                          console.log('Opening document with URL:', data.url);
                          
                          // Handle differently based on whether it's a local or cloud URL
                          if (data.isLocal) {
                            // For local files, use our own endpoint
                            window.open(data.url, '_blank');
                          } else {
                            // For cloud URLs (Azure), open directly
                            window.open(data.url, '_blank');
                          }
                        } else {
                          toast({
                            title: t('document.toast.documentNotFound'),
                            description: data.details || t('document.errors.urlNotRetrieved'),
                            variant: "destructive",
                          });
                        }
                      })
                      .catch(error => {
                        console.error('Error fetching document URL:', error);
                        
                        // More descriptive error messages based on error type
                        let errorMessage = t('document.errors.unableToAccess');
                        
                        if (error.message === 'DOCUMENT_NOT_FOUND') {
                          errorMessage = t('document.errors.documentNotFound');
                        } else if (error.message === 'STORAGE_UNAVAILABLE') {
                          errorMessage = t('document.errors.storageUnavailable');
                        }
                        
                        toast({
                          title: t('document.toast.error'),
                          description: errorMessage,
                          variant: "destructive",
                        });
                      });
                  }}
                  className="text-xs text-primary hover:underline inline-flex items-center mt-1"
                >
                  {t('document.actions.viewDocument')} <Info className="h-3 w-3 ml-1" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}