import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit,
  Trash2,
  Star,
  MessageSquare,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/lib/toast';
import { formatDate } from '@/lib/utils';
import { platformApi } from '@/platform/lib/platformApi';

const testimonialSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
  role: z.string().min(1, 'Role is required').max(255, 'Role must be 255 characters or less'),
  organization: z.string().max(255, 'Organization must be 255 characters or less').optional().nullable(),
  content: z.string().min(1, 'Content is required'),
  image_url: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  rating: z.number().min(1).max(5).default(5),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

type TestimonialFormData = z.infer<typeof testimonialSchema>;

interface Testimonial {
  id: string;
  name: string;
  role: string;
  organization?: string | null;
  content: string;
  image_url?: string | null;
  rating: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export function TestimonialsManagement() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
    setValue,
  } = useForm<TestimonialFormData>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: {
      name: '',
      role: '',
      organization: '',
      content: '',
      image_url: '',
      rating: 5,
      sort_order: 0,
      is_active: true,
    },
  });

  const isActive = watch('is_active');

  // Fetch testimonials
  const { data: testimonials, isLoading } = useQuery({
    queryKey: ['platform-testimonials'],
    queryFn: async () => {
      const response = await platformApi.request<{ data: Testimonial[] }>('/platform/testimonials', {
        method: 'GET',
      });
      return response.data;
    },
  });

  // Create testimonial
  const createTestimonial = useMutation({
    mutationFn: async (data: TestimonialFormData) => {
      return await platformApi.request('/platform/testimonials', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      showToast.success('Testimonial created successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-testimonials'] });
      setIsDialogOpen(false);
      reset();
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to create testimonial');
    },
  });

  // Update testimonial
  const updateTestimonial = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TestimonialFormData }) => {
      return await platformApi.request(`/platform/testimonials/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      showToast.success('Testimonial updated successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-testimonials'] });
      setIsDialogOpen(false);
      setEditingId(null);
      reset();
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to update testimonial');
    },
  });

  // Delete testimonial
  const deleteTestimonial = useMutation({
    mutationFn: async (id: string) => {
      return await platformApi.request(`/platform/testimonials/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      showToast.success('Testimonial deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-testimonials'] });
      setDeletingId(null);
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to delete testimonial');
    },
  });

  const onSubmit = (data: TestimonialFormData) => {
    const submitData = {
      ...data,
      image_url: data.image_url || null,
      organization: data.organization || null,
    };

    if (editingId) {
      updateTestimonial.mutate({ id: editingId, data: submitData });
    } else {
      createTestimonial.mutate(submitData);
    }
  };

  const handleEdit = (testimonial: Testimonial) => {
    setEditingId(testimonial.id);
    reset({
      name: testimonial.name,
      role: testimonial.role,
      organization: testimonial.organization || '',
      content: testimonial.content,
      image_url: testimonial.image_url || '',
      rating: testimonial.rating,
      sort_order: testimonial.sort_order,
      is_active: testimonial.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    if (deletingId) {
      deleteTestimonial.mutate(deletingId);
    }
  };

  const handleCreate = () => {
    setEditingId(null);
    reset({
      name: '',
      role: '',
      organization: '',
      content: '',
      image_url: '',
      rating: 5,
      sort_order: 0,
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Testimonials Management
              </CardTitle>
              <CardDescription>
                Manage testimonials displayed on the landing page
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Testimonial
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {testimonials && testimonials.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testimonials.map((testimonial) => (
                  <TableRow key={testimonial.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {testimonial.image_url && (
                          <img
                            src={testimonial.image_url}
                            alt={testimonial.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        )}
                        <span>{testimonial.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{testimonial.role}</TableCell>
                    <TableCell>{testimonial.organization || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < testimonial.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{testimonial.sort_order}</TableCell>
                    <TableCell>
                      <Badge variant={testimonial.is_active ? 'default' : 'secondary'}>
                        {testimonial.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(testimonial)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingId(testimonial.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No testimonials yet. Create your first one!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Testimonial' : 'Create Testimonial'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the testimonial details below.'
                : 'Add a new testimonial to display on the landing page.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input id="name" {...register('name')} placeholder="John Doe" />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">
                  Role <span className="text-destructive">*</span>
                </Label>
                <Input id="role" {...register('role')} placeholder="Principal" />
                {errors.role && (
                  <p className="text-sm text-destructive">{errors.role.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization">Organization (Optional)</Label>
              <Input
                id="organization"
                {...register('organization')}
                placeholder="Nazim School"
              />
              {errors.organization && (
                <p className="text-sm text-destructive">{errors.organization.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">
                Content <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="content"
                {...register('content')}
                placeholder="This system has revolutionized how we manage our school..."
                rows={4}
              />
              {errors.content && (
                <p className="text-sm text-destructive">{errors.content.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">
                <ImageIcon className="inline h-4 w-4 mr-1" />
                Image URL (Optional)
              </Label>
              <Input
                id="image_url"
                {...register('image_url')}
                placeholder="https://example.com/image.jpg"
              />
              {errors.image_url && (
                <p className="text-sm text-destructive">{errors.image_url.message}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rating">Rating</Label>
                <Input
                  id="rating"
                  type="number"
                  min="1"
                  max="5"
                  {...register('rating', { valueAsNumber: true })}
                />
                {errors.rating && (
                  <p className="text-sm text-destructive">{errors.rating.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  {...register('sort_order', { valueAsNumber: true })}
                />
                {errors.sort_order && (
                  <p className="text-sm text-destructive">{errors.sort_order.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="is_active" className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={isActive}
                    onCheckedChange={(checked) => setValue('is_active', checked)}
                  />
                  Active
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingId(null);
                  reset();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTestimonial.isPending || updateTestimonial.isPending}
              >
                {(createTestimonial.isPending || updateTestimonial.isPending) ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    {editingId ? 'Updating...' : 'Creating...'}
                  </>
                ) : editingId ? (
                  'Update Testimonial'
                ) : (
                  'Create Testimonial'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Testimonial</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this testimonial? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTestimonial.isPending}
            >
              {deleteTestimonial.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

