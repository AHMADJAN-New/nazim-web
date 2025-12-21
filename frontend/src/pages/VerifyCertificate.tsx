import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Shield, Calendar, Award, School, User, Search, Hash } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { format } from 'date-fns';

interface CertificateVerificationData {
  status: 'valid' | 'revoked' | 'invalid';
  student_name?: string;
  school_name?: string;
  class_id?: string;
  graduation_date?: string;
  certificate_no?: string;
  issued_at?: string;
  revoked_at?: string;
  revoke_reason?: string;
  message?: string;
}

export default function VerifyCertificate() {
  const { hash } = useParams<{ hash: string }>();
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(!!hash);
  const [data, setData] = useState<CertificateVerificationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Search form state
  const [certificateNumber, setCertificateNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [honeypot, setHoneypot] = useState(''); // Honeypot field for bot detection

  // Handle hash-based verification
  useEffect(() => {
    if (!hash) {
      setLoading(false);
      return;
    }

    const verifyCertificate = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Call the API endpoint (public route, no auth required)
        const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/verify/certificate/${hash}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        const data = await response.json() as CertificateVerificationData;
        
        if (!response.ok) {
          // Handle error response
          if (response.status === 404) {
            setData({
              status: 'invalid',
              message: data.message || 'Certificate not found. Please verify the link is correct.',
            });
          } else {
            throw { status: response.status, message: data.message || 'Failed to verify certificate' };
          }
        } else {
          setData(data);
        }
      } catch (err: any) {
        if (err.status === 404) {
          setData({
            status: 'invalid',
            message: 'Certificate not found. Please verify the link is correct.',
          });
        } else {
          setError(err.message || 'Failed to verify certificate. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    verifyCertificate();
  }, [hash]);

  // Handle certificate number search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Honeypot check - if filled, it's likely a bot
    if (honeypot) {
      setError('Invalid request. Please try again.');
      return;
    }
    
    // Validate certificate number
    const trimmedCertNo = certificateNumber.trim();
    if (!trimmedCertNo) {
      setError('Please enter a certificate number');
      return;
    }
    
    if (trimmedCertNo.length < 3) {
      setError('Certificate number must be at least 3 characters');
      return;
    }
    
    try {
      setSearching(true);
      setError(null);
      setData(null);
      
      // Call the search API endpoint
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/verify/certificate/search`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          certificate_no: trimmedCertNo,
          website: honeypot, // Honeypot field - should be empty
        }),
      });
      
      const result = await response.json() as CertificateVerificationData;
      
      if (!response.ok) {
        if (response.status === 404) {
          setData({
            status: 'invalid',
            message: result.message || 'Certificate not found. Please verify the certificate number is correct.',
          });
        } else if (response.status === 429) {
          setError('Too many requests. Please wait a moment and try again.');
        } else {
          setError(result.message || 'Failed to verify certificate. Please try again later.');
        }
      } else {
        setData(result);
        // Clear the search form
        setCertificateNumber('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify certificate. Please try again later.');
    } finally {
      setSearching(false);
    }
  };

  const getStatusIcon = () => {
    if (loading) return <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />;
    if (data?.status === 'valid') return <CheckCircle2 className="h-12 w-12 text-green-600" />;
    if (data?.status === 'revoked') return <XCircle className="h-12 w-12 text-red-600" />;
    return <AlertCircle className="h-12 w-12 text-yellow-600" />;
  };

  const getStatusBadge = () => {
    if (data?.status === 'valid') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Valid Certificate</Badge>;
    }
    if (data?.status === 'revoked') {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Revoked Certificate</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Invalid Certificate</Badge>;
  };

  const getStatusMessage = () => {
    if (data?.status === 'valid') {
      return 'This certificate is authentic and has been verified.';
    }
    if (data?.status === 'revoked') {
      return data.revoke_reason 
        ? `This certificate has been revoked. Reason: ${data.revoke_reason}`
        : 'This certificate has been revoked and is no longer valid.';
    }
    return data?.message || 'This certificate could not be verified. Please check the verification link.';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Certificate Verification</h1>
          </div>
          <p className="text-muted-foreground">
            Verify the authenticity of graduation certificates
          </p>
        </div>

        {/* Search Form - Show when no hash is provided or after search */}
        {!hash && (
          <Card className="shadow-lg mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search by Certificate Number
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="certificate-number">Certificate Number</Label>
                  <Input
                    id="certificate-number"
                    type="text"
                    placeholder="Enter certificate number (e.g., NZM-GRAD-2024-0001)"
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value)}
                    disabled={searching}
                    className="text-base"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the certificate number printed on your certificate
                  </p>
                </div>
                
                {/* Honeypot field - hidden from users but visible to bots */}
                <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
                  <Label htmlFor="website">Website (leave blank)</Label>
                  <Input
                    id="website"
                    type="text"
                    name="website"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={searching || !certificateNumber.trim()}>
                  {searching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Verify Certificate
                    </>
                  )}
                </Button>
              </form>
              
              {error && !data && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Alternative: Verify by Hash Link */}
        {!hash && (
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground">
              Or verify using a{' '}
              <Button
                variant="link"
                className="p-0 h-auto font-semibold"
                onClick={() => navigate('/verify')}
              >
                verification link
                <Hash className="h-3 w-3 ml-1 inline" />
              </Button>
            </p>
          </div>
        )}

        {/* Results Card - Show when hash is provided or after search */}
        {(hash || data) && (
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                {getStatusIcon()}
              </div>
              <CardTitle className="text-2xl">{getStatusBadge()}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Verifying certificate...</p>
                </div>
              ) : error && !data ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                  <p className="text-red-600 font-medium">{error}</p>
                </div>
              ) : (
              <>
                {/* Status Message */}
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">{getStatusMessage()}</p>
                </div>

                {/* Certificate Details */}
                {data?.status === 'valid' || data?.status === 'revoked' ? (
                  <div className="space-y-4 border-t pt-6">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Certificate Details
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.certificate_no && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Certificate Number</p>
                          <p className="text-base font-semibold">{data.certificate_no}</p>
                        </div>
                      )}
                      
                      {data.student_name && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <User className="h-4 w-4" />
                            Student Name
                          </p>
                          <p className="text-base font-semibold">{data.student_name}</p>
                        </div>
                      )}
                      
                      {data.school_name && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <School className="h-4 w-4" />
                            School
                          </p>
                          <p className="text-base font-semibold">{data.school_name}</p>
                        </div>
                      )}
                      
                      {data.graduation_date && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Graduation Date
                          </p>
                          <p className="text-base font-semibold">
                            {format(new Date(data.graduation_date), 'MMMM d, yyyy')}
                          </p>
                        </div>
                      )}
                      
                      {data.issued_at && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Issued Date</p>
                          <p className="text-base font-semibold">
                            {format(new Date(data.issued_at), 'MMMM d, yyyy')}
                          </p>
                        </div>
                      )}
                      
                      {data.revoked_at && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Revoked Date</p>
                          <p className="text-base font-semibold text-red-600">
                            {format(new Date(data.revoked_at), 'MMMM d, yyyy')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Security Notice */}
                <div className="border-t pt-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-900">
                        <p className="font-medium mb-1">Security Information</p>
                        <p className="text-blue-700">
                          This verification system uses cryptographic hashing to ensure certificate authenticity. 
                          Only certificates issued through our system can be verified here.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>For questions or concerns, please contact the issuing institution.</p>
          {data && (
            <Button
              variant="link"
              className="mt-4"
              onClick={() => {
                setData(null);
                setError(null);
                setCertificateNumber('');
                navigate('/verify/certificate');
              }}
            >
              Verify Another Certificate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

