import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Building2, Users, DollarSign, Eye, Edit } from "lucide-react";
import type { HostelRoom } from "@/hooks/useHostel";

interface RoomCardProps {
  room: HostelRoom;
  onViewDetails: (room: HostelRoom) => void;
  onEdit: (room: HostelRoom) => void;
}

export function RoomCard({ room, onViewDetails, onEdit }: RoomCardProps) {
  const occupancyPercentage = (room.occupied_count / room.capacity) * 100;
  const isAvailable = room.occupied_count < room.capacity;
  
  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Room {room.room_number}</CardTitle>
              <p className="text-sm text-muted-foreground">Floor {room.floor}</p>
            </div>
          </div>
          <Badge variant={isAvailable ? "default" : "secondary"}>
            {isAvailable ? "Available" : "Full"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Occupancy</span>
            <span className="font-medium">{room.occupied_count}/{room.capacity}</span>
          </div>
          <Progress value={occupancyPercentage} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{room.room_type}</span>
          </div>
          {room.monthly_fee && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>₹{room.monthly_fee}</span>
            </div>
          )}
        </div>

        {room.facilities && room.facilities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {room.facilities.slice(0, 3).map((facility) => (
              <Badge key={facility} variant="outline" className="text-xs">
                {facility}
              </Badge>
            ))}
            {room.facilities.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{room.facilities.length - 3} more
              </Badge>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewDetails(room)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Details
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(room)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
