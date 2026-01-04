/**
 * Route Tours Handler Component
 * 
 * Handles route-based tour triggering.
 */

import { useRouteTours } from '@/hooks/useRouteTours';

export function RouteToursHandler() {
  useRouteTours();
  return null; // This component doesn't render anything
}

