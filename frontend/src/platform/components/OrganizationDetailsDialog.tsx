import { Building2, Mail, Phone, Globe, MapPin, Users, Calendar, Package } from 'lucide-react';
import { useState } from 'react';

import { OrganizationSubscriptionDialog } from './OrganizationSubscriptionDialog';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { formatDate, formatDateTime } from '@/lib/utils';
import { usePlatformOrganization } from '@/platform/hooks/usePlatformAdmin';
import type { Organization } from '@/types/domain/organization';

interface OrganizationDetailsDialogProps {
  organizationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showManageButton?: boolean;
}

export function OrganizationDetailsDialog({
  organizationId,
  open,
  onOpenChange,
  showManageButton = true,
}: OrganizationDetailsDialogProps) {
  const { data: organization, isLoading, error } = usePlatformOrganization(organizationId);
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            {organization?.name || 'Organization Details'}
          </DialogTitle>
          <DialogDescription>
            Complete organization information and contact details
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-destructive">Error loading organization details</p>
              {import.meta.env.DEV && (
                <p className="text-xs mt-2 text-muted-foreground">
                  {error instanceof Error ? error.message : String(error)}
                </p>
              )}
            </div>
          ) : organization ? (
            <>
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Organization Name</Label>
                      <p className="font-medium">{organization.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Slug</Label>
                      <p className="font-medium font-mono text-sm">{organization.slug}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Organization ID</Label>
                      <p className="text-sm font-mono text-muted-foreground break-all">{organization.id}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        {organization.deletedAt ? (
                          <Badge variant="destructive">Inactive</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-500">
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {organization.description && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Description</Label>
                      <p className="text-sm">{organization.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {organization.contactPersonName && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Contact Person</Label>
                        <p className="font-medium">{organization.contactPersonName}</p>
                        {organization.contactPersonPosition && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {organization.contactPersonPosition}
                          </p>
                        )}
                      </div>
                    )}
                    {organization.email && (
                      <div>
                        <Label className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Email
                        </Label>
                        <p className="font-medium">{organization.email}</p>
                      </div>
                    )}
                    {organization.contactPersonEmail && (
                      <div>
                        <Label className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Contact Email
                        </Label>
                        <p className="font-medium">{organization.contactPersonEmail}</p>
                      </div>
                    )}
                    {organization.phone && (
                      <div>
                        <Label className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          Phone
                        </Label>
                        <p className="font-medium">{organization.phone}</p>
                      </div>
                    )}
                    {organization.contactPersonPhone && (
                      <div>
                        <Label className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          Contact Phone
                        </Label>
                        <p className="font-medium">{organization.contactPersonPhone}</p>
                      </div>
                    )}
                    {organization.website && (
                      <div>
                        <Label className="text-sm text-muted-foreground flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          Website
                        </Label>
                        <a
                          href={organization.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline"
                        >
                          {organization.website}
                        </a>
                      </div>
                    )}
                  </div>
                  {!organization.contactPersonName &&
                    !organization.email &&
                    !organization.contactPersonEmail &&
                    !organization.phone &&
                    !organization.contactPersonPhone &&
                    !organization.website && (
                      <p className="text-sm text-muted-foreground italic">No contact information available</p>
                    )}
                </CardContent>
              </Card>

              {/* Address Information */}
              {(organization.streetAddress ||
                organization.city ||
                organization.stateProvince ||
                organization.country ||
                organization.postalCode) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {organization.streetAddress && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Street Address</Label>
                        <p className="font-medium">{organization.streetAddress}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {organization.city && (
                        <div>
                          <Label className="text-sm text-muted-foreground">City</Label>
                          <p className="font-medium">{organization.city}</p>
                        </div>
                      )}
                      {organization.stateProvince && (
                        <div>
                          <Label className="text-sm text-muted-foreground">State/Province</Label>
                          <p className="font-medium">{organization.stateProvince}</p>
                        </div>
                      )}
                      {organization.country && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Country</Label>
                          <p className="font-medium">{organization.country}</p>
                        </div>
                      )}
                      {organization.postalCode && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Postal Code</Label>
                          <p className="font-medium">{organization.postalCode}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Information */}
              {(organization.registrationNumber ||
                organization.taxId ||
                organization.licenseNumber ||
                organization.type ||
                organization.establishedDate) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {organization.registrationNumber && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Registration Number</Label>
                          <p className="font-medium">{organization.registrationNumber}</p>
                        </div>
                      )}
                      {organization.taxId && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Tax ID</Label>
                          <p className="font-medium">{organization.taxId}</p>
                        </div>
                      )}
                      {organization.licenseNumber && (
                        <div>
                          <Label className="text-sm text-muted-foreground">License Number</Label>
                          <p className="font-medium">{organization.licenseNumber}</p>
                        </div>
                      )}
                      {organization.type && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Type</Label>
                          <p className="font-medium">{organization.type}</p>
                        </div>
                      )}
                      {organization.establishedDate && (
                        <div>
                          <Label className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Established Date
                          </Label>
                          <p className="font-medium">
                            {formatDate(new Date(organization.establishedDate))}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">Created At</Label>
                    <p className="text-sm font-medium">
                      {organization.createdAt ? formatDateTime(new Date(organization.createdAt)) : 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">Updated At</Label>
                    <p className="text-sm font-medium">
                      {organization.updatedAt ? formatDateTime(new Date(organization.updatedAt)) : 'N/A'}
                    </p>
                  </div>
                  {organization.deletedAt && (
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">Deleted At</Label>
                      <p className="text-sm font-medium text-destructive">
                        {formatDateTime(new Date(organization.deletedAt))}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p>Organization not found</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {showManageButton && organization && (
            <Button onClick={() => setIsSubscriptionDialogOpen(true)}>
              <Package className="mr-2 h-4 w-4" />
              Manage Subscription
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
      </Dialog>

      {/* Subscription Management Dialog */}
      {organization && (
        <OrganizationSubscriptionDialog
          organizationId={organization.id}
          open={isSubscriptionDialogOpen}
          onOpenChange={setIsSubscriptionDialogOpen}
        />
      )}
    </>
  );
}

