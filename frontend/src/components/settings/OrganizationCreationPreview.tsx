import { useState, useEffect } from 'react';
import { organizationsApi } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading';
import { Building2, Users, Shield, School, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface PreviewData {
  organization: {
    name: string;
    slug: string;
    description: string;
  };
  school: {
    name: string;
    description: string;
  };
  admin_user: {
    email: string;
    full_name: string;
    role: string;
    description: string;
  };
  roles: Array<{
    name: string;
    description: string;
    permissions_count: number;
  }>;
  permissions: {
    total_count: number;
    resources: string[];
    description: string;
  };
}

interface OrganizationCreationPreviewProps {
  formData: {
    name?: string;
    slug?: string;
    admin_email?: string;
    admin_full_name?: string;
  };
  onConfirm?: () => void;
}

export function OrganizationCreationPreview({ formData, onConfirm }: OrganizationCreationPreviewProps) {
  const { t } = useLanguage();
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPreview = async () => {
      if (!formData.name) return;

      setIsLoading(true);
      setError(null);
      try {
        const data = await organizationsApi.preview(formData);
        setPreview(data as PreviewData);
      } catch (err: any) {
        setError(err.message || 'Failed to load preview');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [formData]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!preview) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Preview
          </CardTitle>
          <CardDescription>Review what will be created</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Organization */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Organization</h3>
            </div>
            <div className="pl-6 space-y-1">
              <p><strong>Name:</strong> {preview.organization.name}</p>
              <p><strong>Slug:</strong> {preview.organization.slug}</p>
              <p className="text-sm text-muted-foreground">{preview.organization.description}</p>
            </div>
          </div>

          {/* School */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <School className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Default School</h3>
            </div>
            <div className="pl-6 space-y-1">
              <p><strong>Name:</strong> {preview.school.name}</p>
              <p className="text-sm text-muted-foreground">{preview.school.description}</p>
            </div>
          </div>

          {/* Admin User */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Admin User</h3>
            </div>
            <div className="pl-6 space-y-1">
              <p><strong>Email:</strong> {preview.admin_user.email}</p>
              <p><strong>Full Name:</strong> {preview.admin_user.full_name}</p>
              <p><strong>Role:</strong> <Badge>{preview.admin_user.role}</Badge></p>
              <p className="text-sm text-muted-foreground">{preview.admin_user.description}</p>
            </div>
          </div>

          {/* Roles */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Default Roles</h3>
            </div>
            <div className="pl-6 space-y-3">
              {preview.roles.map((role) => (
                <div key={role.name} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{role.name}</p>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                    <Badge variant="secondary">{role.permissions_count} permissions</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Permissions</h3>
            </div>
            <div className="pl-6 space-y-1">
              <p><strong>Total Permissions:</strong> {preview.permissions.total_count}</p>
              <p className="text-sm text-muted-foreground">{preview.permissions.description}</p>
              <div className="mt-2">
                <p className="text-sm font-medium mb-1">Resources ({preview.permissions.resources.length}):</p>
                <div className="flex flex-wrap gap-1">
                  {preview.permissions.resources.slice(0, 10).map((resource) => (
                    <Badge key={resource} variant="outline" className="text-xs">
                      {resource}
                    </Badge>
                  ))}
                  {preview.permissions.resources.length > 10 && (
                    <Badge variant="outline" className="text-xs">
                      +{preview.permissions.resources.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {onConfirm && (
            <div className="pt-4 border-t">
              <Button onClick={onConfirm} className="w-full">
                Confirm and Create Organization
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

