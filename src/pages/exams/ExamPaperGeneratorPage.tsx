import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, FileText, Download, Edit, Trash2 } from 'lucide-react';
import { useExamQuestions, useCreateExamQuestion, useUpdateExamQuestion, useDeleteExamQuestion } from '@/hooks/useExamQuestions';
import { useExams } from '@/hooks/useExams';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function ExamPaperGeneratorPage() {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  
  const { data: exams } = useExams();
  const { data: questions } = useExamQuestions(examId);
  const createQuestion = useCreateExamQuestion();
  const updateQuestion = useUpdateExamQuestion();
  const deleteQuestion = useDeleteExamQuestion();

  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    options: ['', '', '', ''],
    correct_answer: '',
    marks: 1,
    difficulty_level: 'medium',
    subject_area: '',
  });

  const selectedExam = exams?.find(exam => exam.id === examId);

  const handleCreateQuestion = async () => {
    if (!examId || !user) return;

    const questionData = {
      exam_id: examId,
      question_number: (questions?.length || 0) + 1,
      question_text: newQuestion.question_text,
      question_type: newQuestion.question_type as any,
      options: newQuestion.question_type === 'multiple_choice' ? newQuestion.options.filter(opt => opt.trim()) : null,
      correct_answer: newQuestion.correct_answer,
      marks: newQuestion.marks,
      difficulty_level: newQuestion.difficulty_level as any,
      subject_area: newQuestion.subject_area,
      created_by: user.id,
    };

    await createQuestion.mutateAsync(questionData);
    setIsQuestionDialogOpen(false);
    setNewQuestion({
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: '',
      marks: 1,
      difficulty_level: 'medium',
      subject_area: '',
    });
  };

  const handleEditQuestion = (question: any) => {
    setEditingQuestion(question);
    setNewQuestion({
      question_text: question.question_text,
      question_type: question.question_type,
      options: question.options || ['', '', '', ''],
      correct_answer: question.correct_answer || '',
      marks: question.marks,
      difficulty_level: question.difficulty_level,
      subject_area: question.subject_area || '',
    });
    setIsQuestionDialogOpen(true);
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return;

    const updates = {
      question_text: newQuestion.question_text,
      question_type: newQuestion.question_type as any,
      options: newQuestion.question_type === 'multiple_choice' ? newQuestion.options.filter(opt => opt.trim()) : null,
      correct_answer: newQuestion.correct_answer,
      marks: newQuestion.marks,
      difficulty_level: newQuestion.difficulty_level as any,
      subject_area: newQuestion.subject_area,
    };

    await updateQuestion.mutateAsync({ id: editingQuestion.id, ...updates });
    setIsQuestionDialogOpen(false);
    setEditingQuestion(null);
    setNewQuestion({
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: '',
      marks: 1,
      difficulty_level: 'medium',
      subject_area: '',
    });
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      await deleteQuestion.mutateAsync(questionId);
    }
  };

  const generatePDF = () => {
    if (!selectedExam || !questions?.length) {
      toast.error('No questions available to generate PDF');
      return;
    }

    // Basic PDF generation logic - you can enhance this with a library like jsPDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${selectedExam.name} - Question Paper</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .exam-info { margin-bottom: 20px; }
          .question { margin-bottom: 20px; page-break-inside: avoid; }
          .question-number { font-weight: bold; }
          .options { margin-left: 20px; }
          .option { margin: 5px 0; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>School Management System</h1>
          <h2>${selectedExam.name}</h2>
        </div>
        
        <div class="exam-info">
          <p><strong>Subject:</strong> ${selectedExam.subjects?.name || 'N/A'}</p>
          <p><strong>Class:</strong> ${selectedExam.classes?.name || 'N/A'}</p>
          <p><strong>Date:</strong> ${new Date(selectedExam.exam_date).toLocaleDateString()}</p>
          <p><strong>Duration:</strong> ${selectedExam.duration_minutes || 'N/A'} minutes</p>
          <p><strong>Total Marks:</strong> ${totalMarks}</p>
        </div>

        <hr>

        <div class="questions">
          ${questions.map((question, index) => `
            <div class="question">
              <p class="question-number">Q${index + 1}. ${question.question_text} (${question.marks} marks)</p>
              ${question.question_type === 'multiple_choice' && question.options ? `
                <div class="options">
                  ${question.options.map((option, i) => `
                    <div class="option">${String.fromCharCode(97 + i)}) ${option}</div>
                  `).join('')}
                </div>
              ` : `
                <div style="height: 60px; border-bottom: 1px solid #ddd; margin: 10px 0;"></div>
              `}
            </div>
          `).join('')}
        </div>

        <div class="no-print" style="position: fixed; top: 10px; right: 10px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Print</button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">Close</button>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  if (!examId) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Select an Exam</h1>
        <p>Please select an exam from the exams page to generate question paper.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{selectedExam?.name || 'Exam Paper Generator'}</h1>
          {selectedExam && (
            <p className="text-muted-foreground">
              {selectedExam.subjects?.name} • {selectedExam.classes?.name}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={generatePDF} disabled={!questions?.length}>
            <Download className="w-4 h-4 mr-2" />
            Generate PDF
          </Button>
          <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingQuestion ? 'Edit Question' : 'Add New Question'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="question_text">Question Text</Label>
                  <Textarea
                    id="question_text"
                    value={newQuestion.question_text}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, question_text: e.target.value }))}
                    placeholder="Enter the question..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="question_type">Question Type</Label>
                    <Select
                      value={newQuestion.question_type}
                      onValueChange={(value) => setNewQuestion(prev => ({ ...prev, question_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="short_answer">Short Answer</SelectItem>
                        <SelectItem value="essay">Essay</SelectItem>
                        <SelectItem value="true_false">True/False</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="marks">Marks</Label>
                    <Input
                      id="marks"
                      type="number"
                      value={newQuestion.marks}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, marks: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>

                {newQuestion.question_type === 'multiple_choice' && (
                  <div>
                    <Label>Options</Label>
                    {newQuestion.options.map((option, index) => (
                      <div key={index} className="flex gap-2 mt-2">
                        <span className="self-center w-6">{String.fromCharCode(97 + index)})</span>
                        <Input
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...newQuestion.options];
                            newOptions[index] = e.target.value;
                            setNewQuestion(prev => ({ ...prev, options: newOptions }));
                          }}
                          placeholder={`Option ${String.fromCharCode(97 + index)}`}
                        />
                      </div>
                    ))}
                    
                    <div className="mt-2">
                      <Label htmlFor="correct_answer">Correct Answer</Label>
                      <Select
                        value={newQuestion.correct_answer}
                        onValueChange={(value) => setNewQuestion(prev => ({ ...prev, correct_answer: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select correct answer" />
                        </SelectTrigger>
                        <SelectContent>
                          {newQuestion.options.map((option, index) => (
                            option.trim() && (
                              <SelectItem key={index} value={option}>
                                {String.fromCharCode(97 + index)}) {option}
                              </SelectItem>
                            )
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="difficulty_level">Difficulty Level</Label>
                    <Select
                      value={newQuestion.difficulty_level}
                      onValueChange={(value) => setNewQuestion(prev => ({ ...prev, difficulty_level: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="subject_area">Subject Area</Label>
                    <Input
                      id="subject_area"
                      value={newQuestion.subject_area}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, subject_area: e.target.value }))}
                      placeholder="e.g., Algebra, Biology..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsQuestionDialogOpen(false);
                      setEditingQuestion(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={editingQuestion ? handleUpdateQuestion : handleCreateQuestion}
                    disabled={!newQuestion.question_text.trim()}
                  >
                    {editingQuestion ? 'Update Question' : 'Add Question'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Question Bank ({questions?.length || 0} questions)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {questions?.length ? (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <Card key={question.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Q{index + 1}.</span>
                      <Badge variant={question.difficulty_level === 'easy' ? 'default' : question.difficulty_level === 'medium' ? 'secondary' : 'destructive'}>
                        {question.difficulty_level}
                      </Badge>
                      <Badge variant="outline">{question.marks} marks</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditQuestion(question)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteQuestion(question.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="mb-2">{question.question_text}</p>
                  
                  {question.question_type === 'multiple_choice' && question.options && (
                    <div className="ml-4 space-y-1">
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex} className={`text-sm ${option === question.correct_answer ? 'font-semibold text-green-600' : ''}`}>
                          {String.fromCharCode(97 + optIndex)}) {option}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {question.subject_area && (
                    <div className="mt-2">
                      <Badge variant="outline">{question.subject_area}</Badge>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No questions added yet. Click "Add Question" to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}