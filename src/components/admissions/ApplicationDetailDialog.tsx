import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AdmissionApplication } from "@/hooks/useAdmissions";
import { Calendar, Mail, Phone, User, MapPin, School, FileText } from "lucide-react";

interface ApplicationDetailDialogProps {
  application: AdmissionApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApplicationDetailDialog({ application, open, onOpenChange }: ApplicationDetailDialogProps) {
  if (!application) return null;

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-500/10 text-yellow-500",
      approved: "bg-green-500/10 text-green-500",
      rejected: "bg-red-500/10 text-red-500",
      interview: "bg-blue-500/10 text-blue-500",
      waitlist: "bg-orange-500/10 text-orange-500",
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Application Details</DialogTitle>
          <DialogDescription>
            Application ID: {application.application_id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Badge className={`${getStatusColor(application.status)} px-4 py-2 text-sm font-medium`}>
              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
            </Badge>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Applied: {new Date(application.applied_date).toLocaleDateString()}
            </div>
          </div>

          <Separator />

          {/* Student Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5" />
              Student Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Student Name</p>
                <p className="font-medium">{application.student_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="font-medium">
                  {application.date_of_birth 
                    ? new Date(application.date_of_birth).toLocaleDateString()
                    : "Not provided"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Father's Name</p>
                <p className="font-medium">{application.father_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mother's Name</p>
                <p className="font-medium">{application.mother_name || "Not provided"}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{application.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{application.email || "Not provided"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 md:col-span-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{application.address || "Not provided"}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Academic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <School className="w-5 h-5" />
              Academic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Class Applying For</p>
                <p className="font-medium">{application.class_applying_for}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Previous School</p>
                <p className="font-medium">{application.previous_school || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Admission Fee</p>
                <p className="font-medium">
                  {application.admission_fee 
                    ? `PKR ${application.admission_fee.toLocaleString()}`
                    : "Not specified"}
                </p>
              </div>
              {application.interview_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Interview Date</p>
                  <p className="font-medium">
                    {new Date(application.interview_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          {application.documents_submitted && Array.isArray(application.documents_submitted) && application.documents_submitted.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documents Submitted
                </h3>
                <div className="space-y-2">
                  {application.documents_submitted.map((doc: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <span className="flex-1 font-medium">{doc.name || `Document ${index + 1}`}</span>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Remarks */}
          {application.remarks && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Remarks</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">{application.remarks}</p>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button variant="default">
              Edit Application
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
