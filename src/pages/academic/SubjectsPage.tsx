import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, BookOpen, Search } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface Subject {
  id: string;
  code: string;
  name: string;
  description: string;
  department: string;
  credits: number;
  teacherIds: string[];
  isActive: boolean;
}

const mockSubjects: Subject[] = [
  {
    id: "1",
    code: "MATH101",
    name: "Mathematics",
    description: "Basic mathematics for primary level",
    department: "Science",
    credits: 3,
    teacherIds: ["teacher1", "teacher2"],
    isActive: true
  },
  {
    id: "2",
    code: "ENG101",
    name: "English Language",
    description: "English language and literature",
    department: "Languages",
    credits: 4,
    teacherIds: ["teacher3"],
    isActive: true
  },
  {
    id: "3",
    code: "SCI101",
    name: "General Science",
    description: "Introduction to basic science concepts",
    department: "Science",
    credits: 3,
    teacherIds: ["teacher4"],
    isActive: true
  }
];

export default function SubjectsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>(mockSubjects);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    department: "",
    credits: 1
  });

  const departments = ["Science", "Languages", "Social Studies", "Arts", "Physical Education"];

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         subject.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = !selectedDepartment || subject.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSubject) {
      setSubjects(prev => prev.map(subject =>
        subject.id === editingSubject.id
          ? { ...subject, ...formData }
          : subject
      ));
      toast({
        title: "Subject Updated",
        description: "Subject has been updated successfully"
      });
    } else {
      const newSubject: Subject = {
        id: Date.now().toString(),
        ...formData,
        teacherIds: [],
        isActive: true
      };
      setSubjects(prev => [...prev, newSubject]);
      toast({
        title: "Subject Added",
        description: "New subject has been added successfully"
      });
    }

    setFormData({ code: "", name: "", description: "", department: "", credits: 1 });
    setEditingSubject(null);
    setIsAddDialogOpen(false);
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      code: subject.code,
      name: subject.name,
      description: subject.description,
      department: subject.department,
      credits: subject.credits
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setSubjects(prev => prev.filter(subject => subject.id !== id));
    toast({
      title: "Subject Deleted",
      description: "Subject has been deleted successfully"
    });
  };

  return (
    <MainLayout title="Subjects Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Subjects Management</h1>
            <p className="text-muted-foreground">Manage school subjects and curriculum</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingSubject(null);
                setFormData({ code: "", name: "", description: "", department: "", credits: 1 });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSubject ? 'Edit Subject' : 'Add New Subject'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="code">Subject Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="credits">Credits</Label>
                    <Input
                      id="credits"
                      type="number"
                      min="1"
                      max="6"
                      value={formData.credits}
                      onChange={(e) => setFormData(prev => ({ ...prev, credits: parseInt(e.target.value) }))}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="name">Subject Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingSubject ? 'Update' : 'Add'} Subject
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search subjects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-48">
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subjects Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Subjects ({filteredSubjects.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubjects.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-mono">{subject.code}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{subject.name}</div>
                        <div className="text-sm text-muted-foreground">{subject.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{subject.department}</Badge>
                    </TableCell>
                    <TableCell>{subject.credits}</TableCell>
                    <TableCell>
                      <Badge variant={subject.isActive ? "default" : "secondary"}>
                        {subject.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(subject)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(subject.id)}
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