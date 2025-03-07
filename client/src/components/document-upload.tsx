import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

interface DocumentUploadProps {
  onDataExtracted: (data: {
    buildingSize?: number;
    currentConsumption?: number;
    projectedConsumption?: number;
    language?: string;
  }) => void;
}

export function DocumentUpload({ onDataExtracted }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const { mutate, isPending } = useMutation({
    mutationFn: async (formData: FormData) => {
      console.log('Uploading file:', formData.get('document')); // Debug log
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
        title: "Document processed successfully",
        description: `Language detected: ${data.language}. Document has been analyzed.`,
      });

      // Extract relevant data from OCR results
      const extractedData = {
        language: data.language,
        buildingSize: data.extractedData?.building_size || undefined,
        currentConsumption: data.extractedData?.current_consumption || undefined,
        projectedConsumption: data.extractedData?.projected_consumption || undefined,
      };

      onDataExtracted(extractedData);
    },
    onError: (error: Error) => {
      toast({
        title: "Error processing document",
        description: error.message,
        variant: "destructive",
      });
      setFile(null); // Reset file selection on error
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      // Validate file type
      if (!selectedFile.type.match('application/pdf|image/jpeg|image/png|image/jpg')) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or image file (JPG, PNG)",
          variant: "destructive",
        });
        return;
      }
      // Validate file size (10MB max)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("document", file);
    console.log('Sending file:', file.name); // Debug log
    mutate(formData);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileChange}
          className="flex-1"
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
      {file && (
        <p className="text-sm text-muted-foreground">
          Selected file: {file.name}
        </p>
      )}
    </div>
  );
}