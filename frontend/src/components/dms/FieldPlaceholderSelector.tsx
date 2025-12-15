import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dmsApi } from '@/lib/api/client';
import type { TemplateField } from '@/types/dms';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from '@/hooks/useTranslations';
import { Search, Copy, CheckCircle2 } from 'lucide-react';

interface FieldPlaceholderSelectorProps {
  recipientType: string;
  onInsert: (placeholder: string) => void;
  className?: string;
}

export function FieldPlaceholderSelector({
  recipientType,
  onInsert,
  className = '',
}: FieldPlaceholderSelectorProps) {
  const { t } = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedField, setSelectedField] = useState<TemplateField | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch available fields for the recipient type
  const { data: fieldsData, isLoading } = useQuery({
    queryKey: ['template-fields', recipientType],
    queryFn: () => dmsApi.templates.getAvailableFields(recipientType),
    enabled: !!recipientType,
  });

  const fields = fieldsData?.fields || [];
  const groupedFields = fieldsData?.grouped_fields || {};

  // Filter fields based on search query
  const filteredFields = fields.filter((field: TemplateField) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      field.key.toLowerCase().includes(query) ||
      field.label.toLowerCase().includes(query) ||
      field.label_en.toLowerCase().includes(query)
    );
  });

  // Group filtered fields
  const filteredGroupedFields = filteredFields.reduce((acc: Record<string, TemplateField[]>, field: TemplateField) => {
    if (!acc[field.group]) {
      acc[field.group] = [];
    }
    acc[field.group].push(field);
    return acc;
  }, {});

  const handleInsertField = (field: TemplateField) => {
    const placeholder = `{{${field.key}}}`;
    onInsert(placeholder);
    setSelectedField(field);

    // Show copied feedback
    setCopiedField(field.key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const groupLabels: Record<string, string> = {
    basic: t('dms.fields.basic_info'),
    academic: t('dms.fields.academic_info'),
    employment: t('dms.fields.employment_info'),
    contact: t('dms.fields.contact_info'),
    guardian: t('dms.fields.guardian_info'),
    application: t('dms.fields.application_info'),
    organization: t('dms.fields.organization_info'),
    document: t('dms.fields.document_info'),
    recipient: t('dms.fields.recipient_info'),
    datetime: t('dms.fields.datetime_info'),
    education: t('dms.fields.education_info'),
    custom: t('dms.fields.custom_fields'),
  };

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label>{t('dms.fields.available_fields')}</Label>
        <div className="text-sm text-muted-foreground">{t('common.loading')}...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="space-y-2">
        <Label>{t('dms.fields.insert_field_placeholder')}</Label>
        <p className="text-sm text-muted-foreground">
          {t('dms.fields.insert_field_help')}
        </p>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('dms.fields.search_fields')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Field selector with grouped options */}
      <div className="space-y-2">
        <Select
          value={selectedField?.key}
          onValueChange={(key) => {
            const field = fields.find((f: TemplateField) => f.key === key);
            if (field) {
              setSelectedField(field);
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('dms.fields.select_field')} />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {Object.entries(filteredGroupedFields).map(([group, groupFields]) => (
              <SelectGroup key={group}>
                <SelectLabel>{groupLabels[group] || group}</SelectLabel>
                {(groupFields as TemplateField[]).map((field) => (
                  <SelectItem key={field.key} value={field.key}>
                    <div className="flex items-center justify-between gap-2">
                      <span>{field.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {`{{${field.key}}}`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        {selectedField && (
          <Button
            type="button"
            onClick={() => handleInsertField(selectedField)}
            className="w-full"
            variant={copiedField === selectedField.key ? 'secondary' : 'default'}
          >
            {copiedField === selectedField.key ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t('dms.fields.inserted')}
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                {t('dms.fields.insert_field')}: {`{{${selectedField.key}}}`}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Quick insert buttons for common fields */}
      {!searchQuery && (
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-xs text-muted-foreground">
            {t('dms.fields.common_fields')}
          </Label>
          <div className="flex flex-wrap gap-2">
            {fields.slice(0, 6).map((field: TemplateField) => (
              <Button
                key={field.key}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleInsertField(field)}
                className="text-xs"
              >
                {field.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Field preview */}
      {selectedField && (
        <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium">{selectedField.label}</p>
              <p className="text-xs text-muted-foreground">{selectedField.label_en}</p>
            </div>
            <code className="rounded bg-background px-2 py-1 text-xs">
              {`{{${selectedField.key}}}`}
            </code>
          </div>
        </div>
      )}

      {filteredFields.length === 0 && searchQuery && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          {t('dms.fields.no_fields_found')}
        </div>
      )}
    </div>
  );
}
