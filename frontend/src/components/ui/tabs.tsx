import * as TabsPrimitive from "@radix-ui/react-tabs"
import * as React from "react"

import { cn } from "@/lib/utils"

type Dir = "ltr" | "rtl"

function getDocumentDir(): Dir {
  if (typeof document === "undefined") return "ltr"
  return document.documentElement.getAttribute("dir") === "rtl" ? "rtl" : "ltr"
}

function useResolvedDir(explicitDir?: Dir): Dir {
  const [dir, setDir] = React.useState<Dir>(() => explicitDir ?? getDocumentDir())

  React.useEffect(() => {
    if (explicitDir) {
      setDir(explicitDir)
      return
    }

    const root = document.documentElement
    const read = () => (root.getAttribute("dir") === "rtl" ? "rtl" : "ltr")

    // Set initial dir
    setDir(read())

    // Keep in sync when language toggles and the app updates <html dir="...">
    const observer = new MutationObserver(() => setDir(read()))
    observer.observe(root, { attributes: true, attributeFilter: ["dir"] })

    return () => observer.disconnect()
  }, [explicitDir])

  return dir
}

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ dir: explicitDir, ...props }, ref) => {
  const dir = useResolvedDir(explicitDir as Dir | undefined)
  return <TabsPrimitive.Root ref={ref} dir={dir} {...props} />
})
Tabs.displayName = TabsPrimitive.Root.displayName

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, dir: explicitDir, ...props }, ref) => {
  const dir = useResolvedDir(explicitDir as Dir | undefined)

  return (
    <TabsPrimitive.List
      ref={ref}
      dir={dir}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    />
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, dir: explicitDir, ...props }, ref) => {
  const dir = useResolvedDir(explicitDir as Dir | undefined)

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      dir={dir}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        className
      )}
      {...props}
    />
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, dir: explicitDir, ...props }, ref) => {
  const dir = useResolvedDir(explicitDir as Dir | undefined)

  return (
    <TabsPrimitive.Content
      ref={ref}
      dir={dir}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  )
})
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
