import { useState } from "react";
import { useFees, useCreateFee, useUpdateFee } from "@/hooks/useFinance";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarDays, CreditCard, Download, Eye, Plus, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  studentName: string;
  studentId: string;
  amount: number;
  feeType: string;
  paymentMethod: string;
  transactionId: string;
  status: 'completed' | 'pending' | 'failed';
  paymentDate: string;
  dueDate: string;
}

const mockPayments: Payment[] = [
  {
    id: "1",
    studentName: "Ahmed Hassan",
    studentId: "STU001",
    amount: 5000,
    feeType: "Tuition Fee",
    paymentMethod: "Bank Transfer",
    transactionId: "TXN001234",
    status: "completed",
    paymentDate: "2024-01-15",
    dueDate: "2024-01-10"
  },
  {
    id: "2",
    studentName: "Fatima Ali",
    studentId: "STU002",
    amount: 1500,
    feeType: "Exam Fee",
    paymentMethod: "Cash",
    transactionId: "TXN001235",
    status: "pending",
    paymentDate: "2024-01-16",
    dueDate: "2024-01-15"
  },
  {
    id: "3",
    studentName: "Omar Khan",
    studentId: "STU003",
    amount: 2000,
    feeType: "Library Fee",
    paymentMethod: "Credit Card",
    transactionId: "TXN001236",
    status: "completed",
    paymentDate: "2024-01-14",
    dueDate: "2024-01-12"
  }
];

const statusVariants = {
  completed: "default",
  pending: "secondary",
  failed: "destructive"
} as const;

export default function PaymentsPage() {
  const { toast } = useToast();
  const { data: fees = [], isLoading } = useFees();
  const createFee = useCreateFee();
  const updateFee = useUpdateFee();
  
  // Convert fees to payment format for compatibility
  const payments = fees.map(fee => ({
    id: fee.id,
    studentName: 'Student Name', // Would need to join with students table
    studentId: fee.student_id,
    amount: Number(fee.amount),
    feeType: fee.fee_type,
    paymentMethod: fee.payment_method || 'N/A',
    transactionId: fee.transaction_id || 'N/A',
    status: fee.status as 'completed' | 'pending' | 'failed',
    paymentDate: fee.paid_date || '',
    dueDate: fee.due_date
  }));
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         payment.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         payment.transactionId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddPayment = (newPayment: Partial<Payment>) => {
    const payment: Payment = {
      id: `${payments.length + 1}`,
      studentName: newPayment.studentName || "",
      studentId: newPayment.studentId || "",
      amount: newPayment.amount || 0,
      feeType: newPayment.feeType || "",
      paymentMethod: newPayment.paymentMethod || "",
      transactionId: `TXN${String(Date.now()).slice(-6)}`,
      status: "completed",
      paymentDate: new Date().toISOString().split('T')[0],
      dueDate: newPayment.dueDate || ""
    };

    // Use createFee mutation instead of setPayments
    createFee.mutate({
      student_id: payment.studentId,
      fee_type: payment.feeType,
      amount: payment.amount,
      due_date: payment.dueDate,
      payment_method: payment.paymentMethod,
      transaction_id: payment.transactionId,
      status: payment.status === 'completed' ? 'paid' : 'pending',
      academic_year_id: '1' // Would need proper academic year selection
    });
    setIsAddPaymentOpen(false);
    toast({
      title: "Payment Added",
      description: "Payment record has been successfully created."
    });
  };

  const generateReceipt = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsReceiptDialogOpen(true);
  };

  const downloadReceipt = (payment: Payment) => {
    toast({
      title: "Receipt Downloaded",
      description: `Receipt for ${payment.transactionId} has been downloaded.`
    });
  };

  return (
    <MainLayout 
      title="Payments Management" 
      showBreadcrumb={true}
      breadcrumbItems={[
        { label: "Finance", href: "/finance" },
        { label: "Payments" }
      ]}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹8,500</div>
              <p className="text-xs text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹1,500</div>
              <p className="text-xs text-muted-foreground">1 payment pending</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹6,500</div>
              <p className="text-xs text-muted-foreground">3 payments completed</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Payment</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹2,833</div>
              <p className="text-xs text-muted-foreground">Per transaction</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payment Records</CardTitle>
                <CardDescription>Manage and track all payment transactions</CardDescription>
              </div>
              <Button onClick={() => setIsAddPaymentOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2" />
                <Input
                  placeholder="Search by student name, ID, or transaction..."
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
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payments Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.studentName}</div>
                          <div className="text-sm text-muted-foreground">{payment.studentId}</div>
                        </div>
                      </TableCell>
                      <TableCell>{payment.feeType}</TableCell>
                      <TableCell className="font-medium">₹{payment.amount}</TableCell>
                      <TableCell>{payment.paymentMethod}</TableCell>
                      <TableCell className="font-mono text-sm">{payment.transactionId}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[payment.status]}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                         <TableCell>{payment.paymentDate}</TableCell>
                         <TableCell>
                           <div className="flex items-center space-x-2">
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => setSelectedPayment(payment)}
                             >
                               <Eye className="h-4 w-4" />
                             </Button>
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => toast({ title: "Download started", description: "Receipt download initiated" })}
                             >
                               <Download className="h-4 w-4" />
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

        {/* Add Payment Dialog */}
        <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Payment</DialogTitle>
              <DialogDescription>
                Record a new payment transaction for a student.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddPayment({
                studentName: formData.get('studentName') as string,
                studentId: formData.get('studentId') as string,
                amount: Number(formData.get('amount')),
                feeType: formData.get('feeType') as string,
                paymentMethod: formData.get('paymentMethod') as string,
                dueDate: formData.get('dueDate') as string,
              });
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="studentName" className="text-right">Student Name</Label>
                  <Input id="studentName" name="studentName" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="studentId" className="text-right">Student ID</Label>
                  <Input id="studentId" name="studentId" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">Amount</Label>
                  <Input id="amount" name="amount" type="number" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="feeType" className="text-right">Fee Type</Label>
                  <Select name="feeType" required>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select fee type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tuition Fee">Tuition Fee</SelectItem>
                      <SelectItem value="Exam Fee">Exam Fee</SelectItem>
                      <SelectItem value="Library Fee">Library Fee</SelectItem>
                      <SelectItem value="Transport Fee">Transport Fee</SelectItem>
                      <SelectItem value="Hostel Fee">Hostel Fee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="paymentMethod" className="text-right">Payment Method</Label>
                  <Select name="paymentMethod" required>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Debit Card">Debit Card</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="dueDate" className="text-right">Due Date</Label>
                  <Input id="dueDate" name="dueDate" type="date" className="col-span-3" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Add Payment</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Receipt Dialog */}
        <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Payment Receipt</DialogTitle>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4">
                <div className="text-center border-b pb-4">
                  <h3 className="text-lg font-semibold">Nazim School</h3>
                  <p className="text-sm text-muted-foreground">Payment Receipt</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Student Name</Label>
                    <p className="text-sm">{selectedPayment.studentName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Student ID</Label>
                    <p className="text-sm">{selectedPayment.studentId}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Transaction ID</Label>
                    <p className="text-sm font-mono">{selectedPayment.transactionId}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Payment Date</Label>
                    <p className="text-sm">{selectedPayment.paymentDate}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Fee Type</Label>
                    <p className="text-sm">{selectedPayment.feeType}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Payment Method</Label>
                    <p className="text-sm">{selectedPayment.paymentMethod}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm font-medium">Amount Paid</Label>
                    <p className="text-lg font-bold">₹{selectedPayment.amount}</p>
                  </div>
                </div>
                <div className="flex justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => downloadReceipt(selectedPayment)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button onClick={() => setIsReceiptDialogOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}