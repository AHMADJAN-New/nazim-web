import { useEffect, useState, type ReactNode } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

export interface FilterPanelProps {
  title?: string
  children: ReactNode
  defaultOpenDesktop?: boolean
  defaultOpenMobile?: boolean
  footer?: ReactNode
  className?: string
}

export function FilterPanel({
  title = "Search & Filter",
  children,
  defaultOpenDesktop = true,
  defaultOpenMobile = false,
  footer,
  className,
}: FilterPanelProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(defaultOpenDesktop)

  useEffect(() => {
    setOpen(isMobile ? defaultOpenMobile : defaultOpenDesktop)
  }, [isMobile, defaultOpenDesktop, defaultOpenMobile])

  return (
    <Card className={cn("w-full", className)}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="px-4 py-3">
          {isMobile ? (
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span>{title}</span>
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">{title}</div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Toggle filters">
                  {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          )}
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-4">{children}</div>
          {footer ? <div className="px-4 pb-4">{footer}</div> : null}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
