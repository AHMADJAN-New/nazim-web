import { useEffect, useState } from 'react';
import { CheckCircle2, Eye, Plus, Save, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { PrivateImage, PrivateDocumentLink } from '@/components/PrivateImage';

const optionsToString = (options?: Array<{ value: string; label: string }> | null) =>
  (options || []).map((opt) => opt.value).join(', ');

const stringToOptions = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => ({ value: item, label: item }));

export default function WebsiteAdmissionsPage() {
  const { t } = useLanguage();
  const statusOptions = [
    { value: 'submitted', label: t('websiteAdmin.admissions.statuses.submitted') },
    { value: 'under_review', label: t('websiteAdmin.admissions.statuses.underReview') },
    { value: 'accepted', label: t('websiteAdmin.admissions.statuses.accepted') },
    { value: 'rejected', label: t('websiteAdmin.admissions.statuses.rejected') },
    { value: 'archived', label: t('websiteAdmin.admissions.statuses.archived') },
  ];
  const fieldTypes: { value: OnlineAdmissionFieldType; label: string }[] = [
    { value: 'text', label: t('websiteAdmin.admissions.fieldTypes.text') },
    { value: 'textarea', label: t('websiteAdmin.admissions.fieldTypes.textarea') },
    { value: 'phone', label: t('websiteAdmin.admissions.fieldTypes.phone') },
    { value: 'number', label: t('websiteAdmin.admissions.fieldTypes.number') },
    { value: 'select', label: t('websiteAdmin.admissions.fieldTypes.select') },
    { value: 'multiselect', label: t('websiteAdmin.admissions.fieldTypes.multiselect') },
    { value: 'date', label: t('websiteAdmin.admissions.fieldTypes.date') },
    { value: 'toggle', label: t('websiteAdmin.admissions.fieldTypes.toggle') },
    { value: 'email', label: t('websiteAdmin.admissions.fieldTypes.email') },
    { value: 'id_number', label: t('websiteAdmin.admissions.fieldTypes.idNumber') },
    { value: 'address', label: t('websiteAdmin.admissions.fieldTypes.address') },
    { value: 'photo', label: t('websiteAdmin.admissions.fieldTypes.photo') },
    { value: 'file', label: t('websiteAdmin.admissions.fieldTypes.file') },
  ];
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
        title={t('websiteAdmin.admissions.title')}
        description={t('websiteAdmin.admissions.description')}
        icon={<Eye className="h-5 w-5" />}
      />

      <Tabs defaultValue="applications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="applications">{t('websiteAdmin.admissions.tabs.applications')}</TabsTrigger>
          <TabsTrigger value="fields">{t('websiteAdmin.admissions.tabs.fields')}</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-6">
          <FilterPanel title={t('websiteAdmin.common.filters')} defaultOpenDesktop defaultOpenMobile={false}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('websiteAdmin.common.status')}</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('websiteAdmin.admissions.allStatuses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('websiteAdmin.common.all')}</SelectItem>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t('websiteAdmin.common.search')}</Label>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('websiteAdmin.admissions.searchPlaceholder')}
                />
              </div>
            </div>
          </FilterPanel>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>{t('websiteAdmin.admissions.applicationsTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('websiteAdmin.admissions.columns.applicationNo')}</TableHead>
                      <TableHead>{t('websiteAdmin.admissions.columns.student')}</TableHead>
                      <TableHead>{t('websiteAdmin.admissions.columns.guardianPhone')}</TableHead>
                      <TableHead>{t('websiteAdmin.admissions.columns.applyingGrade')}</TableHead>
                      <TableHead>{t('websiteAdmin.common.status')}</TableHead>
                      <TableHead>{t('websiteAdmin.admissions.columns.submitted')}</TableHead>
                      <TableHead>{t('websiteAdmin.common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow>
                        <TableCell colSpan={7}>{t('websiteAdmin.admissions.loading')}</TableCell>
                      </TableRow>
                    )}
                    {!isLoading && admissions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7}>{t('websiteAdmin.admissions.noResults')}</TableCell>
                      </TableRow>
                    )}
                    {admissions.map((admission) => (
                      <TableRow key={admission.id}>
                        <TableCell className="font-medium">{admission.applicationNo}</TableCell>
                        <TableCell>{admission.fullName}</TableCell>
                        <TableCell>{admission.guardianPhone || t('websiteAdmin.common.notSet')}</TableCell>
                        <TableCell>{admission.applyingGrade || t('websiteAdmin.common.notSet')}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(admission.status)}>
                            {statusOptions.find((opt) => opt.value === admission.status)?.label || admission.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(admission.submittedAt)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedAdmissionId(admission.id)}
                          >{t('websiteAdmin.admissions.actions.view')}</Button>
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
              <CardTitle>{t('websiteAdmin.admissions.fieldsTitle')}</CardTitle>
              <Button size="sm" onClick={() => openFieldDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                {t('websiteAdmin.admissions.actions.addField')}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('websiteAdmin.admissions.fieldColumns.key')}</TableHead>
                      <TableHead>{t('websiteAdmin.admissions.fieldColumns.label')}</TableHead>
                      <TableHead>{t('websiteAdmin.admissions.fieldColumns.type')}</TableHead>
                      <TableHead>{t('websiteAdmin.admissions.fieldColumns.required')}</TableHead>
                      <TableHead>{t('websiteAdmin.admissions.fieldColumns.enabled')}</TableHead>
                      <TableHead>{t('websiteAdmin.admissions.fieldColumns.sort')}</TableHead>
                      <TableHead>{t('websiteAdmin.common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7}>{t('websiteAdmin.admissions.noFields')}</TableCell>
                      </TableRow>
                    )}
                    {fields.map((field) => (
                      <TableRow key={field.id}>
                        <TableCell>{field.key}</TableCell>
                        <TableCell>{field.label}</TableCell>
                        <TableCell>
                          {fieldTypes.find((opt) => opt.value === field.fieldType)?.label || field.fieldType}
                        </TableCell>
                        <TableCell>{field.isRequired ? t('websiteAdmin.common.yes') : t('websiteAdmin.common.no')}</TableCell>
                        <TableCell>{field.isEnabled ? t('websiteAdmin.common.yes') : t('websiteAdmin.common.no')}</TableCell>
                        <TableCell>{field.sortOrder}</TableCell>
                        <TableCell className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => openFieldDialog(field)}>
                            {t('common.edit')}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="admission-details-desc">
          <DialogHeader>
            <DialogTitle>{t('websiteAdmin.admissions.detailsTitle')}</DialogTitle>
            <DialogDescription id="admission-details-desc">
              {t('websiteAdmin.admissions.detailsDescription')}
            </DialogDescription>
          </DialogHeader>
          {!admissionDetails && <p className="text-muted-foreground py-4">{t('websiteAdmin.admissions.loadingSingle')}</p>}
          {admissionDetails && (
            <div className="space-y-6">
              {/* Student & Guardian cards with photos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t('websiteAdmin.admissions.sections.student')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="font-medium">{admissionDetails.fullName}</p>
                    <p className="text-sm text-muted-foreground">{t('websiteAdmin.admissions.labels.father')}: {admissionDetails.fatherName}</p>
                    <p className="text-sm text-muted-foreground">{t('websiteAdmin.admissions.labels.applying')}: {admissionDetails.applyingGrade || t('websiteAdmin.common.notSet')}</p>
                    {(admissionDetails.pictureUrl ?? admissionDetails.picturePath) && (
                      <div className="mt-2 rounded-lg overflow-hidden border bg-muted/50 w-32 h-32">
                        <PrivateImage
                          src={admissionDetails.pictureUrl ?? admissionDetails.picturePath ?? null}
                          alt={admissionDetails.fullName}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t('websiteAdmin.admissions.sections.guardian')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="font-medium">{admissionDetails.guardianName || t('websiteAdmin.admissions.labels.guardian')}</p>
                    <p className="text-sm text-muted-foreground">{admissionDetails.guardianPhone || t('websiteAdmin.common.notSet')}</p>
                    {(admissionDetails.guardianPictureUrl ?? admissionDetails.guardianPicturePath) && (
                      <div className="mt-2 rounded-lg overflow-hidden border bg-muted/50 w-32 h-32">
                        <PrivateImage
                          src={admissionDetails.guardianPictureUrl ?? admissionDetails.guardianPicturePath ?? null}
                          alt={admissionDetails.guardianName || t('websiteAdmin.admissions.labels.guardian')}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t('websiteAdmin.admissions.sections.address')}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    <p>{admissionDetails.homeAddress || t('websiteAdmin.common.notSet')}</p>
                    <p>{t('websiteAdmin.admissions.labels.origin')}: {admissionDetails.origProvince || t('websiteAdmin.common.notSet')} / {admissionDetails.origDistrict || t('websiteAdmin.common.notSet')}</p>
                    <p>{t('websiteAdmin.admissions.labels.current')}: {admissionDetails.currProvince || t('websiteAdmin.common.notSet')} / {admissionDetails.currDistrict || t('websiteAdmin.common.notSet')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t('websiteAdmin.admissions.sections.previousSchool')}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    <p>{admissionDetails.previousSchool || t('websiteAdmin.common.notSet')}</p>
                    <p>{t('websiteAdmin.admissions.labels.grade')}: {admissionDetails.previousGradeLevel || t('websiteAdmin.common.notSet')}</p>
                    <p>{t('websiteAdmin.admissions.labels.year')}: {admissionDetails.previousAcademicYear || t('websiteAdmin.common.notSet')}</p>
                    <p>{t('websiteAdmin.admissions.labels.notes')}: {admissionDetails.previousSchoolNotes || t('websiteAdmin.common.notSet')}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('websiteAdmin.admissions.sections.statusActions')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Select value={statusDraft} onValueChange={(value) => setStatusDraft(value as any)}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder={t('websiteAdmin.admissions.selectStatus')} />
                      </SelectTrigger>
                      <SelectContent>
                        {(admissionDetails.status === 'accepted'
                          ? statusOptions
                          : statusOptions.filter((option) => option.value !== 'accepted')
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
                      {t('websiteAdmin.admissions.actions.accept')}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('websiteAdmin.admissions.labels.internalNotes')}</Label>
                    <Textarea value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} placeholder={t('websiteAdmin.admissions.placeholders.internalNotes')} rows={2} />
                  </div>
                  {statusDraft === 'rejected' && (
                    <div className="space-y-2">
                      <Label>{t('websiteAdmin.admissions.labels.rejectionReason')}</Label>
                      <Textarea value={rejectionDraft} onChange={(event) => setRejectionDraft(event.target.value)} placeholder={t('websiteAdmin.admissions.placeholders.rejectionReason')} rows={2} />
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
                      {t('websiteAdmin.admissions.actions.saveChanges')}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('websiteAdmin.admissions.sections.documents')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {admissionDetails.documents && admissionDetails.documents.length > 0 ? (
                    <ul className="space-y-2">
                      {admissionDetails.documents.map((doc) => (
                        <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm">
                          <span className="font-medium truncate flex-1 min-w-0">{doc.fileName}</span>
                          <span className="text-muted-foreground shrink-0">{doc.documentType}</span>
                          {doc.fileUrl ? (
                            <PrivateDocumentLink url={doc.fileUrl} fileName={doc.fileName} />
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('websiteAdmin.admissions.noDocuments')}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('websiteAdmin.admissions.sections.extraFields')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {admissionDetails.fieldValues && admissionDetails.fieldValues.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {admissionDetails.fieldValues.map((value) => (
                        <div key={value.id} className="rounded-md border p-3">
                          <p className="font-semibold text-muted-foreground mb-1">{value.field?.label || t('websiteAdmin.admissions.labels.field')}</p>
                          {value.fileUrl ? (
                            <PrivateDocumentLink url={value.fileUrl} fileName={value.fileName || t('websiteAdmin.admissions.labels.download')} />
                          ) : (
                            <p>{value.valueText || (Array.isArray(value.valueJson) ? value.valueJson.join(', ') : t('websiteAdmin.common.notSet'))}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('websiteAdmin.admissions.noExtraFields')}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent className="max-w-md" aria-describedby="accept-admission-desc">
          <DialogHeader>
            <DialogTitle>{t('websiteAdmin.admissions.acceptTitle')}</DialogTitle>
            <DialogDescription id="accept-admission-desc">
              {t('websiteAdmin.admissions.acceptDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('websiteAdmin.admissions.labels.admissionNoOptional')}</Label>
              <Input value={acceptAdmissionNo} onChange={(event) => setAcceptAdmissionNo(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('websiteAdmin.admissions.labels.admissionYearOptional')}</Label>
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
              {t('websiteAdmin.admissions.actions.confirmAcceptance')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
        <DialogContent className="max-w-lg" aria-describedby="field-form-desc">
          <DialogHeader>
            <DialogTitle>{editingField?.id ? t('websiteAdmin.admissions.actions.editField') : t('websiteAdmin.admissions.actions.newField')}</DialogTitle>
            <DialogDescription id="field-form-desc">
              {editingField?.id ? t('websiteAdmin.admissions.fieldDialog.editDescription') : t('websiteAdmin.admissions.fieldDialog.newDescription')}
            </DialogDescription>
          </DialogHeader>
          {editingField && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('websiteAdmin.admissions.fieldForm.key')}</Label>
                <Input
                  value={editingField.key}
                  onChange={(event) => setEditingField({ ...editingField, key: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('websiteAdmin.admissions.fieldForm.label')}</Label>
                <Input
                  value={editingField.label}
                  onChange={(event) => setEditingField({ ...editingField, label: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('websiteAdmin.admissions.fieldForm.type')}</Label>
                <Select
                  value={editingField.fieldType}
                  onValueChange={(value) =>
                    setEditingField({ ...editingField, fieldType: value as OnlineAdmissionFieldType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('websiteAdmin.admissions.fieldForm.selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('websiteAdmin.admissions.fieldForm.sortOrder')}</Label>
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
                  <Label>{t('websiteAdmin.admissions.fieldForm.options')}</Label>
                  <Input value={fieldOptionsInput} onChange={(event) => setFieldOptionsInput(event.target.value)} />
                </div>
              )}
              <div className="space-y-2">
                <Label>{t('websiteAdmin.admissions.fieldForm.placeholder')}</Label>
                <Input
                  value={editingField.placeholder || ''}
                  onChange={(event) => setEditingField({ ...editingField, placeholder: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('websiteAdmin.admissions.fieldForm.helpText')}</Label>
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
                  {t('websiteAdmin.admissions.fieldForm.required')}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editingField.isEnabled}
                    onChange={(event) => setEditingField({ ...editingField, isEnabled: event.target.checked })}
                  />
                  {t('websiteAdmin.admissions.fieldForm.enabled')}
                </label>
              </div>
              <Button onClick={handleSaveField} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {t('websiteAdmin.admissions.actions.saveField')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}




