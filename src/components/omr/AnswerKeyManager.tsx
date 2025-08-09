import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Upload, Download, Plus, Trash2, Key } from 'lucide-react';
import type { AnswerKey } from '@/types/omr';

interface AnswerKeyManagerProps {
  answerKey: AnswerKey | null;
  onAnswerKeyChange: (answerKey: AnswerKey | null) => void;
}

export function AnswerKeyManager({ answerKey, onAnswerKeyChange }: AnswerKeyManagerProps) {
  const [manualKey, setManualKey] = useState<AnswerKey>(answerKey || {});
  useEffect(() => {
    setManualKey(answerKey || {});
  }, [answerKey]);
  const [quickSetup, setQuickSetup] = useState({
    totalQuestions: 50,
    pattern: 'A' as 'A' | 'B' | 'C' | 'D',
    startFrom: 1
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        // Validate the structure
        if (typeof parsed === 'object' && parsed !== null) {
          setManualKey(parsed);
          onAnswerKeyChange(parsed);
          toast({
            title: "Answer Key Loaded",
            description: `Loaded ${Object.keys(parsed).length} answers`,
          });
        } else {
          throw new Error('Invalid format');
        }
      } catch (error) {
        toast({
          title: "Upload Failed",
          description: "Invalid JSON format. Please check your file.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const downloadAnswerKey = () => {
    if (!answerKey || Object.keys(answerKey).length === 0) {
      toast({
        title: "No Answer Key",
        description: "Create an answer key first",
        variant: "destructive",
      });
      return;
    }

    const blob = new Blob([JSON.stringify(answerKey, null, 2)], {
      type: 'application/json',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `answer_key_${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    toast({
      title: "Download Complete",
      description: "Answer key has been downloaded",
    });
  };

  const generateQuickKey = () => {
    const { totalQuestions, pattern, startFrom } = quickSetup;
    const newKey: AnswerKey = {};

    for (let i = startFrom; i < startFrom + totalQuestions; i++) {
      newKey[`Q${i}`] = pattern;
    }

    setManualKey(newKey);
    onAnswerKeyChange(newKey);
    
    toast({
      title: "Answer Key Generated",
      description: `Generated ${totalQuestions} answers with pattern '${pattern}'`,
    });
  };

  const addQuestion = () => {
    const questionCount = Object.keys(manualKey).length;
    const newQuestion = `Q${questionCount + 1}`;
    const updated = { ...manualKey, [newQuestion]: 'A' };
    setManualKey(updated);
  };

  const updateAnswer = (questionId: string, answer: string) => {
    const updated = { ...manualKey, [questionId]: answer };
    setManualKey(updated);
    onAnswerKeyChange(updated);
  };

  const removeQuestion = (questionId: string) => {
    const updated = { ...manualKey };
    delete updated[questionId];
    setManualKey(updated);
    onAnswerKeyChange(updated);
  };

  const clearAnswerKey = () => {
    setManualKey({});
    onAnswerKeyChange(null);
    toast({
      title: "Answer Key Cleared",
      description: "All answers have been removed",
    });
  };

  const parseTextAnswers = (text: string) => {
    try {
      const lines = text.split('\n').filter(line => line.trim());
      const newKey: AnswerKey = {};

      lines.forEach(line => {
        const match = line.trim().match(/^(\d+|Q\d+)[:\s]+([A-E])/i);
        if (match) {
          const questionNum = match[1].startsWith('Q') ? match[1] : `Q${match[1]}`;
          newKey[questionNum] = match[2].toUpperCase();
        }
      });

      if (Object.keys(newKey).length > 0) {
        setManualKey(newKey);
        onAnswerKeyChange(newKey);
        toast({
          title: "Answer Key Imported",
          description: `Imported ${Object.keys(newKey).length} answers`,
        });
      } else {
        toast({
          title: "No Valid Answers Found",
          description: "Please use format: '1: A' or 'Q1: A'",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Parse Error",
        description: "Failed to parse text answers",
        variant: "destructive",
      });
    }
  };

  const questions = Object.keys(manualKey).sort((a, b) => {
    const numA = parseInt(a.replace('Q', ''));
    const numB = parseInt(b.replace('Q', ''));
    return numA - numB;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            <CardTitle>Answer Key Management</CardTitle>
          </div>
          <div className="flex gap-2">
            {answerKey && (
              <Button onClick={downloadAnswerKey} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
            <Button onClick={clearAnswerKey} variant="outline" size="sm">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {answerKey && Object.keys(answerKey).length > 0 ? (
            <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">
                Answer key active with {Object.keys(answerKey).length} questions
              </p>
            </div>
          ) : (
            <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">
                No answer key loaded. Create or upload one to enable score calculation.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Answer Key Methods */}
      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload">Upload File</TabsTrigger>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="quick">Quick Setup</TabsTrigger>
          <TabsTrigger value="text">Text Import</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Answer Key</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="answerKeyFile">JSON Answer Key File</Label>
                  <Input
                    id="answerKeyFile"
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="mt-1"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Expected format:</p>
                  <pre className="bg-muted p-2 rounded text-xs">
{`{
  "Q1": "A",
  "Q2": "B",
  "Q3": "C",
  ...
}`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Manual Answer Entry</CardTitle>
              <Button onClick={addQuestion} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </CardHeader>
            <CardContent>
              {questions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No questions added yet. Click "Add Question" to start.</p>
                </div>
              ) : (
                <div className="grid gap-4 max-h-96 overflow-y-auto">
                  {questions.map((questionId) => (
                    <div key={questionId} className="flex items-center gap-4 p-3 border rounded-lg">
                      <Label className="w-12 font-medium">{questionId}:</Label>
                      <Select
                        value={manualKey[questionId]}
                        onValueChange={(value) => updateAnswer(questionId, value)}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                          <SelectItem value="D">D</SelectItem>
                          <SelectItem value="E">E</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(questionId)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quick" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Answer Key Setup</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Total Questions</Label>
                    <Input
                      type="number"
                      value={quickSetup.totalQuestions}
                      onChange={(e) => setQuickSetup(prev => ({
                        ...prev,
                        totalQuestions: parseInt(e.target.value) || 0
                      }))}
                      min="1"
                      max="500"
                    />
                  </div>
                  <div>
                    <Label>Answer Pattern</Label>
                    <Select
                      value={quickSetup.pattern}
                      onValueChange={(value: 'A' | 'B' | 'C' | 'D') => 
                        setQuickSetup(prev => ({ ...prev, pattern: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Start From</Label>
                    <Input
                      type="number"
                      value={quickSetup.startFrom}
                      onChange={(e) => setQuickSetup(prev => ({
                        ...prev,
                        startFrom: parseInt(e.target.value) || 1
                      }))}
                      min="1"
                    />
                  </div>
                </div>
                <Button onClick={generateQuickKey} className="w-full">
                  Generate Answer Key
                </Button>
                <p className="text-sm text-muted-foreground">
                  This will create {quickSetup.totalQuestions} questions (Q{quickSetup.startFrom} to Q{quickSetup.startFrom + quickSetup.totalQuestions - 1}) 
                  all with answer "{quickSetup.pattern}"
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="text" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Text Import</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Paste Answer List</Label>
                  <Textarea
                    placeholder="1: A&#10;2: B&#10;3: C&#10;Q4: D&#10;5: A"
                    className="h-32"
                    onChange={(e) => {
                      if (e.target.value.trim()) {
                        parseTextAnswers(e.target.value);
                      }
                    }}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Supported formats:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>1: A</li>
                    <li>Q1: A</li>
                    <li>1 A</li>
                    <li>Q1 A</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}