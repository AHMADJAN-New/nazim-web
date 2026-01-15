import {
  Key,
  FileText,
  CheckCircle,
  XCircle,
  Download,
  Upload,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  RefreshCw,
  Save,
  Loader2,
} from 'lucide-react';
import { useState, useRef } from 'react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';
import {
  useLicenseKeys,
  useGenerateKeyPair,
  useUpdateKey,
  useDeleteKey,
  useSignLicense,
  useVerifyLicense,
  useDesktopLicenses,
  useDownloadLicense,
  useDeleteLicense,
  type LicenseKey,
  type DesktopLicense,
  type LicenseEdition,
} from '@/platform/hooks/useDesktopLicenses';

export default function DesktopLicenseGeneration() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('keys');
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editingKeyNotes, setEditingKeyNotes] = useState('');
  const [viewingLicenseId, setViewingLicenseId] = useState<string | null>(null);
  const [licenseJson, setLicenseJson] = useState('');
  const [signedLicenseJson, setSignedLicenseJson] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; payload?: any; error?: string } | null>(null);
  
  // Sign License Form State
  const [signForm, setSignForm] = useState({
    kid: '',
    customer: '',
    edition: 'Pro' as LicenseEdition,
    validityDays: 365,
    seats: 1,
    notes: '',
    fingerprintId: '',
  });

  // File input refs
  const loadKeysFileRef = useRef<HTMLInputElement>(null);
  const loadFingerprintFileRef = useRef<HTMLInputElement>(null);
  const loadLicenseFileRef = useRef<HTMLInputElement>(null);

  // Permission check is handled at route level (ProtectedPlatformLayout)
  // No need to check permissions here - just enable queries directly
  const { data: keys, isLoading: keysLoading } = useLicenseKeys(true);
  const { data: licenses, isLoading: licensesLoading } = useDesktopLicenses(true);
  const generateKeyPair = useGenerateKeyPair();
  const updateKey = useUpdateKey();
  const deleteKey = useDeleteKey();
  const signLicense = useSignLicense();
  const verifyLicense = useVerifyLicense();
  const downloadLicense = useDownloadLicense();
  const deleteLicense = useDeleteLicense();

  // Generate new key pair
  const handleGenerateKeyPair = async () => {
    const kid = prompt('Enter key identifier (e.g., "root-v1"):');
    if (!kid) return;

    const notes = prompt('Enter optional notes (or leave empty):') || null;

    await generateKeyPair.mutateAsync({
      kid,
      notes,
    });
  };

  // Load keys from JSON file
  const handleLoadKeysFromFile = () => {
    loadKeysFileRef.current?.click();
  };

  const handleKeysFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // TODO: Implement loading keys from JSON file
      // This would require a backend endpoint to import keys
      alert('Loading keys from file is not yet implemented. Please use the generate button to create new keys.');
    } catch (error) {
      alert('Failed to load keys file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Reset file input
    e.target.value = '';
  };

  // Save keys to JSON file
  const handleSaveKeysToFile = () => {
    if (!keys || keys.length === 0) {
      alert('No keys to save');
      return;
    }

    const keysData = keys.map(key => ({
      kid: key.kid,
      public_key_b64: key.publicKeyB64,
      notes: key.notes,
    }));

    const blob = new Blob([JSON.stringify(keysData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `license-keys-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Update key notes
  const handleUpdateKey = async (keyId: string) => {
    await updateKey.mutateAsync({
      id: keyId,
      notes: editingKeyNotes || null,
    });
    setEditingKeyId(null);
    setEditingKeyNotes('');
  };

  // Delete key
  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this key? This action cannot be undone.')) {
      return;
    }
    await deleteKey.mutateAsync(keyId);
  };

  // Delete license
  const handleDeleteLicense = async (licenseId: string) => {
    if (!confirm('Are you sure you want to delete this license? This action cannot be undone.')) {
      return;
    }
    await deleteLicense.mutateAsync(licenseId);
  };

  // Load fingerprint from JSON file
  const handleLoadFingerprintFromFile = () => {
    loadFingerprintFileRef.current?.click();
  };

  const handleFingerprintFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Extract fingerprint_id from JSON
      const fingerprintId = data.fingerprint_id || data.fingerprint?.fingerprint_id || '';
      if (fingerprintId) {
        setSignForm(prev => ({ ...prev, fingerprintId }));
      } else {
        alert('No fingerprint_id found in file');
      }
    } catch (error) {
      alert('Failed to load fingerprint file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Reset file input
    e.target.value = '';
  };

  // Sign license
  const handleSignLicense = async () => {
    if (!signForm.kid || !signForm.customer || !signForm.fingerprintId) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate fingerprint format (16 hex characters)
    if (!/^[0-9a-f]{16}$/i.test(signForm.fingerprintId)) {
      alert('Fingerprint ID must be exactly 16 hexadecimal characters');
      return;
    }

    try {
      const result = await signLicense.mutateAsync(signForm);
      setSignedLicenseJson(result.licenseJson);
      setLicenseJson(result.licenseJson);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  // Load license file for verification
  const handleLoadLicenseFile = () => {
    loadLicenseFileRef.current?.click();
  };

  const handleLicenseFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      setLicenseJson(text);
      
      // Extract payload and signature
      const payloadB64 = data.payload;
      const signatureB64 = data.signature;

      if (!payloadB64 || !signatureB64) {
        alert('Invalid license file format. Expected { payload, signature }');
        return;
      }

      // Find the key used for signing (from payload)
      const payloadJson = JSON.parse(atob(payloadB64));
      const kid = payloadJson.kid;
      const key = keys?.find(k => k.kid === kid);

      if (!key) {
        alert(`Key "${kid}" not found. Please ensure the key is loaded.`);
        return;
      }

      // Verify license
      const result = await verifyLicense.mutateAsync({
        payloadB64,
        signatureB64,
        publicKeyB64: key.publicKeyB64,
      });

      setVerifyResult(result);
    } catch (error) {
      alert('Failed to load license file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Reset file input
    e.target.value = '';
  };

  // Verify license manually
  const handleVerifyLicense = async () => {
    if (!licenseJson) {
      alert('Please load a license file first');
      return;
    }

    try {
      const data = JSON.parse(licenseJson);
      const payloadB64 = data.payload;
      const signatureB64 = data.signature;

      if (!payloadB64 || !signatureB64) {
        alert('Invalid license format. Expected { payload, signature }');
        return;
      }

      // Find the key used for signing
      const payloadJson = JSON.parse(atob(payloadB64));
      const kid = payloadJson.kid;
      const key = keys?.find(k => k.kid === kid);

      if (!key) {
        alert(`Key "${kid}" not found. Please ensure the key is loaded.`);
        return;
      }

      const result = await verifyLicense.mutateAsync({
        payloadB64,
        signatureB64,
        publicKeyB64: key.publicKeyB64,
      });

      setVerifyResult(result);
    } catch (error) {
      alert('Failed to verify license: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Download license as .dat file
  const handleDownloadLicense = () => {
    if (!signedLicenseJson) {
      alert('No signed license to download');
      return;
    }

    const blob = new Blob([signedLicenseJson], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `license-${signForm.customer.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.dat`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Copy license JSON
  const handleCopyLicenseJson = (license: DesktopLicense) => {
    const licenseData = {
      payload: license.payloadB64,
      signature: license.signatureB64,
    };
    navigator.clipboard.writeText(JSON.stringify(licenseData, null, 2));
    alert('License JSON copied to clipboard');
  };

  // View license JSON
  const handleViewLicenseJson = (license: DesktopLicense) => {
    const licenseData = {
      payload: license.payloadB64,
      signature: license.signatureB64,
    };
    setLicenseJson(JSON.stringify(licenseData, null, 2));
    setViewingLicenseId(license.id);
  };

  const selectedKey = keys?.find(k => k.id === selectedKeyId);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Desktop License Generation</h1>
          <p className="text-muted-foreground">Generate and manage Ed25519-signed licenses for the Nazim desktop application</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">Keys</span>
          </TabsTrigger>
          <TabsTrigger value="sign" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Sign License</span>
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Test License</span>
          </TabsTrigger>
          <TabsTrigger value="repository" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Repository</span>
          </TabsTrigger>
        </TabsList>

        {/* Keys Tab */}
        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>License Keys</CardTitle>
              <CardDescription>Generate and manage Ed25519 key pairs for signing licenses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleGenerateKeyPair} disabled={generateKeyPair.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate New Key Pair
                </Button>
                <Button variant="outline" onClick={handleLoadKeysFromFile}>
                  <Upload className="h-4 w-4 mr-2" />
                  Load Keys from JSON
                </Button>
                <Button variant="outline" onClick={handleSaveKeysToFile} disabled={!keys || keys.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Save Keys to JSON
                </Button>
                <input
                  ref={loadKeysFileRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleKeysFileChange}
                />
              </div>

              {keysLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : keys && keys.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>KID</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Public Key</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {keys.map((key) => (
                        <TableRow key={key.id}>
                          <TableCell className="font-mono text-xs">{key.id.slice(0, 8)}...</TableCell>
                          <TableCell className="font-mono">{key.kid}</TableCell>
                          <TableCell>{formatDate(key.createdAt)}</TableCell>
                          <TableCell className="font-mono text-xs max-w-xs truncate">
                            {key.publicKeyB64.slice(0, 32)}...
                          </TableCell>
                          <TableCell>{key.notes || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedKeyId(key.id);
                                  setSignForm(prev => ({ ...prev, kid: key.kid }));
                                }}
                              >
                                Use
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingKeyId(key.id);
                                  setEditingKeyNotes(key.notes || '');
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteKey(key.id)}
                                disabled={deleteKey.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No keys found. Generate a new key pair to get started.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Key Dialog */}
          <Dialog open={editingKeyId !== null} onOpenChange={(open) => !open && setEditingKeyId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Key Notes</DialogTitle>
                <DialogDescription>Update the notes for this key</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={editingKeyNotes}
                    onChange={(e) => setEditingKeyNotes(e.target.value)}
                    placeholder="Optional notes about this key"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingKeyId(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => editingKeyId && handleUpdateKey(editingKeyId)}
                  disabled={updateKey.isPending}
                >
                  {updateKey.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Sign License Tab */}
        <TabsContent value="sign" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sign License</CardTitle>
              <CardDescription>Create a signed license for a customer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Key Identifier (KID) *</Label>
                  <Select
                    value={signForm.kid}
                    onValueChange={(value) => setSignForm(prev => ({ ...prev, kid: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a key" />
                    </SelectTrigger>
                    <SelectContent>
                      {keys?.map((key) => (
                        <SelectItem key={key.id} value={key.kid}>
                          {key.kid}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Customer Name *</Label>
                  <Input
                    value={signForm.customer}
                    onChange={(e) => setSignForm(prev => ({ ...prev, customer: e.target.value }))}
                    placeholder="School Name"
                  />
                </div>
                <div>
                  <Label>Edition *</Label>
                  <Select
                    value={signForm.edition}
                    onValueChange={(value) => setSignForm(prev => ({ ...prev, edition: value as LicenseEdition }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Basic">Basic</SelectItem>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Pro">Pro</SelectItem>
                      <SelectItem value="Enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Validity Days *</Label>
                  <Input
                    type="number"
                    value={signForm.validityDays}
                    onChange={(e) => setSignForm(prev => ({ ...prev, validityDays: parseInt(e.target.value) || 365 }))}
                    min={1}
                  />
                </div>
                <div>
                  <Label>Seats *</Label>
                  <Input
                    type="number"
                    value={signForm.seats}
                    onChange={(e) => setSignForm(prev => ({ ...prev, seats: parseInt(e.target.value) || 1 }))}
                    min={1}
                  />
                </div>
                <div>
                  <Label>Fingerprint ID *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={signForm.fingerprintId}
                      onChange={(e) => setSignForm(prev => ({ ...prev, fingerprintId: e.target.value }))}
                      placeholder="d915347b496bc42e"
                      className="font-mono"
                    />
                    <Button variant="outline" onClick={handleLoadFingerprintFromFile}>
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  <input
                    ref={loadFingerprintFileRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFingerprintFileChange}
                  />
                  <p className="text-xs text-muted-foreground mt-1">16 hexadecimal characters</p>
                </div>
                <div className="md:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={signForm.notes}
                    onChange={(e) => setSignForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional notes"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSignLicense} disabled={signLicense.isPending}>
                  {signLicense.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Sign License
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadLicense}
                  disabled={!signedLicenseJson}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download .dat File
                </Button>
              </div>

              {signedLicenseJson && (
                <div>
                  <Label>Signed License JSON</Label>
                  <Textarea
                    value={signedLicenseJson}
                    readOnly
                    className="font-mono text-xs"
                    rows={10}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test License Tab */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test License</CardTitle>
              <CardDescription>Verify a signed license file</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleLoadLicenseFile}>
                  <Upload className="h-4 w-4 mr-2" />
                  Load License File
                </Button>
                <Button onClick={handleVerifyLicense} disabled={!licenseJson || verifyLicense.isPending}>
                  {verifyLicense.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Verify License
                </Button>
                <input
                  ref={loadLicenseFileRef}
                  type="file"
                  accept=".dat,.json"
                  className="hidden"
                  onChange={handleLicenseFileChange}
                />
              </div>

              {licenseJson && (
                <div>
                  <Label>License JSON</Label>
                  <Textarea
                    value={licenseJson}
                    onChange={(e) => setLicenseJson(e.target.value)}
                    className="font-mono text-xs"
                    rows={10}
                  />
                </div>
              )}

              {verifyResult && (
                <div>
                  <Label>Verification Result</Label>
                  <Card className={verifyResult.valid ? 'border-green-500' : 'border-red-500'}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        {verifyResult.valid ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="font-semibold text-green-500">License is Valid</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-5 w-5 text-red-500" />
                            <span className="font-semibold text-red-500">License is Invalid</span>
                          </>
                        )}
                      </div>
                      {verifyResult.error && (
                        <p className="text-sm text-red-500 mb-4">{verifyResult.error}</p>
                      )}
                      {verifyResult.payload && (
                        <div className="space-y-2 text-sm">
                          <div><strong>KID:</strong> {verifyResult.payload.kid}</div>
                          <div><strong>Customer:</strong> {verifyResult.payload.customer}</div>
                          <div><strong>Edition:</strong> {verifyResult.payload.edition}</div>
                          <div><strong>Expires:</strong> {verifyResult.payload.expires}</div>
                          <div><strong>Issued At:</strong> {verifyResult.payload.issuedAt}</div>
                          <div><strong>Seats:</strong> {verifyResult.payload.seats}</div>
                          <div><strong>Fingerprint ID:</strong> {verifyResult.payload.fingerprint.fingerprintId}</div>
                          {verifyResult.payload.notes && (
                            <div><strong>Notes:</strong> {verifyResult.payload.notes}</div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Repository Tab */}
        <TabsContent value="repository" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Keys Repository</CardTitle>
              <CardDescription>View all saved license keys</CardDescription>
            </CardHeader>
            <CardContent>
              {keysLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : keys && keys.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>KID</TableHead>
                        <TableHead>Public Key</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {keys.map((key) => (
                        <TableRow key={key.id}>
                          <TableCell className="font-mono text-xs">{key.id.slice(0, 8)}...</TableCell>
                          <TableCell>{formatDate(key.createdAt)}</TableCell>
                          <TableCell className="font-mono">{key.kid}</TableCell>
                          <TableCell className="font-mono text-xs max-w-xs truncate">
                            {key.publicKeyB64.slice(0, 32)}...
                          </TableCell>
                          <TableCell>{key.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No keys found</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Licenses Repository</CardTitle>
              <CardDescription>View all generated licenses</CardDescription>
            </CardHeader>
            <CardContent>
              {licensesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : licenses && licenses.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Edition</TableHead>
                        <TableHead>Validity Days</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Seats</TableHead>
                        <TableHead>Fingerprint ID</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {licenses.map((license) => (
                        <TableRow key={license.id}>
                          <TableCell className="font-mono text-xs">{license.id.slice(0, 8)}...</TableCell>
                          <TableCell>{formatDate(license.createdAt)}</TableCell>
                          <TableCell>{license.customer}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{license.edition}</Badge>
                          </TableCell>
                          <TableCell>{license.validityDays}</TableCell>
                          <TableCell>{formatDate(license.expires)}</TableCell>
                          <TableCell>{license.seats}</TableCell>
                          <TableCell className="font-mono text-xs">{license.fingerprintId}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewLicenseJson(license)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadLicense.mutate(license.id)}
                                disabled={downloadLicense.isPending}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyLicenseJson(license)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLicense(license.id)}
                                disabled={deleteLicense.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No licenses found</div>
              )}
            </CardContent>
          </Card>

          {/* View License JSON Dialog */}
          <Dialog open={viewingLicenseId !== null} onOpenChange={(open) => !open && setViewingLicenseId(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>License JSON</DialogTitle>
                <DialogDescription>View the license JSON data</DialogDescription>
              </DialogHeader>
              <div>
                <Textarea
                  value={licenseJson}
                  readOnly
                  className="font-mono text-xs"
                  rows={15}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewingLicenseId(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(licenseJson);
                    alert('License JSON copied to clipboard');
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}

