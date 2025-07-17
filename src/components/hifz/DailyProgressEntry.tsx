import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Save, Upload, Play, Pause, Mic, Video, FileText, CheckCircle, AlertCircle, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ProgressEntry {
  date: Date;
  surah: string;
  ayahRange: string;
  sessionType: 'memorization' | 'revision' | 'both';
  status: 'completed' | 'partial' | 'needs_work';
  notes: string;
  mistakes: string[];
  mediaUrl?: string;
  duration: number; // in minutes
}

export function DailyProgressEntry() {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentEntry, setCurrentEntry] = useState<Partial<ProgressEntry>>({
    date: new Date(),
    sessionType: 'memorization',
    status: 'completed',
    notes: '',
    mistakes: [],
    duration: 30
  });
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<'audio' | 'video' | null>(null);

  // Mock data for surahs
  const surahs = [
    { id: '001', name: 'الفاتحة', arabic: 'Al-Fatihah', ayahs: 7 },
    { id: '002', name: 'البقرة', arabic: 'Al-Baqarah', ayahs: 286 },
    { id: '003', name: 'آل عمران', arabic: 'Ali \'Imran', ayahs: 200 },
    { id: '004', name: 'النساء', arabic: 'An-Nisa', ayahs: 176 },
    { id: '005', name: 'المائدة', arabic: 'Al-Maidah', ayahs: 120 }
  ];

  const sessionTypes = [
    { value: 'memorization', label: t('New Memorization'), icon: '📖' },
    { value: 'revision', label: t('Revision'), icon: '🔄' },
    { value: 'both', label: t('Both'), icon: '📚' }
  ];

  const statusOptions = [
    { value: 'completed', label: t('Mastered'), icon: CheckCircle, color: 'text-green-500' },
    { value: 'partial', label: t('In Progress'), icon: AlertCircle, color: 'text-yellow-500' },
    { value: 'needs_work', label: t('Needs Work'), icon: AlertCircle, color: 'text-red-500' }
  ];

  const handleSave = () => {
    // Here you would save to Supabase
    toast({
      title: t('Progress Saved'),
      description: t('Your Hifz session has been recorded successfully'),
    });
  };

  const toggleRecording = (type: 'audio' | 'video') => {
    if (isRecording && recordingType === type) {
      setIsRecording(false);
      setRecordingType(null);
    } else {
      setIsRecording(true);
      setRecordingType(type);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm">📖</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('This Week')}</p>
                <p className="text-lg font-semibold">12 {t('Ayahs')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm">🔄</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('Streak')}</p>
                <p className="text-lg font-semibold">7 {t('Days')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 text-sm">📊</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('Accuracy')}</p>
                <p className="text-lg font-semibold">94%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 text-sm">⏱️</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('Today')}</p>
                <p className="text-lg font-semibold">45 {t('Min')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t('Log Today\'s Session')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Selection */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label>{t('Session Date')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : t('Pick a date')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1">
              <Label>{t('Session Type')}</Label>
              <Select 
                value={currentEntry.sessionType} 
                onValueChange={(value: any) => setCurrentEntry({...currentEntry, sessionType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sessionTypes.map((type) => (
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
          </div>

          {/* Surah and Ayah Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('Surah')}</Label>
              <Select 
                value={currentEntry.surah} 
                onValueChange={(value) => setCurrentEntry({...currentEntry, surah: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('Select Surah')} />
                </SelectTrigger>
                <SelectContent>
                  {surahs.map((surah) => (
                    <SelectItem key={surah.id} value={surah.id}>
                      <span className={`${isRTL ? 'text-right' : 'text-left'}`}>
                        {surah.id}. {surah.name} ({surah.arabic})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('Ayah Range')}</Label>
              <Input
                placeholder={t('e.g., 1-10 or 15')}
                value={currentEntry.ayahRange || ''}
                onChange={(e) => setCurrentEntry({...currentEntry, ayahRange: e.target.value})}
              />
            </div>
          </div>

          {/* Status and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('Session Status')}</Label>
              <Select 
                value={currentEntry.status} 
                onValueChange={(value: any) => setCurrentEntry({...currentEntry, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <span className="flex items-center gap-2">
                        <status.icon className={`h-4 w-4 ${status.color}`} />
                        {status.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('Duration (minutes)')}</Label>
              <Input
                type="number"
                min="1"
                value={currentEntry.duration || ''}
                onChange={(e) => setCurrentEntry({...currentEntry, duration: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>

          <Separator />

          {/* Media Upload/Recording Section */}
          <div className="space-y-4">
            <Label>{t('Audio/Video Recording')}</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={isRecording && recordingType === 'audio' ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleRecording('audio')}
              >
                <Mic className="h-4 w-4 mr-2" />
                {isRecording && recordingType === 'audio' ? t('Stop Audio') : t('Record Audio')}
              </Button>
              
              <Button
                variant={isRecording && recordingType === 'video' ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleRecording('video')}
              >
                <Video className="h-4 w-4 mr-2" />
                {isRecording && recordingType === 'video' ? t('Stop Video') : t('Record Video')}
              </Button>

              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                {t('Upload File')}
              </Button>
            </div>

            {isRecording && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-600">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  {t('Recording')} {recordingType === 'audio' ? t('Audio') : t('Video')}...
                </div>
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div>
            <Label>{t('Session Notes')}</Label>
            <Textarea
              placeholder={t('Add notes about today\'s session, challenges, or observations...')}
              value={currentEntry.notes || ''}
              onChange={(e) => setCurrentEntry({...currentEntry, notes: e.target.value})}
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button onClick={handleSave} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {t('Save Session')}
            </Button>
            <Button variant="outline">
              {t('Save as Draft')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Add Shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Quick Add')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              {t('Repeat Last Session')}
            </Button>
            <Button variant="outline" size="sm">
              {t('Continue Previous Surah')}
            </Button>
            <Button variant="outline" size="sm">
              {t('Mark Revision Complete')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}