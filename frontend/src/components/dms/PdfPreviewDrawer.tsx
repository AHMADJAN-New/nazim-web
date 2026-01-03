import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

interface PdfPreviewDrawerProps {
  triggerLabel?: string;
  url?: string | null;
}

export function PdfPreviewDrawer({ triggerLabel = "Preview PDF", url }: PdfPreviewDrawerProps) {
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState<string | undefined>();

  useEffect(() => {
    if (open && url) {
      setSrc(url);
    }
  }, [open, url]);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" disabled={!url}>
          {triggerLabel}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-screen overflow-hidden">
        <DrawerHeader>
          <DrawerTitle>PDF Preview</DrawerTitle>
        </DrawerHeader>
        <div className="h-[70vh] w-full p-4">
          {src ? (
            <iframe src={src} title="PDF preview" className="h-full w-full rounded border" />
          ) : (
            <p className="text-sm text-muted-foreground">Generate a PDF to preview it here.</p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
