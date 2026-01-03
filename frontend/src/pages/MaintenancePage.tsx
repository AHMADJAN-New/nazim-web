import { useQuery } from '@tanstack/react-query';
import { 
  Wrench, 
  Clock, 
  RefreshCw, 
  Calendar, 
  AlertCircle, 
  CheckCircle2,
  Settings,
  Zap,
  Shield,
  Activity
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { maintenanceApi } from '@/lib/api/client';
import { formatDate, formatDateTime } from '@/lib/calendarAdapter';
import { cn } from '@/lib/utils';

interface MaintenancePageProps {
  message?: string;
  retryAfter?: number | null;
  scheduledEnd?: string | null;
}

interface MaintenanceStatus {
  is_maintenance_mode: boolean;
  message: string | null;
  scheduled_end_at: string | null;
  started_at: string | null;
  affected_services: string[];
}

export default function MaintenancePage({ 
  message: propMessage, 
  retryAfter: propRetryAfter, 
  scheduledEnd: propScheduledEnd 
}: MaintenancePageProps) {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timeUntilEnd, setTimeUntilEnd] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  // Fetch maintenance status from database
  const { data: maintenanceData, isLoading, error } = useQuery({
    queryKey: ['maintenance-status-public'],
    queryFn: async () => {
      const response = await maintenanceApi.getPublicStatus();
      return response.data;
    },
    refetchInterval: 10000, // Refetch every 10 seconds (faster to detect when disabled)
    staleTime: 5 * 1000, // Consider data stale after 5 seconds
  });

  const maintenanceStatus: MaintenanceStatus | null = maintenanceData || null;

  // CRITICAL: Redirect users when maintenance mode is disabled
  useEffect(() => {
    if (maintenanceStatus && !maintenanceStatus.is_maintenance_mode) {
      // Maintenance mode has been disabled - redirect users
      if (user) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/auth', { replace: true });
      }
    }
  }, [maintenanceStatus, user, navigate]);

  // Don't show maintenance page if maintenance is disabled
  if (maintenanceStatus && !maintenanceStatus.is_maintenance_mode) {
    return null; // Will redirect via useEffect
  }

  // Use database data if available, otherwise use props
  const displayMessage = maintenanceStatus?.message || propMessage || 
    t('maintenance.defaultMessage') || 
    'We are performing scheduled maintenance. We\'ll be back soon!';
  
  const scheduledEndAt = maintenanceStatus?.scheduled_end_at || propScheduledEnd;
  const startedAt = maintenanceStatus?.started_at;
  const affectedServices = maintenanceStatus?.affected_services || [];

  // Calculate progress percentage and time until scheduled end
  useEffect(() => {
    if (scheduledEndAt && startedAt) {
      const updateProgress = () => {
        try {
          const startDate = new Date(startedAt);
          const endDate = new Date(scheduledEndAt);
          const now = new Date();
          
          const totalDuration = endDate.getTime() - startDate.getTime();
          const elapsed = now.getTime() - startDate.getTime();
          const remaining = endDate.getTime() - now.getTime();

          // Calculate progress (0-100%)
          const progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
          setProgress(progressPercent);

          // Calculate time remaining
          if (remaining <= 0) {
            setTimeUntilEnd(null);
            setProgress(100);
            return;
          }

          const hours = Math.floor(remaining / (1000 * 60 * 60));
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

          if (hours > 0) {
            setTimeUntilEnd(`${hours}h ${minutes}m ${seconds}s`);
          } else if (minutes > 0) {
            setTimeUntilEnd(`${minutes}m ${seconds}s`);
          } else {
            setTimeUntilEnd(`${seconds}s`);
          }
        } catch (error) {
          setTimeUntilEnd(null);
        }
      };

      updateProgress();
      const interval = setInterval(updateProgress, 1000);
      return () => clearInterval(interval);
    } else if (scheduledEndAt) {
      // If we only have scheduled end, calculate time remaining
      const updateTimeUntilEnd = () => {
        try {
          const endDate = new Date(scheduledEndAt);
          const now = new Date();
          const diff = endDate.getTime() - now.getTime();

          if (diff <= 0) {
            setTimeUntilEnd(null);
            return;
          }

          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);

          if (hours > 0) {
            setTimeUntilEnd(`${hours}h ${minutes}m ${seconds}s`);
          } else if (minutes > 0) {
            setTimeUntilEnd(`${minutes}m ${seconds}s`);
          } else {
            setTimeUntilEnd(`${seconds}s`);
          }
        } catch (error) {
          setTimeUntilEnd(null);
        }
      };

      updateTimeUntilEnd();
      const interval = setInterval(updateTimeUntilEnd, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeUntilEnd(null);
    }
  }, [scheduledEndAt, startedAt]);

  // Countdown timer for retry after
  useEffect(() => {
    if (propRetryAfter && propRetryAfter > 0) {
      setCountdown(propRetryAfter);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [propRetryAfter]);

  const handleRetry = () => {
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div 
        className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <Card className="w-full max-w-2xl shadow-2xl border-0">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-muted-foreground">{t('common.loading') || 'Loading...'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 relative overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        <Card className="w-full shadow-2xl border-0 backdrop-blur-sm bg-white/95">
          {/* Hero Section */}
          <CardHeader className="text-center space-y-6 pb-8 pt-12 px-8">
            <div className="flex justify-center relative">
              <div className="relative">
                {/* Main icon with pulsing animation */}
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300">
                  <Settings className="h-16 w-16 text-white animate-spin-slow" />
                </div>
                {/* Pulsing indicator */}
                <div className="absolute -top-2 -right-2 h-6 w-6 bg-yellow-400 rounded-full animate-ping"></div>
                <div className="absolute -top-2 -right-2 h-6 w-6 bg-yellow-400 rounded-full"></div>
              </div>
            </div>
            
            <div className="space-y-3">
              <CardTitle className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {t('maintenance.title') || 'System Under Maintenance'}
              </CardTitle>
              <CardDescription className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                {displayMessage}
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 px-8 pb-8">
            {/* Progress Bar */}
            {startedAt && scheduledEndAt && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">
                    {t('maintenance.progress') || 'Maintenance Progress'}
                  </span>
                  <span className="font-bold text-blue-600">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
            )}

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Started At */}
              {startedAt && (
                <Card className="border-2 border-slate-200 hover:border-blue-300 transition-colors bg-gradient-to-br from-slate-50 to-white">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                          {t('maintenance.startedAt') || 'Maintenance Started'}
                        </p>
                        <p className="text-base font-semibold text-slate-900">
                          {formatDateTime(new Date(startedAt))}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Scheduled End Time */}
              {scheduledEndAt && (
                <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors bg-gradient-to-br from-blue-50 to-white">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-500 rounded-xl">
                        <Clock className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                          {t('maintenance.scheduledEnd') || 'Scheduled Completion'}
                        </p>
                        <p className="text-base font-semibold text-slate-900 mb-2">
                          {formatDateTime(new Date(scheduledEndAt))}
                        </p>
                        {timeUntilEnd && (
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-blue-500" />
                              <p className="text-sm font-bold text-blue-700">
                                {timeUntilEnd} {t('maintenance.remaining') || 'remaining'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Affected Services */}
            {affectedServices.length > 0 && (
              <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-orange-500 rounded-xl">
                      <AlertCircle className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-3">
                        {t('maintenance.affectedServices') || 'Affected Services'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {affectedServices.map((service, index) => (
                          <Badge 
                            key={index} 
                            variant="outline" 
                            className="bg-white text-orange-700 border-orange-300 hover:bg-orange-50 transition-colors px-3 py-1.5"
                          >
                            <Activity className="h-3 w-3 mr-1.5" />
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Badge */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 rounded-full border border-yellow-300">
                <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-yellow-800">
                  {t('maintenance.inProgress') || 'Maintenance in Progress'}
                </span>
              </div>
            </div>

            {/* Retry After Countdown */}
            {countdown !== null && countdown > 0 && (
              <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
                <CardContent className="p-5">
                  <div className="flex items-center justify-center gap-4">
                    <RefreshCw className="h-6 w-6 text-yellow-600 animate-spin" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-yellow-900 mb-1">
                        {t('maintenance.retryAfter') || 'You can try again in'}
                      </p>
                      <p className="text-2xl font-bold text-yellow-700">
                        {countdown} {t('maintenance.seconds') || 'seconds'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <Button
                onClick={handleRetry}
                disabled={countdown !== null && countdown > 0}
                size="lg"
                className="min-w-[200px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <RefreshCw className={cn(
                  "h-5 w-5 mr-2",
                  countdown !== null && countdown > 0 && "animate-spin"
                )} />
                {t('maintenance.retry') || 'Retry Connection'}
              </Button>
              
              {!scheduledEndAt && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => window.location.reload()}
                  className="min-w-[200px] border-2 hover:bg-slate-50"
                >
                  <Shield className="h-5 w-5 mr-2" />
                  {t('maintenance.refresh') || 'Refresh Page'}
                </Button>
              )}
            </div>

            {/* Additional Info */}
            <div className="text-center pt-6 border-t border-slate-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <p className="text-sm font-medium text-slate-700">
                  {t('maintenance.teamWorking') || 'Our team is working hard to restore service'}
                </p>
              </div>
              <p className="text-xs text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {t('maintenance.info') || 
                  'We apologize for any inconvenience. Our team is working hard to restore service as quickly as possible. Thank you for your patience.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-muted-foreground">
          <p>{t('maintenance.autoRefresh') || 'This page will automatically refresh every 30 seconds'}</p>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
