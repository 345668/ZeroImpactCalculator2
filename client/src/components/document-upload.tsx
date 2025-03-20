import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    fileUrl?: string;
  }) => void;
}

// Add file size constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

export function DocumentUpload({ onDataExtracted }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const validateFile = useCallback((file: File): boolean => {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please upload a PDF or image file (JPG, PNG)");
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File size must be less than 10MB");
      return false;
    }

    return true;
  }, []);

  const { mutate, isPending } = useMutation({
    mutationFn: async (formData: FormData) => {
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
      toast({
        title: "Success",
        description: `Document processed successfully in ${data.language}`,
      });

      const extractedData = {
        language: data.language,
        buildingSize: data.extractedData?.building_size,
        currentConsumption: data.extractedData?.current_consumption,
        projectedConsumption: data.extractedData?.projected_consumption,
        heatingSystem: data.extractedData?.heating_system_type,
        energyConsultantName: data.extractedData?.energy_consultant_name,
        energyConsultantCompany: data.extractedData?.energy_consultant_company,
        energyConsultantId: data.extractedData?.energy_consultant_id,
        energyConsultantBafaNumber: data.extractedData?.energy_consultant_bafa_number,
        fileUrl: data.fileUrl,
      };

      onDataExtracted(extractedData);
      setFile(null); // Reset file after successful upload
    },
    onError: (error: Error) => {
      console.error('Upload error:', error);
      setError(error.message);
      toast({
        title: "Error",
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
      setError("Please select a file to upload");
      return;
    }

    const formData = new FormData();
    formData.append("document", file);
    mutate(formData);
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
              Processing
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </>
          )}
        </Button>
      </div>

      {file && !error && (
        <p className="text-sm text-muted-foreground">
          Selected file: {file.name}
        </p>
      )}
    </div>
  );
}