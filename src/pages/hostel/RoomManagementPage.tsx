import { useState } from "react";
import { useHostelRooms, useCreateHostelRoom } from "@/hooks/useHostel";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building, Bed, Users, Plus, Search, Filter, Edit, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  roomType: 'single' | 'double' | 'triple' | 'dormitory';
  capacity: number;
  currentOccupancy: number;
  monthlyFee: number;
  facilities: string[];
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  building: string;
}

const mockRooms: Room[] = [
  {
    id: "1",
    roomNumber: "101",
    floor: 1,
    roomType: "double",
    capacity: 2,
    currentOccupancy: 2,
    monthlyFee: 3000,
    facilities: ["AC", "Attached Bathroom", "Study Table", "Wardrobe"],
    status: "occupied",
    building: "Block A"
  },
  {
    id: "2",
    roomNumber: "102",
    floor: 1,
    roomType: "single",
    capacity: 1,
    currentOccupancy: 0,
    monthlyFee: 4500,
    facilities: ["AC", "Attached Bathroom", "Study Table", "Wardrobe", "Balcony"],
    status: "available",
    building: "Block A"
  },
  {
    id: "3",
    roomNumber: "201",
    floor: 2,
    roomType: "triple",
    capacity: 3,
    currentOccupancy: 1,
    monthlyFee: 2500,
    facilities: ["Fan", "Common Bathroom", "Study Table", "Wardrobe"],
    status: "available",
    building: "Block B"
  },
  {
    id: "4",
    roomNumber: "301",
    floor: 3,
    roomType: "dormitory",
    capacity: 8,
    currentOccupancy: 6,
    monthlyFee: 1500,
    facilities: ["Fan", "Common Bathroom", "Common Study Area"],
    status: "occupied",
    building: "Block C"
  }
];

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
  const [rooms, setRooms] = useState<Room[]>(mockRooms);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.building.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || room.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
  const availableRooms = rooms.filter(r => r.status === 'available').length;
  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
  const currentOccupancy = rooms.reduce((sum, room) => sum + room.currentOccupancy, 0);

  const handleAddRoom = (newRoom: Partial<Room>) => {
    const room: Room = {
      id: `${rooms.length + 1}`,
      roomNumber: newRoom.roomNumber || "",
      floor: newRoom.floor || 1,
      roomType: newRoom.roomType || "single",
      capacity: newRoom.capacity || 1,
      currentOccupancy: 0,
      monthlyFee: newRoom.monthlyFee || 0,
      facilities: newRoom.facilities || [],
      status: "available",
      building: newRoom.building || ""
    };

    setRooms([...rooms, room]);
    setIsAddRoomOpen(false);
    toast({
      title: "Room Added",
      description: `Room ${room.roomNumber} has been successfully added.`
    });
  };

  const handleEditRoom = (updatedRoom: Partial<Room>) => {
    if (!editingRoom) return;

    const room: Room = {
      ...editingRoom,
      ...updatedRoom,
    };

    setRooms(prev => prev.map(r => r.id === editingRoom.id ? room : r));
    setIsEditRoomOpen(false);
    setEditingRoom(null);
    toast({
      title: "Room Updated",
      description: `Room ${room.roomNumber} has been successfully updated.`
    });
  };

  const handleDeleteRoom = (roomId: string) => {
    setRooms(prev => prev.filter(r => r.id !== roomId));
    toast({
      title: "Room Deleted",
      description: "Room has been successfully deleted."
    });
  };

  const viewRoomDetails = (room: Room) => {
    setSelectedRoom(room);
    setIsDetailsDialogOpen(true);
  };

  const editRoom = (room: Room) => {
    setEditingRoom(room);
    setIsEditRoomOpen(true);
  };

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
              <p className="text-xs text-muted-foreground">{Math.round((occupiedRooms/totalRooms)*100)}% occupancy rate</p>
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
              <p className="text-xs text-muted-foreground">{Math.round((currentOccupancy/totalCapacity)*100)}% capacity used</p>
            </CardContent>
          </Card>
        </div>

        {/* Rooms Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Room Inventory</CardTitle>
                <CardDescription>Manage hostel rooms and their occupancy</CardDescription>
              </div>
              <Button onClick={() => setIsAddRoomOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Room
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2" />
                <Input
                  placeholder="Search by room number or building..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room Number</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Occupancy</TableHead>
                    <TableHead>Monthly Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.roomNumber}</TableCell>
                      <TableCell>{room.building}</TableCell>
                      <TableCell>{room.floor}</TableCell>
                      <TableCell className="capitalize">{room.roomType}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {room.currentOccupancy}/{room.capacity}
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div 
                              className="bg-primary h-1.5 rounded-full" 
                              style={{ width: `${(room.currentOccupancy / room.capacity) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>₹{room.monthlyFee}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[room.status]}>
                          {room.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewRoomDetails(room)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editRoom(room)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRoom(room.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const facilities = Array.from(formData.getAll('facilities')) as string[];
              handleAddRoom({
                roomNumber: formData.get('roomNumber') as string,
                building: formData.get('building') as string,
                floor: Number(formData.get('floor')),
                roomType: formData.get('roomType') as Room['roomType'],
                capacity: Number(formData.get('capacity')),
                monthlyFee: Number(formData.get('monthlyFee')),
                facilities,
              });
            }}>
              <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="roomNumber" className="text-right">Room Number</Label>
                  <Input id="roomNumber" name="roomNumber" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="building" className="text-right">Building</Label>
                  <Input id="building" name="building" className="col-span-3" required />
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
                <Button type="submit">Add Room</Button>
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
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const facilities = Array.from(formData.getAll('facilities')) as string[];
                handleEditRoom({
                  roomNumber: formData.get('roomNumber') as string,
                  building: formData.get('building') as string,
                  floor: Number(formData.get('floor')),
                  roomType: formData.get('roomType') as Room['roomType'],
                  capacity: Number(formData.get('capacity')),
                  monthlyFee: Number(formData.get('monthlyFee')),
                  status: formData.get('status') as Room['status'],
                  facilities,
                });
              }}>
                <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="editRoomNumber" className="text-right">Room Number</Label>
                    <Input id="editRoomNumber" name="roomNumber" defaultValue={editingRoom.roomNumber} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="editBuilding" className="text-right">Building</Label>
                    <Input id="editBuilding" name="building" defaultValue={editingRoom.building} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="editFloor" className="text-right">Floor</Label>
                    <Input id="editFloor" name="floor" type="number" min="1" defaultValue={editingRoom.floor} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="editRoomType" className="text-right">Room Type</Label>
                    <Select name="roomType" defaultValue={editingRoom.roomType} required>
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
                    <Input id="editMonthlyFee" name="monthlyFee" type="number" min="0" defaultValue={editingRoom.monthlyFee} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="editStatus" className="text-right">Status</Label>
                    <Select name="status" defaultValue={editingRoom.status} required>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(status => (
                          <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                            defaultChecked={editingRoom.facilities.includes(facility)}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={`edit-${facility}`} className="text-sm">{facility}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Update Room</Button>
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
                    <p className="text-sm">{selectedRoom.roomNumber}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Building</Label>
                    <p className="text-sm">{selectedRoom.building}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Floor</Label>
                    <p className="text-sm">{selectedRoom.floor}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Room Type</Label>
                    <p className="text-sm capitalize">{selectedRoom.roomType}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Capacity</Label>
                    <p className="text-sm">{selectedRoom.capacity} students</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Current Occupancy</Label>
                    <p className="text-sm">{selectedRoom.currentOccupancy} students</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Monthly Fee</Label>
                    <p className="text-sm">₹{selectedRoom.monthlyFee}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge variant={statusVariants[selectedRoom.status]} className="capitalize">
                      {selectedRoom.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Facilities</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedRoom.facilities.map(facility => (
                      <Badge key={facility} variant="secondary">{facility}</Badge>
                    ))}
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