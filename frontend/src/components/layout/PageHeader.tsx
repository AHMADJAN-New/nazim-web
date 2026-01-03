import { Plus } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PageHeaderAction = {
  label: string
  onClick?: () => void
  href?: string
  icon?: ReactNode
  disabled?: boolean
}

type PageHeaderSecondaryAction = PageHeaderAction & {
  variant?: "default" | "outline" | "ghost"
}

export interface PageHeaderProps {
  title: string
  description?: string
  icon?: ReactNode
  primaryAction?: PageHeaderAction
  secondaryActions?: PageHeaderSecondaryAction[]
  breadcrumbs?: Array<{ label: string; href?: string }>
  rightSlot?: ReactNode
  showDescriptionOnMobile?: boolean
  mobilePrimaryActionVariant?: "icon" | "sticky"
  className?: string
}

const renderActionButton = (
  action: PageHeaderAction,
  {
    iconOnly = false,
    variant = "default",
    size = "default",
    className,
  }: {
    iconOnly?: boolean
    variant?: "default" | "outline" | "ghost"
    size?: "default" | "sm" | "icon"
    className?: string
  }
) => {
  const content = iconOnly ? (
    action.icon ? (
      <span className="flex items-center">{action.icon}</span>
    ) : (
      <Plus className="h-4 w-4" />
    )
  ) : (
    <>
      {action.icon ? <span className="flex items-center">{action.icon}</span> : null}
      <span>{action.label}</span>
    </>
  )

  if (action.href && !action.disabled) {
    return (
      <Button
        asChild
        variant={variant}
        size={size}
        className={className}
        aria-label={iconOnly ? action.label : undefined}
      >
        <Link to={action.href} onClick={action.onClick}>
          {content}
        </Link>
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={action.onClick}
      className={className}
      aria-label={iconOnly ? action.label : undefined}
      disabled={action.disabled}
    >
      {content}
    </Button>
  )
}

export function PageHeader({
  title,
  description,
  icon,
  primaryAction,
  secondaryActions = [],
  breadcrumbs,
  rightSlot,
  showDescriptionOnMobile = false,
  mobilePrimaryActionVariant = "icon",
  className,
}: PageHeaderProps) {
  const showMobileIconAction = Boolean(primaryAction && mobilePrimaryActionVariant === "icon")

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1
              return (
                <BreadcrumbItem key={`${crumb.label}-${index}`}>
                  {crumb.href && !isLast ? (
                    <BreadcrumbLink asChild>
                      <Link to={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                  {!isLast ? <BreadcrumbSeparator /> : null}
                </BreadcrumbItem>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            {icon ? (
              <span className="hidden md:inline-flex h-6 w-6 items-center justify-center text-muted-foreground">
                {icon}
              </span>
            ) : null}
            <h1 className="text-2xl font-bold leading-tight break-words">{title}</h1>
          </div>
          {description ? (
            <p
              className={cn(
                "text-sm text-muted-foreground",
                showDescriptionOnMobile ? "block" : "hidden md:block"
              )}
            >
              {description}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {showMobileIconAction && primaryAction
            ? renderActionButton(primaryAction, {
                iconOnly: true,
                size: "icon",
                className: "md:hidden",
              })
            : null}

          <div className="hidden md:flex items-center gap-2">
            {secondaryActions.map((action, index) => (
              <span key={`${action.label}-${index}`}>
                {renderActionButton(action, {
                  variant: action.variant || "outline",
                  size: "sm",
                  className: "whitespace-nowrap",
                })}
              </span>
            ))}
            {rightSlot}
            {primaryAction
              ? renderActionButton(primaryAction, {
                  variant: "default",
                  size: "sm",
                  className: "whitespace-nowrap",
                })
              : null}
          </div>
        </div>
      </div>

      {(secondaryActions.length > 0 || rightSlot) && (
        <div className="flex flex-wrap gap-2 md:hidden">
          {secondaryActions.map((action, index) => (
            <span key={`${action.label}-mobile-${index}`}>
              {renderActionButton(action, {
                variant: action.variant || "outline",
                size: "sm",
                className: "whitespace-nowrap",
              })}
            </span>
          ))}
          {rightSlot}
        </div>
      )}

      {primaryAction && mobilePrimaryActionVariant === "sticky" ? (
        <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden">
          {renderActionButton(primaryAction, {
            variant: "default",
            size: "default",
            className: "w-full justify-center",
          })}
        </div>
      ) : null}
    </div>
  )
}
