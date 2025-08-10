import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, BookOpen, User, Download, Printer } from "lucide-react";

interface ScheduleEntry {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject: string | null;
  room: string | null;
  teacher?: {
    full_name: string;
  } | null;
}

export default function StudentTimetablePage() {
  const [selectedClass, setSelectedClass] = useState<string>("10-A");
  const [selectedDay, setSelectedDay] = useState<string>("Monday");

  const classes = ["8-A", "8-B", "9-A", "9-B", "10-A", "10-B", "11-A", "11-B"];
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  const { data: timetable = [] } = useQuery({
    queryKey: ["student-timetable", selectedClass, selectedDay],
    queryFn: async (): Promise<ScheduleEntry[]> => {
      const { data: classRow } = await supabase
        .from("classes")
        .select("id")
        .eq("name", selectedClass)
        .single();

      if (!classRow) return [];

      const { data } = await supabase
        .from("class_schedules")
        .select("id, day_of_week, start_time, end_time, subject, room, teacher:profiles(full_name)")
        .eq("class_id", classRow.id)
        .eq("day_of_week", selectedDay)
        .order("start_time");

      const mapped = (data || []).map((d: any) => ({
        id: d.id,
        day_of_week: d.day_of_week,
        start_time: d.start_time,
        end_time: d.end_time,
        subject: d.subject,
        room: d.room,
        teacher: Array.isArray(d.teacher) ? { full_name: d.teacher[0]?.full_name || '' } : d.teacher,
      }));

      return (mapped as ScheduleEntry[]) || [];
    }
  });

  const handleExport = () => {
    if (!timetable.length) return;
    const header = "Time,Subject,Teacher,Room\n";
    const rows = timetable
      .map(t => `${t.start_time}-${t.end_time},${t.subject || ""},${t.teacher?.full_name || ""},${t.room || ""}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `timetable_${selectedClass}_${selectedDay}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!timetable.length) return;
    const rows = timetable
      .map(
        t => `<tr><td>${t.start_time}-${t.end_time}</td><td>${t.subject || ""}</td><td>${t.teacher?.full_name || ""}</td><td>${t.room || ""}</td></tr>`
      )
      .join("");
    const printWindow = window.open("", "", "height=600,width=800");
    printWindow?.document.write(
      `<html><head><title>Timetable</title></head><body><table border="1" style="width:100%;border-collapse:collapse"><thead><tr><th>Time</th><th>Subject</th><th>Teacher</th><th>Room</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
    );
    printWindow?.document.close();
    printWindow?.print();
  };

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
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={handlePrint}>
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
              {timetable.map(period => (
                <div
                  key={period.id}
                  className={`flex items-center p-4 rounded-lg border ${
                    period.subject === "Break" ? "bg-muted/50" : "bg-background"
                  }`}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center text-sm font-medium w-24">
                      <Clock className="h-4 w-4 mr-2" />
                      {period.start_time}-{period.end_time}
                    </div>
                    <div className="flex items-center flex-1">
                      <BookOpen className="h-4 w-4 mr-2" />
                      <span className="font-medium">{period.subject || ""}</span>
                    </div>
                    {period.teacher?.full_name && (
                      <div className="flex items-center text-sm text-muted-foreground w-32">
                        <User className="h-4 w-4 mr-2" />
                        {period.teacher.full_name}
                      </div>
                    )}
                    {period.room && <Badge variant="outline">{period.room}</Badge>}
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