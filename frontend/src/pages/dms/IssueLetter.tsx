import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { dmsApi } from "@/lib/api/client";
import type { LetterTemplate, TemplateVariable, OutgoingDocument } from "@/types/dms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/hooks/useLanguage";
import { showToast } from "@/lib/toast";
import { SecurityBadge } from "@/components/dms/SecurityBadge";
import { DocumentNumberBadge } from "@/components/dms/DocumentNumberBadge";
import { AlertCircle, Loader2, RefreshCw, Download, CheckCircle2 } from "lucide-react";
import { RecipientSelector } from "@/components/dms/RecipientSelector";
import { useProfile } from "@/hooks/useProfiles";
import type { Student } from "@/types/domain/student";
import type { Staff } from "@/types/domain/staff";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type TemplatePreviewResponse = {
  html?: string | null;
};

type IssuePayload = {
  subject: string;
  issue_date: string;
  recipient_type: string;
  recipient_id: string | null;
  external_recipient_name: string;
  external_recipient_org: string;
  recipient_address: string;
  security_level_key: string;
  academic_year_id?: string | null;
  school_id?: string | null;
};

type IssueRequestPayload = {
  template_id: string;
  template_variables: Record<string, string>;
  subject: string;
  issue_date: string;
  recipient_type: string;
  recipient_id: string | null;
  external_recipient_name: string | null;
  external_recipient_org: string | null;
  recipient_address: string | null;
  security_level_key: string;
  academic_year_id?: string | null;
  school_id?: string | null;
};

export default function IssueLetter() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [template, setTemplate] = useState<LetterTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<Student | Staff | null>(null);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [issuedDocument, setIssuedDocument] = useState<OutgoingDocument | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const [payload, setPayload] = useState<IssuePayload>({
    subject: "",
    issue_date: new Date().toISOString().slice(0, 10),
    recipient_type: "external",
    recipient_id: null,
    external_recipient_name: "",
    external_recipient_org: "",
    recipient_address: "",
    security_level_key: "public",
    academic_year_id: null,
    school_id: null,
  });

  const { data: templates } = useQuery<LetterTemplate[]>({
    queryKey: ["dms", "templates"],
    queryFn: () => dmsApi.templates.list({ active: true }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: templateDetails } = useQuery<LetterTemplate>({
    queryKey: ["dms", "templates", selectedTemplateId],
    queryFn: () => dmsApi.templates.get(selectedTemplateId),
    enabled: !!selectedTemplateId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!templateDetails) return;

    setTemplate(templateDetails);
    setPayload((prev) => ({
      ...prev,
      subject: templateDetails.name || prev.subject,
      security_level_key: templateDetails.default_security_level_key || prev.security_level_key,
      // Set recipient_type based on template category if it matches
      recipient_type: templateDetails.category === 'student' ? 'student' 
        : templateDetails.category === 'staff' ? 'staff'
        : templateDetails.category === 'applicant' ? 'applicant'
        : prev.recipient_type,
    }));

    const initialVars: Record<string, string> = {};
    if (templateDetails.variables && Array.isArray(templateDetails.variables)) {
      templateDetails.variables.forEach((varDef: TemplateVariable) => {
        initialVars[varDef.name] = varDef.default || "";
      });
    }
    setVariables(initialVars);

    setPreviewHtml("");
    setPreviewError(null);
  }, [templateDetails]);

  // Update school_id from selected recipient
  useEffect(() => {
    if (selectedRecipient) {
      const schoolId = 'schoolId' in selectedRecipient ? selectedRecipient.schoolId : null;
      setPayload((prev) => ({
        ...prev,
        school_id: schoolId || prev.school_id,
      }));
    }
  }, [selectedRecipient]);

  const previewMutation = useMutation({
    mutationFn: async (): Promise<TemplatePreviewResponse> => {
      if (!templateDetails?.id) return { html: "" };
      
      // Build preview variables with actual recipient data if available
      const previewVars = {
        ...variables,
        subject: payload.subject,
        issue_date: payload.issue_date,
        document_number: "AUTO",
        recipient_name: payload.external_recipient_name || (selectedRecipient && 'fullName' in selectedRecipient ? selectedRecipient.fullName : ''),
        recipient_organization: payload.external_recipient_org || '',
        recipient_address: payload.recipient_address || '',
      };

      // Pass recipient_id and school_id to preview endpoint for actual data
      return (await dmsApi.templates.preview(
        templateDetails.id,
        previewVars,
        {
          recipient_type: payload.recipient_type,
          recipient_id: payload.recipient_id || undefined,
          school_id: payload.school_id || undefined,
          table_payload: undefined,
        }
      )) as TemplatePreviewResponse;
    },
    onSuccess: (data) => {
      setPreviewError(null);
      setPreviewHtml(data?.html || "");
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to generate preview";
      setPreviewError(message);
      setPreviewHtml("");
    },
  });

  useEffect(() => {
    if (!templateDetails?.id) {
      setPreviewHtml("");
      setPreviewError(null);
      return;
    }

    const tmr = window.setTimeout(() => previewMutation.mutate(), 500);
    return () => window.clearTimeout(tmr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateDetails?.id, payload, variables, selectedRecipient]);

  const issueMutation = useMutation<OutgoingDocument, unknown, IssueRequestPayload>({
    mutationFn: async (data) => {
      const result = await dmsApi.outgoing.create({ ...data, status: "issued" });
      return result as OutgoingDocument;
    },
    onSuccess: async (doc) => {
      setIssuedDocument(doc);
      setShowSuccessDialog(true);
      showToast.success(t("toast.letterIssued") || "Letter issued successfully");
      
      // Reset form
      setSelectedTemplateId("");
      setTemplate(null);
      setVariables({});
      setPreviewHtml("");
      setPreviewError(null);
      setSelectedRecipient(null);
      setSelectedAcademicYearId(null);
      setSelectedClassId(null);
      setPayload({
        subject: "",
        issue_date: new Date().toISOString().slice(0, 10),
        recipient_type: "external",
        recipient_id: null,
        external_recipient_name: "",
        external_recipient_org: "",
        recipient_address: "",
        security_level_key: "public",
        academic_year_id: null,
        school_id: null,
      });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : t("toast.letterIssueFailed") || "Failed to issue letter";
      showToast.error(message);
    },
  });

  const downloadPdfMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { blob, filename } = await dmsApi.outgoing.downloadPdf(docId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `outgoing-document-${docId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      showToast.success(t("toast.pdfDownloaded") || "PDF downloaded successfully");
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to download PDF";
      showToast.error(message);
    },
  });

  const handleIssue = () => {
    if (!template?.id) return;

    // Validate required fields based on recipient type
    if (payload.recipient_type === 'student' && !payload.recipient_id) {
      showToast.error("Please select a student");
      return;
    }
    if (payload.recipient_type === 'staff' && !payload.recipient_id) {
      showToast.error("Please select a staff member");
      return;
    }
    if (payload.recipient_type === 'external' && !payload.external_recipient_name) {
      showToast.error("Please enter recipient name");
      return;
    }

    issueMutation.mutate({
      template_id: template.id,
      template_variables: variables,
      subject: payload.subject,
      issue_date: payload.issue_date,
      recipient_type: payload.recipient_type,
      recipient_id: payload.recipient_id,
      external_recipient_name: payload.recipient_type === 'external' ? payload.external_recipient_name : null,
      external_recipient_org: payload.recipient_type === 'external' ? payload.external_recipient_org : null,
      recipient_address: payload.recipient_type === 'external' ? payload.recipient_address : null,
      security_level_key: payload.security_level_key,
      academic_year_id: payload.academic_year_id || null,
      school_id: payload.school_id || null,
    });
  };

  const handleDownloadPdf = () => {
    if (issuedDocument?.id) {
      downloadPdfMutation.mutate(issuedDocument.id);
    }
  };

  const handleRecipientChange = (recipientId: string | null, recipientData?: any) => {
    setPayload((prev) => ({
      ...prev,
      recipient_id: recipientId,
    }));
    if (recipientData) {
      setSelectedRecipient(recipientData);
    } else {
      setSelectedRecipient(null);
    }
  };

  const handleExternalRecipientChange = (field: 'name' | 'org' | 'address', value: string) => {
    setPayload((prev) => ({
      ...prev,
      external_recipient_name: field === 'name' ? value : prev.external_recipient_name,
      external_recipient_org: field === 'org' ? value : prev.external_recipient_org,
      recipient_address: field === 'address' ? value : prev.recipient_address,
    }));
  };

  const templateVariables = (template?.variables as TemplateVariable[]) || [];

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Issue from Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>
                Template <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose template" />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.name}
                      {tpl.letter_type && ` (${tpl.letter_type})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {template && (
              <>
                <div className="space-y-2">
                  <Label>
                    Subject <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={payload.subject}
                    onChange={(e) => setPayload((s) => ({ ...s, subject: e.target.value }))}
                    placeholder="Letter subject"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Recipient Type</Label>
                  <Select
                    value={payload.recipient_type}
                    onValueChange={(value) => {
                      setPayload((s) => ({ 
                        ...s, 
                        recipient_type: value,
                        recipient_id: null,
                        external_recipient_name: '',
                        external_recipient_org: '',
                        recipient_address: '',
                      }));
                      setSelectedRecipient(null);
                      setSelectedAcademicYearId(null);
                      setSelectedClassId(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="applicant">Applicant</SelectItem>
                      <SelectItem value="external">External</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Recipient Selector */}
                <RecipientSelector
                  recipientType={payload.recipient_type as 'student' | 'staff' | 'external' | 'applicant'}
                  selectedRecipientId={payload.recipient_id}
                  onRecipientChange={handleRecipientChange}
                  selectedAcademicYearId={selectedAcademicYearId}
                  onAcademicYearChange={(id) => {
                    setSelectedAcademicYearId(id);
                    setPayload((prev) => ({ ...prev, academic_year_id: id }));
                  }}
                  selectedClassId={selectedClassId}
                  onClassChange={setSelectedClassId}
                  externalRecipientName={payload.external_recipient_name}
                  externalRecipientOrg={payload.external_recipient_org}
                  externalRecipientAddress={payload.recipient_address}
                  onExternalRecipientChange={handleExternalRecipientChange}
                  required={payload.recipient_type !== 'external'}
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>
                      Issue Date <span className="text-destructive">*</span>
                    </Label>
                    <SecurityBadge level={payload.security_level_key} />
                  </div>
                  <Input
                    type="date"
                    value={payload.issue_date}
                    onChange={(e) => setPayload((s) => ({ ...s, issue_date: e.target.value }))}
                  />
                </div>

                {templateVariables.length > 0 && (
                  <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                    <Label>Template Variables</Label>
                    {templateVariables.map((varDef) => (
                      <div key={varDef.name} className="space-y-1">
                        <Label htmlFor={`var-${varDef.name}`} className="text-sm">
                          {varDef.label || varDef.name}
                          {varDef.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        <Input
                          id={`var-${varDef.name}`}
                          value={variables[varDef.name] || ""}
                          onChange={(e) => setVariables((prev) => ({ ...prev, [varDef.name]: e.target.value }))}
                          placeholder={varDef.default || `Enter ${varDef.label || varDef.name}`}
                          type={varDef.type === "date" ? "date" : varDef.type === "number" ? "number" : "text"}
                        />
                        {varDef.description && <p className="text-xs text-muted-foreground">{varDef.description}</p>}
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  disabled={
                    !payload.subject || 
                    !payload.issue_date || 
                    issueMutation.isPending ||
                    (payload.recipient_type === 'student' && !payload.recipient_id) ||
                    (payload.recipient_type === 'staff' && !payload.recipient_id) ||
                    (payload.recipient_type === 'external' && !payload.external_recipient_name)
                  }
                  onClick={handleIssue}
                  className="w-full"
                >
                  {issueMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Issuing...
                    </>
                  ) : (
                    "Issue Letter"
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Live Preview</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => previewMutation.mutate()}
                disabled={!templateDetails?.id || previewMutation.isPending}
              >
                {previewMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{payload.subject || "Letter subject"}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <DocumentNumberBadge value="AUTO" type="outgoing" />
                <SecurityBadge level={payload.security_level_key} />
              </div>
            </div>

            {previewError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{previewError}</AlertDescription>
              </Alert>
            )}

            {previewHtml ? (
              <div className="border rounded-lg bg-white overflow-hidden">
                <iframe
                  srcDoc={previewHtml}
                  className="w-full border-0"
                  style={{ minHeight: "800px" }}
                  title="Outgoing Template Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            ) : (
              <div className="rounded-md border bg-muted/50 p-6 text-sm text-muted-foreground min-h-[300px]">
                Select a template to see a live preview.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Success Dialog with PDF Download */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Letter Issued Successfully
            </DialogTitle>
            <DialogDescription>
              The letter has been issued and saved to the outgoing documents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {issuedDocument && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Document Number:</span>
                  <DocumentNumberBadge value={issuedDocument.full_outdoc_number || 'N/A'} type="outgoing" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Subject:</span>
                  <span className="text-sm text-muted-foreground">{issuedDocument.subject}</span>
                </div>
                {issuedDocument.issue_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Issue Date:</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(issuedDocument.issue_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleDownloadPdf}
                disabled={!issuedDocument?.id || downloadPdfMutation.isPending}
                className="flex-1"
              >
                {downloadPdfMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSuccessDialog(false);
                  setIssuedDocument(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
