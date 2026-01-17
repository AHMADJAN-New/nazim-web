import { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  color?: "primary" | "secondary" | "success" | "warning" | "destructive" | "blue" | "green" | "purple" | "amber" | "red" | "yellow" | "cyan" | "emerald" | "orange";
  onClick?: () => void;
  showButton?: boolean;
  buttonText?: string;
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend,
  color = "primary",
  onClick,
  showButton = false,
  buttonText
}: StatsCardProps) {
  const colorClasses = {
    primary: {
      circle: "bg-primary/10",
      iconBg: "bg-primary/10",
      icon: "text-primary dark:text-primary",
      value: "text-primary"
    },
    secondary: {
      circle: "bg-secondary/10",
      iconBg: "bg-secondary/10",
      icon: "text-secondary dark:text-secondary",
      value: "text-secondary"
    },
    success: {
      circle: "bg-green-500/10",
      iconBg: "bg-green-500/10",
      icon: "text-green-600 dark:text-green-400",
      value: "text-green-600"
    },
    warning: {
      circle: "bg-amber-500/10",
      iconBg: "bg-amber-500/10",
      icon: "text-amber-600 dark:text-amber-400",
      value: "text-amber-600"
    },
    destructive: {
      circle: "bg-red-500/10",
      iconBg: "bg-red-500/10",
      icon: "text-red-600 dark:text-red-400",
      value: "text-red-600"
    },
    blue: {
      circle: "bg-blue-500/10",
      iconBg: "bg-blue-500/10",
      icon: "text-blue-600 dark:text-blue-400",
      value: "text-blue-600"
    },
    green: {
      circle: "bg-green-500/10",
      iconBg: "bg-green-500/10",
      icon: "text-green-600 dark:text-green-400",
      value: "text-green-600"
    },
    purple: {
      circle: "bg-purple-500/10",
      iconBg: "bg-purple-500/10",
      icon: "text-purple-600 dark:text-purple-400",
      value: "text-purple-600"
    },
    amber: {
      circle: "bg-amber-500/10",
      iconBg: "bg-amber-500/10",
      icon: "text-amber-600 dark:text-amber-400",
      value: "text-amber-600"
    },
    red: {
      circle: "bg-red-500/10",
      iconBg: "bg-red-500/10",
      icon: "text-red-600 dark:text-red-400",
      value: "text-red-600"
    },
    yellow: {
      circle: "bg-yellow-500/10",
      iconBg: "bg-yellow-500/10",
      icon: "text-yellow-600 dark:text-yellow-400",
      value: "text-yellow-600"
    },
    cyan: {
      circle: "bg-cyan-500/10",
      iconBg: "bg-cyan-500/10",
      icon: "text-cyan-600 dark:text-cyan-400",
      value: "text-cyan-600"
    },
    emerald: {
      circle: "bg-emerald-500/10",
      iconBg: "bg-emerald-500/10",
      icon: "text-emerald-600 dark:text-emerald-400",
      value: "text-emerald-600"
    },
    orange: {
      circle: "bg-orange-500/10",
      iconBg: "bg-orange-500/10",
      icon: "text-orange-600 dark:text-orange-400",
      value: "text-orange-600"
    }
  };

  const colors = colorClasses[color] || colorClasses.primary;

  return (
    <Card className="relative overflow-hidden shadow-custom-sm hover:shadow-custom-md transition-shadow duration-200">
      <div className={`absolute top-0 right-0 w-32 h-32 ${colors.circle} rounded-full -mr-8 -mt-8 pointer-events-none opacity-50`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${colors.iconBg} flex-shrink-0`}>
          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${colors.icon}`} />
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className={`text-2xl sm:text-3xl font-bold mb-2 break-words ${colors.value}`}>
          {value}
        </div>
        <div className="flex items-center justify-between">
          {description && (
            <p className="text-xs text-muted-foreground break-words">{description}</p>
          )}
          {trend && (
            <Badge 
              variant={trend.isPositive ? "default" : "destructive"}
              className="text-xs"
            >
              {trend.isPositive ? "+" : ""}{trend.value}% {trend.label}
            </Badge>
          )}
        </div>
      </CardContent>
      {showButton && onClick && (
        <CardFooter className="pt-3 pb-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start whitespace-normal sm:whitespace-nowrap"
            onClick={onClick}
          >
            <ArrowUpRight className="h-4 w-4 mr-1.5 flex-shrink-0" />
            <span className="text-left">{buttonText || "View Details"}</span>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}