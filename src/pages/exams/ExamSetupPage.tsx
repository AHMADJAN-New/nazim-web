import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Trophy, Calendar, Clock } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface Exam {
  id: string;
  name: string;
  type: string;
  subject: string;
  class: string;
  date: string;
  duration: number;
  totalMarks: number;
  passMarks: number;
  instructions: string;
  status: string;
}

const mockExams: Exam[] = [
  {
    id: "1",
    name: "Mid-Term Mathematics",
    type: "Mid-Term",
    subject: "Mathematics",
    class: "Grade 5A",
    date: "2024-02-15",
    duration: 120,
    totalMarks: 100,
    passMarks: 40,
    instructions: "Use of calculator is not allowed",
    status: "scheduled"
  },
  {
    id: "2",
    name: "Final English Exam",
    type: "Final",
    subject: "English",
    class: "Grade 5A",
    date: "2024-03-20",
    duration: 180,
    totalMarks: 100,
    passMarks: 50,
    instructions: "Answer all questions in the answer sheet provided",
    status: "draft"
  }
];

export default function ExamSetupPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [exams, setExams] = useState<Exam[]>(mockExams);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "",
    subject: "",
    class: "",
    date: "",
    duration: 60,
    totalMarks: 100,
    passMarks: 40,
    instructions: ""
  });

  const examTypes = ["Mid-Term", "Final", "Unit Test", "Monthly Test", "Assessment"];
  const subjects = ["Mathematics", "English", "Science", "History", "Geography"];
  const classes = ["Grade 1A", "Grade 2A", "Grade 3A", "Grade 4A", "Grade 5A", "Grade 6A"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingExam) {
      setExams(prev => prev.map(exam =>
        exam.id === editingExam.id
          ? { ...exam, ...formData, status: "draft" }
          : exam
      ));
      toast({
        title: "Exam Updated",
        description: "Exam has been updated successfully"
      });
    } else {
      const newExam: Exam = {
        id: Date.now().toString(),
        ...formData,
        status: "draft"
      };
      setExams(prev => [...prev, newExam]);
      toast({
        title: "Exam Created",
        description: "New exam has been created successfully"
      });
    }

    setFormData({
      name: "", type: "", subject: "", class: "", date: "",
      duration: 60, totalMarks: 100, passMarks: 40, instructions: ""
    });
    setEditingExam(null);
    setIsAddDialogOpen(false);
  };

  const handleEdit = (exam: Exam) => {
    setEditingExam(exam);
    setFormData({
      name: exam.name,
      type: exam.type,
      subject: exam.subject,
      class: exam.class,
      date: exam.date,
      duration: exam.duration,
      totalMarks: exam.totalMarks,
      passMarks: exam.passMarks,
      instructions: exam.instructions
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setExams(prev => prev.filter(exam => exam.id !== id));
    toast({
      title: "Exam Deleted",
      description: "Exam has been deleted successfully"
    });
  };

  const handlePublish = (id: string) => {
    setExams(prev => prev.map(exam =>
      exam.id === id ? { ...exam, status: "scheduled" } : exam
    ));
    toast({
      title: "Exam Published",
      description: "Exam has been published and scheduled"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "secondary";
      case "scheduled": return "default";
      case "ongoing": return "yellow";
      case "completed": return "green";
      default: return "secondary";
    }
  };

  return (
    <MainLayout title="Exam Setup">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Exam Setup</h1>
            <p className="text-muted-foreground">Create and manage exam schedules</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingExam(null);
                setFormData({
                  name: "", type: "", subject: "", class: "", date: "",
                  duration: 60, totalMarks: 100, passMarks: 40, instructions: ""
                });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Exam
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingExam ? 'Edit Exam' : 'Create New Exam'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="name">Exam Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="type">Exam Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {examTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
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
                    <Label htmlFor="class">Class</Label>
                    <Select
                      value={formData.class}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, class: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(cls => (
                          <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="date">Exam Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="30"
                      max="300"
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="totalMarks">Total Marks</Label>
                    <Input
                      id="totalMarks"
                      type="number"
                      min="1"
                      value={formData.totalMarks}
                      onChange={(e) => setFormData(prev => ({ ...prev, totalMarks: parseInt(e.target.value) }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="passMarks">Pass Marks</Label>
                    <Input
                      id="passMarks"
                      type="number"
                      min="1"
                      value={formData.passMarks}
                      onChange={(e) => setFormData(prev => ({ ...prev, passMarks: parseInt(e.target.value) }))}
                      required
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label htmlFor="instructions">Instructions</Label>
                    <Textarea
                      id="instructions"
                      value={formData.instructions}
                      onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingExam ? 'Update' : 'Create'} Exam
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Exams Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Exams ({exams.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{exam.name}</div>
                        <div className="text-sm text-muted-foreground">{exam.type}</div>
                      </div>
                    </TableCell>
                    <TableCell>{exam.subject}</TableCell>
                    <TableCell>{exam.class}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(exam.date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {exam.duration} min
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div>Total: {exam.totalMarks}</div>
                        <div className="text-sm text-muted-foreground">Pass: {exam.passMarks}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(exam.status) as any}>
                        {exam.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(exam)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {exam.status === "draft" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePublish(exam.id)}
                          >
                            Publish
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(exam.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}