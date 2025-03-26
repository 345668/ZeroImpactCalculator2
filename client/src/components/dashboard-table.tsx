import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { Submission } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";

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
  const { t } = useTranslation();
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-muted/5">
            <TableHead className="font-semibold">{t('dashboard.table.date')}</TableHead>
            <TableHead className="font-semibold">{t('dashboard.table.customer')}</TableHead>
            <TableHead className="font-semibold">{t('dashboard.table.consultant')}</TableHead>
            <TableHead className="font-semibold">{t('dashboard.table.buildingSize')}</TableHead>
            <TableHead className="font-semibold">{t('dashboard.table.energyReduction')}</TableHead>
            <TableHead className="font-semibold">{t('dashboard.table.co2Savings')}</TableHead>
            <TableHead className="font-semibold">{t('dashboard.table.carbonCredits')}</TableHead>
            <TableHead className="font-semibold">{t('dashboard.table.financialValue')}</TableHead>
            <TableHead className="font-semibold">{t('dashboard.table.document')}</TableHead>
            <TableHead className="font-semibold">{t('dashboard.table.actions')}</TableHead>
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
                <span className="text-xs text-muted-foreground">
                  {submission.streetName}, {submission.postalCode}, {submission.region}, {submission.country}
                </span>
              </TableCell>
              <TableCell>
                {submission.energyConsultantName ? (
                  <>
                    {submission.energyConsultantName}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {submission.energyConsultantCompany}
                      <br />
                      {t('consultant.id')}: {submission.energyConsultantId}
                      <br />
                      {t('consultant.bafa')}: {submission.energyConsultantBafaNumber}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">{t('consultant.noInfo')}</span>
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
                          
                          // Make a request to get the document URL through our API endpoint using apiRequest to include CSRF token
                          apiRequest('GET', `/api/documents/url?path=${encodeURIComponent(submission.fileUrl || '')}`)
                            .then(response => {
                              // apiRequest throws on error, so we don't need to check response.ok
                              return response.json();
                            })
                            .catch(error => {
                              // Handle specific error codes from apiRequest error
                              if (error.status === 404) {
                                throw new Error('Document not found');
                              } else if (error.status === 503) {
                                throw new Error('Document storage service unavailable');
                              } else {
                                throw new Error('Failed to fetch document URL');
                              }
                            })
                            .then(data => {
                              if (data.url) {
                                console.log('Opening document with URL:', data.url);
                                window.open(data.url, '_blank');
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
                              
                              if (error.message === 'Document not found') {
                                errorMessage = t('document.errors.documentNotFound');
                              } else if (error.message === 'Document storage service unavailable') {
                                errorMessage = t('document.errors.storageUnavailable');
                              }
                              
                              toast({
                                title: t('document.toast.error'),
                                description: errorMessage,
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
                        {t('document.actions.viewDocument')}
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
                  <span className="text-xs text-muted-foreground">{t('document.noDocument')}</span>
                )}
              </TableCell>
              <TableCell>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const response = await apiRequest('POST', '/api/send-report', 
                          { submissionId: submission.id }
                        );
                        
                        // apiRequest throws an error if the response is not OK, so we don't need to check response.ok

                        // Invalidate the query to refresh the data
                        await queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });

                        toast({
                          title: t('document.toast.success'),
                          description: t('document.report.sentSuccess'),
                        });
                      } catch (error) {
                        console.error('Error sending report:', error);
                        toast({
                          title: t('document.toast.error'),
                          description: t('document.report.sentError'),
                          variant: "destructive",
                        });
                      }
                    }}
                    className="w-full justify-center"
                    disabled={submission.emailSent === "yes"}
                  >
                    <FileDown className="h-4 w-4 mr-1" />
                    {submission.emailSent === "yes" ? t('document.report.sent') : t('document.report.send')}
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