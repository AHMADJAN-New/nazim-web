import { X } from "lucide-react";
import { memo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  const backdropRef = useRef<HTMLDivElement>(null);

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

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node) &&
        backdropRef.current &&
        backdropRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose]);

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

  // Render using portal to ensure it's at the root level
  const sidebarContent = (
    <>
      {/* Backdrop - covers content area but not sidebars */}
      {open && (
        <div
          ref={backdropRef}
          className={cn(
            "fixed top-0 bottom-0 bg-black/20 z-[35] transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0 pointer-events-none",
            // Position backdrop to start after secondary sidebar (which is after main sidebar)
            // Account for both collapsed and expanded states
            collapsed
              ? isRTL
                ? "right-[calc(3.5rem+16rem)] left-0"   // 3.5rem (main collapsed) + 16rem (secondary)
                : "left-[calc(3.5rem+16rem)] right-0"   // 3.5rem (main collapsed) + 16rem (secondary)
              : isRTL
              ? "right-[calc(18rem+16rem)] left-0"     // 18rem (main expanded) + 16rem (secondary)
              : "left-[calc(18rem+16rem)] right-0"     // 18rem (main expanded) + 16rem (secondary)
          )}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Secondary Sidebar */}
      <div
        ref={sidebarRef}
        className={cn(
          "fixed top-0 bottom-0 z-[60] w-64 bg-sidebar text-sidebar-foreground border-sidebar-border shadow-2xl",
          "transition-all duration-300 ease-in-out",
          // Position next to main sidebar
          // When expanded: sidebar is w-72 (18rem = 288px = 72 * 4px)
          // When collapsed: sidebar is w-14 (3.5rem = 56px = 14 * 4px)
          // LTR: sidebar on left, secondary on right of sidebar
          // RTL: sidebar on right, secondary on left of sidebar
          // Position based on collapsed state
          collapsed
            ? isRTL
              ? "right-14 border-l"  // 3.5rem = 56px from right (collapsed)
              : "left-14 border-r"   // 3.5rem = 56px from left (collapsed)
            : isRTL
            ? "right-72 border-l"    // 18rem = 288px from right (expanded)
            : "left-72 border-r",    // 18rem = 288px from left (expanded)
          open
            ? "translate-x-0 opacity-100"
            : isRTL
            ? "translate-x-full opacity-0"
            : "-translate-x-full opacity-0"
        )}
        role="complementary"
        aria-label={label}
        style={{ height: '100vh' }}
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
                        // Close secondary sidebar and expand main sidebar when item is clicked
                        if (onItemClick) {
                          onItemClick();
                        }
                        onClose();
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
    </>
  );

  // Render to document.body to ensure it's above everything
  return createPortal(sidebarContent, document.body);
});

