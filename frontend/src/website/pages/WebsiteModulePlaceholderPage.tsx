import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WebsiteModulePlaceholderPageProps {
  title: string;
  description: string;
  actionLabel: string;
  features: string[];
}

export default function WebsiteModulePlaceholderPage({
  title,
  description,
  actionLabel,
  features,
}: WebsiteModulePlaceholderPageProps) {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 max-w-6xl overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
            <Badge variant="secondary">Coming soon</Badge>
          </div>
          <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
        </div>
        <Button disabled>{actionLabel}</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Planned capabilities</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary/60" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
