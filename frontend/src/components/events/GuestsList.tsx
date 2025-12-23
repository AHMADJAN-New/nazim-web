import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Pencil,
  Trash2,
  QrCode,
  UserCheck,
  UserX,
  Phone,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { toast } from 'sonner';
import { eventGuestsApi, eventsApi } from '@/lib/api/client';
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
  const [deletingGuest, setDeletingGuest] = useState<EventGuest | null>(null);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, typeFilter]);

  // Fetch event details
  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.get(eventId),
  });

  // Fetch guests with pagination
  const { data: guestsResponse, isLoading } = useQuery({
    queryKey: ['event-guests', eventId, debouncedSearch, statusFilter, typeFilter, page, perPage],
    queryFn: () => eventGuestsApi.list(eventId, {
      q: debouncedSearch || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      guest_type: typeFilter !== 'all' ? typeFilter : undefined,
      page,
      per_page: perPage,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (guestId: string) => eventGuestsApi.delete(eventId, guestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-guests', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      toast.success('Guest deleted successfully');
      setDeletingGuest(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete guest');
    },
  });

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
        <Button onClick={onAddGuest || (() => navigate(`/events/${eventId}/guests/add`))}>
          <Plus className="h-4 w-4 mr-2" />
          Add Guest
        </Button>
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
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={guest.photo_thumb_url || undefined} alt={guest.full_name} />
                      <AvatarFallback>{getInitials(guest.full_name)}</AvatarFallback>
                    </Avatar>

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
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingGuest(guest);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
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

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingGuest}
        onOpenChange={(open) => !open && setDeletingGuest(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Guest</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingGuest?.full_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingGuest && deleteMutation.mutate(deletingGuest.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
