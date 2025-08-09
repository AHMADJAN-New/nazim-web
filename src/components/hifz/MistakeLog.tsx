import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  Plus, 
  Edit,
  Search,
  Filter,
  BookOpen,
  Target,
  Clock,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface Mistake {
  id: string;
  date: Date;
  surah: string;
  ayah: number;
  mistakeType: 'tajwid' | 'pronunciation' | 'memorization' | 'flow';
  description: string;
  correction: string;
  resolved: boolean;
  recurrenceCount: number;
  teacherNotes?: string;
  tags: string[];
}

export function MistakeLog() {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [newMistakeOpen, setNewMistakeOpen] = useState(false);
  const [newMistake, setNewMistake] = useState<Partial<Mistake>>({
    mistakeType: 'tajwid',
    resolved: false,
    tags: []
  });
  const queryClient = useQueryClient();

  const { data: mistakes = [] } = useQuery({
    queryKey: ['mistakes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hifz_mistakes')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      return data as Mistake[];
    }
  });

  useEffect(() => {
    const channel = supabase
      .channel('hifz_mistakes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hifz_mistakes' }, () => {
        queryClient.invalidateQueries({ queryKey: ['mistakes'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const mistakeTypes = [
    { value: 'tajwid', label: t('Tajwid Rules'), color: 'bg-red-100 text-red-800', icon: '📖' },
    { value: 'pronunciation', label: t('Pronunciation'), color: 'bg-orange-100 text-orange-800', icon: '🗣️' },
    { value: 'memorization', label: t('Memorization'), color: 'bg-blue-100 text-blue-800', icon: '🧠' },
    { value: 'flow', label: t('Flow & Rhythm'), color: 'bg-purple-100 text-purple-800', icon: '🎵' }
  ];

  const getMistakeTypeConfig = (type: string) => {
    return mistakeTypes.find(mt => mt.value === type) || mistakeTypes[0];
  };

  const filteredMistakes = mistakes.filter(mistake => {
    const matchesSearch = mistake.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mistake.surah.includes(searchQuery) ||
                         mistake.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || mistake.mistakeType === filterType;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'resolved' && mistake.resolved) ||
                         (filterStatus === 'unresolved' && !mistake.resolved);
    return matchesSearch && matchesType && matchesStatus;
  });

  const { mutate: addMistake } = useMutation({
    mutationFn: async (mistake: Partial<Mistake>) => {
      const { error } = await supabase.from('hifz_mistakes').insert({
        ...mistake,
        date: mistake.date || new Date()
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mistakes'] });
      toast({ title: t('Mistake Added'), description: t('Mistake logged successfully') });
    }
  });

  const handleAddMistake = () => {
    addMistake(newMistake);
    setNewMistakeOpen(false);
    setNewMistake({ mistakeType: 'tajwid', resolved: false, tags: [] });
  };

  const mistakeStats = {
    total: mistakes.length,
    resolved: mistakes.filter(m => m.resolved).length,
    recurring: mistakes.filter(m => m.recurrenceCount > 1).length,
    thisWeek: mistakes.filter(m => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return m.date >= oneWeekAgo;
    }).length
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('Total Mistakes')}</p>
                <p className="text-lg font-semibold">{mistakeStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('Resolved')}</p>
                <p className="text-lg font-semibold">{mistakeStats.resolved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('Recurring')}</p>
                <p className="text-lg font-semibold">{mistakeStats.recurring}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('This Week')}</p>
                <p className="text-lg font-semibold">{mistakeStats.thisWeek}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('Mistake Log')}
            </CardTitle>
            
            <Dialog open={newMistakeOpen} onOpenChange={setNewMistakeOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('Log Mistake')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('Log New Mistake')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{t('Surah')}</Label>
                    <Input 
                      placeholder={t('Enter surah name')}
                      value={newMistake.surah || ''}
                      onChange={(e) => setNewMistake({...newMistake, surah: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label>{t('Ayah Number')}</Label>
                    <Input 
                      type="number"
                      placeholder="1"
                      value={newMistake.ayah || ''}
                      onChange={(e) => setNewMistake({...newMistake, ayah: parseInt(e.target.value)})}
                    />
                  </div>

                  <div>
                    <Label>{t('Mistake Type')}</Label>
                    <Select 
                      value={newMistake.mistakeType} 
                      onValueChange={(value: any) => setNewMistake({...newMistake, mistakeType: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {mistakeTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <span className="flex items-center gap-2">
                              <span>{type.icon}</span>
                              {type.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{t('Description')}</Label>
                    <Textarea 
                      placeholder={t('Describe the mistake...')}
                      value={newMistake.description || ''}
                      onChange={(e) => setNewMistake({...newMistake, description: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label>{t('Correction/Notes')}</Label>
                    <Textarea 
                      placeholder={t('How to fix this mistake...')}
                      value={newMistake.correction || ''}
                      onChange={(e) => setNewMistake({...newMistake, correction: e.target.value})}
                    />
                  </div>

                  <Button onClick={handleAddMistake} className="w-full">
                    {t('Save Mistake')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className={`absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder={t('Search mistakes...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRTL ? 'pr-10' : 'pl-10'}
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder={t('All Types')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Types')}</SelectItem>
                {mistakeTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      {type.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder={t('All Status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Status')}</SelectItem>
                <SelectItem value="resolved">{t('Resolved')}</SelectItem>
                <SelectItem value="unresolved">{t('Unresolved')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Mistakes List */}
      <div className="space-y-4">
        {filteredMistakes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('No Mistakes Found')}</h3>
              <p className="text-muted-foreground">{t('Try adjusting your filters or log a new mistake.')}</p>
            </CardContent>
          </Card>
        ) : (
          filteredMistakes.map((mistake) => {
            const typeConfig = getMistakeTypeConfig(mistake.mistakeType);
            return (
              <Card key={mistake.id} className={`border-l-4 ${mistake.resolved ? 'border-l-green-500' : 'border-l-red-500'}`}>
                <CardContent className="p-6">
                  <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div>
                          <h4 className="font-semibold text-lg">
                            {mistake.surah} - {t('Ayah')} {mistake.ayah}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {format(mistake.date, 'PPP')}
                          </p>
                        </div>
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Badge className={typeConfig.color}>
                            {typeConfig.icon} {typeConfig.label}
                          </Badge>
                          {mistake.recurrenceCount > 1 && (
                            <Badge variant="destructive">
                              {mistake.recurrenceCount}x {t('recurring')}
                            </Badge>
                          )}
                          {mistake.resolved && (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t('Resolved')}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-red-800">{t('Mistake:')}</p>
                        <p className="text-sm text-red-700">{mistake.description}</p>
                      </div>

                      {/* Correction */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-blue-800">{t('Correction:')}</p>
                        <p className="text-sm text-blue-700">{mistake.correction}</p>
                      </div>

                      {/* Teacher Notes */}
                      {mistake.teacherNotes && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-purple-800">{t('Teacher Notes:')}</p>
                          <p className="text-sm text-purple-700">{mistake.teacherNotes}</p>
                        </div>
                      )}

                      {/* Tags */}
                      {mistake.tags.length > 0 && (
                        <div className={`flex flex-wrap gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          {mistake.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className={`flex gap-2 pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          {t('Edit')}
                        </Button>
                        {!mistake.resolved && (
                          <Button size="sm">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {t('Mark Resolved')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}