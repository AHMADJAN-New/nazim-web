import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, BookOpen, User, Download, Printer } from "lucide-react";

const mockTimetable = {
  "Monday": [
    { time: "08:00-08:45", subject: "Mathematics", teacher: "Mr. Ahmad", room: "Room 101" },
    { time: "08:45-09:30", subject: "English", teacher: "Ms. Fatima", room: "Room 102" },
    { time: "09:30-10:15", subject: "Physics", teacher: "Dr. Hassan", room: "Lab 1" },
    { time: "10:15-10:30", subject: "Break", teacher: "", room: "" },
    { time: "10:30-11:15", subject: "Chemistry", teacher: "Ms. Ayesha", room: "Lab 2" },
    { time: "11:15-12:00", subject: "Urdu", teacher: "Mr. Ali", room: "Room 103" }
  ],
  "Tuesday": [
    { time: "08:00-08:45", subject: "Biology", teacher: "Dr. Sara", room: "Lab 3" },
    { time: "08:45-09:30", subject: "Mathematics", teacher: "Mr. Ahmad", room: "Room 101" },
    { time: "09:30-10:15", subject: "Computer Science", teacher: "Mr. Omar", room: "Computer Lab" },
    { time: "10:15-10:30", subject: "Break", teacher: "", room: "" },
    { time: "10:30-11:15", subject: "English", teacher: "Ms. Fatima", room: "Room 102" },
    { time: "11:15-12:00", subject: "Islamic Studies", teacher: "Maulana Qasim", room: "Room 104" }
  ]
};

export default function StudentTimetablePage() {
  const [selectedClass, setSelectedClass] = useState<string>("10-A");
  const [selectedDay, setSelectedDay] = useState<string>("Monday");

  const classes = ["8-A", "8-B", "9-A", "9-B", "10-A", "10-B", "11-A", "11-B"];
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  return (
    <MainLayout title="Student Timetable">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(cls => (
                  <SelectItem key={cls} value={cls}>Class {cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {days.map(day => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Timetable - Class {selectedClass} ({selectedDay})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockTimetable[selectedDay as keyof typeof mockTimetable]?.map((period, index) => (
                <div key={index} className={`flex items-center p-4 rounded-lg border ${
                  period.subject === "Break" ? "bg-muted/50" : "bg-background"
                }`}>
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center text-sm font-medium w-24">
                      <Clock className="h-4 w-4 mr-2" />
                      {period.time}
                    </div>
                    <div className="flex items-center flex-1">
                      <BookOpen className="h-4 w-4 mr-2" />
                      <span className="font-medium">{period.subject}</span>
                    </div>
                    {period.teacher && (
                      <div className="flex items-center text-sm text-muted-foreground w-32">
                        <User className="h-4 w-4 mr-2" />
                        {period.teacher}
                      </div>
                    )}
                    {period.room && (
                      <Badge variant="outline">{period.room}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}