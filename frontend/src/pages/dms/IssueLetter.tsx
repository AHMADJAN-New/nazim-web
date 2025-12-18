import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { dmsApi } from "@/lib/api/client";
import type { LetterTemplate, TemplateVariable } from "@/types/dms";
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
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";

type TemplatePreviewResponse = {
  html?: string | null;
};

type IssuePayload = {
  subject: string;
  issue_date: string;
  recipient_type: string;
  recipient_id: string;
  external_recipient_name: string;
  external_recipient_org: string;
  recipient_address: string;
  security_level_key: string;
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
};

export default function IssueLetter() {
  const { t } = useLanguage();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [template, setTemplate] = useState<LetterTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [payload, setPayload] = useState<IssuePayload>({
    subject: "",
    issue_date: new Date().toISOString().slice(0, 10),
    recipient_type: "external",
    recipient_id: "",
    external_recipient_name: "",
    external_recipient_org: "",
    recipient_address: "",
    security_level_key: "public",
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

  const previewVariables = useMemo(() => {
    return {
      ...variables,
      subject: payload.subject,
      issue_date: payload.issue_date,
      document_number: "AUTO",
      recipient_name: payload.external_recipient_name,
      recipient_organization: payload.external_recipient_org,
      recipient_address: payload.recipient_address,
    };
  }, [
    variables,
    payload.subject,
    payload.issue_date,
    payload.external_recipient_name,
    payload.external_recipient_org,
    payload.recipient_address,
  ]);

  const previewMutation = useMutation({
    mutationFn: async (): Promise<TemplatePreviewResponse> => {
      if (!templateDetails?.id) return { html: "" };
      return (await dmsApi.templates.preview(templateDetails.id, previewVariables)) as TemplatePreviewResponse;
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

    const tmr = window.setTimeout(() => previewMutation.mutate(), 250);
    return () => window.clearTimeout(tmr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateDetails?.id, previewVariables]);

  const issueMutation = useMutation<unknown, unknown, IssueRequestPayload>({
    mutationFn: (data) => dmsApi.outgoing.create({ ...data, status: "issued" }),
    onSuccess: () => {
      showToast.success(t("toast.letterIssued") || "Letter issued successfully");
      setSelectedTemplateId("");
      setTemplate(null);
      setVariables({});
      setPreviewHtml("");
      setPreviewError(null);
      setPayload({
        subject: "",
        issue_date: new Date().toISOString().slice(0, 10),
        recipient_type: "external",
        recipient_id: "",
        external_recipient_name: "",
        external_recipient_org: "",
        recipient_address: "",
        security_level_key: "public",
      });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : t("toast.letterIssueFailed") || "Failed to issue letter";
      showToast.error(message);
    },
  });

  const handleIssue = () => {
    if (!template?.id) return;

    issueMutation.mutate({
      template_id: template.id,
      template_variables: variables,
      subject: payload.subject,
      issue_date: payload.issue_date,
      recipient_type: payload.recipient_type,
      recipient_id: payload.recipient_id || null,
      external_recipient_name: payload.external_recipient_name || null,
      external_recipient_org: payload.external_recipient_org || null,
      recipient_address: payload.recipient_address || null,
      security_level_key: payload.security_level_key,
    });
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
                    onValueChange={(value) => setPayload((s) => ({ ...s, recipient_type: value }))}
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

                {payload.recipient_type !== "external" ? (
                  <div className="space-y-2">
                    <Label>Recipient ID (optional)</Label>
                    <Input
                      value={payload.recipient_id}
                      onChange={(e) => setPayload((s) => ({ ...s, recipient_id: e.target.value }))}
                      placeholder="UUID of recipient (student/staff/applicant)"
                    />
                  </div>
                ) : (
                  <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                    <Label>External Recipient</Label>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-sm">Name</Label>
                        <Input
                          value={payload.external_recipient_name}
                          onChange={(e) => setPayload((s) => ({ ...s, external_recipient_name: e.target.value }))}
                          placeholder="Recipient name"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm">Organization</Label>
                        <Input
                          value={payload.external_recipient_org}
                          onChange={(e) => setPayload((s) => ({ ...s, external_recipient_org: e.target.value }))}
                          placeholder="Organization"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Address</Label>
                      <Input
                        value={payload.recipient_address}
                        onChange={(e) => setPayload((s) => ({ ...s, recipient_address: e.target.value }))}
                        placeholder="Recipient address"
                      />
                    </div>
                  </div>
                )}

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
                  disabled={!payload.subject || !payload.issue_date || issueMutation.isPending}
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
    </div>
  );
}
