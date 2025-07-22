import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Users, DollarSign, Download, Eye, Plus, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Donation {
  id: string;
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  amount: number;
  purpose: string;
  donationType: 'individual' | 'corporate' | 'anonymous';
  paymentMethod: string;
  transactionId: string;
  donationDate: string;
  receiptGenerated: boolean;
  notes?: string;
}

const mockDonations: Donation[] = [
  {
    id: "1",
    donorName: "Ahmed Industries",
    donorEmail: "contact@ahmedindustries.com",
    donorPhone: "+92-300-1234567",
    amount: 50000,
    purpose: "Library Development",
    donationType: "corporate",
    paymentMethod: "Bank Transfer",
    transactionId: "DON001234",
    donationDate: "2024-01-15",
    receiptGenerated: true,
    notes: "Annual corporate donation for library books and equipment"
  },
  {
    id: "2",
    donorName: "Fatima Khan",
    donorEmail: "fatima.khan@email.com",
    donorPhone: "+92-301-9876543",
    amount: 10000,
    purpose: "Student Scholarships",
    donationType: "individual",
    paymentMethod: "Cash",
    transactionId: "DON001235",
    donationDate: "2024-01-16",
    receiptGenerated: true,
    notes: "In memory of her late father"
  },
  {
    id: "3",
    donorName: "Anonymous Donor",
    donorEmail: "",
    donorPhone: "",
    amount: 25000,
    purpose: "School Infrastructure",
    donationType: "anonymous",
    paymentMethod: "Online Transfer",
    transactionId: "DON001236",
    donationDate: "2024-01-14",
    receiptGenerated: false
  }
];

const donationPurposes = [
  "General Fund",
  "Library Development",
  "Student Scholarships",
  "School Infrastructure",
  "Sports Equipment",
  "Computer Lab",
  "Mosque Maintenance",
  "Teacher Training",
  "Orphan Students",
  "Emergency Fund"
];

export default function DonationsPage() {
  const { toast } = useToast();
  const [donations, setDonations] = useState<Donation[]>(mockDonations);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [isAddDonationOpen, setIsAddDonationOpen] = useState(false);

  const filteredDonations = donations.filter(donation => {
    const matchesSearch = donation.donorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         donation.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         donation.transactionId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || donation.donationType === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalDonations = donations.reduce((sum, donation) => sum + donation.amount, 0);
  const monthlyDonations = donations
    .filter(d => new Date(d.donationDate).getMonth() === new Date().getMonth())
    .reduce((sum, donation) => sum + donation.amount, 0);

  const handleAddDonation = (newDonation: Partial<Donation>) => {
    const donation: Donation = {
      id: `${donations.length + 1}`,
      donorName: newDonation.donorName || "",
      donorEmail: newDonation.donorEmail || "",
      donorPhone: newDonation.donorPhone || "",
      amount: newDonation.amount || 0,
      purpose: newDonation.purpose || "",
      donationType: newDonation.donationType || "individual",
      paymentMethod: newDonation.paymentMethod || "",
      transactionId: `DON${String(Date.now()).slice(-6)}`,
      donationDate: new Date().toISOString().split('T')[0],
      receiptGenerated: false,
      notes: newDonation.notes || ""
    };

    setDonations([donation, ...donations]);
    setIsAddDonationOpen(false);
    toast({
      title: "Donation Added",
      description: "Donation record has been successfully created."
    });
  };

  const generateReceipt = (donation: Donation) => {
    setSelectedDonation(donation);
    setIsReceiptDialogOpen(true);
    
    // Update receipt status
    setDonations(prev => prev.map(d => 
      d.id === donation.id ? { ...d, receiptGenerated: true } : d
    ));
  };

  const downloadReceipt = (donation: Donation) => {
    toast({
      title: "Receipt Downloaded",
      description: `Donation receipt for ${donation.transactionId} has been downloaded.`
    });
  };

  return (
    <MainLayout 
      title="Donations Management" 
      showBreadcrumb={true}
      breadcrumbItems={[
        { label: "Finance", href: "/finance" },
        { label: "Donations" }
      ]}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalDonations.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All time donations</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{monthlyDonations.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Current month donations</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Donors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{donations.length}</div>
              <p className="text-xs text-muted-foreground">Registered donors</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Donation</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{Math.round(totalDonations / donations.length).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Per donation</p>
            </CardContent>
          </Card>
        </div>

        {/* Donations Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Donation Records</CardTitle>
                <CardDescription>Manage and track all donations received</CardDescription>
              </div>
              <Button onClick={() => setIsAddDonationOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Donation
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2" />
                <Input
                  placeholder="Search by donor name, purpose, or transaction..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="anonymous">Anonymous</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDonations.map((donation) => (
                    <TableRow key={donation.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{donation.donorName}</div>
                          {donation.donorEmail && (
                            <div className="text-sm text-muted-foreground">{donation.donorEmail}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={donation.donationType === 'corporate' ? 'default' : 'secondary'}>
                          {donation.donationType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">₹{donation.amount.toLocaleString()}</TableCell>
                      <TableCell>{donation.purpose}</TableCell>
                      <TableCell>{donation.paymentMethod}</TableCell>
                      <TableCell>{donation.donationDate}</TableCell>
                      <TableCell>
                        <Badge variant={donation.receiptGenerated ? 'default' : 'secondary'}>
                          {donation.receiptGenerated ? 'Generated' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => generateReceipt(donation)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadReceipt(donation)}
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

        {/* Add Donation Dialog */}
        <Dialog open={isAddDonationOpen} onOpenChange={setIsAddDonationOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Donation</DialogTitle>
              <DialogDescription>
                Record a new donation received by the school.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddDonation({
                donorName: formData.get('donorName') as string,
                donorEmail: formData.get('donorEmail') as string,
                donorPhone: formData.get('donorPhone') as string,
                amount: Number(formData.get('amount')),
                purpose: formData.get('purpose') as string,
                donationType: formData.get('donationType') as 'individual' | 'corporate' | 'anonymous',
                paymentMethod: formData.get('paymentMethod') as string,
                notes: formData.get('notes') as string,
              });
            }}>
              <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="donorName" className="text-right">Donor Name</Label>
                  <Input id="donorName" name="donorName" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="donorEmail" className="text-right">Email</Label>
                  <Input id="donorEmail" name="donorEmail" type="email" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="donorPhone" className="text-right">Phone</Label>
                  <Input id="donorPhone" name="donorPhone" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="donationType" className="text-right">Type</Label>
                  <Select name="donationType" required>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select donor type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="anonymous">Anonymous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">Amount</Label>
                  <Input id="amount" name="amount" type="number" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="purpose" className="text-right">Purpose</Label>
                  <Select name="purpose" required>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      {donationPurposes.map(purpose => (
                        <SelectItem key={purpose} value={purpose}>{purpose}</SelectItem>
                      ))}
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
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Online Transfer">Online Transfer</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notes" className="text-right">Notes</Label>
                  <Textarea id="notes" name="notes" className="col-span-3" placeholder="Additional notes..." />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Add Donation</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Receipt Dialog */}
        <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Donation Receipt</DialogTitle>
            </DialogHeader>
            {selectedDonation && (
              <div className="space-y-4">
                <div className="text-center border-b pb-4">
                  <h3 className="text-lg font-semibold">Nazim School</h3>
                  <p className="text-sm text-muted-foreground">Donation Receipt</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Donor Name</Label>
                    <p className="text-sm">{selectedDonation.donorName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Transaction ID</Label>
                    <p className="text-sm font-mono">{selectedDonation.transactionId}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Donation Date</Label>
                    <p className="text-sm">{selectedDonation.donationDate}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Purpose</Label>
                    <p className="text-sm">{selectedDonation.purpose}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Payment Method</Label>
                    <p className="text-sm">{selectedDonation.paymentMethod}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Donor Type</Label>
                    <p className="text-sm capitalize">{selectedDonation.donationType}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm font-medium">Amount Donated</Label>
                    <p className="text-lg font-bold">₹{selectedDonation.amount.toLocaleString()}</p>
                  </div>
                  {selectedDonation.notes && (
                    <div className="col-span-2">
                      <Label className="text-sm font-medium">Notes</Label>
                      <p className="text-sm">{selectedDonation.notes}</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => downloadReceipt(selectedDonation)}>
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