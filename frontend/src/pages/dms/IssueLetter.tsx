import { useEffect, useMemo, useState } from "react";
import { formatDate, formatDateTime } from '@/lib/utils';
import { useMutation, useQuery } from "@tanstack/react-query";
import { dmsApi } from "@/lib/api/client";
import type { LetterTemplate, TemplateVariable, OutgoingDocument } from "@/types/dms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/useLanguage";
import { showToast } from "@/lib/toast";
import { SecurityBadge } from "@/components/dms/SecurityBadge";
import { DocumentNumberBadge } from "@/components/dms/DocumentNumberBadge";
import { AlertCircle, Loader2, RefreshCw, Printer } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { useClassAcademicYears } from "@/hooks/useClasses";
import { useStudentAdmissions } from "@/hooks/useStudentAdmissions";
import { useStaff } from "@/hooks/useStaff";
import { useAuth } from "@/hooks/useAuth";
import { IssuedLettersTable } from "@/components/dms/IssuedLettersTable";
import { LetterDetailsPanel } from "@/components/dms/LetterDetailsPanel";
import { ImageFileUploader } from "@/components/dms/ImageFileUploader";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, X, File as FileIcon } from "lucide-react";

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
  // New fields for student selection
  academic_year_id?: string;
  class_academic_year_id?: string;
  student_admission_id?: string;
  // New field for staff selection
  staff_id?: string;
  // New field for applicant selection
  applicant_id?: string;
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
  const { profile } = useAuth();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [template, setTemplate] = useState<LetterTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  // State for issued letters tab
  const [selectedLetter, setSelectedLetter] = useState<OutgoingDocument | null>(null);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  
  // State for attachments and draft
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [draftLetterId, setDraftLetterId] = useState<string | null>(null);
  const [isDraftMode, setIsDraftMode] = useState(false);

  const [payload, setPayload] = useState<IssuePayload>({
    subject: "",
    issue_date: new Date().toISOString().slice(0, 10),
    recipient_type: "external",
    recipient_id: "",
    external_recipient_name: "",
    external_recipient_org: "",
    recipient_address: "",
    security_level_key: "public",
    academic_year_id: "",
    class_academic_year_id: "",
    student_admission_id: "",
    staff_id: "",
    applicant_id: "",
  });

  // Fetch templates
  const { data: templates } = useQuery<LetterTemplate[]>({
    queryKey: ["dms", "templates"],
    queryFn: () => dmsApi.templates.list({ active: true }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch template details
  const { data: templateDetails } = useQuery<LetterTemplate>({
    queryKey: ["dms", "templates", selectedTemplateId],
    queryFn: () => dmsApi.templates.get(selectedTemplateId),
    enabled: !!selectedTemplateId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch academic years
  const { data: academicYears = [] } = useAcademicYears();

  // Fetch classes for selected academic year
  const { data: classAcademicYears = [] } = useClassAcademicYears(
    payload.academic_year_id || undefined
  );

  // Fetch student admissions for selected academic year and class
  const { data: studentAdmissions = [] } = useStudentAdmissions(profile?.organization_id, false);

  // Filter student admissions by academic year and class
  const filteredStudentAdmissions = useMemo(() => {
    if (!payload.academic_year_id) return [];
    if (!payload.class_academic_year_id) return [];

    return studentAdmissions.filter((admission) => {
      const matchesAcademicYear = admission.academicYearId === payload.academic_year_id;
      const matchesClass = admission.classAcademicYearId === payload.class_academic_year_id;
      return matchesAcademicYear && matchesClass;
    });
  }, [studentAdmissions, payload.academic_year_id, payload.class_academic_year_id]);

  // Fetch all student admissions for applicant selection (pending admissions)
  const applicantAdmissions = useMemo(() => {
    return studentAdmissions.filter(
      (admission) => admission.enrollmentStatus === "pending" || admission.enrollmentStatus === "admitted"
    );
  }, [studentAdmissions]);

  // Fetch staff
  const { data: staff = [] } = useStaff(profile?.organization_id, false);

  // Get selected student admission
  const selectedStudentAdmission = useMemo(() => {
    if (!payload.student_admission_id) return null;
    return filteredStudentAdmissions.find((a) => a.id === payload.student_admission_id);
  }, [filteredStudentAdmissions, payload.student_admission_id]);

  // Get selected staff
  const selectedStaff = useMemo(() => {
    if (!payload.staff_id) return null;
    return staff.find((s) => s.id === payload.staff_id);
  }, [staff, payload.staff_id]);

  // Get selected applicant
  const selectedApplicant = useMemo(() => {
    if (!payload.applicant_id) return null;
    return applicantAdmissions.find((a) => a.id === payload.applicant_id);
  }, [applicantAdmissions, payload.applicant_id]);

  // Initialize template and auto-select recipient type based on category
  useEffect(() => {
    if (!templateDetails) return;

    setTemplate(templateDetails);
    setPayload((prev) => {
      // Auto-select recipient type based on template category
      let recipientType = prev.recipient_type;
      if (templateDetails.category === "student") {
        recipientType = "student";
      } else if (templateDetails.category === "staff") {
        recipientType = "staff";
      } else if (templateDetails.category === "applicant") {
        recipientType = "applicant";
      } else if (templateDetails.category === "general") {
        recipientType = "external";
      }

      return {
        ...prev,
        subject: templateDetails.name || prev.subject,
        security_level_key: templateDetails.default_security_level_key || prev.security_level_key,
        recipient_type: recipientType,
        // Reset recipient selections when type changes
        recipient_id: "",
        academic_year_id: "",
        class_academic_year_id: "",
        student_admission_id: "",
        staff_id: "",
        applicant_id: "",
      };
    });

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

  // Reset student selection when academic year or class changes
  useEffect(() => {
    if (payload.recipient_type === "student") {
      if (!payload.academic_year_id) {
        setPayload((prev) => ({
          ...prev,
          class_academic_year_id: "",
          student_admission_id: "",
          recipient_id: "",
        }));
      } else if (!payload.class_academic_year_id) {
        setPayload((prev) => ({
          ...prev,
          student_admission_id: "",
          recipient_id: "",
        }));
      }
    }
  }, [payload.academic_year_id, payload.class_academic_year_id, payload.recipient_type]);

  // Update recipient_id when student admission is selected
  useEffect(() => {
    if (payload.recipient_type === "student" && payload.student_admission_id && selectedStudentAdmission) {
      setPayload((prev) => ({
        ...prev,
        recipient_id: selectedStudentAdmission.studentId || "",
      }));
    }
  }, [payload.student_admission_id, payload.recipient_type, selectedStudentAdmission]);

  // Update recipient_id when staff is selected
  useEffect(() => {
    if (payload.recipient_type === "staff" && payload.staff_id) {
      setPayload((prev) => ({
        ...prev,
        recipient_id: payload.staff_id || "",
      }));
    }
  }, [payload.staff_id, payload.recipient_type]);

  // Update recipient_id when applicant is selected
  useEffect(() => {
    if (payload.recipient_type === "applicant" && payload.applicant_id && selectedApplicant) {
      setPayload((prev) => ({
        ...prev,
        recipient_id: selectedApplicant.studentId || "",
      }));
    }
  }, [payload.applicant_id, payload.recipient_type, selectedApplicant]);

  // Build preview variables with recipient data
  const previewVariables = useMemo(() => {
    const baseVars = {
      ...variables,
      subject: payload.subject,
      issue_date: payload.issue_date,
      document_number: "AUTO",
    };

    // Add recipient-specific data
    if (payload.recipient_type === "student" && selectedStudentAdmission) {
      return {
        ...baseVars,
        recipient_name: selectedStudentAdmission.student?.fullName || "",
        student_name: selectedStudentAdmission.student?.fullName || "",
        student_id: selectedStudentAdmission.studentId || "",
        admission_number: selectedStudentAdmission.student?.admissionNumber || "",
        father_name: selectedStudentAdmission.student?.fatherName || "",
        class_name: selectedStudentAdmission.class?.name || "",
        academic_year: selectedStudentAdmission.academicYear?.name || "",
      };
    }

    if (payload.recipient_type === "staff" && selectedStaff) {
      return {
        ...baseVars,
        recipient_name: selectedStaff.fullName || "",
        staff_name: selectedStaff.fullName || "",
        staff_id: selectedStaff.id || "",
        staff_code: selectedStaff.code || "",
        position: selectedStaff.position || "",
        department: selectedStaff.department || "",
        phone: selectedStaff.phone || "",
        email: selectedStaff.email || "",
      };
    }

    if (payload.recipient_type === "applicant" && selectedApplicant) {
      return {
        ...baseVars,
        recipient_name: selectedApplicant.student?.fullName || "",
        applicant_name: selectedApplicant.student?.fullName || "",
        applicant_id: selectedApplicant.id || "",
        father_name: selectedApplicant.student?.fatherName || "",
        application_number: selectedApplicant.student?.admissionNumber || "",
      };
    }

    // External recipient
    return {
      ...baseVars,
      recipient_name: payload.external_recipient_name,
      recipient_organization: payload.external_recipient_org,
      recipient_address: payload.recipient_address,
    };
  }, [
    variables,
    payload.subject,
    payload.issue_date,
    payload.recipient_type,
    payload.external_recipient_name,
    payload.external_recipient_org,
    payload.recipient_address,
    selectedStudentAdmission,
    selectedStaff,
    selectedApplicant,
  ]);

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async (): Promise<TemplatePreviewResponse> => {
      if (!templateDetails?.id) return { html: "" };
      setIsPreviewLoading(true);
      try {
        // Pass recipient_id and recipient_type so backend can use actual data instead of mock data
        const response = await dmsApi.templates.preview(
          templateDetails.id,
          previewVariables,
          {
            recipient_type: payload.recipient_type,
            recipient_id: payload.recipient_id || undefined,
          }
        );
        return response as TemplatePreviewResponse;
      } finally {
        setIsPreviewLoading(false);
      }
    },
    onSuccess: (data) => {
      setPreviewError(null);
      setPreviewHtml(data?.html || "");
      if (import.meta.env.DEV) {
        console.log("[IssueLetter] Preview generated successfully, HTML length:", data?.html?.length || 0);
        // Check if HTML contains letterhead background
        const hasLetterhead = data?.html?.includes('letterhead-background') || data?.html?.includes('letterhead-header');
        const hasBackgroundImage = data?.html?.includes('background-image');
        const hasDataUrl = data?.html?.includes('data:image') || data?.html?.includes('data:application/pdf');
        console.log("[IssueLetter] Preview HTML analysis:", {
          hasLetterhead,
          hasBackgroundImage,
          hasDataUrl,
          htmlPreview: data?.html?.substring(0, 500) + "...",
        });
      }
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to generate preview";
      setPreviewError(message);
      setPreviewHtml("");
      if (import.meta.env.DEV) {
        console.error("[IssueLetter] Preview error:", err);
      }
    },
  });

  // Auto-generate preview when template or variables change
  useEffect(() => {
    if (!templateDetails?.id) {
      setPreviewHtml("");
      setPreviewError(null);
      return;
    }

    // Only auto-preview if we have required data
    if (payload.recipient_type === "student" && !payload.student_admission_id) {
      return;
    }
    if (payload.recipient_type === "staff" && !payload.staff_id) {
      return;
    }
    if (payload.recipient_type === "applicant" && !payload.applicant_id) {
      return;
    }

    const tmr = window.setTimeout(() => {
      previewMutation.mutate();
    }, 500);
    return () => window.clearTimeout(tmr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateDetails?.id, previewVariables, payload.recipient_type, payload.student_admission_id, payload.staff_id, payload.applicant_id]);

  // Create draft mutation
  const createDraftMutation = useMutation<unknown, unknown, IssueRequestPayload>({
    mutationFn: async (data) => {
      // If draft exists, update it; otherwise create new draft
      if (draftLetterId) {
        return await dmsApi.outgoing.update(draftLetterId, { ...data, status: "draft" });
      } else {
        return await dmsApi.outgoing.create({ ...data, status: "draft" });
      }
    },
    onSuccess: (response: any) => {
      const letterId = response?.id || (response as any)?.data?.id || (response as any)?.document?.id;
      
      if (letterId) {
        setDraftLetterId(letterId);
        setIsDraftMode(true);
        setIsUploadDialogOpen(true);
        showToast.success(t("dms.issueLetter.draftCreated") || "Draft created. You can now upload attachments.");
      } else {
        showToast.error(t("dms.issueLetter.draftCreateFailed") || "Failed to create draft");
      }
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : t("dms.issueLetter.draftCreateFailed") || "Failed to create draft";
      showToast.error(message);
    },
  });

  // Issue mutation - updates draft to issued or creates new
  const issueMutation = useMutation<unknown, unknown, IssueRequestPayload>({
    mutationFn: async (data) => {
      // If draft exists, update it to issued; otherwise create new
      if (draftLetterId) {
        return await dmsApi.outgoing.update(draftLetterId, { ...data, status: "issued" });
      } else {
        return await dmsApi.outgoing.create({ ...data, status: "issued" });
      }
    },
    onSuccess: (response: any) => {
      const letterId = response?.id || (response as any)?.data?.id || (response as any)?.document?.id;
      
      if (letterId) {
        setDraftLetterId(letterId);
        setIsDraftMode(false);
        showToast.success(t("toast.letterIssued") || "Letter issued successfully");
        resetForm();
      } else {
        showToast.success(t("toast.letterIssued") || "Letter issued successfully");
        resetForm();
      }
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : t("toast.letterIssueFailed") || "Failed to issue letter";
      showToast.error(message);
    },
  });

  const resetForm = () => {
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
      academic_year_id: "",
      class_academic_year_id: "",
      student_admission_id: "",
      staff_id: "",
      applicant_id: "",
    });
    setDraftLetterId(null);
    setIsDraftMode(false);
  };

  const handleUploadDialogClose = (open: boolean) => {
    setIsUploadDialogOpen(open);
    // Don't reset form when closing upload dialog - user might want to issue the letter
  };

  const handleCreateDraft = () => {
    if (!template?.id) {
      showToast.error(t("dms.issueLetter.selectTemplateFirst") || "Please select a template first");
      return;
    }

    if (!payload.subject || !payload.issue_date) {
      showToast.error(t("dms.issueLetter.fillRequiredFields") || "Please fill in all required fields");
      return;
    }

    createDraftMutation.mutate({
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

  // Prepare combobox options
  const academicYearOptions = academicYears.map((ay) => ({
    value: ay.id,
    label: ay.name,
  }));

  const classOptions = classAcademicYears.map((cay) => ({
    value: cay.id,
    label: `${cay.class?.name || "Unknown Class"}${cay.sectionName ? ` - ${cay.sectionName}` : ""}`,
  }));

  const studentAdmissionOptions = filteredStudentAdmissions.map((admission) => ({
    value: admission.id,
    label: `${admission.student?.fullName || "Unknown"} (${admission.student?.admissionNumber || "N/A"})`,
  }));

  const staffOptions = staff.map((s) => ({
    value: s.id,
    label: s.fullName || "Unknown Staff",
  }));

  const applicantOptions = applicantAdmissions.map((admission) => ({
    value: admission.id,
    label: `${admission.student?.fullName || "Unknown"} (${admission.student?.admissionNumber || "N/A"})`,
  }));

  const handleRowClick = (letter: OutgoingDocument) => {
    setSelectedLetter(letter);
    setIsDetailsPanelOpen(true);
  };

  const handlePrintPreview = async () => {
    if (!templateDetails?.id) {
      showToast.error(t("dms.issueLetter.selectTemplateFirst") || "Please select a template first");
      return;
    }

    try {
      // Show loading state
      showToast.info(t("dms.issueLetter.generatingPdf") || "Generating PDF...");
      
      // Generate PDF from preview data
      const blob = await dmsApi.templates.previewPdf(
        templateDetails.id,
        previewVariables,
        {
          recipient_type: payload.recipient_type,
          recipient_id: payload.recipient_id || undefined,
        }
      );
      
      const url = window.URL.createObjectURL(blob);
      
      // Create a hidden iframe in the current page for printing
      // This keeps the print dialog in the same tab
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-1';
      iframe.src = url;
      
      // Store iframe reference for cleanup
      let iframeRef: HTMLIFrameElement | null = iframe;
      let urlRef: string = url;
      
      document.body.appendChild(iframe);
      
      // Cleanup function
      const cleanup = () => {
        if (iframeRef && iframeRef.parentNode) {
          document.body.removeChild(iframeRef);
        }
        window.URL.revokeObjectURL(urlRef);
        iframeRef = null;
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      
      // Handle after print event - only clean up when user closes print dialog
      const handleAfterPrint = () => {
        // Wait a bit before cleaning up to ensure print dialog is fully closed
        setTimeout(cleanup, 1000);
      };
      
      window.addEventListener('afterprint', handleAfterPrint);
      
      // Wait for PDF to load, then trigger print
      iframe.onload = () => {
        // Give PDF more time to fully render (especially for letterheads with images)
        setTimeout(() => {
          try {
            if (iframe.contentWindow && iframeRef) {
              iframe.contentWindow.focus();
              // Trigger print - dialog will stay open until user closes it
              iframe.contentWindow.print();
            }
          } catch (error) {
            if (import.meta.env.DEV) {
              console.error("[IssueLetter] Print error:", error);
            }
            // Fallback: open PDF in new window
            window.open(urlRef, '_blank');
            cleanup();
          }
        }, 2000); // Increased delay to ensure PDF and letterhead images are fully loaded
      };
      
      // Fallback: if onload doesn't fire, try after 5 seconds
      setTimeout(() => {
        if (iframeRef && document.body.contains(iframeRef)) {
          try {
            if (iframeRef.contentWindow) {
              iframeRef.contentWindow.focus();
              iframeRef.contentWindow.print();
            }
          } catch (error) {
            window.open(urlRef, '_blank');
            cleanup();
          }
        }
      }, 5000);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("[IssueLetter] Failed to generate PDF for print:", error);
      }
      showToast.error(error.message || t("dms.issueLetter.printFailed") || "Failed to generate PDF for printing");
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <Tabs defaultValue="issue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="issue">
            {t("dms.issueLetter.tabs.issue") || "Issue Letter"}
          </TabsTrigger>
          <TabsTrigger value="issued-letters">
            {t("dms.issueLetter.tabs.allIssued") || "All Issued Letters"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="issue" className="space-y-6">
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
                        recipient_id: "",
                        academic_year_id: "",
                        class_academic_year_id: "",
                        student_admission_id: "",
                        staff_id: "",
                        applicant_id: "",
                        external_recipient_name: "",
                        external_recipient_org: "",
                        recipient_address: "",
                      }));
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

                {/* Student Selection */}
                {payload.recipient_type === "student" && (
                  <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                    <Label className="text-base font-semibold">Student Selection</Label>
                    
                    <div className="space-y-2">
                      <Label>Academic Year <span className="text-destructive">*</span></Label>
                      <Combobox
                        options={academicYearOptions}
                        value={payload.academic_year_id || ""}
                        onValueChange={(value) => {
                          setPayload((s) => ({
                            ...s,
                            academic_year_id: value,
                            class_academic_year_id: "",
                            student_admission_id: "",
                            recipient_id: "",
                          }));
                        }}
                        placeholder="Select academic year"
                        searchPlaceholder="Search academic years..."
                        emptyText="No academic years found"
                      />
                    </div>

                    {payload.academic_year_id && (
                      <div className="space-y-2">
                        <Label>Class <span className="text-destructive">*</span></Label>
                        <Combobox
                          options={classOptions}
                          value={payload.class_academic_year_id || ""}
                          onValueChange={(value) => {
                            setPayload((s) => ({
                              ...s,
                              class_academic_year_id: value,
                              student_admission_id: "",
                              recipient_id: "",
                            }));
                          }}
                          placeholder="Select class"
                          searchPlaceholder="Search classes..."
                          emptyText="No classes found"
                          disabled={!payload.academic_year_id || classOptions.length === 0}
                        />
                      </div>
                    )}

                    {payload.class_academic_year_id && (
                      <div className="space-y-2">
                        <Label>Student <span className="text-destructive">*</span></Label>
                        <Combobox
                          options={studentAdmissionOptions}
                          value={payload.student_admission_id || ""}
                          onValueChange={(value) => {
                            setPayload((s) => ({
                              ...s,
                              student_admission_id: value,
                            }));
                          }}
                          placeholder="Select student"
                          searchPlaceholder="Search students..."
                          emptyText="No students found in this class"
                          disabled={!payload.class_academic_year_id || studentAdmissionOptions.length === 0}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Staff Selection */}
                {payload.recipient_type === "staff" && (
                  <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                    <Label className="text-base font-semibold">Staff Selection</Label>
                    <Combobox
                      options={staffOptions}
                      value={payload.staff_id || ""}
                      onValueChange={(value) => {
                        setPayload((s) => ({
                          ...s,
                          staff_id: value,
                        }));
                      }}
                      placeholder="Select staff member"
                      searchPlaceholder="Search staff..."
                      emptyText="No staff found"
                    />
                  </div>
                )}

                {/* Applicant Selection */}
                {payload.recipient_type === "applicant" && (
                  <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                    <Label className="text-base font-semibold">Applicant Selection</Label>
                    <Combobox
                      options={applicantOptions}
                      value={payload.applicant_id || ""}
                      onValueChange={(value) => {
                        setPayload((s) => ({
                          ...s,
                          applicant_id: value,
                        }));
                      }}
                      placeholder="Select applicant"
                      searchPlaceholder="Search applicants..."
                      emptyText="No applicants found"
                    />
                  </div>
                )}

                {/* External Recipient */}
                {payload.recipient_type === "external" && (
                  <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                    <Label className="text-base font-semibold">External Recipient</Label>
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
                  <CalendarDatePicker date={payload.issue_date ? new Date(payload.issue_date) : undefined} onDateChange={(date) => setPayload(date ? date.toISOString().split("T")[0] : "")} />
                </div>

                {/* Template Variables - Individual Fields with Better UX */}
                {templateVariables.length > 0 && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <div>
                      <Label className="text-base font-semibold">Template Variables</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Fill in the template variables. These will be used to populate the letter.
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {templateVariables.map((varDef) => (
                        <div key={varDef.name} className="space-y-2">
                          <Label htmlFor={`var-${varDef.name}`}>
                            {varDef.label || varDef.name}
                            {varDef.required && <span className="text-destructive ml-1">*</span>}
                          </Label>
                          <Input
                            id={`var-${varDef.name}`}
                            value={variables[varDef.name] || ""}
                            onChange={(e) => setVariables((prev) => ({ ...prev, [varDef.name]: e.target.value }))}
                            placeholder={varDef.default || `Enter ${varDef.label || varDef.name}`}
                            type={varDef.type === "date" ? "date" : varDef.type === "number" ? "number" : "text"}
                            className="w-full"
                          />
                          {varDef.description && (
                            <p className="text-xs text-muted-foreground">{varDef.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={
                        !payload.subject ||
                        !payload.issue_date ||
                        createDraftMutation.isPending ||
                        (payload.recipient_type === "student" && !payload.student_admission_id) ||
                        (payload.recipient_type === "staff" && !payload.staff_id) ||
                        (payload.recipient_type === "applicant" && !payload.applicant_id)
                      }
                      onClick={handleCreateDraft}
                      className="flex-1"
                    >
                      {createDraftMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t("dms.issueLetter.creatingDraft") || "Creating..."}
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          {t("dms.issueLetter.uploadAttachments") || "Upload Attachments"}
                        </>
                      )}
                    </Button>
                    <Button
                      disabled={
                        !payload.subject ||
                        !payload.issue_date ||
                        issueMutation.isPending ||
                        (payload.recipient_type === "student" && !payload.student_admission_id) ||
                        (payload.recipient_type === "staff" && !payload.staff_id) ||
                        (payload.recipient_type === "applicant" && !payload.applicant_id)
                      }
                      onClick={handleIssue}
                      className="flex-1"
                    >
                      {issueMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t("dms.issueLetter.issuing") || "Issuing..."}
                        </>
                      ) : (
                        t("dms.issueLetter.issueButton") || "Issue Letter"
                      )}
                    </Button>
                  </div>
                  
                  {isDraftMode && draftLetterId && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        {t("dms.issueLetter.draftModeActive") || "Draft mode: You can upload attachments. Click 'Issue Letter' when ready."}
                      </p>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground text-center">
                    {t("dms.issueLetter.attachmentsNote") || "Create a draft to upload attachments before issuing, or issue directly"}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Live Preview</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => previewMutation.mutate()}
                  disabled={!templateDetails?.id || previewMutation.isPending || isPreviewLoading}
                >
                  {previewMutation.isPending || isPreviewLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                {previewHtml && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePrintPreview}
                    disabled={!previewHtml}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    {t("dms.issueLetter.print") || "Print"}
                  </Button>
                )}
              </div>
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

            {(previewMutation.isPending || isPreviewLoading) && (
              <div className="border rounded-lg bg-muted/50 p-8 text-center min-h-[300px] flex items-center justify-center">
                <div className="space-y-2">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Generating preview...</p>
                </div>
              </div>
            )}

            {!previewMutation.isPending && !isPreviewLoading && previewHtml ? (
              <div className="border rounded-lg bg-white overflow-hidden">
                <iframe
                  srcDoc={previewHtml}
                  className="w-full border-0"
                  style={{ minHeight: "800px" }}
                  title="Outgoing Template Preview"
                />
              </div>
            ) : !previewMutation.isPending && !isPreviewLoading && !previewHtml ? (
              <div className="rounded-md border bg-muted/50 p-6 text-sm text-muted-foreground min-h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <p>Select a template and recipient to see a live preview.</p>
                  {payload.recipient_type === "student" && !payload.student_admission_id && (
                    <p className="text-xs mt-2">Please select a student to generate preview.</p>
                  )}
                  {payload.recipient_type === "staff" && !payload.staff_id && (
                    <p className="text-xs mt-2">Please select a staff member to generate preview.</p>
                  )}
                  {payload.recipient_type === "applicant" && !payload.applicant_id && (
                    <p className="text-xs mt-2">Please select an applicant to generate preview.</p>
                  )}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="issued-letters" className="space-y-6">
          <IssuedLettersTable onRowClick={handleRowClick} />
        </TabsContent>
      </Tabs>

      {/* Letter Details Side Panel */}
      <LetterDetailsPanel
        letter={selectedLetter}
        open={isDetailsPanelOpen}
        onOpenChange={setIsDetailsPanelOpen}
      />

      {/* Upload Attachments Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={handleUploadDialogClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("dms.issueLetter.uploadAttachments") || "Upload Attachments"}</DialogTitle>
            <DialogDescription>
              {t("dms.issueLetter.uploadAttachmentsDescription") || "Upload attachments or files for this letter. Images will be automatically compressed."}
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
                      {formatDate(issuedDocument.issue_date)}
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
