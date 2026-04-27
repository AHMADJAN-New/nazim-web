import { CloudOff } from 'lucide-react';
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsOnline } from '@/hooks/useOfflineStatus';

// Wrapper for Tier C controls — reports, bulk imports, financial
// approvals — that genuinely require a live server connection. When
// online, the children render unchanged; when offline, the child gets
// `disabled` set and a tooltip explains why.
//
// Behaves as a passthrough in the web build (no Electron bridge =>
// useIsOnline returns true), so application code can use it
// unconditionally without branching on platform.
type Props = {
  children: ReactElement<{ disabled?: boolean }>;
  // Optional override message; falls back to a sensible default.
  reason?: ReactNode;
};

export function OfflineDisabled({ children, reason }: Props) {
  const online = useIsOnline();
  if (online || !isValidElement(children)) return children;

  // Force the wrapped element to be disabled. The cloned child takes
  // precedence over any disabled the caller already set so this composes
  // safely even if the parent already disables conditionally.
  const disabledChild = cloneElement(children, { disabled: true });

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          {/*
            * Inline-block wrapper so the tooltip has something to anchor
            * to even though the underlying button is disabled (browsers
            * suppress pointer events on disabled controls).
            */}
          <span className="inline-block">{disabledChild}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="flex items-start gap-2">
            <CloudOff className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
            <span className="text-xs">
              {reason ?? 'Reconnect to the internet to use this action.'}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
