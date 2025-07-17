import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Target, Calendar, Award, Flame, BookOpen, CheckCircle } from 'lucide-react';

export function MotivationWall() {
  const { t, isRTL } = useLanguage();

  const achievements = [
    { id: 1, title: 'First Surah Complete', icon: Trophy, earned: true, date: '2024-01-10' },
    { id: 2, title: '7-Day Streak', icon: Flame, earned: true, date: '2024-01-15' },
    { id: 3, title: '100 Ayahs Memorized', icon: BookOpen, earned: true, date: '2024-01-20' },
    { id: 4, title: 'Perfect Week', icon: Star, earned: false, progress: 85 },
    { id: 5, title: 'Tajwid Master', icon: Award, earned: false, progress: 60 }
  ];

  const currentStreak = 12;
  const totalAyahs = 245;
  const monthlyGoal = 300;

  return (
    <div className="space-y-6">
      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {t('Achievements')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((achievement) => (
              <div key={achievement.id} className={`p-4 rounded-lg border ${achievement.earned ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <achievement.icon className={`h-8 w-8 ${achievement.earned ? 'text-yellow-600' : 'text-gray-400'}`} />
                  <div className="flex-1">
                    <h4 className="font-medium">{achievement.title}</h4>
                    {achievement.earned ? (
                      <Badge variant="secondary" className="mt-1">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t('Earned')}
                      </Badge>
                    ) : (
                      <div className="mt-2">
                        <Progress value={achievement.progress} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{achievement.progress}% {t('Complete')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('Current Goals')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className={`flex justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="font-medium">{t('Monthly Goal')}</span>
              <span className="text-sm text-muted-foreground">{totalAyahs}/{monthlyGoal} {t('Ayahs')}</span>
            </div>
            <Progress value={(totalAyahs/monthlyGoal) * 100} className="h-3" />
          </div>
          
          <div className={`flex items-center gap-4 p-4 bg-orange-50 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Flame className="h-8 w-8 text-orange-600" />
            <div>
              <h4 className="font-semibold text-orange-800">{currentStreak} {t('Day Streak!')}</h4>
              <p className="text-sm text-orange-600">{t('Keep going to reach 30 days!')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}