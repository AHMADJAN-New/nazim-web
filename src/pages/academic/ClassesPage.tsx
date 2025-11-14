import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Edit, Trash2, Users, Calendar, Clock, MapPin, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClasses, useCreateClass } from "@/hooks/useClasses";
import { useSubjects } from "@/hooks/useSubjects";
import { LoadingSpinner } from "@/components/ui/loading";

const timeSlots = [
  "8:00-8:40", "8:40-9:20", "9:20-10:00", "10:20-11:00", 
  "11:00-11:40", "11:40-12:20", "12:20-1:00"
];

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function ClassesPage() {
  const { data: classes = [], isLoading } = useClasses();
  const { data: subjects = [] } = useSubjects();
  const createClassMutation = useCreateClass();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [showNewClassDialog, setShowNewClassDialog] = useState(false);
  const { toast } = useToast();

  const handleDeleteClass = (id: string) => {
    // Delete class logic would go here
    toast({
      title: "Class Deleted",
      description: "Class has been successfully deleted"
    });
  };

  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cls.section || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <MainLayout title="Classes Management">
        <LoadingSpinner />
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="Classes Management"
      showBreadcrumb
      breadcrumbItems={[
        { label: "Academic", href: "/academic" },
        { label: "Classes" }
      ]}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Dialog open={showNewClassDialog} onOpenChange={setShowNewClassDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add New Class
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
                <DialogDescription>
                  Add a new class section to the system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="class-name">Class Name</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nursery">Nursery</SelectItem>
                        <SelectItem value="prep">Prep</SelectItem>
                        <SelectItem value="class-1">Class 1</SelectItem>
                        <SelectItem value="class-2">Class 2</SelectItem>
                        <SelectItem value="class-3">Class 3</SelectItem>
                        <SelectItem value="class-4">Class 4</SelectItem>
                        <SelectItem value="class-5">Class 5</SelectItem>
                        <SelectItem value="class-6">Class 6</SelectItem>
                        <SelectItem value="class-7">Class 7</SelectItem>
                        <SelectItem value="class-8">Class 8</SelectItem>
                        <SelectItem value="class-9">Class 9</SelectItem>
                        <SelectItem value="class-10">Class 10</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="section">Section</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Section" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input id="capacity" type="number" placeholder="40" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room">Room</Label>
                    <Input id="room" placeholder="Room 101" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="teacher">Class Teacher</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher1">استاد احمد</SelectItem>
                      <SelectItem value="teacher2">استاد فاطمہ</SelectItem>
                      <SelectItem value="teacher3">Miss Sarah</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => setShowNewClassDialog(false)}>
                    Create Class
                  </Button>
                  <Button variant="outline" onClick={() => setShowNewClassDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Classes Overview</TabsTrigger>
            <TabsTrigger value="schedule">Time Table</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Classes</p>
                      <p className="text-2xl font-bold">{classes.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                       <p className="text-2xl font-bold">0</p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Average Class Size</p>
                       <p className="text-2xl font-bold">
                         0
                       </p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Capacity Utilization</p>
                      <p className="text-2xl font-bold">92%</p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Class List</CardTitle>
                <CardDescription>
                  Manage all classes and sections in your school
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Class Teacher</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Enrollment</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                    <TableBody>
                      {filteredClasses.map((classInfo) => (
                        <TableRow key={classInfo.id}>
                          <TableCell className="font-medium">{classInfo.name}</TableCell>
                          <TableCell>{classInfo.section || 'N/A'}</TableCell>
                          <TableCell>N/A</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              N/A
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">
                              0
                            </Badge>
                          </TableCell>
                          <TableCell>{classInfo.capacity}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setSelectedClass(classInfo)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Users className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteClass(classInfo.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Time Table Management</CardTitle>
                    <CardDescription>
                      Create and manage class schedules and time tables
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(cls => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name} - {cls.section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button>Edit Schedule</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-border">
                    <thead>
                      <tr>
                        <th className="border border-border p-2 bg-muted">Time</th>
                        {days.map(day => (
                          <th key={day} className="border border-border p-2 bg-muted">{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map(time => (
                        <tr key={time}>
                          <td className="border border-border p-2 font-medium bg-muted/50">{time}</td>
                          {days.map(day => (
                            <td key={`${time}-${day}`} className="border border-border p-2 text-center">
                              <div className="min-h-[60px] flex items-center justify-center">
                                <Button variant="ghost" size="sm" className="text-xs">
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subjects" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Subjects Management</CardTitle>
                    <CardDescription>
                      Manage subjects taught in your school
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Subject
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {subjects.map((subject) => (
                     <Card key={subject.id}>
                       <CardContent className="p-4">
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                             <BookOpen className="w-4 h-4 text-muted-foreground" />
                             <span className="font-medium">{subject.name}</span>
                           </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm">
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rooms" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Rooms Management</CardTitle>
                    <CardDescription>
                      Manage classrooms and their assignments
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Room
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {["Room 101", "Room 102", "Room 103", "Room 201", "Room 202", "Lab 1"].map((room, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{room}</span>
                          </div>
                          <Badge variant={index < 2 ? "default" : "secondary"}>
                            {index < 2 ? "Occupied" : "Available"}
                          </Badge>
                        </div>
                        {index < 2 && (
                          <p className="text-sm text-muted-foreground">
                            Assigned to: Class {6 + index} - {index === 0 ? 'A' : 'B'}
                          </p>
                        )}
                        <div className="flex gap-1 mt-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}