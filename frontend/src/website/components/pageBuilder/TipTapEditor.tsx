import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useLanguage } from '@/hooks/useLanguage';
import { useEffect } from 'react';
import './tiptap.css';

interface TipTapEditorProps {
  content: any; // ProseMirror JSON
  onChange: (json: any) => void;
  placeholder?: string;
  editor?: any; // Optional editor instance from parent (for toolbar)
  onEditorReady?: (editor: any) => void; // Callback when editor is ready
}

export function TipTapEditor({ 
  content, 
  onChange, 
  placeholder,
  editor: externalEditor,
  onEditorReady,
}: TipTapEditorProps) {
  const { isRTL, t } = useLanguage();
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable default heading levels, we'll use our own
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'tiptap-image',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'tiptap-link',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || t('website.editor.placeholder') || 'Start typing...',
      }),
    ],
    content: content || { type: 'doc', content: [] },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[300px] p-4 tiptap-editor',
        dir: isRTL ? 'rtl' : 'ltr',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  // Update content when it changes externally
  useEffect(() => {
    if (editor && content) {
      const currentContent = editor.getJSON();
      // Only update if content is actually different
      if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Use external editor if provided (for toolbar integration)
  const activeEditor = externalEditor || editor;

  if (!activeEditor) {
    return (
      <div className="min-h-[300px] p-4 border rounded-lg flex items-center justify-center text-muted-foreground">
        {t('website.editor.loading') || 'Loading editor...'}
      </div>
    );
  }

  return <EditorContent editor={activeEditor} />;
}
