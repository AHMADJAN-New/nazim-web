import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface SeoFieldsProps {
  seoTitleName?: string;
  seoDescriptionName?: string;
  seoImagePathName?: string;
}

export function SeoFields({
  seoTitleName = 'seoTitle',
  seoDescriptionName = 'seoDescription',
  seoImagePathName = 'seoImagePath',
}: SeoFieldsProps) {
  const { register } = useFormContext();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={seoTitleName}>SEO Title</Label>
        <Input
          id={seoTitleName}
          {...register(seoTitleName)}
          placeholder="Enter SEO title (max 60 characters)"
          maxLength={60}
        />
        <p className="text-xs text-muted-foreground">
          The title that appears in search engine results
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={seoDescriptionName}>SEO Description</Label>
        <Textarea
          id={seoDescriptionName}
          {...register(seoDescriptionName)}
          placeholder="Enter SEO description (max 160 characters)"
          maxLength={160}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          A brief description that appears in search engine results
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={seoImagePathName}>SEO Image Path</Label>
        <Input
          id={seoImagePathName}
          {...register(seoImagePathName)}
          placeholder="Enter image path for social media sharing"
        />
        <p className="text-xs text-muted-foreground">
          Image URL for Open Graph and Twitter cards
        </p>
      </div>
    </div>
  );
}

