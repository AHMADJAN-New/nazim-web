import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useWebsiteMedia } from '@/website/hooks/useWebsiteManager';
import { resolveMediaUrl } from '@/website/lib/mediaUrl';
import { ImageIcon, FileIcon } from 'lucide-react';

interface MediaPickerProps {
  value?: string | string[] | null;
  onChange: (path: string | string[] | null) => void;
  type?: 'image' | 'document' | 'all';
  /** When true, allows selecting multiple items; value/onChange use string[] */
  multiple?: boolean;
  /** When true, only show the trigger button (no path input). Use with custom label. */
  buttonOnly?: boolean;
  /** Custom label (default "Media"). Omit when using buttonOnly with your own label. */
  label?: string;
  /** Trigger button text when buttonOnly (default "Browse" / "Select from library"). */
  triggerLabel?: string;
}

export function MediaPicker({
  value,
  onChange,
  type = 'all',
  multiple = false,
  buttonOnly = false,
  label = 'Media',
  triggerLabel,
}: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const { data: media = [], isLoading } = useWebsiteMedia();

  const filteredMedia =
    type === 'image'
      ? media.filter((m) => m.type === 'image')
      : type === 'document'
        ? media.filter((m) => m.type === 'document')
        : media;

  const valuePaths = multiple
    ? (Array.isArray(value) ? value : value ? [value] : [])
    : [];
  const singleValue = multiple ? (valuePaths[0] ?? '') : (typeof value === 'string' ? value : value ?? '');

  const selectedMedia = media.find((m) => m.filePath === singleValue);
  const selectedMultiple = media.filter((m) => valuePaths.includes(m.filePath));

  const handleSelect = (itemPath: string) => {
    if (multiple) {
      const current = valuePaths.includes(itemPath)
        ? valuePaths.filter((p) => p !== itemPath)
        : [...valuePaths, itemPath];
      onChange(current.length ? current : null);
    } else {
      onChange(itemPath);
      setOpen(false);
    }
  };

  const handleConfirmMultiple = () => {
    setOpen(false);
  };

  const triggerText = triggerLabel ?? (multiple ? 'Select from library' : 'Browse');

  return (
    <div className="space-y-2">
      {!buttonOnly && <Label>{label}</Label>}
      <div className="flex items-center gap-2 flex-wrap">
        {!buttonOnly && (
          <Input
            value={multiple ? valuePaths.join(', ') : (singleValue || '')}
            onChange={(e) =>
              multiple ? onChange(e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : null) : onChange(e.target.value || null)
            }
            placeholder={multiple ? 'Select from library (multiple)' : 'Enter path or select from library'}
            className="min-w-[200px] flex-1"
          />
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              {triggerText}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby="media-picker-desc">
            <DialogHeader>
              <DialogTitle>{multiple ? 'Select media (multiple)' : 'Select media'}</DialogTitle>
              <DialogDescription id="media-picker-desc">
                {multiple ? 'Choose one or more items from the media library.' : 'Choose an item from the media library.'}
              </DialogDescription>
            </DialogHeader>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Loading media...</p>
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">
                  {type === 'document' ? 'No documents in library. Upload in Media first.' : 'No media found. Upload in Media first.'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredMedia.map((item) => {
                    const isSelected = multiple ? valuePaths.includes(item.filePath) : singleValue === item.filePath;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item.filePath)}
                        className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-colors ${
                          isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {item.type === 'image' ? (
                          <img
                            src={resolveMediaUrl(item.filePath)}
                            alt={item.altText || item.fileName || 'Media'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <FileIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="bg-primary text-primary-foreground rounded-full p-1">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          </div>
                        )}
                        {multiple && isSelected && (
                          <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">
                            {valuePaths.indexOf(item.filePath) + 1}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {multiple && valuePaths.length > 0 && (
                  <div className="flex justify-end pt-2 border-t">
                    <Button type="button" onClick={handleConfirmMultiple}>
                      Use {valuePaths.length} selected
                    </Button>
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
      {selectedMedia && !multiple && (
        <p className="text-xs text-muted-foreground">
          Selected: {selectedMedia.fileName || selectedMedia.filePath}
        </p>
      )}
      {multiple && selectedMultiple.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Selected: {selectedMultiple.length} item(s)
        </p>
      )}
    </div>
  );
}

