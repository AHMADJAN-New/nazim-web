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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, DollarSign, TrendingUp, TrendingDown, Plus, Search, Download, FileText, CreditCard, Receipt } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface FeeStructure {
  id: string;
  class: string;
  tuitionFee: number;
  admissionFee: number;
  examFee: number;
  libraryFee: number;
  sportsFee: number;
  total: number;
}

interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  feeType: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'paid' | 'pending' | 'overdue';
  method?: 'cash' | 'bank' | 'online';
  receiptNo?: string;
}

const mockFeeStructure: FeeStructure[] = [
  {
    id: "FEE001",
    class: "Nursery",
    tuitionFee: 8000,
    admissionFee: 5000,
    examFee: 1000,
    libraryFee: 500,
    sportsFee: 500,
    total: 15000
  },
  {
    id: "FEE002",
    class: "Class 1-5",
    tuitionFee: 10000,
    admissionFee: 8000,
    examFee: 1500,
    libraryFee: 800,
    sportsFee: 700,
    total: 21000
  },
  {
    id: "FEE003",
    class: "Class 6-8",
    tuitionFee: 12000,
    admissionFee: 10000,
    examFee: 2000,
    libraryFee: 1000,
    sportsFee: 1000,
    total: 26000
  }
];

const mockPayments: PaymentRecord[] = [
  {
    id: "PAY001",
    studentId: "STU001",
    studentName: "احمد علی",
    class: "Class 6-A",
    feeType: "Monthly Tuition",
    amount: 12000,
    dueDate: "2024-01-31",
    paidDate: "2024-01-25",
    status: "paid",
    method: "bank",
    receiptNo: "RCP001"
  },
  {
    id: "PAY002",
    studentId: "STU002",
    studentName: "فاطمہ خان",
    class: "Class 6-A",
    feeType: "Monthly Tuition",
    amount: 12000,
    dueDate: "2024-01-31",
    status: "pending",
  }
];

export default function FinancePage() {
  const [feeStructure, setFeeStructure] = useState<FeeStructure[]>(mockFeeStructure);
  const [payments, setPayments] = useState<PaymentRecord[]>(mockPayments);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const { toast } = useToast();

  const getStatusBadge = (status: PaymentRecord['status']) => {
    const variants = {
      paid: "default",
      pending: "secondary",
      overdue: "destructive"
    } as const;
    
    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const overdueAmount = payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);

  return (
    <MainLayout 
      title="Finance Management"
      showBreadcrumb
      breadcrumbItems={[
        { label: "Finance" }
      ]}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">PKR {totalRevenue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">PKR {pendingAmount.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold">PKR {overdueAmount.toLocaleString()}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Collection Rate</p>
                  <p className="text-2xl font-bold">85%</p>
                </div>
                <Receipt className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="payments" className="w-full">
          <TabsList>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="fee-structure">Fee Structure</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Payment Records</CardTitle>
                    <CardDescription>
                      Track all student fee payments and dues
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          Filter Date
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <Select>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Paid Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.studentName}</TableCell>
                        <TableCell>{payment.class}</TableCell>
                        <TableCell>{payment.feeType}</TableCell>
                        <TableCell>PKR {payment.amount.toLocaleString()}</TableCell>
                        <TableCell>{format(new Date(payment.dueDate), "PPP")}</TableCell>
                        <TableCell>
                          {payment.paidDate ? format(new Date(payment.paidDate), "PPP") : "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell>
                          {payment.receiptNo ? (
                            <Button variant="outline" size="sm">
                              <FileText className="w-4 h-4 mr-1" />
                              {payment.receiptNo}
                            </Button>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {payment.status === 'pending' && (
                              <Button size="sm">
                                <CreditCard className="w-4 h-4 mr-1" />
                                Pay
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              <FileText className="w-4 h-4" />
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

          <TabsContent value="fee-structure" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Fee Structure</CardTitle>
                    <CardDescription>
                      Configure fee amounts for different classes
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Fee Structure
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Tuition Fee</TableHead>
                      <TableHead>Admission Fee</TableHead>
                      <TableHead>Exam Fee</TableHead>
                      <TableHead>Library Fee</TableHead>
                      <TableHead>Sports Fee</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeStructure.map((fee) => (
                      <TableRow key={fee.id}>
                        <TableCell className="font-medium">{fee.class}</TableCell>
                        <TableCell>PKR {fee.tuitionFee.toLocaleString()}</TableCell>
                        <TableCell>PKR {fee.admissionFee.toLocaleString()}</TableCell>
                        <TableCell>PKR {fee.examFee.toLocaleString()}</TableCell>
                        <TableCell>PKR {fee.libraryFee.toLocaleString()}</TableCell>
                        <TableCell>PKR {fee.sportsFee.toLocaleString()}</TableCell>
                        <TableCell className="font-bold">PKR {fee.total.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">Edit</Button>
                            <Button variant="outline" size="sm">Delete</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Invoice Management</CardTitle>
                    <CardDescription>
                      Generate and manage student fee invoices
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">
                      Bulk Generate
                    </Button>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      New Invoice
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nursery">Nursery</SelectItem>
                        <SelectItem value="class-1-5">Class 1-5</SelectItem>
                        <SelectItem value="class-6-8">Class 6-8</SelectItem>
                        <SelectItem value="class-9-10">Class 9-10</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Fee Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly Tuition</SelectItem>
                        <SelectItem value="admission">Admission Fee</SelectItem>
                        <SelectItem value="exam">Exam Fee</SelectItem>
                        <SelectItem value="annual">Annual Fee</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button>Generate Invoices</Button>
                  </div>
                  
                  <div className="text-center py-8 text-muted-foreground">
                    Select class and fee type to generate invoices
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Revenue Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>January 2024:</span>
                      <span className="font-semibold">PKR 245,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>December 2023:</span>
                      <span className="font-semibold">PKR 232,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>November 2023:</span>
                      <span className="font-semibold">PKR 218,000</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Outstanding Dues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Class 6:</span>
                      <span className="font-semibold text-red-600">PKR 45,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Class 7:</span>
                      <span className="font-semibold text-red-600">PKR 32,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Class 8:</span>
                      <span className="font-semibold text-red-600">PKR 28,000</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    <Download className="w-4 h-4 mr-2" />
                    Send Reminders
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded">
                    <p className="text-2xl font-bold text-green-600">92%</p>
                    <p className="text-sm text-muted-foreground">Collection Rate</p>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <p className="text-2xl font-bold">PKR 2.4M</p>
                    <p className="text-sm text-muted-foreground">Annual Revenue</p>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <p className="text-2xl font-bold text-red-600">PKR 105K</p>
                    <p className="text-sm text-muted-foreground">Total Outstanding</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}