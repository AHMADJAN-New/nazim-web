import { useState } from "react";
import { useHostelRooms, useCreateHostelRoom, useUpdateHostelRoom } from "@/hooks/useHostel";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Bed, Users, Plus, Search, Filter, LayoutGrid, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RoomCard } from "@/components/hostel/RoomCard";
import { LoadingSpinner } from "@/components/ui/loading";

const roomTypes = ["single", "double", "triple", "dormitory"];
const statusOptions = ["available", "occupied", "maintenance", "reserved"];
const facilityOptions = [
  "AC", "Fan", "Attached Bathroom", "Common Bathroom", "Study Table", 
  "Wardrobe", "Balcony", "WiFi", "Common Study Area", "Refrigerator"
];
const statusVariants = {
  available: "default",
  occupied: "secondary",
  maintenance: "destructive",
  reserved: "outline"
} as const;

export default function RoomManagementPage() {
  const { toast } = useToast();
  const { data: rooms = [], isLoading, refetch } = useHostelRooms();
  const createRoom = useCreateHostelRoom();
  const updateRoom = useUpdateHostelRoom();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.room_number.toLowerCase().includes(searchQuery.toLowerCase());
    // Since hostel_rooms doesn't have status field, we'll filter by availability
    const isAvailable = (room.occupied_count || 0) < room.capacity;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "available" && isAvailable) ||
                         (statusFilter === "occupied" && !isAvailable);
    return matchesSearch && matchesStatus;
  });

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(r => r.occupied_count === r.capacity).length;
  const availableRooms = rooms.filter(r => r.occupied_count < r.capacity).length;
  const totalCapacity = rooms.reduce((sum, room) => sum + (room.capacity || 0), 0);
  const currentOccupancy = rooms.reduce((sum, room) => sum + (room.occupied_count || 0), 0);

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const facilities = Array.from(formData.getAll('facilities')) as string[];
    
    createRoom.mutate({
      room_number: formData.get('roomNumber') as string,
      floor: Number(formData.get('floor')),
      room_type: formData.get('roomType') as string,
      capacity: Number(formData.get('capacity')),
      occupied_count: 0, // Initialize as empty
      monthly_fee: Number(formData.get('monthlyFee')),
      facilities,
      branch_id: 'branch-1' // Default branch
    });
    
    setIsAddRoomOpen(false);
  };

  const handleEditRoom = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingRoom) return;

    const formData = new FormData(e.currentTarget);
    const facilities = Array.from(formData.getAll('facilities')) as string[];
    const capacity = Number(formData.get('capacity'));
    const monthlyFee = Number(formData.get('monthlyFee'));

    if (
      !formData.get('roomNumber') ||
      !formData.get('roomType') ||
      Number.isNaN(capacity) ||
      Number.isNaN(monthlyFee)
    ) {
      toast({
        title: 'Invalid input',
        description: 'Please provide valid room details.',
        variant: 'destructive',
      });
      return;
    }

    if (capacity < (editingRoom.occupied_count || 0)) {
      toast({
        title: 'Invalid capacity',
        description: `Capacity cannot be less than current occupancy (${editingRoom.occupied_count || 0}).`,
        variant: 'destructive',
      });
      return;
    }

    updateRoom.mutate(
      {
        id: editingRoom.id,
        room_number: formData.get('roomNumber') as string,
        floor: Number(formData.get('floor')),
        room_type: formData.get('roomType') as string,
        capacity,
        monthly_fee: monthlyFee,
        facilities,
      },
      {
        onSuccess: () => {
          setIsEditRoomOpen(false);
          setEditingRoom(null);
          refetch();
        },
        onError: (error: any) => {
          toast({
            title: 'Failed to update room',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const viewRoomDetails = (room: any) => {
    setSelectedRoom(room);
    setIsDetailsDialogOpen(true);
  };

  const editRoom = (room: any) => {
    setEditingRoom(room);
    setIsEditRoomOpen(true);
  };

  if (isLoading) {
    return (
      <MainLayout title="Room Management">
        <LoadingSpinner />
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="Room Management" 
      showBreadcrumb={true}
      breadcrumbItems={[
        { label: "Hostel", href: "/hostel" },
        { label: "Room Management" }
      ]}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRooms}</div>
              <p className="text-xs text-muted-foreground">Across all blocks</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupied Rooms</CardTitle>
              <Bed className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{occupiedRooms}</div>
              <p className="text-xs text-muted-foreground">{totalRooms > 0 ? Math.round((occupiedRooms/totalRooms)*100) : 0}% occupancy rate</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Rooms</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{availableRooms}</div>
              <p className="text-xs text-muted-foreground">Ready for assignment</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bed Occupancy</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentOccupancy}/{totalCapacity}</div>
              <p className="text-xs text-muted-foreground">{totalCapacity > 0 ? Math.round((currentOccupancy/totalCapacity)*100) : 0}% capacity used</p>
            </CardContent>
          </Card>
        </div>

        {/* Rooms Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Room Inventory</CardTitle>
                <CardDescription>Manage hostel rooms and their occupancy</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "list")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="grid">
                      <LayoutGrid className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger value="list">
                      <List className="h-4 w-4" />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button onClick={() => setIsAddRoomOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Room
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
              <div className="flex-1 w-full relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2" />
                <Input
                  placeholder="Search by room number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {viewMode === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onViewDetails={viewRoomDetails}
                    onEdit={editRoom}
                  />
                ))}
                {filteredRooms.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    <Building className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No rooms found</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Room</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Occupancy</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Fee</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRooms.map((room) => (
                      <tr key={room.id} className="border-b">
                        <td className="p-4">
                          <div>
                            <div className="font-medium">Room {room.room_number}</div>
                            <div className="text-sm text-muted-foreground">Floor {room.floor}</div>
                          </div>
                        </td>
                        <td className="p-4 capitalize">{room.room_type}</td>
                        <td className="p-4">{room.occupied_count}/{room.capacity}</td>
                        <td className="p-4">₹{room.monthly_fee}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => viewRoomDetails(room)}>
                              Details
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => editRoom(room)}>
                              Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredRooms.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-muted-foreground">
                          No rooms found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Room Dialog */}
        <Dialog open={isAddRoomOpen} onOpenChange={setIsAddRoomOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Room</DialogTitle>
              <DialogDescription>
                Add a new room to the hostel inventory.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddRoom}>
              <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="roomNumber" className="text-right">Room Number</Label>
                  <Input id="roomNumber" name="roomNumber" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="floor" className="text-right">Floor</Label>
                  <Input id="floor" name="floor" type="number" min="1" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="roomType" className="text-right">Room Type</Label>
                  <Select name="roomType" required>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.map(type => (
                        <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="capacity" className="text-right">Capacity</Label>
                  <Input id="capacity" name="capacity" type="number" min="1" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="monthlyFee" className="text-right">Monthly Fee</Label>
                  <Input id="monthlyFee" name="monthlyFee" type="number" min="0" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right">Facilities</Label>
                  <div className="col-span-3 grid grid-cols-2 gap-2">
                    {facilityOptions.map(facility => (
                      <div key={facility} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id={facility} 
                          name="facilities" 
                          value={facility}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={facility} className="text-sm">{facility}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createRoom.isPending}>
                  {createRoom.isPending ? 'Adding...' : 'Add Room'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Room Dialog */}
        <Dialog open={isEditRoomOpen} onOpenChange={setIsEditRoomOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Room</DialogTitle>
              <DialogDescription>
                Update room information and settings.
              </DialogDescription>
            </DialogHeader>
            {editingRoom && (
              <form onSubmit={handleEditRoom}>
                <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="editRoomNumber" className="text-right">Room Number</Label>
                    <Input id="editRoomNumber" name="roomNumber" defaultValue={editingRoom.room_number} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="editFloor" className="text-right">Floor</Label>
                    <Input id="editFloor" name="floor" type="number" min="1" defaultValue={editingRoom.floor} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="editRoomType" className="text-right">Room Type</Label>
                    <Select name="roomType" defaultValue={editingRoom.room_type} required>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roomTypes.map(type => (
                          <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="editCapacity" className="text-right">Capacity</Label>
                    <Input id="editCapacity" name="capacity" type="number" min="1" defaultValue={editingRoom.capacity} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="editMonthlyFee" className="text-right">Monthly Fee</Label>
                    <Input id="editMonthlyFee" name="monthlyFee" type="number" min="0" defaultValue={editingRoom.monthly_fee} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right">Facilities</Label>
                    <div className="col-span-3 grid grid-cols-2 gap-2">
                      {facilityOptions.map(facility => (
                        <div key={facility} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`edit-${facility}`}
                            name="facilities"
                            value={facility}
                            defaultChecked={editingRoom.facilities?.includes(facility)}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={`edit-${facility}`} className="text-sm">{facility}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={updateRoom.isPending}>
                    {updateRoom.isPending ? 'Updating...' : 'Update Room'}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Room Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Room Details</DialogTitle>
            </DialogHeader>
            {selectedRoom && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Room Number</Label>
                    <p className="text-sm">{selectedRoom.room_number}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Floor</Label>
                    <p className="text-sm">{selectedRoom.floor}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Room Type</Label>
                    <p className="text-sm capitalize">{selectedRoom.room_type}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Capacity</Label>
                    <p className="text-sm">{selectedRoom.capacity} students</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Current Occupancy</Label>
                    <p className="text-sm">{selectedRoom.occupied_count || 0} students</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Monthly Fee</Label>
                    <p className="text-sm">₹{selectedRoom.monthly_fee}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Facilities</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedRoom.facilities?.map((facility: string) => (
                      <Badge key={facility} variant="secondary">{facility}</Badge>
                    )) || <span className="text-sm text-muted-foreground">No facilities listed</span>}
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => setIsDetailsDialogOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}