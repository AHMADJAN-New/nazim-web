import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
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
import { toast } from 'sonner';
import { eventGuestsApi, eventCheckinApi } from '@/lib/api/client';
import type { EventGuest, GuestStatus, EventCheckin } from '@/types/events';
import { GUEST_TYPE_LABELS, GUEST_STATUS_LABELS } from '@/types/events';
import { QRCodeSVG } from 'qrcode.react';

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

  const { data: guest, isLoading } = useQuery({
    queryKey: ['event-guest', eventId, guestId],
    queryFn: () => eventGuestsApi.get(eventId, guestId),
  });

  const checkinMutation = useMutation({
    mutationFn: (increment: number) => eventCheckinApi.checkin(eventId, {
      guest_code: guest?.guest_code,
      arrived_increment: increment,
    }),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['event-guest', eventId, guestId] });
        toast.success(`Checked in ${response.checkin?.arrived_increment || 1} guest(s)`);
      } else {
        toast.error(response.error || 'Check-in failed');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Check-in failed');
    },
  });

  const blockMutation = useMutation({
    mutationFn: (status: GuestStatus) => eventGuestsApi.update(eventId, guestId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-guest', eventId, guestId] });
      toast.success('Guest status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update status');
    },
  });

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
        <Button variant="ghost" size="icon" onClick={() => onBack?.() || navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Guest Details</h1>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center mb-6">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={guest.photo_url || undefined} alt={guest.full_name} />
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
              onClick={() => window.print()}
              variant="outline"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Pass
            </Button>
            {remainingInvites > 0 && guest.status !== 'blocked' && (
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
            <span>Added {format(new Date(guest.created_at!), 'PPP')}</span>
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
                      {format(new Date(checkin.scanned_at), 'PPp')}
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
