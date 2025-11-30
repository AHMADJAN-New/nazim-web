export interface Asset {
  id: string;
  name: string;
  category: string;
  type: string;
  serialNumber: string;
  barcode: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  location: string;
  assignedTo: string;
  assignedPerson: string;
  condition: string;
  status: string;
  warranty: string;
  vendor: string;
}
