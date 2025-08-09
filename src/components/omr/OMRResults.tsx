import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Download, Eye, Trash2, FileText } from 'lucide-react';
import type { OMRScanResult, AnswerKey } from '@/types/omr';

interface OMRResultsProps {
  results: OMRScanResult[];
  answerKey: AnswerKey | null;
  onClearResults: () => void;
}

export function OMRResults({ results, answerKey, onClearResults }: OMRResultsProps) {
  const [selectedResult, setSelectedResult] = useState<OMRScanResult | null>(null);

  const downloadCSV = () => {
    if (results.length === 0) {
      toast({
        title: "No Data",
        description: "No scan results to export",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      'File Name',
      'Student ID',
      'Score',
      'Total Questions',
      'Percentage',
      'Layout ID',
      'Scan Accuracy',
      'Scan Date'
    ];

    const csvData = results.map(result => [
      result.fileName,
      result.studentId,
      result.score.toString(),
      result.totalQuestions.toString(),
      ((result.score / result.totalQuestions) * 100).toFixed(1) + '%',
      result.layoutId,
      result.scanAccuracy.toString() + '%',
      result.scanDate.toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `omr_results_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: "Export Complete",
      description: "CSV file has been downloaded",
    });
  };

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getAccuracyBadge = (accuracy: number) => {
    if (accuracy >= 95) return <Badge variant="default" className="bg-green-500">High</Badge>;
    if (accuracy >= 85) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="destructive">Low</Badge>;
  };

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">No Scan Results</p>
          <p className="text-muted-foreground">
            Upload and scan answer sheets to see results here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{results.length}</div>
            <p className="text-sm text-muted-foreground">Total Scans</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {(results.reduce((sum, r) => sum + r.score, 0) / results.reduce((sum, r) => sum + r.totalQuestions, 0) * 100).toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">Average Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {(results.reduce((sum, r) => sum + r.scanAccuracy, 0) / results.length).toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">Avg Accuracy</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {results.filter(r => r.scanAccuracy >= 95).length}
            </div>
            <p className="text-sm text-muted-foreground">High Quality</p>
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Scan Results</CardTitle>
          <div className="flex gap-2">
            <Button onClick={downloadCSV} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={onClearResults}>
              <Trash2 className="w-4 h-4" />
              Clear All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Layout</TableHead>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell className="font-medium">
                      {result.fileName}
                    </TableCell>
                    <TableCell>{result.studentId}</TableCell>
                    <TableCell>
                      <Badge className={getScoreColor(result.score, result.totalQuestions)}>
                        {result.score}/{result.totalQuestions}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {((result.score / result.totalQuestions) * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>{result.layoutId}</TableCell>
                    <TableCell>
                      {getAccuracyBadge(result.scanAccuracy)}
                      <span className="ml-2 text-sm text-muted-foreground">
                        {result.scanAccuracy}%
                      </span>
                    </TableCell>
                    <TableCell>{result.scanDate.toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedResult(result)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>
                              Answer Details - {result.fileName}
                            </DialogTitle>
                          </DialogHeader>
                          <AnswerDetailsModal result={result} answerKey={answerKey} />
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AnswerDetailsModal({ 
  result, 
  answerKey 
}: { 
  result: OMRScanResult; 
  answerKey: AnswerKey | null; 
}) {
  const questions = Object.keys(result.answers).sort((a, b) => {
    const numA = parseInt(a.replace('Q', ''));
    const numB = parseInt(b.replace('Q', ''));
    return numA - numB;
  });

  const getAnswerStatus = (questionId: string, studentAnswer: string) => {
    if (!answerKey) return 'unknown';
    const correctAnswer = answerKey[questionId];
    if (!correctAnswer) return 'unknown';
    return studentAnswer === correctAnswer ? 'correct' : 'incorrect';
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-lg font-bold">{result.score}</div>
          <div className="text-sm text-muted-foreground">Score</div>
        </div>
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-lg font-bold">{result.totalQuestions}</div>
          <div className="text-sm text-muted-foreground">Total</div>
        </div>
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-lg font-bold">
            {((result.score / result.totalQuestions) * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-muted-foreground">Percentage</div>
        </div>
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-lg font-bold">{result.scanAccuracy}%</div>
          <div className="text-sm text-muted-foreground">Accuracy</div>
        </div>
      </div>

      {/* Answers Grid */}
      <ScrollArea className="h-96">
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {questions.map((questionId) => {
            const studentAnswer = result.answers[questionId];
            const status = getAnswerStatus(questionId, studentAnswer);
            
            return (
              <div
                key={questionId}
                className={`p-2 text-center rounded border text-sm ${
                  status === 'correct' 
                    ? 'bg-green-100 border-green-300 text-green-800'
                    : status === 'incorrect'
                    ? 'bg-red-100 border-red-300 text-red-800'
                    : 'bg-gray-100 border-gray-300'
                }`}
              >
                <div className="font-medium">{questionId.replace('Q', '')}</div>
                <div className="font-bold">{studentAnswer}</div>
                {answerKey && answerKey[questionId] && status === 'incorrect' && (
                  <div className="text-xs text-green-600">({answerKey[questionId]})</div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {!answerKey && (
        <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Upload an answer key to see correct/incorrect highlighting
          </p>
        </div>
      )}
    </div>
  );
}