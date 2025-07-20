import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { OMRUploader } from '@/components/omr/OMRUploader';
import { OMRResults } from '@/components/omr/OMRResults';
import { AnswerKeyManager } from '@/components/omr/AnswerKeyManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Upload, BarChart3 } from 'lucide-react';

export interface OMRScanResult {
  id: string;
  fileName: string;
  studentId: string;
  score: number;
  totalQuestions: number;
  answers: Record<string, string>;
  layoutId: string;
  scanAccuracy: number;
  scanDate: Date;
}

export interface AnswerKey {
  [questionNumber: string]: string;
}

export default function OMRScanningPage() {
  const [scanResults, setScanResults] = useState<OMRScanResult[]>([]);
  const [answerKey, setAnswerKey] = useState<AnswerKey | null>(null);
  const [activeTab, setActiveTab] = useState('upload');

  const handleScanComplete = (results: OMRScanResult[]) => {
    setScanResults(prev => [...prev, ...results]);
    setActiveTab('results');
  };

  const handleClearResults = () => {
    setScanResults([]);
  };

  return (
    <MainLayout 
      title="OMR Scanning"
      showBreadcrumb
      breadcrumbItems={[
        { label: 'Exams', href: '/exams' },
        { label: 'OMR Scanning' }
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Optical Mark Recognition Scanner
            </CardTitle>
            <CardDescription>
              Upload scanned answer sheets to automatically extract answers and calculate scores
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload & Scan
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Results ({scanResults.length})
            </TabsTrigger>
            <TabsTrigger value="answer-key" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Answer Key
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <OMRUploader 
              onScanComplete={handleScanComplete}
              answerKey={answerKey}
            />
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <OMRResults 
              results={scanResults}
              answerKey={answerKey}
              onClearResults={handleClearResults}
            />
          </TabsContent>

          <TabsContent value="answer-key" className="space-y-6">
            <AnswerKeyManager 
              answerKey={answerKey}
              onAnswerKeyChange={setAnswerKey}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}