import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import * as React from "react"

import { useLanguage } from "@/hooks/useLanguage"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
  const { isRTL } = useLanguage();
  // Generate a unique ID for the description if none is provided
  // This suppresses Radix UI's accessibility warning by ensuring aria-describedby always points to a valid element
  const descriptionIdRef = React.useRef<string>(
    `dialog-description-${Math.random().toString(36).substr(2, 9)}`
  );
  
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        dir={isRTL ? 'rtl' : 'ltr'}
        data-rtl={isRTL ? 'true' : undefined}
        aria-describedby={ariaDescribedBy || descriptionIdRef.current}
        className={cn(
          "group fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-1.5rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-4 sm:p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl sm:rounded-lg max-h-[90vh] sm:max-h-[85vh] overflow-y-auto",
          className
        )}
        {...props}
      >
        {children}
        {/* Add hidden description if aria-describedby is not explicitly provided
            This satisfies Radix UI's accessibility requirements and suppresses the warning */}
        {!ariaDescribedBy && (
          <DialogPrimitive.Description id={descriptionIdRef.current} className="sr-only">
            Dialog content
          </DialogPrimitive.Description>
        )}
        <DialogPrimitive.Close 
          className="absolute top-4 right-4 group-[data-rtl=true]:right-auto group-[data-rtl=true]:left-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 text-left items-start group-[data-rtl=true]:text-right group-[data-rtl=true]:items-end",
        className
      )}
      {...props}
    />
  );
}
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 group-[data-rtl=true]:sm:flex-row-reverse group-[data-rtl=true]:sm:justify-start group-[data-rtl=true]:sm:space-x-reverse",
        className
      )}
      {...props}
    />
  );
}
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-left group-[data-rtl=true]:text-right",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground text-left group-[data-rtl=true]:text-right", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
