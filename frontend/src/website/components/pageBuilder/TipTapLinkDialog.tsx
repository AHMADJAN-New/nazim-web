import { Editor } from '@tiptap/react';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface TipTapLinkDialogProps {
  editor: Editor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TipTapLinkDialog({ editor, open, onOpenChange }: TipTapLinkDialogProps) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [openInNewTab, setOpenInNewTab] = useState(false);

  // Get current link if editor has a link selected
  useEffect(() => {
    if (open && editor) {
      const { from, to } = editor.state.selection;
      const linkMark = editor.getAttributes('link');
      
      if (linkMark.href) {
        setUrl(linkMark.href);
        // Get selected text
        const selectedText = editor.state.doc.textBetween(from, to);
        setText(selectedText || linkMark.href);
      } else {
        // Get selected text for new link
        const selectedText = editor.state.doc.textBetween(from, to);
        setText(selectedText);
        setUrl('');
      }
    }
  }, [open, editor]);

  const handleInsert = () => {
    if (!url.trim()) {
      return;
    }

    // If there's selected text, wrap it with a link
    // Otherwise, insert the URL as both text and link
    const linkText = text.trim() || url;
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;

    if (hasSelection) {
      // Wrap selected text with link
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({
          href: url,
          target: openInNewTab ? '_blank' : null,
        })
        .run();
    } else {
      // Insert new link with text
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: linkText,
          marks: [
            {
              type: 'link',
              attrs: {
                href: url,
                target: openInNewTab ? '_blank' : null,
              },
            },
          ],
        })
        .run();
    }

    handleClose();
  };

  const handleRemove = () => {
    editor.chain().focus().unsetLink().run();
    handleClose();
  };

  const handleClose = () => {
    setUrl('');
    setText('');
    setOpenInNewTab(false);
    onOpenChange(false);
  };

  const hasLink = editor?.isActive('link');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{hasLink ? 'Edit Link' : 'Insert Link'}</DialogTitle>
          <DialogDescription>
            {hasLink
              ? 'Update the link URL or remove it'
              : 'Add a link to your content'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="link-url">URL *</Label>
            <Input
              id="link-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleInsert();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="link-text">Link Text</Label>
            <Input
              id="link-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Link text (optional)"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use the URL as the link text
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="open-new-tab"
              checked={openInNewTab}
              onCheckedChange={(checked) => setOpenInNewTab(checked === true)}
            />
            <Label
              htmlFor="open-new-tab"
              className="text-sm font-normal cursor-pointer"
            >
              Open in new tab
            </Label>
          </div>
        </div>

        <DialogFooter>
          {hasLink && (
            <Button type="button" variant="destructive" onClick={handleRemove}>
              Remove Link
            </Button>
          )}
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleInsert} disabled={!url.trim()}>
            {hasLink ? 'Update Link' : 'Insert Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

