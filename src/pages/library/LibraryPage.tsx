// Nazim School Management System - Library Management
import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  BookOpen, 
  Search, 
  Filter, 
  Plus,
  Users,
  BookMarked,
  AlertTriangle,
  Calendar,
  Bookmark,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

// Mock data for library management
const libraryStats = {
  totalBooks: 5420,
  availableBooks: 4580,
  issuedBooks: 840,
  overdue: 23,
  totalMembers: 1250,
  activeMembers: 980
};

const books = [
  {
    id: "B001",
    title: "Introduction to Islamic Studies",
    author: "Dr. Ahmad Hassan",
    isbn: "978-1234567890",
    category: "Islamic Studies",
    language: "English",
    publisher: "Islamic Publications",
    publishYear: 2020,
    copies: 5,
    available: 3,
    issued: 2,
    rack: "A-101",
    status: "available"
  },
  {
    id: "B002",
    title: "Advanced Mathematics Grade 12",
    author: "Prof. Muhammad Ali",
    isbn: "978-0987654321", 
    category: "Mathematics",
    language: "English",
    publisher: "Education Press",
    publishYear: 2021,
    copies: 8,
    available: 5,
    issued: 3,
    rack: "B-205",
    status: "available"
  },
  {
    id: "B003",
    title: "Seerah-un-Nabi",
    author: "Allama Shibli Nomani",
    isbn: "978-5432167890",
    category: "Islamic History",
    language: "Urdu",
    publisher: "Dar-ul-Uloom",
    publishYear: 2018,
    copies: 3,
    available: 0,
    issued: 3,
    rack: "C-150",
    status: "unavailable"
  }
];

const issuedBooks = [
  {
    id: "I001",
    bookTitle: "Introduction to Islamic Studies",
    studentName: "Ahmad Ali",
    studentId: "S001",
    class: "Grade 10-A",
    issueDate: "2024-02-15",
    dueDate: "2024-03-15",
    status: "active",
    fine: 0
  },
  {
    id: "I002", 
    bookTitle: "Advanced Mathematics Grade 12",
    studentName: "Hassan Khan",
    studentId: "S002",
    class: "Grade 12-B",
    issueDate: "2024-01-20",
    dueDate: "2024-02-20",
    status: "overdue",
    fine: 50
  }
];

const members = [
  {
    id: "M001",
    name: "Ahmad Ali",
    type: "Student",
    class: "Grade 10-A",
    membershipDate: "2024-01-15",
    booksIssued: 2,
    maxAllowed: 3,
    fine: 0,
    status: "active"
  },
  {
    id: "M002",
    name: "Dr. Fatima Sheikh", 
    type: "Staff",
    department: "Islamic Studies",
    membershipDate: "2023-08-01",
    booksIssued: 5,
    maxAllowed: 10,
    fine: 0,
    status: "active"
  }
];

export default function LibraryPage() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedBook, setSelectedBook] = useState<any>(null);

  const getBookStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="default" className="bg-success text-success-foreground">Available</Badge>;
      case 'unavailable':
        return <Badge variant="destructive">Unavailable</Badge>;
      case 'maintenance':
        return <Badge variant="secondary">Maintenance</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getIssueStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'returned':
        return <Badge variant="secondary">Returned</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getMemberStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <MainLayout
      title={t('nav.library')}
      showBreadcrumb={true}
      breadcrumbItems={[
        { label: t('nav.library') }
      ]}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Books</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{libraryStats.totalBooks}</div>
              <div className="text-xs text-muted-foreground">
                In collection
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{libraryStats.availableBooks}</div>
              <div className="text-xs text-muted-foreground">
                Ready to issue
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Issued Books</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{libraryStats.issuedBooks}</div>
              <div className="text-xs text-muted-foreground">
                Currently borrowed
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{libraryStats.overdue}</div>
              <div className="text-xs text-muted-foreground">
                Need attention
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{libraryStats.totalMembers}</div>
              <div className="text-xs text-muted-foreground">
                Registered
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{libraryStats.activeMembers}</div>
              <div className="text-xs text-muted-foreground">
                Using library
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="books" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="books" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Books</span>
            </TabsTrigger>
            <TabsTrigger value="issued" className="flex items-center gap-2">
              <BookMarked className="h-4 w-4" />
              <span className="hidden sm:inline">Issued</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Members</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <MoreHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
          </TabsList>

          {/* Books Tab */}
          <TabsContent value="books" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search books by title, author, ISBN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="islamic-studies">Islamic Studies</SelectItem>
                  <SelectItem value="mathematics">Mathematics</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="literature">Literature</SelectItem>
                </SelectContent>
              </Select>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Book
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Book Catalog</CardTitle>
                <CardDescription>
                  Manage library book collection and inventory
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>ISBN</TableHead>
                      <TableHead>Copies</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {books.map((book) => (
                      <TableRow key={book.id}>
                        <TableCell className="font-medium">{book.title}</TableCell>
                        <TableCell>{book.author}</TableCell>
                        <TableCell>{book.category}</TableCell>
                        <TableCell className="font-mono text-sm">{book.isbn}</TableCell>
                        <TableCell>{book.copies}</TableCell>
                        <TableCell>{book.available}</TableCell>
                        <TableCell>{getBookStatusBadge(book.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedBook(book)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>{selectedBook?.title}</DialogTitle>
                                  <DialogDescription>
                                    Book details and management options
                                  </DialogDescription>
                                </DialogHeader>
                                {selectedBook && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Author</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedBook.author}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>ISBN</Label>
                                        <p className="text-sm text-muted-foreground font-mono">
                                          {selectedBook.isbn}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Category</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedBook.category}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Language</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedBook.language}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Publisher</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedBook.publisher}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Publish Year</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedBook.publishYear}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Rack Location</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedBook.rack}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Availability</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedBook.available}/{selectedBook.copies} available
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex gap-2 pt-4">
                                      <Button>Issue Book</Button>
                                      <Button variant="outline">Edit Details</Button>
                                      <Button variant="outline">View History</Button>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
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

          {/* Issued Books Tab */}
          <TabsContent value="issued" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search issued books..."
                    className="pl-10"
                  />
                </div>
              </div>
              <Button>
                <BookMarked className="h-4 w-4 mr-2" />
                Issue Book
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Issued Books</CardTitle>
                <CardDescription>
                  Track and manage currently issued books
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Book Title</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Fine</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issuedBooks.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell className="font-medium">{issue.bookTitle}</TableCell>
                        <TableCell>{issue.studentName}</TableCell>
                        <TableCell>{issue.class}</TableCell>
                        <TableCell>{issue.issueDate}</TableCell>
                        <TableCell>{issue.dueDate}</TableCell>
                        <TableCell>
                          {issue.fine > 0 ? (
                            <span className="text-warning font-medium">Rs. {issue.fine}</span>
                          ) : (
                            <span className="text-muted-foreground">Rs. 0</span>
                          )}
                        </TableCell>
                        <TableCell>{getIssueStatusBadge(issue.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm">
                              Return
                            </Button>
                            <Button variant="outline" size="sm">
                              Renew
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

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    className="pl-10"
                  />
                </div>
              </div>
              <Button>
                <Users className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Library Members</CardTitle>
                <CardDescription>
                  Manage library membership and borrowing privileges
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Class/Department</TableHead>
                      <TableHead>Member Since</TableHead>
                      <TableHead>Books Issued</TableHead>
                      <TableHead>Fine</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{member.type}</Badge>
                        </TableCell>
                        <TableCell>
                          {member.type === 'Student' ? member.class : member.department}
                        </TableCell>
                        <TableCell>{member.membershipDate}</TableCell>
                        <TableCell>
                          {member.booksIssued}/{member.maxAllowed}
                        </TableCell>
                        <TableCell>
                          {member.fine > 0 ? (
                            <span className="text-warning font-medium">Rs. {member.fine}</span>
                          ) : (
                            <span className="text-muted-foreground">Rs. 0</span>
                          )}
                        </TableCell>
                        <TableCell>{getMemberStatusBadge(member.status)}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            View Profile
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Book Usage Report</CardTitle>
                  <CardDescription>
                    Most popular books and circulation statistics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Circulations</span>
                      <span className="font-semibold">2,840</span>
                    </div>
                    <div className="flex justify-between">
                      <span>This Month</span>
                      <span className="font-semibold">187</span>
                    </div>
                    <Button className="w-full" variant="outline">
                      Generate Full Report
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Overdue Books</CardTitle>
                  <CardDescription>
                    Books that need immediate attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Overdue</span>
                      <span className="font-semibold text-warning">{libraryStats.overdue}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Fine Amount</span>
                      <span className="font-semibold">Rs. 1,250</span>
                    </div>
                    <Button className="w-full" variant="outline">
                      Send Reminders
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}