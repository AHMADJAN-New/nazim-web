import { Controller, useFormContext } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ContentEditorProps {
  name?: string;
  label?: string;
  placeholder?: string;
  rows?: number;
}

/**
 * Simple content editor wrapper
 * For now, uses a textarea. Can be extended to use a rich text editor later.
 */
export function ContentEditor({
  name = 'content',
  label = 'Content',
  placeholder = 'Enter content...',
  rows = 10,
}: ContentEditorProps) {
  const { control } = useFormContext();

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Textarea
            id={name}
            {...field}
            placeholder={placeholder}
            rows={rows}
            className="font-mono text-sm"
          />
        )}
      />
      <p className="text-xs text-muted-foreground">
        Content is stored as JSON. For now, use plain text. Rich editor coming soon.
      </p>
    </div>
  );
}

