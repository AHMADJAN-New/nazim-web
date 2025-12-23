import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Save,
  ArrowLeft,
  Settings2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { showToast } from '@/lib/toast';
import { eventTypesApi } from '@/lib/api/client';
import type { EventType, EventTypeField, EventTypeFieldGroup, FieldType, FieldOption } from '@/types/events';
import { FIELD_TYPE_LABELS } from '@/types/events';
import { v4 as uuidv4 } from 'uuid';

interface FormDesignerProps {
  eventTypeId: string;
  onBack?: () => void;
}

const FIELD_TYPES: FieldType[] = [
  'text',
  'textarea',
  'phone',
  'number',
  'select',
  'multiselect',
  'date',
  'toggle',
  'email',
  'id_number',
  'address',
];

export function FormDesigner({ eventTypeId, onBack }: FormDesignerProps) {
  const queryClient = useQueryClient();
  const [fieldGroups, setFieldGroups] = useState<EventTypeFieldGroup[]>([]);
  const [fields, setFields] = useState<EventTypeField[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [editingField, setEditingField] = useState<EventTypeField | null>(null);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<EventTypeFieldGroup | null>(null);

  // Fetch event type details
  const { data: eventType } = useQuery({
    queryKey: ['event-type', eventTypeId],
    queryFn: () => eventTypesApi.get(eventTypeId),
  });

  // Fetch fields
  const { data: fieldsData, isLoading } = useQuery({
    queryKey: ['event-type-fields', eventTypeId],
    queryFn: () => eventTypesApi.getFields(eventTypeId),
  });

  useEffect(() => {
    if (fieldsData) {
      setFieldGroups(fieldsData.field_groups || []);
      setFields(fieldsData.fields || []);
    }
  }, [fieldsData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => eventTypesApi.saveFields(eventTypeId, {
      field_groups: fieldGroups.map(g => ({
        id: g.id,
        title: g.title,
        sort_order: g.sort_order,
      })),
      fields: fields.map(f => ({
        id: f.id,
        field_group_id: f.field_group_id,
        key: f.key,
        label: f.label,
        field_type: f.field_type,
        is_required: f.is_required,
        is_enabled: f.is_enabled,
        sort_order: f.sort_order,
        placeholder: f.placeholder,
        help_text: f.help_text,
        validation_rules: f.validation_rules,
        options: f.options,
      })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-type-fields', eventTypeId] });
      showToast.success('toast.fieldsSaved');
      setIsDirty(false);
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.fieldsSaveFailed');
    },
  });

  const addFieldGroup = () => {
    setEditingGroup({
      id: uuidv4(),
      event_type_id: eventTypeId,
      title: '',
      sort_order: fieldGroups.length,
    });
    setShowGroupDialog(true);
  };

  const saveGroup = (group: EventTypeFieldGroup) => {
    const existingIndex = fieldGroups.findIndex(g => g.id === group.id);
    if (existingIndex >= 0) {
      setFieldGroups(prev => prev.map(g => g.id === group.id ? group : g));
    } else {
      setFieldGroups(prev => [...prev, group]);
    }
    setIsDirty(true);
    setShowGroupDialog(false);
    setEditingGroup(null);
  };

  const deleteGroup = (groupId: string) => {
    setFieldGroups(prev => prev.filter(g => g.id !== groupId));
    setFields(prev => prev.map(f =>
      f.field_group_id === groupId ? { ...f, field_group_id: null } : f
    ));
    setIsDirty(true);
  };

  const addField = (groupId?: string | null) => {
    const newField: EventTypeField = {
      id: uuidv4(),
      event_type_id: eventTypeId,
      field_group_id: groupId || null,
      key: '',
      label: '',
      field_type: 'text',
      is_required: false,
      is_enabled: true,
      sort_order: fields.length,
      placeholder: null,
      help_text: null,
      validation_rules: null,
      options: null,
    };
    setEditingField(newField);
    setShowFieldDialog(true);
  };

  const saveField = (field: EventTypeField) => {
    const existingIndex = fields.findIndex(f => f.id === field.id);
    if (existingIndex >= 0) {
      setFields(prev => prev.map(f => f.id === field.id ? field : f));
    } else {
      setFields(prev => [...prev, field]);
    }
    setIsDirty(true);
    setShowFieldDialog(false);
    setEditingField(null);
  };

  const deleteField = (fieldId: string) => {
    setFields(prev => prev.filter(f => f.id !== fieldId));
    setIsDirty(true);
  };

  const toggleFieldEnabled = (fieldId: string) => {
    setFields(prev => prev.map(f =>
      f.id === fieldId ? { ...f, is_enabled: !f.is_enabled } : f
    ));
    setIsDirty(true);
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const index = fields.findIndex(f => f.id === fieldId);
    if (index < 0) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    const newFields = [...fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    newFields.forEach((f, i) => f.sort_order = i);
    setFields(newFields);
    setIsDirty(true);
  };

  // Group fields by field_group_id
  const ungroupedFields = fields.filter(f => !f.field_group_id);
  const groupedFields = fieldGroups.map(group => ({
    ...group,
    fields: fields.filter(f => f.field_group_id === group.id),
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h2 className="text-xl font-semibold">Form Designer</h2>
            {eventType && (
              <p className="text-sm text-muted-foreground">
                Configure guest fields for "{eventType.name}"
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addFieldGroup}>
            <Plus className="h-4 w-4 mr-2" />
            Add Group
          </Button>
          <Button variant="outline" onClick={() => addField(null)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!isDirty || saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Field Groups */}
      <div className="space-y-4">
        {groupedFields.map((group) => (
          <Card key={group.id}>
            <Collapsible defaultOpen>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">{group.title}</CardTitle>
                      <Badge variant="secondary">{group.fields.length} fields</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingGroup(group);
                          setShowGroupDialog(true);
                        }}
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteGroup(group.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-2">
                  {group.fields.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No fields in this group
                    </p>
                  ) : (
                    group.fields.map((field, index) => (
                      <FieldRow
                        key={field.id}
                        field={field}
                        index={index}
                        total={group.fields.length}
                        onEdit={() => {
                          setEditingField(field);
                          setShowFieldDialog(true);
                        }}
                        onDelete={() => deleteField(field.id)}
                        onToggleEnabled={() => toggleFieldEnabled(field.id)}
                        onMove={(dir) => moveField(field.id, dir)}
                      />
                    ))
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => addField(group.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field to Group
                  </Button>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}

        {/* Ungrouped Fields */}
        {ungroupedFields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ungrouped Fields</CardTitle>
              <CardDescription>Fields not assigned to any group</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {ungroupedFields.map((field, index) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  index={index}
                  total={ungroupedFields.length}
                  onEdit={() => {
                    setEditingField(field);
                    setShowFieldDialog(true);
                  }}
                  onDelete={() => deleteField(field.id)}
                  onToggleEnabled={() => toggleFieldEnabled(field.id)}
                  onMove={(dir) => moveField(field.id, dir)}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {fields.length === 0 && fieldGroups.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <p>No fields configured yet.</p>
              <p className="text-sm mt-1">
                Add groups and fields to customize the guest registration form.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Field Dialog */}
      <FieldDialog
        open={showFieldDialog}
        onOpenChange={setShowFieldDialog}
        field={editingField}
        fieldGroups={fieldGroups}
        onSave={saveField}
      />

      {/* Group Dialog */}
      <GroupDialog
        open={showGroupDialog}
        onOpenChange={setShowGroupDialog}
        group={editingGroup}
        onSave={saveGroup}
      />
    </div>
  );
}

interface FieldRowProps {
  field: EventTypeField;
  index: number;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEnabled: () => void;
  onMove: (direction: 'up' | 'down') => void;
}

function FieldRow({ field, index, total, onEdit, onDelete, onToggleEnabled, onMove }: FieldRowProps) {
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg border ${!field.is_enabled ? 'opacity-50 bg-muted' : 'bg-background'}`}>
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{field.label}</span>
          <Badge variant="outline" className="text-xs">{FIELD_TYPE_LABELS[field.field_type]}</Badge>
          {field.is_required && <Badge variant="default" className="text-xs">Required</Badge>}
        </div>
        <span className="text-xs text-muted-foreground">{field.key}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => onMove('up')} disabled={index === 0}>
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onMove('down')} disabled={index === total - 1}>
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onToggleEnabled}>
          {field.is_enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

interface FieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: EventTypeField | null;
  fieldGroups: EventTypeFieldGroup[];
  onSave: (field: EventTypeField) => void;
}

function FieldDialog({ open, onOpenChange, field, fieldGroups, onSave }: FieldDialogProps) {
  const [formData, setFormData] = useState<EventTypeField | null>(null);
  const [options, setOptions] = useState<FieldOption[]>([]);

  useEffect(() => {
    if (field) {
      setFormData(field);
      setOptions(field.options || []);
    }
  }, [field]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    // Auto-generate key from label if empty
    const key = formData.key || formData.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    onSave({
      ...formData,
      key,
      options: ['select', 'multiselect'].includes(formData.field_type) ? options : null,
    });
  };

  const addOption = () => {
    setOptions(prev => [...prev, { value: '', label: '' }]);
  };

  const updateOption = (index: number, key: 'value' | 'label', value: string) => {
    setOptions(prev => prev.map((opt, i) => i === index ? { ...opt, [key]: value } : opt));
  };

  const removeOption = (index: number) => {
    setOptions(prev => prev.filter((_, i) => i !== index));
  };

  if (!formData) return null;

  const needsOptions = ['select', 'multiselect'].includes(formData.field_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{field?.key ? 'Edit Field' : 'Add Field'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Label *</Label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData(prev => prev ? { ...prev, label: e.target.value } : null)}
                placeholder="e.g., Phone Number"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Key</Label>
              <Input
                value={formData.key}
                onChange={(e) => setFormData(prev => prev ? { ...prev, key: e.target.value } : null)}
                placeholder="Auto-generated from label"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Field Type *</Label>
              <Select
                value={formData.field_type}
                onValueChange={(value) => setFormData(prev => prev ? { ...prev, field_type: value as FieldType } : null)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {FIELD_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Group</Label>
              <Select
                value={formData.field_group_id || 'none'}
                onValueChange={(value) => setFormData(prev => prev ? { ...prev, field_group_id: value === 'none' ? null : value } : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No group</SelectItem>
                  {fieldGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Placeholder</Label>
            <Input
              value={formData.placeholder || ''}
              onChange={(e) => setFormData(prev => prev ? { ...prev, placeholder: e.target.value || null } : null)}
              placeholder="Hint text shown in the field"
            />
          </div>

          <div className="space-y-2">
            <Label>Help Text</Label>
            <Textarea
              value={formData.help_text || ''}
              onChange={(e) => setFormData(prev => prev ? { ...prev, help_text: e.target.value || null } : null)}
              placeholder="Additional guidance for the user"
              rows={2}
            />
          </div>

          {needsOptions && (
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="space-y-2">
                {options.map((opt, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={opt.value}
                      onChange={(e) => updateOption(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1"
                    />
                    <Input
                      value={opt.label}
                      onChange={(e) => updateOption(index, 'label', e.target.value)}
                      placeholder="Label"
                      className="flex-1"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_required}
                  onCheckedChange={(checked) => setFormData(prev => prev ? { ...prev, is_required: checked } : null)}
                />
                <Label>Required</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_enabled}
                  onCheckedChange={(checked) => setFormData(prev => prev ? { ...prev, is_enabled: checked } : null)}
                />
                <Label>Enabled</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Field</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: EventTypeFieldGroup | null;
  onSave: (group: EventTypeFieldGroup) => void;
}

function GroupDialog({ open, onOpenChange, group, onSave }: GroupDialogProps) {
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (group) {
      setTitle(group.title);
    }
  }, [group]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;
    onSave({ ...group, title });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{group?.title ? 'Edit Group' : 'Add Group'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Contact Information"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Group</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
