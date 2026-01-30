import { useEffect, useState } from 'react';
import { CheckCircle2, Eye, Plus, Save, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { Badge } from '@/components/ui/badge';
import { showToast } from '@/lib/toast';
import { formatDate } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useWebsiteOnlineAdmissions,
  useWebsiteOnlineAdmission,
  useUpdateWebsiteOnlineAdmission,
  useAcceptWebsiteOnlineAdmission,
  useWebsiteAdmissionFields,
  useCreateWebsiteAdmissionField,
  useUpdateWebsiteAdmissionField,
  useDeleteWebsiteAdmissionField,
} from '@/website/hooks/useWebsiteAdmissions';
import type { OnlineAdmission, OnlineAdmissionField, OnlineAdmissionFieldType } from '@/types/domain/onlineAdmission';

const STATUS_OPTIONS = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
];

const FIELD_TYPES: { value: OnlineAdmissionFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'phone', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'date', label: 'Date' },
  { value: 'toggle', label: 'Toggle' },
  { value: 'email', label: 'Email' },
  { value: 'id_number', label: 'ID Number' },
  { value: 'address', label: 'Address' },
  { value: 'photo', label: 'Photo' },
  { value: 'file', label: 'File' },
];

const optionsToString = (options?: Array<{ value: string; label: string }> | null) =>
  (options || []).map((opt) => opt.value).join(', ');

const stringToOptions = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => ({ value: item, label: item }));

export function WebsiteAdmissionsPage() {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string | null>(null);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [acceptAdmissionNo, setAcceptAdmissionNo] = useState('');
  const [acceptAdmissionYear, setAcceptAdmissionYear] = useState('');
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<OnlineAdmissionField | null>(null);
  const [fieldOptionsInput, setFieldOptionsInput] = useState('');
  const [statusDraft, setStatusDraft] = useState<OnlineAdmission['status']>('submitted');
  const [notesDraft, setNotesDraft] = useState('');
  const [rejectionDraft, setRejectionDraft] = useState('');

  const { admissions, isLoading } = useWebsiteOnlineAdmissions({
    status: statusFilter === 'all' ? undefined : (statusFilter as any),
    search: search || undefined,
  });

  const { data: selectedAdmission } = useWebsiteOnlineAdmission(selectedAdmissionId || undefined);
  const updateAdmission = useUpdateWebsiteOnlineAdmission();
  const acceptAdmission = useAcceptWebsiteOnlineAdmission();

  const { data: fields = [] } = useWebsiteAdmissionFields();
  const createField = useCreateWebsiteAdmissionField();
  const updateField = useUpdateWebsiteAdmissionField();
  const deleteField = useDeleteWebsiteAdmissionField();

  const statusBadgeVariant = (status: OnlineAdmission['status']) => {
    switch (status) {
      case 'accepted':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'under_review':
        return 'secondary';
      case 'archived':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const openFieldDialog = (field?: OnlineAdmissionField) => {
    if (field) {
      setEditingField(field);
      setFieldOptionsInput(optionsToString(field.options));
    } else {
      setEditingField({
        id: '',
        organizationId: '',
        schoolId: '',
        key: '',
        label: '',
        fieldType: 'text',
        isRequired: false,
        isEnabled: true,
        sortOrder: fields.length,
        placeholder: null,
        helpText: null,
        validationRules: null,
        options: null,
      });
      setFieldOptionsInput('');
    }
    setFieldDialogOpen(true);
  };

  const handleSaveField = async () => {
    if (!editingField) return;
    if (!editingField.key || !editingField.label) {
      showToast.error(t('toast.onlineAdmissionFieldMissing'));
      return;
    }

    const payload: OnlineAdmissionField = {
      ...editingField,
      options: fieldOptionsInput ? stringToOptions(fieldOptionsInput) : null,
    };

    if (editingField.id) {
      await updateField.mutateAsync({ id: editingField.id, field: payload });
    } else {
      await createField.mutateAsync(payload);
    }

    setFieldDialogOpen(false);
    setEditingField(null);
    setFieldOptionsInput('');
  };

  const admissionDetails = selectedAdmission;

  useEffect(() => {
    if (!admissionDetails) return;
    setStatusDraft(admissionDetails.status);
    setNotesDraft(admissionDetails.notes || '');
    setRejectionDraft(admissionDetails.rejectionReason || '');
  }, [admissionDetails]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title="Online Admissions"
        description="Review and manage online admission submissions."
        icon={<Eye className="h-5 w-5" />}
      />

      <Tabs defaultValue="applications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="fields">Form Fields</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-6">
          <FilterPanel title="Filters" defaultOpenDesktop defaultOpenMobile={false}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Search</Label>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, guardian phone, or application number"
                />
              </div>
            </div>
          </FilterPanel>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Application No</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Guardian Phone</TableHead>
                      <TableHead>Applying Grade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow>
                        <TableCell colSpan={7}>Loading admissions...</TableCell>
                      </TableRow>
                    )}
                    {!isLoading && admissions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7}>No admissions found.</TableCell>
                      </TableRow>
                    )}
                    {admissions.map((admission) => (
                      <TableRow key={admission.id}>
                        <TableCell className="font-medium">{admission.applicationNo}</TableCell>
                        <TableCell>{admission.fullName}</TableCell>
                        <TableCell>{admission.guardianPhone || '—'}</TableCell>
                        <TableCell>{admission.applyingGrade || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(admission.status)}>
                            {STATUS_OPTIONS.find((opt) => opt.value === admission.status)?.label || admission.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(admission.submittedAt)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedAdmissionId(admission.id)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fields" className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Form Fields</CardTitle>
              <Button size="sm" onClick={() => openFieldDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Enabled</TableHead>
                      <TableHead>Sort</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7}>No custom fields configured.</TableCell>
                      </TableRow>
                    )}
                    {fields.map((field) => (
                      <TableRow key={field.id}>
                        <TableCell>{field.key}</TableCell>
                        <TableCell>{field.label}</TableCell>
                        <TableCell>
                          {FIELD_TYPES.find((opt) => opt.value === field.fieldType)?.label || field.fieldType}
                        </TableCell>
                        <TableCell>{field.isRequired ? 'Yes' : 'No'}</TableCell>
                        <TableCell>{field.isEnabled ? 'Yes' : 'No'}</TableCell>
                        <TableCell>{field.sortOrder}</TableCell>
                        <TableCell className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => openFieldDialog(field)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteField.mutate(field.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedAdmissionId} onOpenChange={(open) => !open && setSelectedAdmissionId(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Admission Details</DialogTitle>
          </DialogHeader>
          {!admissionDetails && <p>Loading admission...</p>}
          {admissionDetails && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold">Student</h3>
                  <p>{admissionDetails.fullName}</p>
                  <p className="text-sm text-muted-foreground">Father: {admissionDetails.fatherName}</p>
                  <p className="text-sm text-muted-foreground">Applying: {admissionDetails.applyingGrade || '—'}</p>
                  {admissionDetails.pictureUrl && (
                    <img
                      src={admissionDetails.pictureUrl}
                      alt={admissionDetails.fullName}
                      className="mt-2 h-32 w-32 rounded object-cover"
                    />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Guardian</h3>
                  <p>{admissionDetails.guardianName || '—'}</p>
                  <p className="text-sm text-muted-foreground">{admissionDetails.guardianPhone || '—'}</p>
                  {admissionDetails.guardianPictureUrl && (
                    <img
                      src={admissionDetails.guardianPictureUrl}
                      alt={admissionDetails.guardianName || 'Guardian'}
                      className="mt-2 h-32 w-32 rounded object-cover"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold">Address</h3>
                  <p className="text-sm text-muted-foreground">{admissionDetails.homeAddress || '—'}</p>
                  <p className="text-sm text-muted-foreground">
                    Origin: {admissionDetails.origProvince || '—'} / {admissionDetails.origDistrict || '—'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Current: {admissionDetails.currProvince || '—'} / {admissionDetails.currDistrict || '—'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Previous School</h3>
                  <p>{admissionDetails.previousSchool || '—'}</p>
                  <p className="text-sm text-muted-foreground">
                    Grade: {admissionDetails.previousGradeLevel || '—'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Year: {admissionDetails.previousAcademicYear || '—'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Notes: {admissionDetails.previousSchoolNotes || '—'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Status</h3>
                <div className="flex flex-col md:flex-row gap-4">
                  <Select value={statusDraft} onValueChange={(value) => setStatusDraft(value as any)}>
                    <SelectTrigger className="md:w-48">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {(admissionDetails.status === 'accepted'
                        ? STATUS_OPTIONS
                        : STATUS_OPTIONS.filter((option) => option.value !== 'accepted')
                      ).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="default"
                    onClick={() => {
                      setAcceptDialogOpen(true);
                      setAcceptAdmissionNo('');
                      setAcceptAdmissionYear('');
                    }}
                    disabled={admissionDetails.status === 'accepted'}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Accept & Create Student
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} />
              </div>

              {statusDraft === 'rejected' && (
                <div className="space-y-2">
                  <Label>Rejection Reason</Label>
                  <Textarea value={rejectionDraft} onChange={(event) => setRejectionDraft(event.target.value)} />
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() =>
                    updateAdmission.mutate({
                      id: admissionDetails.id,
                      data: {
                        status: statusDraft,
                        notes: notesDraft,
                        rejectionReason: rejectionDraft,
                      },
                    })
                  }
                >
                  Save Changes
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Documents</h3>
                {admissionDetails.documents && admissionDetails.documents.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {admissionDetails.documents.map((doc) => (
                      <li key={doc.id} className="flex items-center gap-2">
                        <a className="text-primary underline" href={doc.fileUrl || '#'} target="_blank" rel="noreferrer">
                          {doc.fileName}
                        </a>
                        <span className="text-muted-foreground">{doc.documentType}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No documents uploaded.</p>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Extra Fields</h3>
                {admissionDetails.fieldValues && admissionDetails.fieldValues.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {admissionDetails.fieldValues.map((value) => (
                      <div key={value.id} className="border rounded-md p-2">
                        <p className="font-semibold">{value.field?.label || 'Field'}</p>
                        {value.fileUrl ? (
                          <a className="text-primary underline" href={value.fileUrl} target="_blank" rel="noreferrer">
                            {value.fileName || 'Download'}
                          </a>
                        ) : (
                          <p>{value.valueText || (Array.isArray(value.valueJson) ? value.valueJson.join(', ') : '—')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No extra fields filled.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Accept Admission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Admission Number (optional)</Label>
              <Input value={acceptAdmissionNo} onChange={(event) => setAcceptAdmissionNo(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Admission Year (optional)</Label>
              <Input value={acceptAdmissionYear} onChange={(event) => setAcceptAdmissionYear(event.target.value)} />
            </div>
            <Button
              onClick={async () => {
                if (!selectedAdmissionId) return;
                await acceptAdmission.mutateAsync({
                  id: selectedAdmissionId,
                  admissionNo: acceptAdmissionNo || undefined,
                  admissionYear: acceptAdmissionYear || undefined,
                });
                setAcceptDialogOpen(false);
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirm Acceptance
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingField?.id ? 'Edit Field' : 'New Field'}</DialogTitle>
          </DialogHeader>
          {editingField && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Key</Label>
                <Input
                  value={editingField.key}
                  onChange={(event) => setEditingField({ ...editingField, key: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={editingField.label}
                  onChange={(event) => setEditingField({ ...editingField, label: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Field Type</Label>
                <Select
                  value={editingField.fieldType}
                  onValueChange={(value) =>
                    setEditingField({ ...editingField, fieldType: value as OnlineAdmissionFieldType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={editingField.sortOrder}
                  onChange={(event) =>
                    setEditingField({ ...editingField, sortOrder: Number(event.target.value) || 0 })
                  }
                />
              </div>
              {(editingField.fieldType === 'select' || editingField.fieldType === 'multiselect') && (
                <div className="space-y-2">
                  <Label>Options (comma separated)</Label>
                  <Input value={fieldOptionsInput} onChange={(event) => setFieldOptionsInput(event.target.value)} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Placeholder</Label>
                <Input
                  value={editingField.placeholder || ''}
                  onChange={(event) => setEditingField({ ...editingField, placeholder: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Help Text</Label>
                <Input
                  value={editingField.helpText || ''}
                  onChange={(event) => setEditingField({ ...editingField, helpText: event.target.value })}
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editingField.isRequired}
                    onChange={(event) => setEditingField({ ...editingField, isRequired: event.target.checked })}
                  />
                  Required
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editingField.isEnabled}
                    onChange={(event) => setEditingField({ ...editingField, isEnabled: event.target.checked })}
                  />
                  Enabled
                </label>
              </div>
              <Button onClick={handleSaveField} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Save Field
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
