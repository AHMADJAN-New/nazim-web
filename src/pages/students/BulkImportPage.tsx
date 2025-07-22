import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileSpreadsheet, Users, CheckCircle, XCircle } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
}

export default function BulkImportPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.xlsx')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV or Excel file",
          variant: "destructive"
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'student_id', 'full_name', 'date_of_birth', 'gender', 'email', 
      'phone', 'guardian_name', 'guardian_phone', 'address', 'class_name',
      'admission_date', 'blood_group'
    ];
    
    const csvContent = headers.join(',') + '\n' +
      'ST001,John Smith,2010-05-15,Male,john@example.com,+1234567890,Robert Smith,+1234567891,123 Main St,Grade 5,2024-01-15,O+\n' +
      'ST002,Sarah Johnson,2011-03-20,Female,sarah@example.com,+1234567892,Mary Johnson,+1234567893,456 Oak Ave,Grade 4,2024-01-15,A+';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const simulateImport = async () => {
    if (!file) return;
    
    setImporting(true);
    setProgress(0);
    setResult(null);

    // Simulate file processing
    for (let i = 0; i <= 100; i += 10) {
      setProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Simulate results
    const mockResult: ImportResult = {
      total: 50,
      successful: 47,
      failed: 3,
      errors: [
        'Row 5: Invalid email format',
        'Row 12: Missing guardian phone',
        'Row 23: Invalid date format'
      ]
    };

    setResult(mockResult);
    setImporting(false);
    
    toast({
      title: "Import Completed",
      description: `${mockResult.successful} students imported successfully`,
      variant: mockResult.failed === 0 ? "default" : "destructive"
    });
  };

  return (
    <MainLayout title="Bulk Student Import">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Import Students
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Template Download */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <h3 className="font-medium">Download Template</h3>
                <p className="text-sm text-muted-foreground">
                  Download the CSV template with required columns
                </p>
              </div>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <Label htmlFor="file-upload">Select CSV or Excel File</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                <Button 
                  onClick={simulateImport} 
                  disabled={!file || importing}
                  className="flex items-center gap-2"
                >
                  {importing ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import Students
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Progress */}
            {importing && (
              <div className="space-y-2">
                <Label>Import Progress</Label>
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground">{progress}% complete</p>
              </div>
            )}

            {/* Results */}
            {result && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Import Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{result.total}</div>
                      <div className="text-sm text-blue-600">Total Records</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{result.successful}</div>
                      <div className="text-sm text-green-600">Successful</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{result.failed}</div>
                      <div className="text-sm text-red-600">Failed</div>
                    </div>
                  </div>

                  {result.errors.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-red-600 mb-2 block">Errors:</Label>
                      <div className="space-y-1">
                        {result.errors.map((error, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-red-600">
                            <XCircle className="h-4 w-4" />
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}