import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { Submission } from "@shared/schema";

interface DashboardTableProps {
  submissions: Submission[];
}

// Safety functions
const safeNumber = (value: any): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

const safeDiv = (a: number, b: number, decimals = 2): number => {
  if (b === 0) return 0;
  const result = a / b;
  return Number(result.toFixed(decimals));
};

export function DashboardTable({ submissions }: DashboardTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-muted/5">
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold">Customer</TableHead>
            <TableHead className="font-semibold">Energy Consultant</TableHead>
            <TableHead className="font-semibold">Building Size</TableHead>
            <TableHead className="font-semibold">Energy Reduction</TableHead>
            <TableHead className="font-semibold">CO₂ Savings</TableHead>
            <TableHead className="font-semibold">Carbon Credits</TableHead>
            <TableHead className="font-semibold">Financial Value</TableHead>
            <TableHead className="font-semibold">Document</TableHead>
            <TableHead className="font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.slice(0, 10).map((submission) => (
            <TableRow
              key={submission.id}
              className="transition-colors hover:bg-muted/5"
            >
              <TableCell>
                {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : "N/A"}
              </TableCell>
              <TableCell>
                {`${submission.firstName} ${submission.lastName}`}
                <br />
                <span className="text-xs text-muted-foreground">{submission.address}</span>
              </TableCell>
              <TableCell>
                {submission.energyConsultantName ? (
                  <>
                    {submission.energyConsultantName}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {submission.energyConsultantCompany}
                      <br />
                      ID: {submission.energyConsultantId}
                      <br />
                      BAFA: {submission.energyConsultantBafaNumber}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">No consultant info</span>
                )}
              </TableCell>
              <TableCell>{safeNumber(submission.buildingSize)} m²</TableCell>
              <TableCell>
                {safeDiv(safeNumber(submission.currentConsumption) - safeNumber(submission.projectedConsumption), safeNumber(submission.currentConsumption), 1)}%
              </TableCell>
              <TableCell>{safeNumber(submission.co2Savings).toFixed(2)} tons</TableCell>
              <TableCell>{safeNumber(submission.carbonCredits).toFixed(2)}</TableCell>
              <TableCell>€{safeNumber(submission.financialValue).toFixed(2)}</TableCell>
              <TableCell>
                {submission.fileUrl ? (
                  <div className="space-y-1">
                    <Button
                      variant="link"
                      size="sm"
                      asChild
                      className="p-0 h-auto text-primary hover:text-primary/80 font-medium"
                    >
                      <a 
                        href={submission.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center"
                        onClick={(e) => {
                          e.preventDefault();
                          console.log('Accessing document via API endpoint');
                          
                          // Make a fetch request to get the document URL through our API endpoint
                          fetch(`/api/documents/url?path=${encodeURIComponent(submission.fileUrl)}`)
                            .then(response => {
                              if (!response.ok) {
                                throw new Error('Failed to fetch document URL');
                              }
                              return response.json();
                            })
                            .then(data => {
                              if (data.url) {
                                console.log('Opening document with URL:', data.url);
                                window.open(data.url, '_blank');
                              } else {
                                toast({
                                  title: "Document not found",
                                  description: "The document URL could not be retrieved",
                                  variant: "destructive",
                                });
                              }
                            })
                            .catch(error => {
                              console.error('Error fetching document URL:', error);
                              toast({
                                title: "Error",
                                description: "Unable to access document. Please try again later.",
                                variant: "destructive",
                              });
                            });
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        View Document
                      </a>
                    </Button>
                    {submission.fileName && (
                      <div className="text-xs text-muted-foreground pl-5">
                        {submission.fileName}
                        {submission.fileSize && (
                          <span className="ml-1">
                            ({Math.round(safeNumber(submission.fileSize) / 1024)} KB)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No document</span>
                )}
              </TableCell>
              <TableCell>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/send-report', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ submissionId: submission.id }),
                        });

                        if (!response.ok) {
                          throw new Error('Failed to send report');
                        }

                        // Invalidate the query to refresh the data
                        await queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });

                        toast({
                          title: "Success",
                          description: "Report has been sent to your email",
                        });
                      } catch (error) {
                        console.error('Error sending report:', error);
                        toast({
                          title: "Error",
                          description: "Failed to send report email",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="w-full justify-center"
                    disabled={submission.emailSent === "yes"}
                  >
                    <FileDown className="h-4 w-4 mr-1" />
                    {submission.emailSent === "yes" ? "Report Sent" : "Send Report"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}