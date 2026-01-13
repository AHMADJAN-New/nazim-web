import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Search,
  Eye,
  RefreshCw,
  Mail,
  Phone,
  Users,
  MapPin,
  FileText,
  Calendar,
  MessageSquare,
  Copy,
  ExternalLink,
  Trash2,
  Check,
} from 'lucide-react';
import { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Separator,
} from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { showToast } from '@/lib/toast';
import { formatDate, formatDateTime } from '@/lib/utils';
import { platformApi } from '@/platform/lib/platformApi';

interface PlanRequest {
  id: string;
  requested_plan_id?: string | null;
  organization_name: string;
  school_name: string;
  school_page_url?: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone?: string | null;
  contact_whatsapp?: string | null;
  contact_position?: string | null;
  number_of_schools?: number | null;
  student_count?: number | null;
  staff_count?: number | null;
  city?: string | null;
  country?: string | null;
  message?: string | null;
  created_at: string;
  updated_at: string;
  requested_plan?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export default function PlanRequestsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingRequest, setViewingRequest] = useState<PlanRequest | null>(null);
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch plan requests
  const { data: requestsData, isLoading, refetch } = useQuery({
    queryKey: ['platform-plan-requests', searchQuery, page],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        per_page: 20,
      };
      if (searchQuery) {
        params.search = searchQuery;
      }
      return await platformApi.planRequests.list(params);
    },
  });

  const requests = requestsData?.data || [];
  const pagination = requestsData?.pagination;

  const handleViewRequest = async (requestId: string) => {
    try {
      const response = await platformApi.planRequests.get(requestId);
      setViewingRequest(response.data);
      setIsViewSheetOpen(true);
    } catch (error) {
      console.error('Failed to fetch plan request:', error);
      showToast.error('Failed to load plan request details');
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      showToast.success('Copied to clipboard');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      showToast.error('Failed to copy to clipboard');
    }
  };

  const copyAllContactInfo = () => {
    if (!viewingRequest) return;
    const contactInfo = `
Contact Information:
Name: ${viewingRequest.contact_name}
Email: ${viewingRequest.contact_email}
${viewingRequest.contact_phone ? `Phone: ${viewingRequest.contact_phone}` : ''}
${viewingRequest.contact_whatsapp ? `WhatsApp: ${viewingRequest.contact_whatsapp}` : ''}
${viewingRequest.contact_position ? `Position: ${viewingRequest.contact_position}` : ''}

Organization: ${viewingRequest.organization_name}
School: ${viewingRequest.school_name}
`.trim();
    copyToClipboard(contactInfo, 'all');
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Enterprise Plan Requests</h1>
        <p className="text-muted-foreground mt-2">
          View and manage Enterprise plan contact requests from potential customers
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Plan Requests
                {pagination && (
                  <Badge variant="secondary">{pagination.total}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Enterprise plan inquiries and contact requests
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 px-4 sm:px-0">
              <LoadingSpinner />
            </div>
          ) : !requests.length ? (
            <div className="py-8 text-center text-muted-foreground px-4 sm:px-0">
              No plan requests found
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead className="hidden md:table-cell">Contact</TableHead>
                      <TableHead className="hidden lg:table-cell">Requested Plan</TableHead>
                      <TableHead className="hidden lg:table-cell">Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow
                        key={request.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleViewRequest(request.id)}
                      >
                        <TableCell className="font-medium">
                          <div>
                            {request.organization_name}
                            <div className="md:hidden mt-1 text-xs text-muted-foreground">
                              {request.contact_name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="space-y-1">
                            <div className="font-medium">{request.contact_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {request.contact_email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {request.requested_plan?.name || (
                            <span className="text-muted-foreground">Not specified</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {formatDate(new Date(request.created_at))}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewRequest(request.id)}
                            className="flex-shrink-0"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">View</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
        {pagination && pagination.last_page > 1 && (
          <CardContent className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{' '}
                {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of{' '}
                {pagination.total} requests
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.current_page === 1}
                >
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground">
                  Page {pagination.current_page} of {pagination.last_page}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.last_page, p + 1))}
                  disabled={pagination.current_page === pagination.last_page}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* View Request Sheet (Side Panel) */}
      <Sheet open={isViewSheetOpen} onOpenChange={setIsViewSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <SheetTitle className="flex items-center gap-2 text-2xl">
                  <Building2 className="h-6 w-6 text-primary" />
                  Plan Request Details
                </SheetTitle>
                <SheetDescription className="mt-2 text-base">
                  Enterprise plan contact request
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {viewingRequest && (
            <div className="mt-6 space-y-6">
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 pb-4 border-b">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAllContactInfo}
                  className="flex-shrink-0"
                >
                  {copiedField === 'all' ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy All
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`mailto:${viewingRequest.contact_email}`, '_blank')}
                  className="flex-shrink-0"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                {viewingRequest.contact_phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`tel:${viewingRequest.contact_phone}`, '_blank')}
                    className="flex-shrink-0"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                )}
                {viewingRequest.contact_whatsapp && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://wa.me/${viewingRequest.contact_whatsapp.replace(/[^0-9]/g, '')}`, '_blank')}
                    className="flex-shrink-0"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                )}
                {viewingRequest.school_page_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(viewingRequest.school_page_url || '', '_blank')}
                    className="flex-shrink-0"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Website
                  </Button>
                )}
              </div>

              {/* Organization & School Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Organization & School
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Building2 className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          Organization Name
                        </div>
                        <div className="text-base font-medium">{viewingRequest.organization_name}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Building2 className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          School Name
                        </div>
                        <div className="text-base font-medium">{viewingRequest.school_name}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact Information */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Contact Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Users className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          Contact Name
                        </div>
                        <div className="text-base font-medium">{viewingRequest.contact_name}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => copyToClipboard(viewingRequest.contact_name, 'name')}
                      >
                        {copiedField === 'name' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {viewingRequest.contact_position && (
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            Position
                          </div>
                          <div className="text-base">{viewingRequest.contact_position}</div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          Email
                        </div>
                        <a
                          href={`mailto:${viewingRequest.contact_email}`}
                          className="text-base text-primary hover:underline break-all"
                        >
                          {viewingRequest.contact_email}
                        </a>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => copyToClipboard(viewingRequest.contact_email, 'email')}
                      >
                        {copiedField === 'email' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {viewingRequest.contact_phone && (
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <Phone className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            Phone
                          </div>
                          <a
                            href={`tel:${viewingRequest.contact_phone}`}
                            className="text-base text-primary hover:underline"
                          >
                            {viewingRequest.contact_phone}
                          </a>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => copyToClipboard(viewingRequest.contact_phone || '', 'phone')}
                        >
                          {copiedField === 'phone' ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}

                    {viewingRequest.contact_whatsapp && (
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            WhatsApp
                          </div>
                          <a
                            href={`https://wa.me/${viewingRequest.contact_whatsapp.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base text-primary hover:underline"
                          >
                            {viewingRequest.contact_whatsapp}
                          </a>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => copyToClipboard(viewingRequest.contact_whatsapp || '', 'whatsapp')}
                        >
                          {copiedField === 'whatsapp' ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Organization Details */}
              {(viewingRequest.number_of_schools !== null ||
                viewingRequest.student_count !== null ||
                viewingRequest.staff_count !== null ||
                viewingRequest.city ||
                viewingRequest.country) && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Organization Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {viewingRequest.number_of_schools !== null && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            Number of Schools
                          </div>
                          <div className="text-2xl font-bold">{viewingRequest.number_of_schools}</div>
                        </div>
                      )}
                      {viewingRequest.student_count !== null && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            Student Count
                          </div>
                          <div className="text-2xl font-bold">
                            {viewingRequest.student_count.toLocaleString()}
                          </div>
                        </div>
                      )}
                      {viewingRequest.staff_count !== null && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            Staff Count
                          </div>
                          <div className="text-2xl font-bold">
                            {viewingRequest.staff_count.toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                    {(viewingRequest.city || viewingRequest.country) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        {viewingRequest.city && (
                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-muted-foreground mb-1">
                                City
                              </div>
                              <div className="text-base">{viewingRequest.city}</div>
                            </div>
                          </div>
                        )}
                        {viewingRequest.country && (
                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-muted-foreground mb-1">
                                Country
                              </div>
                              <div className="text-base">{viewingRequest.country}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Requested Plan */}
              {viewingRequest.requested_plan && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Requested Plan
                    </h3>
                    <Badge variant="outline" className="text-base px-3 py-1.5">
                      {viewingRequest.requested_plan.name}
                    </Badge>
                  </div>
                </>
              )}

              {/* Message */}
              {viewingRequest.message && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Organization Needs & Requirements
                    </h3>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-base whitespace-pre-wrap leading-relaxed">
                        {viewingRequest.message}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Timestamp */}
              <Separator />
              <div className="flex items-center gap-2 text-sm text-muted-foreground pb-4">
                <Calendar className="h-4 w-4" />
                <span>Submitted {formatDateTime(new Date(viewingRequest.created_at))}</span>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
