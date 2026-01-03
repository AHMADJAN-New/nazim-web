import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Pencil,
  QrCode,
  UserCheck,
  UserX,
  Phone,
  User,
  ChevronLeft,
  ChevronRight,
  Printer,
} from 'lucide-react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';
// AlertDialog imports removed - delete functionality is hidden per user request
import { eventGuestsApi, eventsApi, schoolsApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import type { EventGuest, GuestType, GuestStatus } from '@/types/events';
import { GUEST_TYPE_LABELS, GUEST_STATUS_LABELS } from '@/types/events';

interface GuestsListProps {
  eventId: string;
  onAddGuest?: () => void;
}

const STATUS_COLORS: Record<GuestStatus, string> = {
  invited: 'bg-yellow-100 text-yellow-800',
  checked_in: 'bg-green-100 text-green-800',
  blocked: 'bg-red-100 text-red-800',
};

export function GuestsList({ eventId, onAddGuest }: GuestsListProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<GuestStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<GuestType | 'all'>('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number>(50);
  // deletingGuest state removed - delete functionality is hidden per user request

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, typeFilter]);

  // Fetch event details with auto-refresh
  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.get(eventId),
    refetchInterval: 15000, // Refresh every 15 seconds for real-time updates
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    refetchOnReconnect: true, // Refresh when network reconnects
  });

  // Fetch guests with pagination and auto-refresh
  const { data: guestsResponse, isLoading } = useQuery({
    queryKey: ['event-guests', eventId, debouncedSearch, statusFilter, typeFilter, page, perPage],
    queryFn: () => eventGuestsApi.list(eventId, {
      q: debouncedSearch || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      guest_type: typeFilter !== 'all' ? typeFilter : undefined,
      page,
      per_page: perPage,
    }),
    refetchInterval: 15000, // Refresh every 15 seconds for real-time updates
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    refetchOnReconnect: true, // Refresh when network reconnects
  });

  // Delete mutation removed - delete functionality is hidden per user request

  const guests = guestsResponse?.data || [];
  const pagination = guestsResponse ? {
    currentPage: guestsResponse.current_page,
    lastPage: guestsResponse.last_page,
    total: guestsResponse.total,
    from: guestsResponse.from,
    to: guestsResponse.to,
  } : null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const escapeHtml = (text: string) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const handlePrintAllPasses = async () => {
    if (!event || guests.length === 0) {
      showToast.error('No guests to print');
      return;
    }

    // Fetch all guests (not just current page)
    try {
      const allGuestsResponse = await eventGuestsApi.list(eventId, {
        per_page: 1000, // Get all guests
      });
      const allGuests = allGuestsResponse.data || [];

      if (allGuests.length === 0) {
        showToast.error('No guests to print');
        return;
      }

      // Generate QR code URLs for all guests
      const passes = allGuests.map(guest => {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(guest.qr_token || guest.guest_code)}`;
        // Ensure invite_count and arrived_count are numbers
        const inviteCount = typeof guest.invite_count === 'number' ? guest.invite_count : (guest.invite_count ? parseInt(guest.invite_count) : 1);
        const arrivedCount = typeof guest.arrived_count === 'number' ? guest.arrived_count : (guest.arrived_count ? parseInt(guest.arrived_count) : 0);
        return {
          ...guest,
          invite_count: inviteCount,
          arrived_count: arrivedCount,
          qrUrl,
        };
      });

      // Fetch school data if available
      let schoolName = '';
      let schoolLogoUrl = '';
      if (event.school_id) {
        try {
          const school = await schoolsApi.get(event.school_id) as {
            school_name?: string;
            primary_logo_binary?: Uint8Array | number[];
            primary_logo_mime_type?: string;
            logo_path?: string;
          };
          schoolName = school.school_name || '';
          
          // Get logo as data URL if available
          if (school.primary_logo_binary && school.primary_logo_mime_type) {
            const uint8Array = new Uint8Array(school.primary_logo_binary as ArrayLike<number>);
            const blob = new Blob([uint8Array], { type: school.primary_logo_mime_type });
            schoolLogoUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          } else if (school.logo_path) {
            // Use logo path if binary is not available
            schoolLogoUrl = school.logo_path;
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('[handlePrintAllPasses] Failed to fetch school data:', error);
          }
        }
      }

      // Format event date
      const eventDate = event.starts_at ? new Date(event.starts_at).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) : '';

      // Create print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showToast.error('Please allow popups to print passes');
        return;
      }

      // Generate HTML for A6 page - one pass per page
      const isSinglePass = passes.length === 1;
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Event Passes - ${escapeHtml(event.title)}</title>
  <style>
    @page {
      size: A6;
      margin: 5mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: white;
    }
    
    .pass {
      width: 95mm;
      height: 138mm;
      border: 2px solid #1e293b;
      border-radius: 12px;
      padding: 8mm;
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      page-break-after: always;
      page-break-inside: avoid;
      break-inside: avoid;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }
    
    .pass:last-child {
      page-break-after: auto;
    }
    
    /* Decorative top border */
    .pass::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4mm;
      background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
    }
    
    .pass-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-top: 2mm;
      margin-bottom: 6mm;
      padding-bottom: 5mm;
      border-bottom: 2px solid #e2e8f0;
      gap: 3mm;
    }
    
    .school-logo {
      width: ${isSinglePass ? '20mm' : '18mm'};
      height: ${isSinglePass ? '20mm' : '18mm'};
      object-fit: contain;
      flex-shrink: 0;
    }
    
    .header-content {
      flex: 1;
      text-align: center;
    }
    
    .school-name {
      font-size: ${isSinglePass ? '10px' : '9px'};
      font-weight: 700;
      color: #475569;
      margin-bottom: 2mm;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .event-title {
      font-size: ${isSinglePass ? '13px' : '11px'};
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 3mm;
      text-transform: uppercase;
      letter-spacing: 1px;
      line-height: 1.3;
    }
    
    .event-info {
      display: flex;
      flex-direction: column;
      gap: 1.5mm;
      margin-top: 3mm;
    }
    
    .event-date, .event-venue {
      font-size: ${isSinglePass ? '9px' : '8px'};
      color: #475569;
      font-weight: 500;
    }
    
    .pass-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4mm;
      padding: 2mm 0;
    }
    
    .guest-name {
      font-size: ${isSinglePass ? '18px' : '16px'};
      font-weight: 700;
      color: #0f172a;
      text-align: center;
      margin-bottom: 2mm;
      line-height: 1.2;
    }
    
    .guest-code {
      font-size: ${isSinglePass ? '11px' : '10px'};
      font-family: 'Courier New', monospace;
      color: #1e293b;
      text-align: center;
      letter-spacing: 2px;
      font-weight: 600;
      background: #f1f5f9;
      padding: 2mm 4mm;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      margin-top: 2mm;
    }
    
    .qr-container {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0.5mm 0 0 0;
      padding: 2mm;
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      overflow: visible;
    }
    
    .qr-code {
      width: ${isSinglePass ? '48mm' : '46mm'};
      height: ${isSinglePass ? '48mm' : '46mm'};
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .qr-code img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      max-width: 100%;
      max-height: 100%;
    }
    
    .invite-count {
      font-size: ${isSinglePass ? '11px' : '10px'};
      color: #1e293b;
      margin-top: 0;
      margin-bottom: 2mm;
      font-weight: 600;
      text-align: center;
      background: #f8fafc;
      padding: 2.5mm 4mm;
      border-radius: 6px;
      border: 1.5px solid #cbd5e1;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
    
    .invite-count strong {
      color: #0f172a;
      font-weight: 700;
      font-size: ${isSinglePass ? '11px' : '10px'};
    }
    
    .guest-type {
      display: inline-block;
      padding: 2mm 5mm;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: white;
      border-radius: 20px;
      font-size: ${isSinglePass ? '9px' : '8px'};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2mm;
      box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
    }
    
    .pass-footer {
      text-align: center;
      margin-top: 4mm;
      padding-top: 4mm;
      border-top: 1px solid #e2e8f0;
      font-size: ${isSinglePass ? '8px' : '7px'};
      color: #64748b;
      font-weight: 500;
    }
    
    .footer-code {
      font-family: 'Courier New', monospace;
      font-weight: 700;
      color: #1e293b;
      letter-spacing: 1px;
      margin-top: 1mm;
    }
    
    @media print {
      body {
        background: white;
        margin: 0;
        padding: 0;
      }
      
      .pass {
        border: 2px solid #1e293b;
        box-shadow: none;
      }
      
      @page {
        size: A6;
        margin: 5mm;
      }
    }
  </style>
</head>
<body>
  ${passes.map(guest => `
    <div class="pass">
      <div class="pass-header">
        ${schoolLogoUrl ? `<img src="${schoolLogoUrl}" alt="School Logo" class="school-logo" onerror="this.style.display='none';" />` : '<div class="school-logo"></div>'}
        <div class="header-content">
          ${schoolName ? `<div class="school-name">${escapeHtml(schoolName)}</div>` : ''}
          <div class="event-title">${escapeHtml(event.title)}</div>
          <div class="event-info">
            ${eventDate ? `<div class="event-date">📅 ${escapeHtml(eventDate)}</div>` : ''}
            ${event.venue ? `<div class="event-venue">📍 ${escapeHtml(event.venue)}</div>` : ''}
          </div>
        </div>
        ${schoolLogoUrl ? `<img src="${schoolLogoUrl}" alt="School Logo" class="school-logo" onerror="this.style.display='none';" />` : '<div class="school-logo"></div>'}
      </div>
      <div class="pass-body">
        <div class="guest-name">${escapeHtml(guest.full_name)}</div>
        <div class="guest-code">${escapeHtml(guest.guest_code)}</div>
        <div class="qr-container">
          <div class="qr-code">
            <img src="${guest.qrUrl}" alt="QR Code" onerror="this.style.display='none';" />
          </div>
        </div>
        <div class="invite-count"><strong>Allowed Guests:</strong> ${guest.invite_count || 1}</div>
        <div class="guest-type">${escapeHtml(GUEST_TYPE_LABELS[guest.guest_type] || guest.guest_type)}</div>
      </div>
      <div class="pass-footer">
        <div>Scan QR code or enter code</div>
        <div class="footer-code">${escapeHtml(guest.guest_code)}</div>
      </div>
    </div>
  `).join('')}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() {
          window.close();
        }, 500);
        }, 500);
    };
  </script>
</body>
</html>`;

      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error printing passes:', error);
      }
      showToast.error(error?.message || 'Failed to generate print passes');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Guests</h2>
          {event && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span>
                <strong>{event.total_invited || 0}</strong> invited
              </span>
              <span>
                <strong>{event.total_arrived || 0}</strong> arrived
              </span>
              <span>
                <strong>{(event.total_invited || 0) - (event.total_arrived || 0)}</strong> remaining
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrintAllPasses}
            disabled={!guests.length || isLoading}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print All Passes
          </Button>
          <Button onClick={onAddGuest || (() => navigate(`/events/${eventId}/guests/add`))}>
            <Plus className="h-4 w-4 mr-2" />
            Add Guest
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as GuestStatus | 'all')}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {(Object.keys(GUEST_STATUS_LABELS) as GuestStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {GUEST_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(value) => setTypeFilter(value as GuestType | 'all')}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {(Object.keys(GUEST_TYPE_LABELS) as GuestType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {GUEST_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Guests list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : guests.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <p>No guests found.</p>
            {search && <p className="text-sm mt-1">Try adjusting your search.</p>}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile-friendly card list */}
          <div className="space-y-2">
            {guests.map((guest) => (
              <Card
                key={guest.id}
                className="hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/events/${eventId}/guests/${guest.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <GuestPhotoAvatar guestId={guest.id} guestName={guest.full_name} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{guest.full_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {guest.guest_code}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        {guest.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {guest.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {GUEST_TYPE_LABELS[guest.guest_type]}
                        </span>
                      </div>
                    </div>

                    {/* Status and count */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {guest.arrived_count > 0 ? (
                            <UserCheck className="h-4 w-4 text-green-600" />
                          ) : (
                            <UserX className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">
                            {guest.arrived_count}/{guest.invite_count}
                          </span>
                        </div>
                        <Badge className={`${STATUS_COLORS[guest.status]} mt-1`}>
                          {GUEST_STATUS_LABELS[guest.status]}
                        </Badge>
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/events/${eventId}/guests/${guest.id}`);
                            }}
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            View / QR
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/events/${eventId}/guests/${guest.id}/edit`);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.lastPage > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Showing {pagination.from}-{pagination.to} of {pagination.total} guests
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {pagination.currentPage} / {pagination.lastPage}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(pagination.lastPage, p + 1))}
                  disabled={page === pagination.lastPage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation removed - delete functionality is hidden per user request */}
    </div>
  );
}

// Helper component to fetch and display guest photo
function GuestPhotoAvatar({ guestId, guestName }: { guestId: string; guestName: string }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let currentBlobUrl: string | null = null;

    const fetchPhoto = async () => {
      try {
        const { apiClient } = await import('@/lib/api/client');
        const { blob } = await apiClient.requestFile(`/guests/${guestId}/photo`, {
          method: 'GET',
          headers: { Accept: 'image/*' },
        });
        const blobUrl = URL.createObjectURL(blob);
        currentBlobUrl = blobUrl;
        setPhotoUrl(blobUrl);
      } catch (error: any) {
        const status = error?.status;
        if (status !== 404 && import.meta.env.DEV) {
          console.error('Error fetching guest photo:', error);
        }
        setPhotoUrl(null);
      }
    };

    fetchPhoto();
    
    return () => {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [guestId]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Avatar className="h-12 w-12">
      <AvatarImage src={photoUrl || undefined} alt={guestName} />
      <AvatarFallback>{getInitials(guestName)}</AvatarFallback>
    </Avatar>
  );
}
