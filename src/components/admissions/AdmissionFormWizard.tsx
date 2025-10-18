import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useClasses } from "@/hooks/useClasses";
import { useCreateStudent } from "@/hooks/useStudents";
import { ChevronLeft, ChevronRight, Check, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDropzone } from "react-dropzone";

const personalInfoSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50),
  fatherName: z.string().min(2, "Father's name is required").max(100),
  motherName: z.string().min(2, "Mother's name is required").max(100),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female"], { required_error: "Please select gender" }),
  bloodGroup: z.string().optional(),
  religion: z.string().min(2, "Religion is required"),
  nationality: z.string().min(2, "Nationality is required").default("Pakistani"),
  caste: z.string().optional(),
});

const contactInfoSchema = z.object({
  phone: z.string().regex(/^(\+92|0)?[0-9]{10}$/, "Invalid phone number").optional(),
  email: z.string().email("Invalid email address").optional(),
  address: z.string().min(10, "Address must be at least 10 characters"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State/Province is required"),
  postalCode: z.string().min(4, "Postal code is required"),
});

const guardianInfoSchema = z.object({
  guardianName: z.string().min(2, "Guardian name is required"),
  guardianRelation: z.string().min(2, "Relationship is required"),
  guardianPhone: z.string().regex(/^(\+92|0)?[0-9]{10}$/, "Invalid phone number"),
  guardianEmail: z.string().email("Invalid email").optional(),
  guardianOccupation: z.string().min(2, "Occupation is required"),
  guardianIncome: z.string().optional(),
});

const academicInfoSchema = z.object({
  classId: z.string().min(1, "Please select a class"),
  previousSchool: z.string().optional(),
  previousClass: z.string().optional(),
  tcNumber: z.string().optional(),
});

type PersonalInfo = z.infer<typeof personalInfoSchema>;
type ContactInfo = z.infer<typeof contactInfoSchema>;
type GuardianInfo = z.infer<typeof guardianInfoSchema>;
type AcademicInfo = z.infer<typeof academicInfoSchema>;

interface AdmissionFormWizardProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AdmissionFormWizard({ onSuccess, onCancel }: AdmissionFormWizardProps) {
  const [step, setStep] = useState(1);
  const [documents, setDocuments] = useState<File[]>([]);
  const { toast } = useToast();
  const { data: classes = [] } = useClasses();
  const createStudent = useCreateStudent();

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const {
    register: registerPersonal,
    handleSubmit: handleSubmitPersonal,
    formState: { errors: errorsPersonal },
    watch: watchPersonal,
  } = useForm<PersonalInfo>({
    resolver: zodResolver(personalInfoSchema),
  });

  const {
    register: registerContact,
    handleSubmit: handleSubmitContact,
    formState: { errors: errorsContact },
    watch: watchContact,
  } = useForm<ContactInfo>({
    resolver: zodResolver(contactInfoSchema),
  });

  const {
    register: registerGuardian,
    handleSubmit: handleSubmitGuardian,
    formState: { errors: errorsGuardian },
    watch: watchGuardian,
  } = useForm<GuardianInfo>({
    resolver: zodResolver(guardianInfoSchema),
  });

  const {
    register: registerAcademic,
    handleSubmit: handleSubmitAcademic,
    formState: { errors: errorsAcademic },
    setValue: setAcademicValue,
    watch: watchAcademic,
  } = useForm<AcademicInfo>({
    resolver: zodResolver(academicInfoSchema),
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 5242880, // 5MB
    onDrop: (acceptedFiles) => {
      setDocuments((prev) => [...prev, ...acceptedFiles]);
      toast({
        title: "Files uploaded",
        description: `${acceptedFiles.length} file(s) added successfully`,
      });
    },
    onDropRejected: (rejections) => {
      toast({
        title: "Upload failed",
        description: rejections[0]?.errors[0]?.message || "Invalid file",
        variant: "destructive",
      });
    },
  });

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmitStep1 = (data: PersonalInfo) => {
    setStep(2);
  };

  const onSubmitStep2 = (data: ContactInfo) => {
    setStep(3);
  };

  const onSubmitStep3 = (data: GuardianInfo) => {
    setStep(4);
  };

  const onSubmitFinal = async (academicData: AcademicInfo) => {
    // Combine all form data
    const personalData = watchPersonal();
    
    const fullName = `${personalData.firstName} ${personalData.lastName}`;
    const email = watchContact().email || `${personalData.firstName.toLowerCase()}.${personalData.lastName.toLowerCase()}@school.edu`;
    
    createStudent.mutate(
      {
        email,
        full_name: fullName,
        student_id: `STU${Date.now()}`,
        admission_date: new Date().toISOString().split('T')[0],
        class_id: academicData.classId,
        guardian_name: watchGuardian().guardianName,
        guardian_phone: watchGuardian().guardianPhone,
        branch_id: 'branch-1',
      },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: "Student admission application submitted successfully",
          });
          onSuccess?.();
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: error.message || "Failed to submit application",
            variant: "destructive",
          });
        },
      }
    );
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <Progress value={progress} className="h-2 mb-4" />
      <div className="flex justify-between text-sm">
        {["Personal Info", "Contact Info", "Guardian Info", "Academic Info"].map((label, idx) => (
          <div
            key={label}
            className={`flex items-center gap-2 ${
              step === idx + 1 ? "text-primary font-semibold" : step > idx + 1 ? "text-muted-foreground" : "text-muted-foreground/50"
            }`}
          >
            {step > idx + 1 ? (
              <Check className="w-4 h-4 text-primary" />
            ) : (
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step === idx + 1 ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                {idx + 1}
              </span>
            )}
            <span className="hidden sm:inline">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Admission Application</CardTitle>
        <CardDescription>
          Complete all steps to submit your admission application
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderStepIndicator()}

        {/* Step 1: Personal Information */}
        {step === 1 && (
          <form onSubmit={handleSubmitPersonal(onSubmitStep1)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  {...registerPersonal("firstName")}
                  placeholder="Enter first name"
                />
                {errorsPersonal.firstName && (
                  <p className="text-sm text-destructive">{errorsPersonal.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  {...registerPersonal("lastName")}
                  placeholder="Enter last name"
                />
                {errorsPersonal.lastName && (
                  <p className="text-sm text-destructive">{errorsPersonal.lastName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fatherName">Father's Name *</Label>
                <Input
                  id="fatherName"
                  {...registerPersonal("fatherName")}
                  placeholder="Enter father's name"
                />
                {errorsPersonal.fatherName && (
                  <p className="text-sm text-destructive">{errorsPersonal.fatherName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="motherName">Mother's Name *</Label>
                <Input
                  id="motherName"
                  {...registerPersonal("motherName")}
                  placeholder="Enter mother's name"
                />
                {errorsPersonal.motherName && (
                  <p className="text-sm text-destructive">{errorsPersonal.motherName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  {...registerPersonal("dateOfBirth")}
                />
                {errorsPersonal.dateOfBirth && (
                  <p className="text-sm text-destructive">{errorsPersonal.dateOfBirth.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select onValueChange={(value) => registerPersonal("gender").onChange({ target: { value } })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                {errorsPersonal.gender && (
                  <p className="text-sm text-destructive">{errorsPersonal.gender.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="religion">Religion *</Label>
                <Input
                  id="religion"
                  {...registerPersonal("religion")}
                  placeholder="Enter religion"
                  defaultValue="Islam"
                />
                {errorsPersonal.religion && (
                  <p className="text-sm text-destructive">{errorsPersonal.religion.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality *</Label>
                <Input
                  id="nationality"
                  {...registerPersonal("nationality")}
                  placeholder="Enter nationality"
                  defaultValue="Pakistani"
                />
                {errorsPersonal.nationality && (
                  <p className="text-sm text-destructive">{errorsPersonal.nationality.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bloodGroup">Blood Group</Label>
                <Select onValueChange={(value) => registerPersonal("bloodGroup").onChange({ target: { value } })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="caste">Caste/Category</Label>
                <Input
                  id="caste"
                  {...registerPersonal("caste")}
                  placeholder="Enter caste/category"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: Contact Information */}
        {step === 2 && (
          <form onSubmit={handleSubmitContact(onSubmitStep2)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  {...registerContact("phone")}
                  placeholder="+92-300-0000000"
                />
                {errorsContact.phone && (
                  <p className="text-sm text-destructive">{errorsContact.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  {...registerContact("email")}
                  placeholder="student@example.com"
                />
                {errorsContact.email && (
                  <p className="text-sm text-destructive">{errorsContact.email.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Complete Address *</Label>
                <Textarea
                  id="address"
                  {...registerContact("address")}
                  placeholder="Street address, house number"
                  rows={3}
                />
                {errorsContact.address && (
                  <p className="text-sm text-destructive">{errorsContact.address.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  {...registerContact("city")}
                  placeholder="Enter city"
                />
                {errorsContact.city && (
                  <p className="text-sm text-destructive">{errorsContact.city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State/Province *</Label>
                <Input
                  id="state"
                  {...registerContact("state")}
                  placeholder="Enter state"
                />
                {errorsContact.state && (
                  <p className="text-sm text-destructive">{errorsContact.state.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code *</Label>
                <Input
                  id="postalCode"
                  {...registerContact("postalCode")}
                  placeholder="Enter postal code"
                />
                {errorsContact.postalCode && (
                  <p className="text-sm text-destructive">{errorsContact.postalCode.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Previous
              </Button>
              <Button type="submit">
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        )}

        {/* Step 3: Guardian Information */}
        {step === 3 && (
          <form onSubmit={handleSubmitGuardian(onSubmitStep3)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guardianName">Guardian Name *</Label>
                <Input
                  id="guardianName"
                  {...registerGuardian("guardianName")}
                  placeholder="Enter guardian name"
                />
                {errorsGuardian.guardianName && (
                  <p className="text-sm text-destructive">{errorsGuardian.guardianName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="guardianRelation">Relationship *</Label>
                <Select onValueChange={(value) => registerGuardian("guardianRelation").onChange({ target: { value } })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="father">Father</SelectItem>
                    <SelectItem value="mother">Mother</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="uncle">Uncle</SelectItem>
                    <SelectItem value="aunt">Aunt</SelectItem>
                    <SelectItem value="grandfather">Grandfather</SelectItem>
                    <SelectItem value="grandmother">Grandmother</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errorsGuardian.guardianRelation && (
                  <p className="text-sm text-destructive">{errorsGuardian.guardianRelation.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="guardianPhone">Guardian Phone *</Label>
                <Input
                  id="guardianPhone"
                  {...registerGuardian("guardianPhone")}
                  placeholder="+92-300-0000000"
                />
                {errorsGuardian.guardianPhone && (
                  <p className="text-sm text-destructive">{errorsGuardian.guardianPhone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="guardianEmail">Guardian Email</Label>
                <Input
                  id="guardianEmail"
                  type="email"
                  {...registerGuardian("guardianEmail")}
                  placeholder="guardian@example.com"
                />
                {errorsGuardian.guardianEmail && (
                  <p className="text-sm text-destructive">{errorsGuardian.guardianEmail.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="guardianOccupation">Occupation *</Label>
                <Input
                  id="guardianOccupation"
                  {...registerGuardian("guardianOccupation")}
                  placeholder="Enter occupation"
                />
                {errorsGuardian.guardianOccupation && (
                  <p className="text-sm text-destructive">{errorsGuardian.guardianOccupation.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="guardianIncome">Annual Income (Optional)</Label>
                <Input
                  id="guardianIncome"
                  {...registerGuardian("guardianIncome")}
                  placeholder="Enter annual income"
                />
              </div>
            </div>

            <div className="flex justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Previous
              </Button>
              <Button type="submit">
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        )}

        {/* Step 4: Academic Information & Documents */}
        {step === 4 && (
          <form onSubmit={handleSubmitAcademic(onSubmitFinal)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="classId">Class Applying For *</Label>
                <Select onValueChange={(value) => setAcademicValue("classId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errorsAcademic.classId && (
                  <p className="text-sm text-destructive">{errorsAcademic.classId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="previousSchool">Previous School</Label>
                <Input
                  id="previousSchool"
                  {...registerAcademic("previousSchool")}
                  placeholder="Enter previous school name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="previousClass">Previous Class</Label>
                <Input
                  id="previousClass"
                  {...registerAcademic("previousClass")}
                  placeholder="Enter previous class"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tcNumber">Transfer Certificate Number</Label>
                <Input
                  id="tcNumber"
                  {...registerAcademic("tcNumber")}
                  placeholder="Enter TC number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Upload Documents</Label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">
                  {isDragActive ? "Drop files here..." : "Drag & drop files here, or click to select"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Supported: Images (PNG, JPG) and PDF up to 5MB
                </p>
              </div>

              {documents.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label>Uploaded Files ({documents.length})</Label>
                  {documents.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-background rounded flex items-center justify-center">
                          📄
                        </div>
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(3)}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Previous
              </Button>
              <Button type="submit" disabled={createStudent.isPending}>
                {createStudent.isPending ? "Submitting..." : "Submit Application"}
                <Check className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
