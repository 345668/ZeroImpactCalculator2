import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, AlertTriangle, Copy, RefreshCw } from "lucide-react";
import { fetchApi } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DomainAlignmentCheck {
  domain: string;
  spfAligned: boolean;
  dkimAligned: boolean;
  dmarcConfigured: boolean;
  dmarcPolicy: string;
  isValid: boolean;
  recommendations: string[];
  dnsRecords: {
    spf?: { record: string; valid: boolean };
    dkim?: { record: string; valid: boolean };
    dmarc?: { record: string; valid: boolean; policy?: string };
  };
  lastChecked: Date;
}

interface DomainAlignmentResponse {
  success: boolean;
  alignment?: DomainAlignmentCheck;
  message?: string;
}

interface DmarcRecordResponse {
  success: boolean;
  domain: string;
  policy: string;
  subdomainPolicy: string;
  dmarcRecord: string;
  message: string;
}

export function DomainAlignmentChecker() {
  const [domain, setDomain] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [alignmentResult, setAlignmentResult] = useState<DomainAlignmentCheck | null>(null);
  const [generatedDmarcRecord, setGeneratedDmarcRecord] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("check");
  const { toast } = useToast();

  // Check domain alignment
  const checkDomainAlignment = async () => {
    if (!domain) {
      setError("Please enter a domain name");
      return;
    }

    setLoading(true);
    setError("");
    setAlignmentResult(null);

    try {
      const response = await fetchApi<DomainAlignmentResponse>("/api/email-agent/domains/check-alignment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain }),
      });

      if (response.success && response.alignment) {
        setAlignmentResult(response.alignment);
      } else {
        setError(response.message || "Failed to check domain alignment");
      }
    } catch (err: any) {
      console.error("Error checking domain alignment:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Generate DMARC record
  const generateDmarcRecord = async () => {
    if (!domain) {
      setError("Please enter a domain name");
      return;
    }

    setLoading(true);
    setError("");
    setGeneratedDmarcRecord("");

    try {
      const response = await fetchApi<DmarcRecordResponse>("/api/email-agent/domains/generate-dmarc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domain,
          policy: "none", // Default to none as the safest starting point
          subdomainPolicy: "none",
          reportEmail: `dmarc@${domain}`,
          percentage: 100,
        }),
      });

      if (response.success) {
        setGeneratedDmarcRecord(response.dmarcRecord);
      } else {
        setError(response.message || "Failed to generate DMARC record");
      }
    } catch (err: any) {
      console.error("Error generating DMARC record:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: "Copied to clipboard",
          description: "DNS record has been copied to your clipboard.",
        });
      },
      (err) => {
        console.error("Could not copy text: ", err);
        toast({
          title: "Copy failed",
          description: "Failed to copy to clipboard.",
          variant: "destructive",
        });
      }
    );
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Domain Alignment Checker</CardTitle>
        <CardDescription>
          Verify your domain's email authentication configuration for better deliverability and security.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Enter domain name (e.g., example.com)"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="flex-1"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="check">Check Alignment</TabsTrigger>
              <TabsTrigger value="generate">Generate DMARC</TabsTrigger>
            </TabsList>

            <TabsContent value="check" className="space-y-4 mt-4">
              <Button
                onClick={checkDomainAlignment}
                disabled={loading || !domain}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Check Domain Alignment"
                )}
              </Button>

              {loading && (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              )}

              {alignmentResult && (
                <div className="space-y-4 mt-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={alignmentResult.isValid ? "default" : "destructive"}
                      className="flex items-center gap-1"
                    >
                      {alignmentResult.isValid ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {alignmentResult.isValid ? "Valid" : "Invalid"}
                    </Badge>

                    <Badge
                      variant={alignmentResult.spfAligned ? "default" : "destructive"}
                      className="flex items-center gap-1"
                    >
                      {alignmentResult.spfAligned ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      SPF
                    </Badge>

                    <Badge
                      variant={alignmentResult.dkimAligned ? "default" : "destructive"}
                      className="flex items-center gap-1"
                    >
                      {alignmentResult.dkimAligned ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      DKIM
                    </Badge>

                    <Badge
                      variant={alignmentResult.dmarcConfigured ? "default" : "destructive"}
                      className="flex items-center gap-1"
                    >
                      {alignmentResult.dmarcConfigured ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      DMARC
                    </Badge>

                    <Badge
                      variant={
                        alignmentResult.dmarcPolicy === "reject"
                          ? "default"
                          : alignmentResult.dmarcPolicy === "quarantine"
                          ? "outline"
                          : "secondary"
                      }
                      className="flex items-center gap-1"
                    >
                      {alignmentResult.dmarcPolicy === "reject" ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : alignmentResult.dmarcPolicy === "quarantine" ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      Policy: {alignmentResult.dmarcPolicy || "none"}
                    </Badge>
                  </div>

                  {alignmentResult.recommendations.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-md font-semibold">Recommendations</h3>
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        {alignmentResult.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4">
                    <h3 className="text-md font-semibold mb-2">DNS Records</h3>
                    
                    {alignmentResult.dnsRecords.spf && (
                      <div className="mt-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">SPF Record</span>
                          <Badge variant={alignmentResult.dnsRecords.spf.valid ? "outline" : "destructive"}>
                            {alignmentResult.dnsRecords.spf.valid ? "Valid" : "Invalid"}
                          </Badge>
                        </div>
                        <div className="bg-muted p-2 rounded-md mt-1 text-xs font-mono relative group">
                          {alignmentResult.dnsRecords.spf.record}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(alignmentResult.dnsRecords.spf?.record || "")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {alignmentResult.dnsRecords.dkim && (
                      <div className="mt-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">DKIM Record</span>
                          <Badge variant={alignmentResult.dnsRecords.dkim.valid ? "outline" : "destructive"}>
                            {alignmentResult.dnsRecords.dkim.valid ? "Valid" : "Invalid"}
                          </Badge>
                        </div>
                        <div className="bg-muted p-2 rounded-md mt-1 text-xs font-mono relative group">
                          {alignmentResult.dnsRecords.dkim.record}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(alignmentResult.dnsRecords.dkim?.record || "")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {alignmentResult.dnsRecords.dmarc && (
                      <div className="mt-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">DMARC Record</span>
                          <Badge variant={alignmentResult.dnsRecords.dmarc.valid ? "outline" : "destructive"}>
                            {alignmentResult.dnsRecords.dmarc.valid ? "Valid" : "Invalid"}
                          </Badge>
                        </div>
                        <div className="bg-muted p-2 rounded-md mt-1 text-xs font-mono relative group">
                          {alignmentResult.dnsRecords.dmarc.record}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(alignmentResult.dnsRecords.dmarc?.record || "")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-2">
                    Last checked: {new Date(alignmentResult.lastChecked).toLocaleString()}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="generate" className="space-y-4 mt-4">
              <Button
                onClick={generateDmarcRecord}
                disabled={loading || !domain}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate DMARC Record"
                )}
              </Button>

              {loading && <Skeleton className="h-20 w-full" />}

              {generatedDmarcRecord && (
                <div className="mt-4 space-y-2">
                  <h3 className="text-md font-semibold">Generated DMARC Record</h3>
                  <Alert>
                    <AlertTitle>DNS Settings</AlertTitle>
                    <AlertDescription className="text-sm">
                      Add this TXT record to your DNS settings with the name <code>_dmarc.{domain}</code>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="bg-muted p-3 rounded-md text-sm font-mono relative group">
                    {generatedDmarcRecord}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => copyToClipboard(generatedDmarcRecord)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="text-sm mt-4">
                    <p><strong>Note:</strong> This record configures a monitoring-only DMARC policy which won't affect email delivery. After monitoring results for at least two weeks, consider transitioning to stronger policies.</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-xs text-muted-foreground">
          Checking and monitoring email authentication helps improve deliverability and prevents spoofing.
        </div>
      </CardFooter>
    </Card>
  );
}