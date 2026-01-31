import { Controller, useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { TipTapEditor } from './pageBuilder/TipTapEditor';
import { TipTapToolbar } from './pageBuilder/TipTapToolbar';
import { useRef, useState } from 'react';
import { Editor } from '@tiptap/react';

interface ContentEditorProps {
  name?: string;
  label?: string;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string>;
}

/**
 * Rich content editor using TipTap
 * Stores content as ProseMirror JSON format
 */
export function ContentEditor({
  name = 'content_json',
  label = 'Content',
  placeholder = 'Start writing...',
  onImageUpload,
}: ContentEditorProps) {
  const { control } = useFormContext();
  const [editor, setEditor] = useState<Editor | null>(null);

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <div className="border rounded-lg overflow-hidden bg-background">
            <TipTapToolbar editor={editor} onImageUpload={onImageUpload} />
            <TipTapEditor
              content={field.value || { type: 'doc', content: [] }}
              onChange={field.onChange}
              placeholder={placeholder}
              onEditorReady={setEditor}
            />
          </div>
        )}
      />
    </div>
  );
}

