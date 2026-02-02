import { useMemo, useState, Fragment } from 'react';
import { Globe, Search, ExternalLink, ChevronDown, ChevronRight, Settings, Lock, CheckCircle, XCircle, AlertCircle, Plus, Trash2, Pencil } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { showToast } from '@/lib/toast';
import { useLanguage } from '@/hooks/useLanguage';
import { usePlatformOrganizations } from '@/platform/hooks/usePlatformAdmin';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { platformApi } from '@/platform/lib/platformApi';

const VERIFICATION_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'failed', label: 'Failed' },
];

const SSL_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'failed', label: 'Failed' },
];

export default function WebsiteManagementPage() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [domainDialogOpen, setDomainDialogOpen] = useState(false);
  const [domainDeleteId, setDomainDeleteId] = useState<string | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<{
    schoolId: string;
    schoolName: string;
    schoolSlug: string;
    isPublic: boolean;
    defaultLanguage: string;
    enabledLanguages: string[];
  }>({
    schoolId: '',
    schoolName: '',
    schoolSlug: '',
    isPublic: true,
    defaultLanguage: 'en',
    enabledLanguages: ['en', 'ar'],
  });
  const [domainForm, setDomainForm] = useState({
    id: '',
    schoolId: '',
    domain: '',
    isPrimary: false,
    verificationStatus: 'pending',
    sslStatus: 'pending',
  });
  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasAdminPermission = Array.isArray(permissions) && permissions.includes('subscription.admin');
  const { data: organizations = [], isLoading: organizationsLoading } = usePlatformOrganizations();

  const { data: websiteConfig } = useQuery({
    queryKey: ['platform-website-config'],
    queryFn: () => platformApi.websites.getConfig(),
    enabled: !permissionsLoading && hasAdminPermission,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch website data for selected organization
  const { data: websiteData, isLoading: websiteDataLoading, error: websiteDataError } = useQuery({
    queryKey: ['platform-organization-website', selectedOrg],
    queryFn: async () => {
      if (!selectedOrg) return null;
      try {
        return await platformApi.websites.getOrganizationWebsite(selectedOrg);
      } catch (error: any) {
        if (import.meta.env.DEV) {
          console.error('[WebsiteManagementPage] Error fetching website data:', error);
        }
        throw error;
      }
    },
    enabled: !!selectedOrg,
    staleTime: 5 * 60 * 1000,
  });

  const upsertWebsiteSettings = useMutation({
    mutationFn: async () => {
      if (!selectedOrg || !settingsForm.schoolId) throw new Error('School not selected');
      const enabledLanguages = settingsForm.enabledLanguages.includes(settingsForm.defaultLanguage)
        ? settingsForm.enabledLanguages
        : [...settingsForm.enabledLanguages, settingsForm.defaultLanguage];
      return platformApi.websites.upsertWebsiteSettings(selectedOrg, settingsForm.schoolId, {
        school_slug: settingsForm.schoolSlug,
        is_public: settingsForm.isPublic,
        default_language: settingsForm.defaultLanguage,
        enabled_languages: enabledLanguages,
      });
    },
    onSuccess: () => {
      showToast.success(t('toast.websiteSettingsUpdated'));
      void queryClient.invalidateQueries({ queryKey: ['platform-organization-website', selectedOrg] });
      setSettingsDialogOpen(false);
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.websiteSettingsUpdateFailed'));
    },
  });

  const createDomain = useMutation({
    mutationFn: async () => {
      if (!selectedOrg) throw new Error('Organization not selected');
      return platformApi.websites.createDomain(selectedOrg, {
        school_id: domainForm.schoolId,
        domain: domainForm.domain,
        is_primary: domainForm.isPrimary,
        verification_status: domainForm.verificationStatus,
        ssl_status: domainForm.sslStatus,
      });
    },
    onSuccess: () => {
      showToast.success(t('toast.domainCreated'));
      void queryClient.invalidateQueries({ queryKey: ['platform-organization-website', selectedOrg] });
      setDomainDialogOpen(false);
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.domainCreateFailed'));
    },
  });

  const updateDomain = useMutation({
    mutationFn: async () => {
      if (!selectedOrg || !domainForm.id) throw new Error('Domain not selected');
      return platformApi.websites.updateDomain(selectedOrg, domainForm.id, {
        school_id: domainForm.schoolId,
        domain: domainForm.domain,
        is_primary: domainForm.isPrimary,
        verification_status: domainForm.verificationStatus,
        ssl_status: domainForm.sslStatus,
      });
    },
    onSuccess: () => {
      showToast.success(t('toast.domainUpdated'));
      void queryClient.invalidateQueries({ queryKey: ['platform-organization-website', selectedOrg] });
      setDomainDialogOpen(false);
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.domainUpdateFailed'));
    },
  });

  const deleteDomain = useMutation({
    mutationFn: async () => {
      if (!selectedOrg || !domainDeleteId) throw new Error('Domain not selected');
      return platformApi.websites.deleteDomain(selectedOrg, domainDeleteId);
    },
    onSuccess: async () => {
      showToast.success(t('toast.domainDeleted'));
      await queryClient.invalidateQueries({ queryKey: ['platform-organization-website', selectedOrg] });
      await queryClient.refetchQueries({ queryKey: ['platform-organization-website', selectedOrg] });
      setDomainDeleteId(null);
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.domainDeleteFailed'));
    },
  });

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

  const openCreateDomain = () => {
    if (!websiteData?.schools?.length) {
      showToast.error(t('toast.domainMissingSchool'));
      return;
    }
    setDomainForm({
      id: '',
      schoolId: websiteData.schools[0]?.id || '',
      domain: '',
      isPrimary: false,
      verificationStatus: 'pending',
      sslStatus: 'pending',
    });
    setDomainDialogOpen(true);
  };

  const openEditDomain = (domain: any) => {
    setDomainForm({
      id: domain.id,
      schoolId: domain.school_id || '',
      domain: domain.domain,
      isPrimary: domain.is_primary,
      verificationStatus: domain.verification_status || 'pending',
      sslStatus: domain.ssl_status || 'pending',
    });
    setDomainDialogOpen(true);
  };

  const baseDomain = (websiteConfig as any)?.base_domain ? String((websiteConfig as any).base_domain) : '';

  const getSubdomainUrl = (schoolSlug?: string | null) => {
    if (!baseDomain || !schoolSlug) return null;
    return `https://${schoolSlug}.${baseDomain}`;
  };

  const openEditSettings = (school: any) => {
    const setting = websiteData?.settings?.find((s: any) => s.school_id === school.id);
    const schoolSlug = setting?.school_slug ?? school.school_slug ?? '';
    setSettingsForm({
      schoolId: school.id,
      schoolName: school.school_name || 'Unnamed School',
      schoolSlug: schoolSlug || '',
      isPublic: setting?.is_public ?? true,
      defaultLanguage: setting?.default_language || 'en',
      enabledLanguages: Array.isArray(setting?.enabled_languages) ? setting.enabled_languages : ['en', 'ar'],
    });
    setSettingsDialogOpen(true);
  };

  const toggleEnabledLanguage = (lang: string, checked: boolean) => {
    setSettingsForm((prev) => {
      const next = new Set(prev.enabledLanguages);
      if (checked) {
        next.add(lang);
      } else {
        next.delete(lang);
      }
      return { ...prev, enabledLanguages: Array.from(next) };
    });
  };

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

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Domains</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrganizations.map((organization) => {
                  const isExpanded = expandedOrg === organization.id;
                  return (
                    <Fragment key={organization.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => {
                        if (isExpanded) {
                          setExpandedOrg(null);
                          setSelectedOrg(null);
                        } else {
                          setExpandedOrg(organization.id);
                          setSelectedOrg(organization.id);
                        }
                      }}>
                        <TableCell>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{organization.name}</TableCell>
                        <TableCell className="text-muted-foreground">{organization.slug}</TableCell>
                        <TableCell>
                          {organization.website ? (
                            <a
                              href={organization.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {organization.website}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {websiteData && selectedOrg === organization.id ? (
                            <Badge variant="outline">
                              {websiteData.domains?.length || 0} domain{(websiteData.domains?.length || 0) !== 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {websiteData && selectedOrg === organization.id ? (
                            websiteData.settings?.some(s => s.is_public) ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Public
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <Lock className="h-3 w-3" />
                                Private
                              </Badge>
                            )
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {(() => {
                              const openUrl =
                                selectedOrg === organization.id && websiteData?.schools?.length
                                  ? (() => {
                                      const first = websiteData.schools[0];
                                      const setting = websiteData.settings?.find((s: any) => s.school_id === first.id);
                                      const slug = setting?.school_slug ?? first.school_slug ?? null;
                                      return getSubdomainUrl(slug);
                                    })()
                                  : organization.website;
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={!openUrl}
                                  asChild
                                >
                                  <a href={openUrl || '#'} target="_blank" rel="noreferrer">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Open
                                  </a>
                                </Button>
                              );
                            })()}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedOrg(organization.id);
                                setExpandedOrg(organization.id);
                              }}
                            >
                              <Settings className="h-3 w-3 mr-1" />
                              Manage
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && selectedOrg === organization.id && (
                        <TableRow>
                          <TableCell colSpan={7} className="p-0">
                            <div className="p-4 bg-muted/30">
                              {websiteDataLoading ? (
                                <div className="text-center py-4 text-muted-foreground">Loading website data...</div>
                              ) : websiteDataError ? (
                                <div className="text-center py-4">
                                  <div className="text-destructive font-medium mb-2">Failed to load website data</div>
                                  <div className="text-sm text-muted-foreground">
                                    {websiteDataError instanceof Error ? websiteDataError.message : 'Unknown error'}
                                  </div>
                                  {import.meta.env.DEV && (
                                    <div className="text-xs text-muted-foreground mt-2">
                                      Check browser console for details
                                    </div>
                                  )}
                                </div>
                              ) : websiteData ? (
                                <Tabs defaultValue="domains" className="w-full">
                                  <TabsList>
                                    <TabsTrigger value="domains">Domains ({websiteData.domains?.length || 0})</TabsTrigger>
                                    <TabsTrigger value="settings">Settings ({websiteData.settings?.length || 0})</TabsTrigger>
                                    <TabsTrigger value="schools">Schools ({websiteData.schools?.length || 0})</TabsTrigger>
                                  </TabsList>
                                  <TabsContent value="domains" className="mt-4">
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="text-sm text-muted-foreground space-y-1">
                                        <div>Manage domains and verification status.</div>
                                        <div className="text-xs">
                                          {baseDomain
                                            ? <>Default subdomains: <span className="font-mono">{`*.${baseDomain}`}</span></>
                                            : <>Default subdomains: <span className="font-mono">NAZIM_PUBLIC_SITE_DOMAIN</span> not configured</>
                                          }
                                        </div>
                                        <div className="text-xs">
                                          Custom domains: point your A record to your load balancer IP, then set Verification to <span className="font-medium">Verified</span>.
                                        </div>
                                      </div>
                                      <Button size="sm" onClick={openCreateDomain}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Domain
                                      </Button>
                                    </div>
                                    {websiteData.domains && websiteData.domains.length > 0 ? (
                                      <div className="space-y-2">
                                        {websiteData.domains.map((domain) => (
                                          <Card key={domain.id}>
                                            <CardContent className="p-4">
                                              <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                  <div className="flex items-center gap-2">
                                                    <span className="font-medium">{domain.domain}</span>
                                                    {domain.is_primary && (
                                                      <Badge variant="default">Primary</Badge>
                                                    )}
                                                  </div>
                                                  <div className="text-xs text-muted-foreground">
                                                    School: {websiteData.schools.find(s => s.id === domain.school_id)?.school_name || 'Unknown'}
                                                  </div>
                                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                      {domain.verification_status === 'verified' ? (
                                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                                      ) : domain.verification_status === 'pending' ? (
                                                        <AlertCircle className="h-3 w-3 text-yellow-600" />
                                                      ) : (
                                                        <XCircle className="h-3 w-3 text-red-600" />
                                                      )}
                                                      <span>Verification: {domain.verification_status || 'Not verified'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                      {domain.ssl_status === 'active' ? (
                                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                                      ) : (
                                                        <XCircle className="h-3 w-3 text-red-600" />
                                                      )}
                                                      <span>SSL: {domain.ssl_status || 'Not configured'}</span>
                                                    </div>
                                                  </div>
                                                </div>
                                                <Button variant="outline" size="sm" asChild>
                                                  <a href={`https://${domain.domain}`} target="_blank" rel="noreferrer">
                                                    <ExternalLink className="h-3 w-3 mr-1" />
                                                    Visit
                                                  </a>
                                                </Button>
                                              </div>
                                              <div className="mt-3 flex items-center gap-2">
                                                <Button variant="outline" size="sm" onClick={() => openEditDomain(domain)}>
                                                  <Pencil className="h-3 w-3 mr-1" />
                                                  Edit
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => setDomainDeleteId(domain.id)}>
                                                  <Trash2 className="h-3 w-3 text-destructive mr-1" />
                                                  Delete
                                                </Button>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-8 text-muted-foreground">
                                        No domains configured
                                      </div>
                                    )}
                                  </TabsContent>
                                  <TabsContent value="settings" className="mt-4">
                                    {websiteData.schools && websiteData.schools.length > 0 ? (
                                      <div className="space-y-2">
                                        {websiteData.schools.map((school) => {
                                          const setting = websiteData.settings?.find((s) => s.school_id === school.id);
                                          const schoolSlug = setting?.school_slug ?? school.school_slug ?? null;
                                          const subdomainUrl = getSubdomainUrl(schoolSlug);

                                          return (
                                            <Card key={school.id}>
                                              <CardContent className="p-4">
                                                <div className="space-y-2">
                                                  <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                      <div className="font-medium">
                                                        {school.school_name || 'Unnamed School'}
                                                      </div>
                                                      <div className="text-sm text-muted-foreground">
                                                        Slug: <span className="font-mono">{schoolSlug || 'Not set'}</span>
                                                      </div>
                                                      {subdomainUrl && (
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                          Subdomain: <span className="font-mono">{subdomainUrl}</span>
                                                        </div>
                                                      )}
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                      {setting?.is_public ?? true ? (
                                                        <Badge variant="default" className="gap-1">
                                                          <CheckCircle className="h-3 w-3" />
                                                          Public
                                                        </Badge>
                                                      ) : (
                                                        <Badge variant="secondary" className="gap-1">
                                                          <Lock className="h-3 w-3" />
                                                          Private
                                                        </Badge>
                                                      )}
                                                      {subdomainUrl && (
                                                        <Button variant="outline" size="sm" asChild>
                                                          <a href={subdomainUrl} target="_blank" rel="noreferrer">
                                                            <ExternalLink className="h-3 w-3 mr-1" />
                                                            Visit
                                                          </a>
                                                        </Button>
                                                      )}
                                                    </div>
                                                  </div>

                                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                      <span className="text-muted-foreground">Default Language: </span>
                                                      <span className="font-medium">{setting?.default_language || 'Not set'}</span>
                                                    </div>
                                                    <div>
                                                      <span className="text-muted-foreground">Enabled Languages: </span>
                                                      <span className="font-medium">
                                                        {Array.isArray(setting?.enabled_languages) ? setting.enabled_languages.join(', ') : 'None'}
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <div className="mt-3 flex items-center gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => openEditSettings(school)}>
                                                      <Pencil className="h-3 w-3 mr-1" />
                                                      {setting ? 'Edit Settings' : 'Configure'}
                                                    </Button>
                                                  </div>
                                                </div>
                                              </CardContent>
                                            </Card>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="text-center py-8 text-muted-foreground">
                                        No schools found
                                      </div>
                                    )}
                                  </TabsContent>
                                  <TabsContent value="schools" className="mt-4">
                                    {websiteData.schools && websiteData.schools.length > 0 ? (
                                      <div className="space-y-2">
                                        {websiteData.schools.map((school) => {
                                          const subdomainUrl = getSubdomainUrl(school.school_slug);
                                          return (
                                            <Card key={school.id}>
                                              <CardContent className="p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                  <div>
                                                    <div className="font-medium">{school.school_name || 'Unnamed School'}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                      Slug: <span className="font-mono">{school.school_slug || 'Not set'}</span>
                                                    </div>
                                                    {subdomainUrl && (
                                                      <div className="text-xs text-muted-foreground mt-1">
                                                        Subdomain: <span className="font-mono">{subdomainUrl}</span>
                                                      </div>
                                                    )}
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    {subdomainUrl && (
                                                      <Button variant="outline" size="sm" asChild>
                                                        <a href={subdomainUrl} target="_blank" rel="noreferrer">
                                                          <ExternalLink className="h-3 w-3 mr-1" />
                                                          Visit
                                                        </a>
                                                      </Button>
                                                    )}
                                                    <Button variant="outline" size="sm" onClick={() => openEditSettings(school)}>
                                                      <Pencil className="h-3 w-3 mr-1" />
                                                      Configure
                                                    </Button>
                                                  </div>
                                                </div>
                                              </CardContent>
                                            </Card>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="text-center py-8 text-muted-foreground">
                                        No schools found
                                      </div>
                                    )}
                                  </TabsContent>
                                </Tabs>
                              ) : (
                                <div className="text-center py-4 text-muted-foreground">
                                  Failed to load website data
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
                {!organizationsLoading && filteredOrganizations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No organizations match the current search.
                    </TableCell>
                  </TableRow>
                )}
                {organizationsLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Loading organizations...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={domainDialogOpen} onOpenChange={setDomainDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{domainForm.id ? 'Edit Domain' : 'Add Domain'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>School</Label>
              <Select
                value={domainForm.schoolId}
                onValueChange={(value) => setDomainForm((prev) => ({ ...prev, schoolId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select school" />
                </SelectTrigger>
                <SelectContent>
                  {(websiteData?.schools || []).map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.school_name || 'Unnamed School'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input
                value={domainForm.domain}
                onChange={(event) => setDomainForm((prev) => ({ ...prev, domain: event.target.value }))}
                placeholder="school.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Verification Status</Label>
              <Select
                value={domainForm.verificationStatus}
                onValueChange={(value) => setDomainForm((prev) => ({ ...prev, verificationStatus: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {VERIFICATION_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SSL Status</Label>
              <Select
                value={domainForm.sslStatus}
                onValueChange={(value) => setDomainForm((prev) => ({ ...prev, sslStatus: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {SSL_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-sm">Primary domain</span>
              <Switch
                checked={domainForm.isPrimary}
                onCheckedChange={(checked) => setDomainForm((prev) => ({ ...prev, isPrimary: checked }))}
              />
            </div>
            <Button
              onClick={() => {
                if (!domainForm.schoolId || !domainForm.domain.trim()) {
                  showToast.error(t('toast.domainMissingFields'));
                  return;
                }
                if (domainForm.id) {
                  updateDomain.mutate();
                } else {
                  createDomain.mutate();
                }
              }}
            >
              {domainForm.id ? 'Save Changes' : 'Create Domain'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Website Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm">
              <span className="text-muted-foreground">School: </span>
              <span className="font-medium">{settingsForm.schoolName}</span>
            </div>

            <div className="space-y-2">
              <Label>School Slug (subdomain)</Label>
              <Input
                value={settingsForm.schoolSlug}
                onChange={(event) => setSettingsForm((prev) => ({ ...prev, schoolSlug: event.target.value }))}
                placeholder="al-huda"
              />
              {baseDomain && settingsForm.schoolSlug.trim() && (
                <div className="text-xs text-muted-foreground">
                  Subdomain URL: <span className="font-mono">{getSubdomainUrl(settingsForm.schoolSlug.trim())}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-sm">Public website</span>
              <Switch
                checked={settingsForm.isPublic}
                onCheckedChange={(checked) => setSettingsForm((prev) => ({ ...prev, isPublic: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Default Language</Label>
              <Select
                value={settingsForm.defaultLanguage}
                onValueChange={(value) => setSettingsForm((prev) => ({ ...prev, defaultLanguage: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (en)</SelectItem>
                  <SelectItem value="ps">Pashto (ps)</SelectItem>
                  <SelectItem value="fa">Farsi (fa)</SelectItem>
                  <SelectItem value="ar">Arabic (ar)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Enabled Languages</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(['en', 'ps', 'fa', 'ar'] as const).map((lang) => {
                  const checked = settingsForm.enabledLanguages.includes(lang);
                  return (
                    <div key={lang} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <span className="text-sm">{lang.toUpperCase()}</span>
                      <Switch checked={checked} onCheckedChange={(v) => toggleEnabledLanguage(lang, v)} />
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                Default language will be forced enabled.
              </div>
            </div>

            <Button
              onClick={() => {
                if (!settingsForm.schoolId || !settingsForm.schoolSlug.trim()) {
                  showToast.error(t('toast.websiteSettingsMissingFields'));
                  return;
                }
                if (settingsForm.enabledLanguages.length === 0) {
                  showToast.error(t('toast.websiteSettingsMissingFields'));
                  return;
                }
                upsertWebsiteSettings.mutate();
              }}
              disabled={upsertWebsiteSettings.isPending}
            >
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!domainDeleteId} onOpenChange={() => setDomainDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete domain?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the domain from the public website mapping.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDomain.mutate()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
