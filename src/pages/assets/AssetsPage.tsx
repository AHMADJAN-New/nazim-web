// Nazim School Management System - Asset Management
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
  Package, 
  Search, 
  Filter, 
  Plus,
  Monitor,
  Wrench,
  AlertTriangle,
  Calendar,
  MapPin,
  User,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

// Mock data for asset management
const assetStats = {
  totalAssets: 1580,
  activeAssets: 1420,
  inMaintenance: 35,
  disposed: 125,
  totalValue: 2850000,
  depreciation: 450000
};

const assets = [
  {
    id: "A001",
    name: "Dell OptiPlex Computer",
    category: "Electronics",
    type: "Computer",
    serialNumber: "DL2024001",
    barcode: "1234567890123",
    purchaseDate: "2023-08-15",
    purchasePrice: 85000,
    currentValue: 70000,
    location: "Computer Lab 1",
    assignedTo: "Computer Lab",
    assignedPerson: "Mr. Ahmad Ali",
    condition: "Good",
    status: "active",
    warranty: "2025-08-15",
    vendor: "Tech Solutions Ltd"
  },
  {
    id: "A002",
    name: "HP LaserJet Printer",
    category: "Electronics", 
    type: "Printer",
    serialNumber: "HP2024002",
    barcode: "2345678901234",
    purchaseDate: "2023-06-20",
    purchasePrice: 45000,
    currentValue: 38000,
    location: "Main Office",
    assignedTo: "Administration",
    assignedPerson: "Ms. Fatima Shah",
    condition: "Excellent",
    status: "active",
    warranty: "2024-06-20",
    vendor: "Office Equipment Co"
  },
  {
    id: "A003",
    name: "Wooden Desk Set",
    category: "Furniture",
    type: "Desk",
    serialNumber: "FUR2024001",
    barcode: "3456789012345",
    purchaseDate: "2024-01-10",
    purchasePrice: 25000,
    currentValue: 23000,
    location: "Classroom 5A",
    assignedTo: "Grade 5",
    assignedPerson: "Mr. Hassan Khan",
    condition: "Good",
    status: "active",
    warranty: "2026-01-10",
    vendor: "Furniture World"
  },
  {
    id: "A004",
    name: "Air Conditioner Unit",
    category: "Electronics",
    type: "Air Conditioner", 
    serialNumber: "AC2024001",
    barcode: "4567890123456",
    purchaseDate: "2023-04-15",
    purchasePrice: 120000,
    currentValue: 95000,
    location: "Principal's Office",
    assignedTo: "Administration",
    assignedPerson: "Principal",
    condition: "Fair",
    status: "maintenance",
    warranty: "2025-04-15",
    vendor: "Cool Air Systems"
  }
];

const maintenanceRecords = [
  {
    id: "M001",
    assetId: "A004",
    assetName: "Air Conditioner Unit",
    type: "Repair",
    description: "Compressor not working properly",
    requestDate: "2024-03-01",
    scheduledDate: "2024-03-05",
    completedDate: null,
    cost: 8500,
    vendor: "Cool Air Systems",
    status: "in-progress",
    priority: "high"
  },
  {
    id: "M002",
    assetId: "A001",
    assetName: "Dell OptiPlex Computer",
    type: "Preventive",
    description: "Regular maintenance and cleaning",
    requestDate: "2024-02-15",
    scheduledDate: "2024-02-20",
    completedDate: "2024-02-20",
    cost: 2000,
    vendor: "Tech Solutions Ltd",
    status: "completed",
    priority: "medium"
  }
];

const assignments = [
  {
    id: "AS001",
    assetId: "A001",
    assetName: "Dell OptiPlex Computer",
    employeeName: "Mr. Ahmad Ali",
    employeeId: "E001",
    department: "Computer Lab",
    assignDate: "2023-08-20",
    returnDate: null,
    condition: "Good",
    status: "active",
    remarks: "For daily computer lab sessions"
  },
  {
    id: "AS002",
    assetId: "A002", 
    assetName: "HP LaserJet Printer",
    employeeName: "Ms. Fatima Shah",
    employeeId: "E002",
    department: "Administration",
    assignDate: "2023-06-25",
    returnDate: null,
    condition: "Excellent",
    status: "active",
    remarks: "Office printing requirements"
  }
];

export default function AssetsPage() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-success text-success-foreground">Active</Badge>;
      case 'maintenance':
        return <Badge variant="secondary">Maintenance</Badge>;
      case 'disposed':
        return <Badge variant="destructive">Disposed</Badge>;
      case 'lost':
        return <Badge variant="destructive">Lost</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case 'Excellent':
        return <Badge variant="default" className="bg-success text-success-foreground">Excellent</Badge>;
      case 'Good':
        return <Badge variant="default">Good</Badge>;
      case 'Fair':
        return <Badge variant="secondary">Fair</Badge>;
      case 'Poor':
        return <Badge variant="destructive">Poor</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getMaintenanceStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-success text-success-foreground">Completed</Badge>;
      case 'in-progress':
        return <Badge variant="secondary">In Progress</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <MainLayout
      title={t('nav.assets')}
      showBreadcrumb={true}
      breadcrumbItems={[
        { label: t('nav.assets') }
      ]}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assetStats.totalAssets}</div>
              <div className="text-xs text-muted-foreground">
                All registered
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{assetStats.activeAssets}</div>
              <div className="text-xs text-muted-foreground">
                In use
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{assetStats.inMaintenance}</div>
              <div className="text-xs text-muted-foreground">
                Under repair
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rs. {(assetStats.totalValue / 1000000).toFixed(1)}M</div>
              <div className="text-xs text-muted-foreground">
                Current worth
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Depreciation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rs. {(assetStats.depreciation / 1000).toFixed(0)}K</div>
              <div className="text-xs text-muted-foreground">
                This year
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Disposed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assetStats.disposed}</div>
              <div className="text-xs text-muted-foreground">
                Retired assets
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="assets" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="assets" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Assets</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Maintenance</span>
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Assignments</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <MoreHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
          </TabsList>

          {/* Assets Tab */}
          <TabsContent value="assets" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search assets by name, serial number, or barcode..."
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
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="furniture">Furniture</SelectItem>
                  <SelectItem value="vehicles">Vehicles</SelectItem>
                  <SelectItem value="books">Books</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="disposed">Disposed</SelectItem>
                </SelectContent>
              </Select>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Asset Inventory</CardTitle>
                <CardDescription>
                  Manage school assets, equipment, and property
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{asset.category}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{asset.serialNumber}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                            {asset.location}
                          </div>
                        </TableCell>
                        <TableCell>{asset.assignedPerson}</TableCell>
                        <TableCell>{getConditionBadge(asset.condition)}</TableCell>
                        <TableCell>{getStatusBadge(asset.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedAsset(asset)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl">
                                <DialogHeader>
                                  <DialogTitle>{selectedAsset?.name}</DialogTitle>
                                  <DialogDescription>
                                    Complete asset information and management options
                                  </DialogDescription>
                                </DialogHeader>
                                {selectedAsset && (
                                  <div className="space-y-6">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                      <div>
                                        <Label>Category</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedAsset.category}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Type</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedAsset.type}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Serial Number</Label>
                                        <p className="text-sm text-muted-foreground font-mono">
                                          {selectedAsset.serialNumber}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Barcode</Label>
                                        <p className="text-sm text-muted-foreground font-mono">
                                          {selectedAsset.barcode}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Purchase Date</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedAsset.purchaseDate}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Purchase Price</Label>
                                        <p className="text-sm text-muted-foreground">
                                          Rs. {selectedAsset.purchasePrice.toLocaleString()}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Current Value</Label>
                                        <p className="text-sm text-muted-foreground">
                                          Rs. {selectedAsset.currentValue.toLocaleString()}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Location</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedAsset.location}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Assigned To</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedAsset.assignedPerson}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Warranty Until</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedAsset.warranty}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Vendor</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedAsset.vendor}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Condition</Label>
                                        <div className="mt-1">
                                          {getConditionBadge(selectedAsset.condition)}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex gap-2 pt-4 border-t">
                                      <Button>Edit Asset</Button>
                                      <Button variant="outline">Transfer</Button>
                                      <Button variant="outline">Maintenance</Button>
                                      <Button variant="outline">Print QR</Button>
                                      <Button variant="destructive">Dispose</Button>
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

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search maintenance records..."
                    className="pl-10"
                  />
                </div>
              </div>
              <Button>
                <Wrench className="h-4 w-4 mr-2" />
                Schedule Maintenance
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Maintenance Records</CardTitle>
                <CardDescription>
                  Track asset maintenance, repairs, and service schedules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Scheduled Date</TableHead>
                      <TableHead>Completed Date</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenanceRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.assetName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{record.type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {record.description}
                        </TableCell>
                        <TableCell>{record.scheduledDate}</TableCell>
                        <TableCell>
                          {record.completedDate || (
                            <span className="text-muted-foreground">Pending</span>
                          )}
                        </TableCell>
                        <TableCell>Rs. {record.cost.toLocaleString()}</TableCell>
                        <TableCell>{getPriorityBadge(record.priority)}</TableCell>
                        <TableCell>{getMaintenanceStatusBadge(record.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {record.status === 'in-progress' && (
                              <Button variant="outline" size="sm">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Asset Assignments</CardTitle>
                <CardDescription>
                  Track which assets are assigned to which staff members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Name</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Assign Date</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">{assignment.assetName}</TableCell>
                        <TableCell>{assignment.employeeName}</TableCell>
                        <TableCell>{assignment.department}</TableCell>
                        <TableCell>{assignment.assignDate}</TableCell>
                        <TableCell>{getConditionBadge(assignment.condition)}</TableCell>
                        <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm">
                              Transfer
                            </Button>
                            <Button variant="outline" size="sm">
                              Return
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

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Asset Valuation</CardTitle>
                  <CardDescription>
                    Current asset worth and depreciation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Value</span>
                      <span className="font-semibold">
                        Rs. {(assetStats.totalValue / 1000000).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Depreciation</span>
                      <span className="font-semibold text-warning">
                        Rs. {(assetStats.depreciation / 1000).toFixed(0)}K
                      </span>
                    </div>
                    <Button className="w-full" variant="outline">
                      Generate Report
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Maintenance Summary</CardTitle>
                  <CardDescription>
                    Maintenance costs and schedules
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Pending</span>
                      <span className="font-semibold text-warning">12</span>
                    </div>
                    <div className="flex justify-between">
                      <span>This Month Cost</span>
                      <span className="font-semibold">Rs. 25,000</span>
                    </div>
                    <Button className="w-full" variant="outline">
                      View Schedule
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Disposal Report</CardTitle>
                  <CardDescription>
                    Assets ready for disposal
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Ready for Disposal</span>
                      <span className="font-semibold">8</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Recovery Value</span>
                      <span className="font-semibold">Rs. 45,000</span>
                    </div>
                    <Button className="w-full" variant="outline">
                      Process Disposal
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