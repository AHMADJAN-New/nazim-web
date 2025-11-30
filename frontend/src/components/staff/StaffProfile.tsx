import { useState } from 'react';
import { useStaffMember, useStaffDocuments, useUploadStaffPicture, useUploadStaffDocument, useDeleteStaffDocument, type Staff } from '@/hooks/useStaff';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Upload, X, FileText, Image as ImageIcon, Download, Trash2, Camera, User, Mail, Phone, MapPin, Calendar, GraduationCap, Briefcase, FileCheck } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { LoadingSpinner } from '@/components/ui/loading';

interface StaffProfileProps {
  staffId: string;
  onClose?: () => void;
}

export function StaffProfile({ staffId, onClose }: StaffProfileProps) {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const { data: staff, isLoading } = useStaffMember(staffId);
  const { data: documents, isLoading: documentsLoading } = useStaffDocuments(staffId);
  const uploadPicture = useUploadStaffPicture();
  const uploadDocument = useUploadStaffDocument();
  const deleteDocument = useDeleteStaffDocument();

  const hasUpdatePermission = useHasPermission('staff.update');
  const hasDocumentPermission = useHasPermission('staff_documents.read');

  const [activeTab, setActiveTab] = useState('assignment');
  const [isUploadPictureDialogOpen, setIsUploadPictureDialogOpen] = useState(false);
  const [isUploadDocumentDialogOpen, setIsUploadDocumentDialogOpen] = useState(false);
  const [isDeleteDocumentDialogOpen, setIsDeleteDocumentDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <LoadingSpinner text="Loading staff profile..." />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">Staff member not found</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'on_leave':
        return 'outline';
      case 'terminated':
        return 'destructive';
      case 'suspended':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getPictureUrl = () => {
    if (!staff.picture_url) return null;
    const schoolPath = staff.school_id ? `${staff.school_id}/` : '';
    const path = `${staff.organization_id}/${schoolPath}${staff.id}/picture/${staff.picture_url}`;
    const { data } = supabase.storage.from('staff-files').getPublicUrl(path);
    return data.publicUrl;
  };

  const getDocumentUrl = (document: any) => {
    const { data } = supabase.storage.from('staff-files').getPublicUrl(document.file_path);
    return data.publicUrl;
  };

  const handleUploadPicture = async () => {
    if (!pictureFile || !staff) return;

    uploadPicture.mutate(
      {
        staffId: staff.id,
        organizationId: staff.organization_id,
        schoolId: staff.school_id,
        file: pictureFile,
      },
      {
        onSuccess: () => {
          setIsUploadPictureDialogOpen(false);
          setPictureFile(null);
        },
      }
    );
  };

  const handleUploadDocument = async () => {
    if (!documentFile || !staff || !documentType) return;

    uploadDocument.mutate(
      {
        staffId: staff.id,
        organizationId: staff.organization_id,
        schoolId: staff.school_id,
        file: documentFile,
        documentType,
        description: documentDescription || null,
      },
      {
        onSuccess: () => {
          setIsUploadDocumentDialogOpen(false);
          setDocumentFile(null);
          setDocumentType('');
          setDocumentDescription('');
        },
      }
    );
  };

  const handleDeleteDocument = () => {
    if (!selectedDocument) return;

    deleteDocument.mutate(selectedDocument, {
      onSuccess: () => {
        setIsDeleteDocumentDialogOpen(false);
        setSelectedDocument(null);
      },
    });
  };

  const pictureUrl = getPictureUrl();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Employee Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Employee Profile
            </CardTitle>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-sm">Photo path</Label>
                <div className="mt-2">
                  {pictureUrl ? (
                    <img src={pictureUrl} alt={staff.full_name} className="w-24 h-24 rounded-full object-cover" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  {hasUpdatePermission && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-2"
                      onClick={() => setIsUploadPictureDialogOpen(true)}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Upload Photo
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Employee ID</Label>
                <p className="font-medium text-primary">{staff.employee_id}</p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-sm">Full name</Label>
                <p className="font-medium text-primary">{staff.full_name}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={getStatusBadgeVariant(staff.status)}>
                  {staff.status.replace('_', ' ').toUpperCase()}
                </Badge>
                {staff.position && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {staff.position}
                  </Badge>
                )}
                {staff.staff_type && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    {staff.staff_type.name}
                  </Badge>
                )}
              </div>
              {staff.created_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-muted-foreground text-sm">Hire Date:</Label>
                  <span className="text-sm">{new Date(staff.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Employee Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            {/* Column 1: Personal Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Personal Information</h4>
              {staff.birth_date && (
                <div>
                  <Label className="text-muted-foreground text-xs">Date of Birth</Label>
                  <p className="text-sm font-medium">{new Date(staff.birth_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              )}
              {staff.tazkira_number && (
                <div>
                  <Label className="text-muted-foreground text-xs">Civil ID / Tazkira</Label>
                  <p className="text-sm font-medium">{staff.tazkira_number}</p>
                </div>
              )}
            </div>

            {/* Column 2: Location Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Location Information</h4>
              {staff.current_province && (
                <div>
                  <Label className="text-muted-foreground text-xs">Province</Label>
                  <p className="text-sm font-medium">{staff.current_province}</p>
                </div>
              )}
              {staff.current_district && (
                <div>
                  <Label className="text-muted-foreground text-xs">District</Label>
                  <p className="text-sm font-medium">{staff.current_district}</p>
                </div>
              )}
              {staff.current_village && (
                <div>
                  <Label className="text-muted-foreground text-xs">Village</Label>
                  <p className="text-sm font-medium">{staff.current_village}</p>
                </div>
              )}
            </div>

            {/* Column 3: Contact & Identification */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Contact & Identification</h4>
              {staff.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <div>
                    <Label className="text-muted-foreground text-xs">Email Address</Label>
                    <p className="text-sm font-medium text-primary">{staff.email}</p>
                  </div>
                </div>
              )}
              {staff.phone_number && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-green-600" />
                  <div>
                    <Label className="text-muted-foreground text-xs">Phone Number</Label>
                    <p className="text-sm font-medium text-green-600">{staff.phone_number}</p>
                  </div>
                </div>
              )}
              {staff.tazkira_number && (
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <Label className="text-muted-foreground text-xs">Civil ID / Tazkira</Label>
                    <p className="text-sm font-medium">{staff.tazkira_number}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b">
          <TabsList className="inline-flex h-auto p-0 bg-transparent">
            <TabsTrigger value="assignment" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Current Assignment & Contract
            </TabsTrigger>
            <TabsTrigger value="addresses" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Addresses
            </TabsTrigger>
            <TabsTrigger value="employment" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Employment History
            </TabsTrigger>
            <TabsTrigger value="education" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Education & Skills
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
              {documents && documents.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5">
                  {documents.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Records & Memberships
            </TabsTrigger>
            <TabsTrigger value="leave" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Leave Balance
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">First Name</Label>
                  <p className="font-medium">{staff.first_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Father Name</Label>
                  <p className="font-medium">{staff.father_name}</p>
                </div>
                {staff.grandfather_name && (
                  <div>
                    <Label className="text-muted-foreground">Grandfather Name</Label>
                    <p className="font-medium">{staff.grandfather_name}</p>
                  </div>
                )}
                {staff.tazkira_number && (
                  <div>
                    <Label className="text-muted-foreground">Tazkira Number</Label>
                    <p className="font-medium">{staff.tazkira_number}</p>
                  </div>
                )}
                {staff.birth_year && (
                  <div>
                    <Label className="text-muted-foreground">Birth Year</Label>
                    <p className="font-medium">{staff.birth_year}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {staff.email && (
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{staff.email}</p>
                  </div>
                )}
                {staff.phone_number && (
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{staff.phone_number}</p>
                  </div>
                )}
                {staff.home_address && (
                  <div>
                    <Label className="text-muted-foreground">Home Address</Label>
                    <p className="font-medium">{staff.home_address}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Origin Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {staff.origin_province && (
                  <div>
                    <Label className="text-muted-foreground">Province</Label>
                    <p className="font-medium">{staff.origin_province}</p>
                  </div>
                )}
                {staff.origin_district && (
                  <div>
                    <Label className="text-muted-foreground">District</Label>
                    <p className="font-medium">{staff.origin_district}</p>
                  </div>
                )}
                {staff.origin_village && (
                  <div>
                    <Label className="text-muted-foreground">Village</Label>
                    <p className="font-medium">{staff.origin_village}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {staff.current_province && (
                  <div>
                    <Label className="text-muted-foreground">Province</Label>
                    <p className="font-medium">{staff.current_province}</p>
                  </div>
                )}
                {staff.current_district && (
                  <div>
                    <Label className="text-muted-foreground">District</Label>
                    <p className="font-medium">{staff.current_district}</p>
                  </div>
                )}
                {staff.current_village && (
                  <div>
                    <Label className="text-muted-foreground">Village</Label>
                    <p className="font-medium">{staff.current_village}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {staff.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{staff.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Education Tab */}
        <TabsContent value="education" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Religious Education
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {staff.religious_education && (
                  <div>
                    <Label className="text-muted-foreground">Education Level</Label>
                    <p className="font-medium">{staff.religious_education}</p>
                  </div>
                )}
                {staff.religious_university && (
                  <div>
                    <Label className="text-muted-foreground">University/School</Label>
                    <p className="font-medium">{staff.religious_university}</p>
                  </div>
                )}
                {staff.religious_graduation_year && (
                  <div>
                    <Label className="text-muted-foreground">Graduation Year</Label>
                    <p className="font-medium">{staff.religious_graduation_year}</p>
                  </div>
                )}
                {staff.religious_department && (
                  <div>
                    <Label className="text-muted-foreground">Department</Label>
                    <p className="font-medium">{staff.religious_department}</p>
                  </div>
                )}
                {!staff.religious_education && !staff.religious_university && (
                  <p className="text-muted-foreground text-sm">No religious education information available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Modern Education
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {staff.modern_education && (
                  <div>
                    <Label className="text-muted-foreground">Education Level</Label>
                    <p className="font-medium">{staff.modern_education}</p>
                  </div>
                )}
                {staff.modern_school_university && (
                  <div>
                    <Label className="text-muted-foreground">University/School</Label>
                    <p className="font-medium">{staff.modern_school_university}</p>
                  </div>
                )}
                {staff.modern_graduation_year && (
                  <div>
                    <Label className="text-muted-foreground">Graduation Year</Label>
                    <p className="font-medium">{staff.modern_graduation_year}</p>
                  </div>
                )}
                {staff.modern_department && (
                  <div>
                    <Label className="text-muted-foreground">Department</Label>
                    <p className="font-medium">{staff.modern_department}</p>
                  </div>
                )}
                {!staff.modern_education && !staff.modern_school_university && (
                  <p className="text-muted-foreground text-sm">No modern education information available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Employment Tab */}
        <TabsContent value="employment" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Position & Duties
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {staff.position && (
                  <div>
                    <Label className="text-muted-foreground">Position</Label>
                    <p className="font-medium">{staff.position}</p>
                  </div>
                )}
                {staff.duty && (
                  <div>
                    <Label className="text-muted-foreground">Duty</Label>
                    <p className="font-medium">{staff.duty}</p>
                  </div>
                )}
                {staff.teaching_section && (
                  <div>
                    <Label className="text-muted-foreground">Teaching Section</Label>
                    <p className="font-medium">{staff.teaching_section}</p>
                  </div>
                )}
                {staff.salary && (
                  <div>
                    <Label className="text-muted-foreground">Salary</Label>
                    <p className="font-medium">{staff.salary}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Employment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">Employee ID</Label>
                  <p className="font-medium">{staff.employee_id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge variant={getStatusBadgeVariant(staff.status)} className="mt-1">
                    {staff.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                {staff.created_at && (
                  <div>
                    <Label className="text-muted-foreground">Created At</Label>
                    <p className="font-medium">{new Date(staff.created_at).toLocaleDateString()}</p>
                  </div>
                )}
                {staff.updated_at && (
                  <div>
                    <Label className="text-muted-foreground">Last Updated</Label>
                    <p className="font-medium">{new Date(staff.updated_at).toLocaleDateString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle>Documents</CardTitle>
            {hasDocumentPermission && (
              <Button onClick={() => setIsUploadDocumentDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            )}
          </div>

          {documentsLoading ? (
            <Card>
              <CardContent className="p-6">
                <LoadingSpinner text="Loading documents..." />
              </CardContent>
            </Card>
          ) : documents && documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => {
                const docUrl = getDocumentUrl(doc);
                const isImage = doc.mime_type?.startsWith('image/');

                return (
                  <Card key={doc.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          {isImage ? (
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          ) : (
                            <FileText className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.file_name}</p>
                          <p className="text-sm text-muted-foreground">{doc.document_type}</p>
                          {doc.description && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">{doc.description}</p>
                          )}
                          {doc.file_size && (
                            <p className="text-xs text-muted-foreground">
                              {(doc.file_size / 1024).toFixed(2)} KB
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(docUrl, '_blank')}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        {hasDocumentPermission && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedDocument(doc.id);
                              setIsDeleteDocumentDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <FileCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No documents uploaded yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Picture Dialog */}
      <Dialog open={isUploadPictureDialogOpen} onOpenChange={setIsUploadPictureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Profile Picture</DialogTitle>
            <DialogDescription>
              Select an image file to upload as the profile picture
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="picture">Picture</Label>
              <Input
                id="picture"
                type="file"
                accept="image/*"
                onChange={(e) => setPictureFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadPictureDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUploadPicture}
              disabled={!pictureFile || uploadPicture.isPending}
            >
              {uploadPicture.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog open={isUploadDocumentDialogOpen} onOpenChange={setIsUploadDocumentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a document for this staff member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="document">Document</Label>
              <Input
                id="document"
                type="file"
                onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <Label htmlFor="documentType">Document Type *</Label>
              <Input
                id="documentType"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                placeholder="e.g., ID Card, Certificate, Contract"
              />
            </div>
            <div>
              <Label htmlFor="documentDescription">Description (Optional)</Label>
              <Textarea
                id="documentDescription"
                value={documentDescription}
                onChange={(e) => setDocumentDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDocumentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUploadDocument}
              disabled={!documentFile || !documentType || uploadDocument.isPending}
            >
              {uploadDocument.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Document Dialog */}
      <AlertDialog open={isDeleteDocumentDialogOpen} onOpenChange={setIsDeleteDocumentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

