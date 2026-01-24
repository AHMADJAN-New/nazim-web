import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PublicWebsitePlaceholderPageProps {
  title: string;
  description: string;
  highlights: string[];
}

export default function PublicWebsitePlaceholderPage({
  title,
  description,
  highlights,
}: PublicWebsitePlaceholderPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <section className="border-b bg-muted/30 py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
            <Badge variant="secondary">Public preview</Badge>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Planned content blocks</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary/60" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
