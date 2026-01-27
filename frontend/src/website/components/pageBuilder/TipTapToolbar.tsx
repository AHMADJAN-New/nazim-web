import { Editor } from '@tiptap/react';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Heading3,
  Link as LinkIcon, 
  Image as ImageIcon,
  Quote,
  Undo,
  Redo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/hooks/useLanguage';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TipTapToolbarProps {
  editor: Editor | null;
  onImageUpload?: (file: File) => Promise<string>;
}

export function TipTapToolbar({ editor, onImageUpload }: TipTapToolbarProps) {
  const { t } = useLanguage();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  if (!editor) return null;

  const handleSetLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setLinkDialogOpen(false);
    setLinkUrl('');
  };

  const handleInsertImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
    }
    setImageDialogOpen(false);
    setImageUrl('');
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageUpload) return;

    try {
      const url = await onImageUpload(file);
      editor.chain().focus().setImage({ src: url }).run();
      setImageDialogOpen(false);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to upload image:', error);
      }
    }
  };

  return (
    <>
      <div className="border-b p-2 flex flex-wrap gap-1 bg-muted/50">
        {/* Text Formatting */}
        <Button
          type="button"
          variant={editor.isActive('bold') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="h-8 w-8 p-0"
          aria-label={t('website.editor.toolbar.bold') || 'Bold'}
          title={t('website.editor.toolbar.bold') || 'Bold'}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('italic') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="h-8 w-8 p-0"
          aria-label={t('website.editor.toolbar.italic') || 'Italic'}
          title={t('website.editor.toolbar.italic') || 'Italic'}
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Headings */}
        <Button
          type="button"
          variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className="h-8 w-8 p-0"
          aria-label={t('website.editor.toolbar.heading1') || 'Heading 1'}
          title={t('website.editor.toolbar.heading1') || 'Heading 1'}
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className="h-8 w-8 p-0"
          aria-label={t('website.editor.toolbar.heading2') || 'Heading 2'}
          title={t('website.editor.toolbar.heading2') || 'Heading 2'}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className="h-8 w-8 p-0"
          aria-label={t('website.editor.toolbar.heading3') || 'Heading 3'}
          title={t('website.editor.toolbar.heading3') || 'Heading 3'}
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Lists */}
        <Button
          type="button"
          variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className="h-8 w-8 p-0"
          aria-label={t('website.editor.toolbar.bulletList') || 'Bullet List'}
          title={t('website.editor.toolbar.bulletList') || 'Bullet List'}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className="h-8 w-8 p-0"
          aria-label={t('website.editor.toolbar.orderedList') || 'Ordered List'}
          title={t('website.editor.toolbar.orderedList') || 'Ordered List'}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Blockquote */}
        <Button
          type="button"
          variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className="h-8 w-8 p-0"
          aria-label={t('website.editor.toolbar.blockquote') || 'Quote'}
          title={t('website.editor.toolbar.blockquote') || 'Quote'}
        >
          <Quote className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Link */}
        <Button
          type="button"
          variant={editor.isActive('link') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => {
            const url = editor.getAttributes('link').href || '';
            setLinkUrl(url);
            setLinkDialogOpen(true);
          }}
          className="h-8 w-8 p-0"
          aria-label={t('website.editor.toolbar.link') || 'Link'}
          title={t('website.editor.toolbar.link') || 'Link'}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>

        {/* Image */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setImageDialogOpen(true)}
          className="h-8 w-8 p-0"
          aria-label={t('website.editor.toolbar.image') || 'Image'}
          title={t('website.editor.toolbar.image') || 'Image'}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Undo/Redo */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 w-8 p-0"
          aria-label={t('website.editor.toolbar.undo') || 'Undo'}
          title={t('website.editor.toolbar.undo') || 'Undo'}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 w-8 p-0"
          aria-label={t('website.editor.toolbar.redo') || 'Redo'}
          title={t('website.editor.toolbar.redo') || 'Redo'}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('website.editor.link.title') || 'Insert Link'}</DialogTitle>
            <DialogDescription>
              {t('website.editor.link.description') || 'Enter the URL for the link'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="link-url">{t('website.editor.link.url') || 'URL'}</Label>
              <Input
                id="link-url"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSetLink();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button type="button" onClick={handleSetLink}>
              {t('website.editor.link.insert') || 'Insert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('website.editor.image.title') || 'Insert Image'}</DialogTitle>
            <DialogDescription>
              {t('website.editor.image.description') || 'Enter image URL or upload a file'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="image-url">{t('website.editor.image.url') || 'Image URL'}</Label>
              <Input
                id="image-url"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleInsertImage();
                  }
                }}
              />
            </div>
            {onImageUpload && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {t('website.editor.image.or') || 'OR'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image-file">{t('website.editor.image.upload') || 'Upload Image'}</Label>
                  <Input
                    id="image-file"
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileUpload}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImageDialogOpen(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button type="button" onClick={handleInsertImage}>
              {t('website.editor.image.insert') || 'Insert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
