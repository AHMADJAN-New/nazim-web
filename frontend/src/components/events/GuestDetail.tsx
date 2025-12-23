import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  ArrowLeft,
  Pencil,
  QrCode,
  Phone,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  Ban,
  Printer,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { showToast } from '@/lib/toast';
import { eventGuestsApi, eventCheckinApi, eventsApi, schoolsApi } from '@/lib/api/client';
import type { EventGuest, GuestStatus, EventCheckin } from '@/types/events';
import { GUEST_TYPE_LABELS, GUEST_STATUS_LABELS } from '@/types/events';
import { QRCodeSVG } from 'qrcode.react';
import { useHasPermission } from '@/hooks/usePermissions';

interface GuestDetailProps {
  eventId: string;
  guestId: string;
  onBack?: () => void;
}

const STATUS_COLORS: Record<GuestStatus, string> = {
  invited: 'bg-yellow-100 text-yellow-800',
  checked_in: 'bg-green-100 text-green-800',
  blocked: 'bg-red-100 text-red-800',
};

export function GuestDetail({ eventId, guestId, onBack }: GuestDetailProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasCheckinPermission = useHasPermission('event_checkins.create');
  const [guestPhotoUrl, setGuestPhotoUrl] = useState<string | null>(null);

  const { data: guest, isLoading } = useQuery({
    queryKey: ['event-guest', eventId, guestId],
    queryFn: () => eventGuestsApi.get(eventId, guestId),
  });

  // Fetch guest photo via API endpoint
  useEffect(() => {
    if (!guest?.id) {
      setGuestPhotoUrl(null);
      return;
    }

    let currentBlobUrl: string | null = null;

    const fetchPhoto = async () => {
      try {
        const { apiClient } = await import('@/lib/api/client');
        const token = apiClient.getToken();
        const url = `/api/guests/${guest.id}/photo`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'image/*',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          currentBlobUrl = blobUrl;
          setGuestPhotoUrl(blobUrl);
        } else if (response.status === 404) {
          setGuestPhotoUrl(null);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error fetching guest photo:', error);
        }
        setGuestPhotoUrl(null);
      }
    };
    
    fetchPhoto();
    
    return () => {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [guest?.id]);

  const checkinMutation = useMutation({
    mutationFn: (increment: number) => eventCheckinApi.checkin(eventId, {
      guest_code: guest?.guest_code,
      arrived_increment: increment,
    }),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['event-guest', eventId, guestId] });
        showToast.success('toast.guestCheckedIn');
      } else {
        showToast.error(response.error || 'toast.checkinFailed');
      }
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.checkinFailed');
    },
  });

  const blockMutation = useMutation({
    mutationFn: (status: GuestStatus) => eventGuestsApi.update(eventId, guestId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-guest', eventId, guestId] });
      showToast.success('toast.guestStatusUpdated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.guestStatusUpdateFailed');
    },
  });

  // Fetch event details for print
  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.get(eventId),
    enabled: !!eventId,
  });

  const handlePrintPass = async () => {
    if (!guest || !event) {
      showToast.error('Guest or event information not available');
      return;
    }

    const escapeHtml = (text: string) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

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
          console.warn('[handlePrintPass] Failed to fetch school data:', error);
        }
      }
    }

    // Generate QR code URL
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(guest.qr_token || guest.guest_code)}`;

    // Ensure invite_count and arrived_count are numbers
    const inviteCount = typeof guest.invite_count === 'number' ? guest.invite_count : (guest.invite_count ? parseInt(String(guest.invite_count)) : 1);
    const arrivedCount = typeof guest.arrived_count === 'number' ? guest.arrived_count : (guest.arrived_count ? parseInt(String(guest.arrived_count)) : 0);

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
      showToast.error('Please allow popups to print pass');
      return;
    }

    // Generate HTML for A6 page - single pass
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Event Pass - ${escapeHtml(guest.full_name)}</title>
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
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
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
      width: 20mm;
      height: 20mm;
      object-fit: contain;
      flex-shrink: 0;
    }
    
    .header-content {
      flex: 1;
      text-align: center;
    }
    
    .school-name {
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      margin-bottom: 2mm;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .event-title {
      font-size: 13px;
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
      font-size: 9px;
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
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      text-align: center;
      margin-bottom: 2mm;
      line-height: 1.2;
    }
    
    .guest-code {
      font-size: 11px;
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
      width: 48mm;
      height: 48mm;
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
      font-size: 11px;
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
      font-size: 11px;
    }
    
    .guest-type {
      display: inline-block;
      padding: 2mm 5mm;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: white;
      border-radius: 20px;
      font-size: 9px;
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
      font-size: 8px;
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
          <img src="${qrUrl}" alt="QR Code" onerror="this.style.display='none';" />
        </div>
      </div>
      <div class="invite-count"><strong>Allowed Guests:</strong> ${inviteCount}</div>
      <div class="guest-type">${escapeHtml(GUEST_TYPE_LABELS[guest.guest_type] || guest.guest_type)}</div>
    </div>
    <div class="pass-footer">
      <div>Scan QR code or enter code</div>
      <div class="footer-code">${escapeHtml(guest.guest_code)}</div>
    </div>
  </div>
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
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Guest not found
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const remainingInvites = guest.invite_count - guest.arrived_count;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { onBack?.(); if (!onBack) navigate(-1); }}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Guest Details</h1>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center mb-6">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={guestPhotoUrl || undefined} alt={guest.full_name} />
              <AvatarFallback className="text-2xl">{getInitials(guest.full_name)}</AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-semibold">{guest.full_name}</h2>
            <p className="text-muted-foreground">{GUEST_TYPE_LABELS[guest.guest_type]}</p>
            <Badge className={`${STATUS_COLORS[guest.status]} mt-2`}>
              {GUEST_STATUS_LABELS[guest.status]}
            </Badge>
          </div>

          <div className="flex justify-center gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{guest.arrived_count}</div>
              <div className="text-sm text-muted-foreground">Arrived</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{guest.invite_count}</div>
              <div className="text-sm text-muted-foreground">Invited</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{remainingInvites}</div>
              <div className="text-sm text-muted-foreground">Remaining</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => navigate(`/events/${eventId}/guests/${guestId}/edit`)}
              variant="outline"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              onClick={handlePrintPass}
              variant="outline"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Pass
            </Button>
            {hasCheckinPermission && remainingInvites > 0 && guest.status !== 'blocked' && (
              <Button
                onClick={() => checkinMutation.mutate(1)}
                disabled={checkinMutation.isPending}
                className="col-span-2"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Manual Check-in
              </Button>
            )}
            {guest.status !== 'blocked' ? (
              <Button
                variant="destructive"
                onClick={() => blockMutation.mutate('blocked')}
                disabled={blockMutation.isPending}
                className="col-span-2"
              >
                <Ban className="h-4 w-4 mr-2" />
                Block Guest
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => blockMutation.mutate('invited')}
                disabled={blockMutation.isPending}
                className="col-span-2"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Unblock Guest
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* QR Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Entry Pass
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG
              value={guest.qr_token}
              size={200}
              level="H"
              includeMargin
            />
          </div>
          <p className="mt-4 font-mono text-lg font-medium">{guest.guest_code}</p>
          <p className="text-sm text-muted-foreground">Show this code at entry</p>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {guest.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <a href={`tel:${guest.phone}`} className="text-primary hover:underline">
                {guest.phone}
              </a>
            </div>
          )}
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <span>{GUEST_TYPE_LABELS[guest.guest_type]}</span>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span>Added {formatDate(guest.created_at!)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Fields */}
      {guest.field_values && guest.field_values.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {guest.field_values.map((fv, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-muted-foreground">{fv.field_label}</span>
                  <span className="font-medium">
                    {Array.isArray(fv.value) ? fv.value.join(', ') : fv.value || '-'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Check-in History */}
      {guest.checkins && guest.checkins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Check-in History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guest.checkins.map((checkin: EventCheckin) => (
                  <TableRow key={checkin.id}>
                    <TableCell>
                      {formatDateTime(checkin.scanned_at)}
                    </TableCell>
                    <TableCell>+{checkin.arrived_increment}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {checkin.user?.email || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
