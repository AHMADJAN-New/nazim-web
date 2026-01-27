import { X } from "lucide-react";
import { memo, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

import type { NavigationItem, NavigationChild } from "./SmartSidebar";

interface SecondarySidebarProps {
  open: boolean;
  onClose: () => void;
  item: NavigationItem | null;
  isRTL: boolean;
  collapsed: boolean;
  onItemClick?: () => void; // Callback when an item is clicked
}

export const SecondarySidebar = memo(function SecondarySidebar({
  open,
  onClose,
  item,
  isRTL,
  collapsed,
  onItemClick,
}: SecondarySidebarProps) {
  const { t, tUnsafe } = useLanguage();
  const location = useLocation();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close on ESC key
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // Don't close on click outside - keep sidebar persistent
  // User can manually close using the close button

  // Don't auto-close on navigation - let user manually close or click item
  // The secondary sidebar will stay open until user closes it or clicks an item

  // Debug logging
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[SecondarySidebar] Props:', {
        open,
        collapsed,
        hasItem: !!item,
        hasChildren: !!item?.children,
        childrenCount: item?.children?.length,
        itemTitleKey: item?.titleKey,
      });
    }
  }, [open, collapsed, item]);

  // Don't show secondary sidebar if not open or no item
  if (!open) {
    if (import.meta.env.DEV) {
      console.log('[SecondarySidebar] Not open, returning null');
    }
    return null;
  }

  if (!item || !item.children) {
    if (import.meta.env.DEV) {
      console.log('[SecondarySidebar] No item or children, returning null', { item, hasChildren: !!item?.children });
    }
    return null;
  }

  // Note: We show secondary sidebar even when main sidebar is collapsed
  // because we control the main sidebar state - when secondary opens, main collapses

  const isActive = (path: string) => location.pathname === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
      : "hover:bg-sidebar-accent/50";

  const label = tUnsafe(`nav.${item.titleKey}`);

  // Render inline (not as portal) - part of the layout
  // When closed, hide it but keep it in the layout flow (width 0)
  return (
    <div
      ref={sidebarRef}
      className={cn(
        "flex-shrink-0 bg-sidebar text-sidebar-foreground border-sidebar-border",
        "transition-all duration-300 ease-in-out overflow-hidden h-screen flex flex-col",
        // Border based on RTL
        isRTL ? "border-l" : "border-r",
        open
          ? "w-64 opacity-100"
          : "w-0 opacity-0 pointer-events-none border-0"
      )}
      role="complementary"
      aria-label={label}
    >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between p-4 border-b border-sidebar-border",
            isRTL && "flex-row-reverse"
          )}
        >
          <h2
            className={cn(
              "text-sm font-semibold text-sidebar-foreground",
              isRTL && "text-right"
            )}
          >
            {label}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
            aria-label={t("common.close") || "Close"}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <SidebarContent className="overflow-y-auto">
          <SidebarMenu className="p-2">
            {item.children.map((child: NavigationChild) => {
              const childLabel = child.titleKey
                ? tUnsafe(`nav.${child.titleKey}`)
                : child.title;
              const isChildActiveNow = child.url
                ? isActive(child.url)
                : false;

              return (
                <SidebarMenuItem
                  key={child.url || child.titleKey || child.title}
                  data-sidebar-menu-item
                  data-active={isChildActiveNow}
                >
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={child.url || "#"}
                      className={cn(
                        "transition-all duration-200",
                        getNavCls({ isActive: isChildActiveNow })
                      )}
                      end={(child.url || "#") === "/"}
                      onClick={() => {
                        // Keep secondary sidebar open when item is clicked
                        // Only expand main sidebar if needed
                        if (onItemClick) {
                          onItemClick();
                        }
                        // Don't close secondary sidebar - keep it persistent
                      }}
                    >
                      <child.icon className="h-4 w-4" />
                      <span className="flex-1">{childLabel}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
      </div>
  );
});

