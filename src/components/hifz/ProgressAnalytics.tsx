import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  Award, 
  AlertTriangle,
  Download,
  Calendar,
  BookOpen,
  CheckCircle
} from 'lucide-react';

export function ProgressAnalytics() {
  const { t, isRTL } = useLanguage();
  const [timeRange, setTimeRange] = useState('week');
  const [selectedMetric, setSelectedMetric] = useState('all');

  // Mock analytics data
  const analyticsData = {
    overview: {
      totalAyahs: 245,
      masteredAyahs: 198,
      currentStreak: 12,
      averageAccuracy: 94.5,
      totalHours: 48.5,
      sessionsThisWeek: 6
    },
    weeklyProgress: [
      { day: 'Mon', ayahs: 8, accuracy: 95, duration: 45 },
      { day: 'Tue', ayahs: 12, accuracy: 92, duration: 60 },
      { day: 'Wed', ayahs: 6, accuracy: 98, duration: 30 },
      { day: 'Thu', ayahs: 10, accuracy: 90, duration: 50 },
      { day: 'Fri', ayahs: 15, accuracy: 96, duration: 70 },
      { day: 'Sat', ayahs: 9, accuracy: 94, duration: 40 },
      { day: 'Sun', ayahs: 11, accuracy: 93, duration: 55 }
    ],
    surahProgress: [
      { name: 'الفاتحة', arabic: 'Al-Fatihah', progress: 100, totalAyahs: 7, mastered: 7 },
      { name: 'البقرة', arabic: 'Al-Baqarah', progress: 65, totalAyahs: 286, mastered: 186 },
      { name: 'آل عمران', arabic: 'Ali Imran', progress: 25, totalAyahs: 200, mastered: 50 },
      { name: 'النساء', arabic: 'An-Nisa', progress: 10, totalAyahs: 176, mastered: 18 },
      { name: 'المائدة', arabic: 'Al-Maidah', progress: 5, totalAyahs: 120, mastered: 6 }
    ],
    commonMistakes: [
      { type: 'Tajwid Rules', count: 15, trend: -2 },
      { type: 'Pronunciation', count: 8, trend: -1 },
      { type: 'Flow & Rhythm', count: 12, trend: 1 },
      { type: 'Memorization', count: 5, trend: -3 }
    ]
  };

  const timeRanges = [
    { value: 'week', label: t('This Week') },
    { value: 'month', label: t('This Month') },
    { value: 'quarter', label: t('Last 3 Months') },
    { value: 'year', label: t('This Year') }
  ];

  const exportData = () => {
    // Mock export functionality
    console.log('Exporting analytics data...');
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
        <div>
          <h2 className="text-2xl font-bold">{t('Progress Analytics')}</h2>
          <p className="text-muted-foreground">{t('Track your Hifz journey with detailed insights')}</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeRanges.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            {t('Export PDF')}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{t('Total Ayahs')}</p>
                <p className="text-2xl font-bold">{analyticsData.overview.totalAyahs}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-500">+12 {t('this week')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{t('Mastered')}</p>
                <p className="text-2xl font-bold">{analyticsData.overview.masteredAyahs}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-blue-500">
                    {Math.round((analyticsData.overview.masteredAyahs / analyticsData.overview.totalAyahs) * 100)}% {t('complete')}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{t('Accuracy')}</p>
                <p className="text-2xl font-bold">{analyticsData.overview.averageAccuracy}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-500">+2.5% {t('improved')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{t('Current Streak')}</p>
                <p className="text-2xl font-bold">{analyticsData.overview.currentStreak}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-purple-500">{t('days')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Progress Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('Weekly Progress')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.weeklyProgress.map((day) => (
              <div key={day.day} className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-12 text-sm font-medium">{day.day}</div>
                <div className="flex-1 space-y-2">
                  <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span>{day.ayahs} {t('Ayahs')}</span>
                    <span>{day.accuracy}% {t('Accuracy')}</span>
                  </div>
                  <Progress value={(day.ayahs / 20) * 100} className="h-2" />
                </div>
                <div className="w-16 text-sm text-muted-foreground text-right">
                  {day.duration} {t('min')}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Surah Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t('Surah Progress')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.surahProgress.map((surah) => (
              <div key={surah.name} className="space-y-2">
                <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div>
                    <span className="font-medium">{surah.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">({surah.arabic})</span>
                  </div>
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm text-muted-foreground">
                      {surah.mastered}/{surah.totalAyahs}
                    </span>
                    <Badge variant="secondary">{surah.progress}%</Badge>
                  </div>
                </div>
                <Progress value={surah.progress} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Common Mistakes Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t('Common Mistakes')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.commonMistakes.map((mistake) => (
                <div key={mistake.type} className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div>
                    <span className="font-medium">{mistake.type}</span>
                    <div className="flex items-center gap-1 mt-1">
                      {mistake.trend < 0 ? (
                        <TrendingDown className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingUp className="h-3 w-3 text-red-500" />
                      )}
                      <span className={`text-xs ${mistake.trend < 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {Math.abs(mistake.trend)} {t('this week')}
                      </span>
                    </div>
                  </div>
                  <Badge variant={mistake.trend < 0 ? "default" : "destructive"}>
                    {mistake.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('Study Time Analysis')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm text-muted-foreground">{t('Total Hours')}</span>
                <span className="font-semibold">{analyticsData.overview.totalHours}h</span>
              </div>
              <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm text-muted-foreground">{t('Average per Session')}</span>
                <span className="font-semibold">45 {t('min')}</span>
              </div>
              <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm text-muted-foreground">{t('Best Day')}</span>
                <span className="font-semibold">{t('Friday')}</span>
              </div>
              <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm text-muted-foreground">{t('Sessions This Week')}</span>
                <span className="font-semibold">{analyticsData.overview.sessionsThisWeek}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals and Targets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('Goals & Targets')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">{t('Monthly Goal')}</h4>
              <div className="space-y-2">
                <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span>{t('Complete Surah Al-Baqarah')}</span>
                  <span>65%</span>
                </div>
                <Progress value={65} className="h-2" />
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">{t('Weekly Target')}</h4>
              <div className="space-y-2">
                <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span>{t('50 New Ayahs')}</span>
                  <span>76%</span>
                </div>
                <Progress value={76} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}