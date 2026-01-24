import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useWebsiteMedia } from '@/website/hooks/useWebsiteManager';
import { ImageIcon, FileIcon } from 'lucide-react';

interface MediaPickerProps {
  value?: string | null;
  onChange: (path: string | null) => void;
  type?: 'image' | 'all';
}

export function MediaPicker({ value, onChange, type = 'all' }: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const { data: media = [], isLoading } = useWebsiteMedia();

  const filteredMedia = type === 'image' 
    ? media.filter(m => m.type === 'image')
    : media;

  const selectedMedia = media.find(m => m.filePath === value);

  return (
    <div className="space-y-2">
      <Label>Media</Label>
      <div className="flex items-center gap-2">
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="Enter media path or select from library"
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              Browse
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Select Media</DialogTitle>
            </DialogHeader>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Loading media...</p>
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">No media found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredMedia.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange(item.filePath);
                      setOpen(false);
                    }}
                    className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-colors ${
                      value === item.filePath
                        ? 'border-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {item.type === 'image' ? (
                      <img
                        src={item.filePath}
                        alt={item.altText || item.fileName || 'Media'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <FileIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    {value === item.filePath && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      {selectedMedia && (
        <p className="text-xs text-muted-foreground">
          Selected: {selectedMedia.fileName || selectedMedia.filePath}
        </p>
      )}
    </div>
  );
}

