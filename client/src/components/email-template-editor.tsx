import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { insertEmailTemplateSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn, queryClient, apiRequest } from "@/lib/queryClient";
import { 
  AlertCircle, Check, Loader2, Save, Trash2, Mail, FileText, 
  Shield, Mail as MailIcon, Globe, Settings, SendHorizontal, Code,
  CopyIcon, HelpCircle, Database
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Extended schema for form validation
const emailTemplateFormSchema = insertEmailTemplateSchema.extend({
  body: z.string().min(10, { message: "Template body must be at least 10 characters" }),
  variables: z.string().optional(),
  templateType: z.enum(["standard", "dmarc-report", "security-alert"]).default("standard"),
  sendgridTemplateId: z.string().optional(),
});

type EmailTemplateFormValues = z.infer<typeof emailTemplateFormSchema>;

type EmailTemplate = {
  id: number;
  name: string;
  subject: string;
  body: string;
  description: string | null;
  isDefault: boolean | null;
  language: string | null;
  variables: string | null;
  templateType: string;
  sendgridTemplateId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: number;
};

/**
 * SubmissionDataHelper Component
 * 
 * Displays available dynamic content fields that can be used in email templates
 * from the submission data structure. Organized into logical categories for ease of use.
 */
function SubmissionDataHelper({ onInsert }: { onInsert?: (field: string) => void }) {
  const { t } = useTranslation();
  
  // Define the available fields organized by categories
  const submissionFields = {
    "User Information": {
      firstName: "First name of the user",
      lastName: "Last name of the user",
      email: "Email address",
      address: "Full address",
      phone: "Phone number",
      acceptedTerms: "Date when terms were accepted",
      gdprConsent: "GDPR consent status",
    },
    "Building Information": {
      buildingOwnership: "Type of building ownership",
      buildingSize: "Size of the building in square meters",
      heatingSystem: "Current heating system type",
      currentEnergySource: "Current energy source",
      currentConsumption: "Current energy consumption",
      projectedConsumption: "Projected energy consumption after improvements",
    },
    "Calculation Results": {
      co2Savings: "Total CO2 savings in kg",
      carbonCredits: "Carbon credits earned",
      financialValue: "Financial value of carbon credits",
      calculationDetails: "Detailed calculation breakdown",
    },
    "Energy Consultant": {
      energyConsultantName: "Name of the energy consultant",
      energyConsultantCompany: "Company of the energy consultant",
      energyConsultantId: "ID of the energy consultant",
      energyConsultantBafaNumber: "BAFA registration number",
    },
    "Document Information": {
      fileName: "Name of the uploaded document",
      fileType: "Type of the uploaded document",
      fileUploadedAt: "Date when document was uploaded",
      documentUrl: "URL to view the uploaded document",
      submittedAt: "Date when submission was created",
    }
  };

  // Handler for inserting a field into the template
  const handleInsertField = (field: string) => {
    if (onInsert) {
      onInsert(field);
    }
  };

  return (
    <div className="p-4 border rounded-md bg-background">
      <div className="flex items-center space-x-2 mb-3">
        <Database className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-medium">{t("Available Dynamic Content Fields")}</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        {t("Click on any field to insert it as a variable in your template. Use with double curly braces like {{fieldName}}.")}
      </p>
      
      <Accordion type="multiple" className="w-full">
        {Object.entries(submissionFields).map(([category, fields]) => (
          <AccordionItem key={category} value={category}>
            <AccordionTrigger className="hover:bg-muted/50 px-3 rounded-md">
              {t(category)}
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 gap-2 p-2">
                {Object.entries(fields).map(([field, description]) => (
                  <TooltipProvider key={field}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="justify-start text-left font-mono h-auto py-2"
                          onClick={() => handleInsertField(field)}
                        >
                          <Badge variant="outline" className="mr-2 bg-primary/10">
                            {field}
                          </Badge>
                          <span className="text-xs truncate">{t(description)}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-md">
                        <div className="space-y-2">
                          <p className="font-medium">{field}</p>
                          <p className="text-xs">{t(description)}</p>
                          <p className="text-xs font-mono bg-muted p-1 rounded">{"{{" + field + "}}"}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

interface EmailTemplateEditorProps {
  templateId?: number;
  onSaved?: () => void;
}

export function EmailTemplateEditor({ templateId, onSaved }: EmailTemplateEditorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch template data if editing
  const { 
    data: template, 
    isLoading: isLoadingTemplate, 
    error: templateError 
  } = useQuery({
    queryKey: ['/api/email-templates', templateId],
    queryFn: templateId ? async () => {
      const response = await fetch(`/api/email-templates/${templateId}`);
      if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch template');
      }
      return response.json();
    } : () => Promise.resolve(null),
    enabled: !!templateId,
  });

  // Form definition
  const form = useForm<EmailTemplateFormValues>({
    resolver: zodResolver(emailTemplateFormSchema),
    defaultValues: {
      name: "",
      subject: "",
      body: "",
      description: "",
      isDefault: false,
      language: "en",
      variables: "",
      templateType: "standard",
      sendgridTemplateId: "",
    },
  });

  // Update form with template data when available
  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        subject: template.subject,
        body: template.body,
        description: template.description || "",
        isDefault: Boolean(template.isDefault),
        language: template.language || "en",
        variables: template.variables || "",
        templateType: template.templateType || "standard",
        sendgridTemplateId: template.sendgridTemplateId || "",
      });

      // Parse variables into preview data
      if (template.variables) {
        try {
          const vars = JSON.parse(template.variables);
          const previewData: Record<string, string> = {};
          Object.keys(vars).forEach(key => {
            previewData[key] = `[${key}]`;
          });
          setPreviewVars(previewData);
        } catch (e) {
          console.error("Failed to parse template variables", e);
        }
      }
    }
  }, [template, form]);

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: EmailTemplateFormValues) => {
      const response = await apiRequest("POST", "/api/email-templates", data);
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("Template created successfully"),
        description: t("Your email template has been saved"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      if (onSaved) onSaved();
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: t("Error creating template"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EmailTemplateFormValues) => {
      const response = await apiRequest("PATCH", `/api/email-templates/${templateId}`, data);
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("Template updated successfully"),
        description: t("Your changes have been saved"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      if (onSaved) onSaved();
    },
    onError: (error: Error) => {
      toast({
        title: t("Error updating template"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/email-templates/${templateId}`);
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("Template deleted"),
        description: t("The email template has been removed"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      if (onSaved) onSaved();
      setDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: t("Error deleting template"),
        description: error.message,
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
    },
  });

  const onSubmit = async (values: EmailTemplateFormValues) => {
    // Format variables as JSON if provided
    if (values.variables) {
      try {
        // Check if it's already JSON
        if (!values.variables.startsWith("{")) {
          // Convert simple name:description format to JSON
          const lines = values.variables.split("\n");
          const jsonObj: Record<string, string> = {};
          
          lines.forEach(line => {
            const parts = line.split(":");
            if (parts.length === 2) {
              const key = parts[0].trim();
              const value = parts[1].trim();
              if (key) jsonObj[key] = value;
            }
          });
          
          values.variables = JSON.stringify(jsonObj);
        } else {
          // Make sure it's valid JSON
          JSON.parse(values.variables);
        }
      } catch (e) {
        toast({
          title: t("Invalid variables format"),
          description: t("Please provide variables in valid JSON format or as name:description pairs"),
          variant: "destructive",
        });
        return;
      }
    }

    if (templateId) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  // Preview template with variables replaced
  const previewTemplate = (template: string) => {
    let result = template;
    Object.entries(previewVars).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return result;
  };

  // Update variables preview
  useEffect(() => {
    const variablesStr = form.watch("variables");
    if (variablesStr) {
      try {
        let vars: Record<string, string>;
        if (variablesStr.startsWith("{")) {
          vars = JSON.parse(variablesStr);
        } else {
          vars = {};
          const lines = variablesStr.split("\n");
          lines.forEach(line => {
            const parts = line.split(":");
            if (parts.length === 2) {
              const key = parts[0].trim();
              vars[key] = `[${key}]`;
            }
          });
        }
        
        const preview: Record<string, string> = {};
        Object.keys(vars).forEach(key => {
          preview[key] = `[${key}]`;
        });
        setPreviewVars(preview);
      } catch (e) {
        // Ignore JSON parse errors while typing
      }
    }
  }, [form.watch("variables")]);

  if (isLoadingTemplate) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (templateId && templateError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {templateError instanceof Error ? templateError.message : "Failed to load template"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{templateId ? t("Edit Email Template") : t("Create Email Template")}</CardTitle>
        <CardDescription>
          {t("Create and manage email templates for sending reports to users")}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Template Name")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("Enter a name for this template")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Email Subject")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("Enter the email subject line")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Description")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("Optional template description")} {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Language")}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value || "en"}
                      value={field.value || "en"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("Select language")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between space-x-2 space-y-0 rounded-md border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>{t("Default Template")}</FormLabel>
                      <FormDescription>
                        {t("Use this as the default template for this language")}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value === true}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="templateType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Template Type")}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value || "standard"}
                      value={field.value || "standard"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("Select template type")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">
                          <div className="flex items-center">
                            <Mail className="mr-2 h-4 w-4" />
                            <span>Standard Email</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="dmarc-report">
                          <div className="flex items-center">
                            <Shield className="mr-2 h-4 w-4" />
                            <span>DMARC Report</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="security-alert">
                          <div className="flex items-center">
                            <AlertCircle className="mr-2 h-4 w-4" />
                            <span>Security Alert</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t("Select the purpose of this template")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="sendgridTemplateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("SendGrid Template ID")}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t("Enter SendGrid dynamic template ID (optional)")} 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("If using a SendGrid dynamic template, enter its ID here")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Email Body")}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t("Enter the email content. Use {{variableName}} for dynamic content.")} 
                      {...field} 
                      className="min-h-[200px] font-mono text-sm"
                    />
                  </FormControl>
                  <FormDescription>
                    {t("Use {{variableName}} to insert dynamic content from the submission data")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="variables"
                render={({ field }) => {
                  // Create a function to insert variables at cursor position or append
                  const insertVariable = (varName: string) => {
                    const textarea = document.querySelector('textarea[name="variables"]') as HTMLTextAreaElement;
                    if (textarea) {
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const currentValue = field.value || '';
                      
                      // Format the variable entry
                      const newVar = `${varName}: ${t("Dynamic field from submission data")}`;
                      
                      // Determine line ending (respect existing format)
                      const lineEnding = currentValue.includes('\r\n') ? '\r\n' : '\n';
                      
                      // Add a line break if not empty and last character is not already a line break
                      const prefix = currentValue && !currentValue.endsWith(lineEnding) ? lineEnding : '';
                      
                      // If values ends with colon and space, don't add a new line
                      const newValue = currentValue.trim().endsWith(':') 
                        ? `${currentValue} ${varName}`
                        : `${currentValue}${prefix}${newVar}`;
                      
                      // Update the field
                      field.onChange(newValue);
                      
                      // Focus the textarea and position cursor at the end of inserted text
                      setTimeout(() => {
                        textarea.focus();
                        const newPosition = newValue.length;
                        textarea.setSelectionRange(newPosition, newPosition);
                      }, 100);
                    }
                  };
                  
                  return (
                    <FormItem>
                      <FormLabel>{t("Template Variables")}</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={t("firstName: User's first name\nlastName: User's last name")} 
                          {...field} 
                          className="min-h-[180px] font-mono text-sm"
                        />
                      </FormControl>
                      <FormDescription className="flex items-center space-x-1">
                        <span>{t("Enter one variable per line in the format name:description, or as a JSON object")}</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                                <HelpCircle className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-2 text-xs">
                                <p>{t("Variables will be available in your email template via double curly braces.")}</p>
                                <p>{t("Example: {{firstName}} will be replaced with the actual first name from submission.")}</p>
                                <p className="font-mono bg-muted p-1 rounded-sm">firstName: User's first name</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              
              {/* Dynamic content helper */}
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <FormLabel>{t("Dynamic Content Helper")}</FormLabel>
                  <Badge variant="outline" className="font-normal text-xs">
                    {t("Click to Insert")}
                  </Badge>
                </div>
                <SubmissionDataHelper 
                  onInsert={(field: string) => {
                    // For body textarea
                    const bodyTextarea = document.querySelector('textarea[name="body"]') as HTMLTextAreaElement;
                    if (bodyTextarea) {
                      const start = bodyTextarea.selectionStart;
                      const end = bodyTextarea.selectionEnd;
                      const value = form.getValues("body");
                      
                      // Insert variable wrapped in double curly braces at cursor position
                      const newValue = value.substring(0, start) + 
                        `{{${field}}}` + 
                        value.substring(end);
                      
                      form.setValue("body", newValue, { shouldDirty: true });
                      
                      // Update the variables field also
                      const variableField = form.getValues("variables") || "";
                      if (!variableField.includes(field + ":")) {
                        const variables = document.querySelector('textarea[name="variables"]') as HTMLTextAreaElement;
                        // If variables contains valid JSON, try to update it
                        if (variableField.trim().startsWith('{') && variableField.trim().endsWith('}')) {
                          try {
                            const vars = JSON.parse(variableField);
                            if (!vars[field]) {
                              vars[field] = t("Dynamic field from submission data");
                              form.setValue("variables", JSON.stringify(vars, null, 2), { shouldDirty: true });
                            }
                          } catch (e) {
                            // If JSON is invalid, just append as text
                            const lineEnding = variableField.includes('\r\n') ? '\r\n' : '\n';
                            const prefix = variableField && !variableField.endsWith(lineEnding) ? lineEnding : '';
                            form.setValue("variables", `${variableField}${prefix}${field}: ${t("Dynamic field from submission data")}`, { shouldDirty: true });
                          }
                        } else {
                          // Append as text
                          const lineEnding = variableField.includes('\r\n') ? '\r\n' : '\n';
                          const prefix = variableField && !variableField.endsWith(lineEnding) ? lineEnding : '';
                          form.setValue("variables", `${variableField}${prefix}${field}: ${t("Dynamic field from submission data")}`, { shouldDirty: true });
                        }
                      }
                    }
                  }} 
                />
              </div>
            </div>
            
            <div className="border rounded-md p-4">
              <h3 className="font-medium mb-2">{t("Template Preview")}</h3>
              <div className="bg-muted p-3 rounded text-sm">
                <div className="font-semibold mb-1">{form.watch("subject")}</div>
                <div className="whitespace-pre-wrap">
                  {previewTemplate(form.watch("body"))}
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            {templateId ? (
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" type="button">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("Delete")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("Delete Template")}</DialogTitle>
                    <DialogDescription>
                      {t("Are you sure you want to delete this template? This action cannot be undone.")}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteDialogOpen(false)}
                    >
                      {t("Cancel")}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("Deleting...")}
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("Delete")}
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <div />
            )}
            
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("Saving...")}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {templateId ? t("Update") : t("Save")}
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

// Component to list available templates

export function EmailTemplatesList() {
  const { t } = useTranslation();
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch all templates
  const { 
    data: templates = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['/api/email-templates'],
    queryFn: async () => {
      const response = await fetch('/api/email-templates');
      if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch templates');
      }
      return response.json();
    },
  });

  const handleEditComplete = () => {
    setIsEditing(false);
    setSelectedTemplate(null);
  };

  const handleEditTemplate = (id: number) => {
    setSelectedTemplate(id);
    setIsEditing(true);
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load templates"}
        </AlertDescription>
      </Alert>
    );
  }

  if (isEditing) {
    return (
      <EmailTemplateEditor 
        templateId={selectedTemplate || undefined} 
        onSaved={handleEditComplete} 
      />
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("Email Templates")}</CardTitle>
          <CardDescription>
            {t("Manage your email templates for sending reports")}
          </CardDescription>
        </div>
        <Button onClick={handleCreateTemplate}>
          {t("Create Template")}
        </Button>
      </CardHeader>
      <CardContent>
        {templates && templates.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {templates.map((template: EmailTemplate) => (
                <Card key={template.id} className="overflow-hidden">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.isDefault && (
                          <span className="px-2 py-1 rounded-md bg-green-100 text-green-800 text-xs font-medium">
                            {t("Default")}
                          </span>
                        )}
                        <span className="px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium uppercase">
                          {template.language || "EN"}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTemplate(template.id)}
                      >
                        {t("Edit")}
                      </Button>
                    </div>
                    <CardDescription className="mt-1">
                      {template.description || t("No description provided")}
                    </CardDescription>
                  </CardHeader>
                  <div className="px-4 pb-4">
                    <div className="border rounded-md p-3 bg-muted">
                      <p className="font-medium mb-1">{template.subject}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {template.body.length > 100
                          ? `${template.body.substring(0, 100)}...`
                          : template.body}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-10">
            <h3 className="text-lg font-medium">{t("No templates yet")}</h3>
            <p className="text-muted-foreground mt-1">
              {t("Create your first email template to get started")}
            </p>
            <Button 
              onClick={handleCreateTemplate}
              className="mt-4"
            >
              {t("Create Template")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}