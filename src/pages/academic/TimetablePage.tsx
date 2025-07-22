import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Plus, Edit, Trash2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface TimetableEntry {
  id: string;
  day: string;
  time: string;
  subject: string;
  teacher: string;
  room: string;
  class: string;
}

const mockTimetable: TimetableEntry[] = [
  { id: "1", day: "Monday", time: "08:00-09:00", subject: "Mathematics", teacher: "Mr. Smith", room: "101", class: "Grade 5A" },
  { id: "2", day: "Monday", time: "09:00-10:00", subject: "English", teacher: "Ms. Johnson", room: "102", class: "Grade 5A" },
  { id: "3", day: "Monday", time: "10:00-11:00", subject: "Science", teacher: "Dr. Brown", room: "Lab 1", class: "Grade 5A" },
  { id: "4", day: "Tuesday", time: "08:00-09:00", subject: "History", teacher: "Mr. Wilson", room: "103", class: "Grade 5A" },
  { id: "5", day: "Tuesday", time: "09:00-10:00", subject: "Mathematics", teacher: "Mr. Smith", room: "101", class: "Grade 5A" },
];

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const timeSlots = [
  "08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00",
  "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00"
];

export default function TimetablePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [timetable, setTimetable] = useState<TimetableEntry[]>(mockTimetable);
  const [selectedClass, setSelectedClass] = useState("Grade 5A");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);

  const [formData, setFormData] = useState({
    day: "",
    time: "",
    subject: "",
    teacher: "",
    room: "",
    class: selectedClass
  });

  const classes = ["Grade 1A", "Grade 2A", "Grade 3A", "Grade 4A", "Grade 5A", "Grade 6A"];
  const subjects = ["Mathematics", "English", "Science", "History", "Geography", "Art", "Physical Education"];
  const teachers = ["Mr. Smith", "Ms. Johnson", "Dr. Brown", "Mr. Wilson", "Ms. Davis"];
  const rooms = ["101", "102", "103", "Lab 1", "Lab 2", "Gym", "Art Room"];

  const filteredTimetable = timetable.filter(entry => entry.class === selectedClass);

  const getTimetableGrid = () => {
    const grid: { [key: string]: TimetableEntry | null } = {};
    
    days.forEach(day => {
      timeSlots.forEach(time => {
        const key = `${day}-${time}`;
        const entry = filteredTimetable.find(e => e.day === day && e.time === time);
        grid[key] = entry || null;
      });
    });
    
    return grid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for conflicts
    const hasConflict = timetable.some(entry =>
      entry.day === formData.day &&
      entry.time === formData.time &&
      entry.class === formData.class &&
      entry.id !== editingEntry?.id
    );

    if (hasConflict) {
      toast({
        title: "Time Conflict",
        description: "This time slot is already occupied",
        variant: "destructive"
      });
      return;
    }

    if (editingEntry) {
      setTimetable(prev => prev.map(entry =>
        entry.id === editingEntry.id ? { ...entry, ...formData } : entry
      ));
      toast({
        title: "Timetable Updated",
        description: "Timetable entry has been updated successfully"
      });
    } else {
      const newEntry: TimetableEntry = {
        id: Date.now().toString(),
        ...formData
      };
      setTimetable(prev => [...prev, newEntry]);
      toast({
        title: "Timetable Added",
        description: "New timetable entry has been added successfully"
      });
    }

    setFormData({ day: "", time: "", subject: "", teacher: "", room: "", class: selectedClass });
    setEditingEntry(null);
    setIsAddDialogOpen(false);
  };

  const handleEdit = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setFormData({
      day: entry.day,
      time: entry.time,
      subject: entry.subject,
      teacher: entry.teacher,
      room: entry.room,
      class: entry.class
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setTimetable(prev => prev.filter(entry => entry.id !== id));
    toast({
      title: "Entry Deleted",
      description: "Timetable entry has been deleted successfully"
    });
  };

  const grid = getTimetableGrid();

  return (
    <MainLayout title="Timetable Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Timetable Management</h1>
            <p className="text-muted-foreground">Manage class schedules and timetables</p>
          </div>
          <div className="flex gap-4">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {classes.map(cls => (
                  <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingEntry(null);
                  setFormData({ day: "", time: "", subject: "", teacher: "", room: "", class: selectedClass });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingEntry ? 'Edit Timetable Entry' : 'Add New Entry'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="day">Day</Label>
                      <Select
                        value={formData.day}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, day: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {days.map(day => (
                            <SelectItem key={day} value={day}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="time">Time</Label>
                      <Select
                        value={formData.time}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, time: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map(time => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Select
                        value={formData.subject}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map(subject => (
                            <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="teacher">Teacher</Label>
                      <Select
                        value={formData.teacher}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, teacher: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select teacher" />
                        </SelectTrigger>
                        <SelectContent>
                          {teachers.map(teacher => (
                            <SelectItem key={teacher} value={teacher}>{teacher}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="room">Room</Label>
                      <Select
                        value={formData.room}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, room: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select room" />
                        </SelectTrigger>
                        <SelectContent>
                          {rooms.map(room => (
                            <SelectItem key={room} value={room}>{room}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="class">Class</Label>
                      <Select
                        value={formData.class}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, class: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map(cls => (
                            <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingEntry ? 'Update' : 'Add'} Entry
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Timetable Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timetable for {selectedClass}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Time</TableHead>
                    {days.map(day => (
                      <TableHead key={day} className="text-center min-w-40">{day}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeSlots.map(time => (
                    <TableRow key={time}>
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {time}
                        </div>
                      </TableCell>
                      {days.map(day => {
                        const entry = grid[`${day}-${time}`];
                        return (
                          <TableCell key={`${day}-${time}`} className="p-1">
                            {entry ? (
                              <div className="p-2 bg-primary/5 border border-primary/20 rounded-md space-y-1">
                                <div className="font-medium text-sm">{entry.subject}</div>
                                <div className="text-xs text-muted-foreground">{entry.teacher}</div>
                                <div className="text-xs text-muted-foreground">{entry.room}</div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleEdit(entry)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleDelete(entry.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="h-20 border-2 border-dashed border-muted rounded-md flex items-center justify-center text-muted-foreground text-xs">
                                Free
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}