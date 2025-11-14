import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserMinus, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { HostelAllocation } from "@/hooks/useHostel";

interface StudentAllocationCardProps {
  allocation: HostelAllocation;
  onCheckout: (allocation: HostelAllocation) => void;
}

const statusVariants = {
  active: "default",
  pending: "secondary",
  checkout: "outline",
} as const;

export function StudentAllocationCard({ allocation, onCheckout }: StudentAllocationCardProps) {
  const studentName = allocation.student?.profiles?.full_name || "Unknown Student";
  const initials = studentName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold truncate">{studentName}</h4>
              <Badge variant={statusVariants[allocation.status as keyof typeof statusVariants] || "default"}>
                {allocation.status}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>Room {allocation.room?.room_number}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Since {format(new Date(allocation.allocated_date), "MMM dd, yyyy")}</span>
              </div>
            </div>
          </div>

          {allocation.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCheckout(allocation)}
            >
              <UserMinus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
