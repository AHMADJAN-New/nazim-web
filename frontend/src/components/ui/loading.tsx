// Unified loading components - all use ID card page spinner style

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  fullScreen?: boolean;
}

/**
 * Unified loading spinner component - matches ID card page style
 */
export function LoadingSpinner({ 
  size = "md", 
  text, 
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-16 w-16",
    lg: "h-32 w-32"
  };

  const containerClass = fullScreen 
    ? "min-h-screen flex items-center justify-center" 
    : "flex items-center justify-center h-64";

  return (
    <div className={containerClass}>
      <div className="text-center space-y-4">
        <div className={`animate-spin rounded-full ${sizeClasses[size]} border-b-2 border-primary mx-auto`}></div>
        {text && (
          <p className="text-sm text-muted-foreground">{text}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Unified page skeleton loader - uses ID card page spinner style
 */
export function PageSkeleton() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>
  );
}

/**
 * Dashboard-specific skeleton - uses ID card page spinner style
 */
export function DashboardSkeleton() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>
  );
}

/**
 * Table skeleton loader - uses ID card page spinner style
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>
  );
}

