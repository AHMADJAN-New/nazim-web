import { Home, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';

export default function NotFound() {
  const { t, isRTL } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-6">
          <div className="text-6xl font-bold text-muted-foreground mb-4">404</div>
          <h1 className="text-2xl font-bold mb-2">{t('notFound.title') || 'Page Not Found'}</h1>
          <p className="text-muted-foreground mb-6">
            {t('notFound.message') || 'The page you are looking for does not exist.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild>
              <Link to="/" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Home className="h-4 w-4" />
                {t('notFound.goHome') || 'Go Home'}
              </Link>
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
              {t('events.goBack') || 'Go Back'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
