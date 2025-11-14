import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Upload, X, FileImage, FileText, Loader2, Scan } from 'lucide-react';
import type { OMRScanResult, AnswerKey } from '@/types/omr';

interface OMRUploaderProps {
  onScanComplete: (results: OMRScanResult[]) => void;
  answerKey: AnswerKey | null;
}

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'scanning' | 'completed' | 'error';
  progress: number;
  result?: OMRScanResult;
  error?: string;
}

export function OMRUploader({ onScanComplete, answerKey }: OMRUploaderProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      status: 'pending',
      progress: 0
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    toast({
      title: "Files Added",
      description: `${acceptedFiles.length} file(s) ready for scanning`,
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png'],
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return updated;
    });
  };

  const scanFile = async (uploadedFile: UploadedFile): Promise<OMRScanResult> => {
    const formData = new FormData();
    formData.append('file', uploadedFile.file);
    if (answerKey) {
      formData.append('answerKey', JSON.stringify(answerKey));
    }

    // Call Supabase Edge Function
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/omr-scan`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Scan failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      id: uploadedFile.id,
      fileName: uploadedFile.file.name,
      ...result,
      scanDate: new Date()
    } as OMRScanResult;
  };

  const scanAllFiles = async () => {
    if (uploadedFiles.length === 0) return;

    setIsScanning(true);
    const results: OMRScanResult[] = [];

    for (const file of uploadedFiles) {
      if (file.status !== 'pending') continue;

      try {
        // Update status to scanning
        setUploadedFiles(prev => 
          prev.map(f => f.id === file.id ? { ...f, status: 'scanning', progress: 0 } : f)
        );

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadedFiles(prev => 
            prev.map(f => f.id === file.id && f.progress < 90 
              ? { ...f, progress: f.progress + 10 } 
              : f
            )
          );
        }, 200);

        const result = await scanFile(file);

        clearInterval(progressInterval);

        // Update with completed result
        setUploadedFiles(prev => 
          prev.map(f => f.id === file.id 
            ? { ...f, status: 'completed', progress: 100, result } 
            : f
          )
        );

        results.push(result);

        toast({
          title: "Scan Complete",
          description: `${file.file.name}: ${result.score}/${result.totalQuestions} (${result.scanAccuracy}% accuracy)`,
        });

      } catch (error) {
        setUploadedFiles(prev => 
          prev.map(f => f.id === file.id 
            ? { ...f, status: 'error', progress: 0, error: error instanceof Error ? error.message : 'Unknown error' } 
            : f
          )
        );

        toast({
          title: "Scan Failed",
          description: `Failed to scan ${file.file.name}`,
          variant: "destructive",
        });
      }
    }

    setIsScanning(false);
    
    if (results.length > 0) {
      onScanComplete(results);
    }
  };

  const clearAllFiles = () => {
    uploadedFiles.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setUploadedFiles([]);
  };

  const getFileIcon = (file: File) => {
    if (file.type.includes('pdf')) return FileText;
    return FileImage;
  };

  const getStatusBadge = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Ready</Badge>;
      case 'scanning':
        return <Badge variant="default">Scanning...</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Answer Sheets</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop files here...' : 'Upload Answer Sheets'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Drag & drop or click to browse (.jpg, .png, .pdf)
            </p>
            <Button variant="outline" disabled={isScanning}>
              Select Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Uploaded Files ({uploadedFiles.length})</CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={scanAllFiles} 
                disabled={isScanning || uploadedFiles.every(f => f.status !== 'pending')}
                className="flex items-center gap-2"
              >
                {isScanning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Scan className="w-4 h-4" />
                )}
                Scan All Files
              </Button>
              <Button variant="outline" onClick={clearAllFiles} disabled={isScanning}>
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {uploadedFiles.map(file => {
                const FileIcon = getFileIcon(file.file);
                return (
                  <div key={file.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    {/* File Preview/Icon */}
                    <div className="flex-shrink-0">
                      {file.preview ? (
                        <img 
                          src={file.preview} 
                          alt={file.file.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <FileIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-grow min-w-0">
                      <p className="font-medium truncate">{file.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                      
                      {/* Progress Bar */}
                      {file.status === 'scanning' && (
                        <Progress value={file.progress} className="mt-2 h-2" />
                      )}
                      
                      {/* Error Message */}
                      {file.status === 'error' && file.error && (
                        <p className="text-sm text-destructive mt-1">{file.error}</p>
                      )}
                      
                      {/* Result Summary */}
                      {file.status === 'completed' && file.result && (
                        <p className="text-sm text-green-600 mt-1">
                          Score: {file.result.score}/{file.result.totalQuestions} 
                          ({file.result.scanAccuracy}% accuracy)
                        </p>
                      )}
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-2">
                      {getStatusBadge(file.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        disabled={file.status === 'scanning'}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}