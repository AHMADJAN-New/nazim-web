import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { StarIcon, MessageCircle, Plus, Send, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface TeacherComment {
  id: string;
  teacherName: string;
  date: Date;
  surah: string;
  ayahRange: string;
  rating: number;
  comment: string;
  improvements: string[];
  strengths: string[];
  nextGoals: string;
}

export function TeacherFeedback() {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const [newCommentOpen, setNewCommentOpen] = useState(false);
  const [filterTeacher, setFilterTeacher] = useState('all');
  const [newComment, setNewComment] = useState<Partial<TeacherComment>>({
    rating: 5,
    improvements: [],
    strengths: []
  });
  const queryClient = useQueryClient();

  const { data: teacherComments = [] } = useQuery({
    queryKey: ['teacher-feedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hifz_teacher_feedback')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data as TeacherComment[];
    }
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('full_name');
      if (error) throw error;
      return (data || []).map((t: any) => t.full_name);
    }
  });

  useEffect(() => {
    const channel = supabase
      .channel('hifz_teacher_feedback')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hifz_teacher_feedback' }, () => {
        queryClient.invalidateQueries({ queryKey: ['teacher-feedback'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { mutate: addFeedback } = useMutation({
    mutationFn: async (comment: Partial<TeacherComment>) => {
      const { error } = await supabase.from('hifz_teacher_feedback').insert(comment);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-feedback'] });
      toast({ title: t('Feedback Added'), description: t('Teacher feedback has been recorded successfully') });
    }
  });

  const handleAddComment = () => {
    addFeedback({ ...newComment, date: new Date() });
    setNewCommentOpen(false);
    setNewComment({ rating: 5, improvements: [], strengths: [] });
  };

  const renderStarRating = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={`h-5 w-5 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:text-yellow-300' : ''}`}
            onClick={() => interactive && onRatingChange?.(star)}
          />
        ))}
      </div>
    );
  };

  const filteredComments = teacherComments.filter(comment =>
    filterTeacher === 'all' || comment.teacherName === filterTeacher
  );

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h2 className="text-2xl font-bold">{t('Teacher Feedback')}</h2>
          <p className="text-muted-foreground">{t('Review guidance and comments from your teachers')}</p>
        </div>
        
        <Dialog open={newCommentOpen} onOpenChange={setNewCommentOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('Add Feedback')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('Add Teacher Feedback')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('Teacher')}</Label>
                  <Select 
                    value={newComment.teacherName || ''} 
                    onValueChange={(value) => setNewComment({...newComment, teacherName: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select Teacher')} />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher} value={teacher}>{teacher}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>{t('Rating')}</Label>
                  <div className="pt-2">
                    {renderStarRating(newComment.rating || 5, true, (rating) => 
                      setNewComment({...newComment, rating})
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('Surah')}</Label>
                  <Input 
                    placeholder={t('Enter surah name')}
                    value={newComment.surah || ''}
                    onChange={(e) => setNewComment({...newComment, surah: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label>{t('Ayah Range')}</Label>
                  <Input 
                    placeholder="1-20"
                    value={newComment.ayahRange || ''}
                    onChange={(e) => setNewComment({...newComment, ayahRange: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label>{t('Feedback Comment')}</Label>
                <Textarea 
                  placeholder={t('Enter detailed feedback...')}
                  value={newComment.comment || ''}
                  onChange={(e) => setNewComment({...newComment, comment: e.target.value})}
                  rows={3}
                />
              </div>

              <div>
                <Label>{t('Next Goals')}</Label>
                <Textarea 
                  placeholder={t('What should the student focus on next?')}
                  value={newComment.nextGoals || ''}
                  onChange={(e) => setNewComment({...newComment, nextGoals: e.target.value})}
                  rows={2}
                />
              </div>

              <Button onClick={handleAddComment} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                {t('Save Feedback')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label>{t('Filter by Teacher:')}</Label>
            <Select value={filterTeacher} onValueChange={setFilterTeacher}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Teachers')}</SelectItem>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher} value={teacher}>{teacher}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <div className="space-y-4">
        {filteredComments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('No Feedback Yet')}</h3>
              <p className="text-muted-foreground">{t('Teacher feedback will appear here once available.')}</p>
            </CardContent>
          </Card>
        ) : (
          filteredComments.map((comment) => (
            <Card key={comment.id} className="border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="flex-1 space-y-4">
                    {/* Header */}
                    <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div>
                        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg">{comment.teacherName}</h4>
                            <p className="text-sm text-muted-foreground">
                              {comment.surah} - {t('Ayahs')} {comment.ayahRange}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {renderStarRating(comment.rating)}
                        <span className="text-sm text-muted-foreground">
                          {format(comment.date, 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>

                    {/* Main Comment */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-800">{comment.comment}</p>
                    </div>

                    {/* Strengths */}
                    {comment.strengths.length > 0 && (
                      <div>
                        <h5 className="font-medium text-green-700 mb-2">{t('Strengths:')}</h5>
                        <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          {comment.strengths.map((strength, index) => (
                            <Badge key={index} className="bg-green-100 text-green-800">
                              ✓ {strength}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Areas for Improvement */}
                    {comment.improvements.length > 0 && (
                      <div>
                        <h5 className="font-medium text-orange-700 mb-2">{t('Areas for Improvement:')}</h5>
                        <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          {comment.improvements.map((improvement, index) => (
                            <Badge key={index} className="bg-orange-100 text-orange-800">
                              → {improvement}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Next Goals */}
                    {comment.nextGoals && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h5 className="font-medium text-purple-700 mb-2">{t('Next Goals:')}</h5>
                        <p className="text-purple-800">{comment.nextGoals}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}