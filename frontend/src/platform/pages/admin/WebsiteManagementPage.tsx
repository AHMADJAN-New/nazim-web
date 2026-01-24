import { useMemo, useState } from 'react';
import { Globe, Search } from 'lucide-react';
import { Navigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePlatformOrganizations } from '@/platform/hooks/usePlatformAdmin';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';

export default function WebsiteManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasAdminPermission = Array.isArray(permissions) && permissions.includes('subscription.admin');
  const { data: organizations = [], isLoading: organizationsLoading } = usePlatformOrganizations();

  if (permissionsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Globe className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAdminPermission) {
    return <Navigate to="/platform/dashboard" replace />;
  }

  const filteredOrganizations = useMemo(() => {
    if (!searchQuery.trim()) return organizations;

    const query = searchQuery.toLowerCase();
    return organizations.filter((org) =>
      org.name.toLowerCase().includes(query) ||
      org.slug.toLowerCase().includes(query) ||
      org.website?.toLowerCase().includes(query)
    );
  }, [organizations, searchQuery]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-6xl overflow-x-hidden">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Website Management</h1>
        <p className="text-sm text-muted-foreground">
          Review organization websites and jump to public domains.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Organizations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrganizations.map((organization) => (
                  <TableRow key={organization.id}>
                    <TableCell className="font-medium">{organization.name}</TableCell>
                    <TableCell className="text-muted-foreground">{organization.slug}</TableCell>
                    <TableCell>
                      {organization.website ? (
                        <a
                          href={organization.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          {organization.website}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!organization.website}
                        asChild
                      >
                        <a
                          href={organization.website || '#'}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open site
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!organizationsLoading && filteredOrganizations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No organizations match the current search.
                    </TableCell>
                  </TableRow>
                )}
                {organizationsLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Loading organizations...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
