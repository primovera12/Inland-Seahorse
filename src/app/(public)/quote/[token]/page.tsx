'use client'

import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import {
  FileText,
  Building2,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Truck,
  PenLine,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { SignaturePad, SignatureDisplay } from '@/components/ui/signature-pad'

type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired'

const STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string; icon: React.ComponentType<{className?: string}> }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: FileText },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-800', icon: Clock },
  viewed: { label: 'Viewed', color: 'bg-purple-100 text-purple-800', icon: FileText },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
  expired: { label: 'Expired', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
}

const REJECTION_REASONS = [
  'Price too high',
  'Found a better quote',
  'Project cancelled',
  'Timeline doesn\'t work',
  'Changed requirements',
  'Other',
]

export default function PublicQuotePage() {
  const params = useParams()
  const token = params.token as string
  const [quoteType, setQuoteType] = useState<'dismantle' | 'inland' | null>(null)

  // Try to fetch dismantle quote first
  const { data: dismantleQuote, isLoading: dismantleLoading, refetch: refetchDismantle } = trpc.quotes.getByPublicToken.useQuery(
    { token },
    { retry: false }
  )

  // Try inland quote if dismantle not found
  const { data: inlandQuote, isLoading: inlandLoading, refetch: refetchInland } = trpc.inland.getByPublicToken.useQuery(
    { token },
    {
      enabled: !dismantleLoading && !dismantleQuote,
      retry: false
    }
  )

  useEffect(() => {
    if (dismantleQuote) {
      setQuoteType('dismantle')
    } else if (inlandQuote) {
      setQuoteType('inland')
    }
  }, [dismantleQuote, inlandQuote])

  const quote = dismantleQuote || inlandQuote
  const isLoading = dismantleLoading || (inlandLoading && !dismantleQuote)

  const refetch = () => {
    if (quoteType === 'dismantle') {
      refetchDismantle()
    } else {
      refetchInland()
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container max-w-4xl mx-auto py-12 px-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container max-w-4xl mx-auto py-12 px-4">
          <Card className="text-center py-12">
            <CardContent>
              <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">Quote Not Found</h2>
              <p className="text-muted-foreground">
                This quote link may be invalid or the quote may have been deleted.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const status = quote.status as QuoteStatus
  const statusConfig = STATUS_CONFIG[status]
  const StatusIcon = statusConfig.icon
  const isExpired = status === 'expired' || (quote.expires_at && new Date(quote.expires_at) < new Date())
  const canRespond = status === 'sent' || status === 'viewed'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-4xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            {quoteType === 'inland' ? (
              <Truck className="h-8 w-8 text-primary" />
            ) : (
              <FileText className="h-8 w-8 text-primary" />
            )}
            <h1 className="text-3xl font-bold">
              {quoteType === 'inland' ? 'Inland Transportation Quote' : 'Equipment Quote'}
            </h1>
          </div>
          <p className="text-muted-foreground">
            Quote #{quote.quote_number}
          </p>
        </div>

        {/* Status Banner */}
        {isExpired && status !== 'expired' && (
          <Card className="mb-6 border-yellow-300 bg-yellow-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">This quote has expired</p>
                  <p className="text-sm text-yellow-700">
                    Please contact us for an updated quote.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {status === 'accepted' && (
          <Card className="mb-6 border-green-300 bg-green-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Quote Accepted</p>
                  <p className="text-sm text-green-700">
                    Thank you for accepting this quote. We will be in touch shortly.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {status === 'rejected' && (
          <Card className="mb-6 border-red-300 bg-red-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">Quote Declined</p>
                  <p className="text-sm text-red-700">
                    This quote has been declined. Contact us if you have any questions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Quote Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Quote Details</CardTitle>
                <CardDescription>
                  Created on {formatDate(quote.created_at)}
                </CardDescription>
              </div>
              <Badge className={statusConfig.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">{quote.customer_name}</p>
                {quote.customer_company && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {quote.customer_company}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Valid Until</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {quote.expires_at ? formatDate(quote.expires_at) : 'Not specified'}
                </p>
              </div>
            </div>

            <Separator />

            {/* Equipment/Service Info */}
            {quoteType === 'dismantle' ? (
              <div className="space-y-4">
                <h3 className="font-semibold">Equipment</h3>
                <div className="rounded-lg border p-4 bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {quote.make_name} {quote.model_name}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {quote.location}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-semibold">Transportation Details</h3>
                <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Origin</p>
                      <p className="font-medium flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-green-600" />
                        {quote.origin_city}, {quote.origin_state}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Destination</p>
                      <p className="font-medium flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-red-600" />
                        {quote.destination_city}, {quote.destination_state}
                      </p>
                    </div>
                  </div>
                  {quote.distance_miles && (
                    <p className="text-sm text-muted-foreground">
                      Distance: {quote.distance_miles.toFixed(1)} miles
                    </p>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="font-semibold">Pricing</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono">{formatCurrency(quote.subtotal)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold text-lg">Total</span>
                  <span className="text-2xl font-bold font-mono text-primary">
                    {formatCurrency(quote.total)}
                  </span>
                </div>
              </div>
            </div>

            {quote.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold">Notes</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {quote.notes}
                  </p>
                </div>
              </>
            )}

            {/* Show signature if accepted */}
            {status === 'accepted' && quote.signature_data && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <PenLine className="h-4 w-4" />
                    Signature
                  </h3>
                  <SignatureDisplay
                    signatureData={quote.signature_data}
                    signedBy={quote.signed_by}
                    signedAt={quote.signed_at}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {canRespond && !isExpired && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Respond to Quote</CardTitle>
              <CardDescription>
                Please review the quote details above and respond below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AcceptRejectSection token={token} quoteType={quoteType!} onSuccess={refetch} />
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Questions about this quote?</p>
          <p>Please contact us for assistance.</p>
        </div>
      </div>
    </div>
  )
}

function AcceptRejectSection({
  token,
  quoteType,
  onSuccess,
}: {
  token: string
  quoteType: 'dismantle' | 'inland'
  onSuccess: () => void
}) {
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [acceptForm, setAcceptForm] = useState({
    signedBy: '',
    signerEmail: '',
    signatureData: null as string | null,
    notes: '',
  })
  const [rejectForm, setRejectForm] = useState({
    respondentName: '',
    respondentEmail: '',
    rejectionReason: '',
    customReason: '',
  })

  const acceptDismantle = trpc.quotes.publicAccept.useMutation({
    onSuccess: () => {
      toast.success('Quote Accepted!', {
        description: 'Thank you! We will be in touch shortly.',
      })
      setShowAcceptDialog(false)
      onSuccess()
    },
    onError: (error) => {
      toast.error('Failed to accept quote', { description: error.message })
    },
  })

  const acceptInland = trpc.inland.publicAccept.useMutation({
    onSuccess: () => {
      toast.success('Quote Accepted!', {
        description: 'Thank you! We will be in touch shortly.',
      })
      setShowAcceptDialog(false)
      onSuccess()
    },
    onError: (error) => {
      toast.error('Failed to accept quote', { description: error.message })
    },
  })

  const rejectDismantle = trpc.quotes.publicReject.useMutation({
    onSuccess: () => {
      toast.info('Quote Declined', {
        description: 'Thank you for letting us know.',
      })
      setShowRejectDialog(false)
      onSuccess()
    },
    onError: (error) => {
      toast.error('Failed to decline quote', { description: error.message })
    },
  })

  const rejectInland = trpc.inland.publicReject.useMutation({
    onSuccess: () => {
      toast.info('Quote Declined', {
        description: 'Thank you for letting us know.',
      })
      setShowRejectDialog(false)
      onSuccess()
    },
    onError: (error) => {
      toast.error('Failed to decline quote', { description: error.message })
    },
  })

  const handleAccept = () => {
    if (!acceptForm.signedBy.trim()) {
      toast.error('Please enter your name')
      return
    }

    const mutation = quoteType === 'dismantle' ? acceptDismantle : acceptInland
    mutation.mutate({
      token,
      signedBy: acceptForm.signedBy,
      signerEmail: acceptForm.signerEmail || undefined,
      signatureData: acceptForm.signatureData || undefined,
      notes: acceptForm.notes || undefined,
    })
  }

  const handleReject = () => {
    const reason = rejectForm.rejectionReason === 'Other'
      ? rejectForm.customReason
      : rejectForm.rejectionReason

    const mutation = quoteType === 'dismantle' ? rejectDismantle : rejectInland
    mutation.mutate({
      token,
      rejectionReason: reason || undefined,
      respondentName: rejectForm.respondentName || undefined,
      respondentEmail: rejectForm.respondentEmail || undefined,
    })
  }

  const isAccepting = acceptDismantle.isPending || acceptInland.isPending
  const isRejecting = rejectDismantle.isPending || rejectInland.isPending

  return (
    <>
      <div className="flex gap-4 justify-center">
        <Button
          onClick={() => setShowAcceptDialog(true)}
          className="bg-green-600 hover:bg-green-700"
          size="lg"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Accept Quote
        </Button>
        <Button
          onClick={() => setShowRejectDialog(true)}
          variant="outline"
          size="lg"
          className="border-red-300 text-red-600 hover:bg-red-50"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Decline Quote
        </Button>
      </div>

      {/* Accept Dialog */}
      <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Accept Quote
            </DialogTitle>
            <DialogDescription>
              Please provide your details to confirm acceptance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signedBy">Your Name *</Label>
              <Input
                id="signedBy"
                value={acceptForm.signedBy}
                onChange={(e) => setAcceptForm({ ...acceptForm, signedBy: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signerEmail">Your Email (optional)</Label>
              <Input
                id="signerEmail"
                type="email"
                value={acceptForm.signerEmail}
                onChange={(e) => setAcceptForm({ ...acceptForm, signerEmail: e.target.value })}
                placeholder="Enter your email address"
              />
            </div>
            <div className="space-y-2">
              <Label>Signature (optional)</Label>
              <SignaturePad
                onSignatureChange={(data) => setAcceptForm({ ...acceptForm, signatureData: data })}
                width={350}
                height={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (optional)</Label>
              <textarea
                id="notes"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Any comments or special requests..."
                value={acceptForm.notes}
                onChange={(e) => setAcceptForm({ ...acceptForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAcceptDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAccept}
              disabled={isAccepting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isAccepting ? 'Accepting...' : 'Confirm Acceptance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Decline Quote
            </DialogTitle>
            <DialogDescription>
              We'd appreciate your feedback to help us improve.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="respondentName">Your Name (optional)</Label>
              <Input
                id="respondentName"
                value={rejectForm.respondentName}
                onChange={(e) => setRejectForm({ ...rejectForm, respondentName: e.target.value })}
                placeholder="Enter your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="respondentEmail">Your Email (optional)</Label>
              <Input
                id="respondentEmail"
                type="email"
                value={rejectForm.respondentEmail}
                onChange={(e) => setRejectForm({ ...rejectForm, respondentEmail: e.target.value })}
                placeholder="Enter your email"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason for Declining (optional)</Label>
              <Select
                value={rejectForm.rejectionReason}
                onValueChange={(value) => setRejectForm({ ...rejectForm, rejectionReason: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {rejectForm.rejectionReason === 'Other' && (
              <div className="space-y-2">
                <Label htmlFor="customReason">Please specify</Label>
                <textarea
                  id="customReason"
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Tell us more..."
                  value={rejectForm.customReason}
                  onChange={(e) => setRejectForm({ ...rejectForm, customReason: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={isRejecting}
              variant="destructive"
            >
              {isRejecting ? 'Declining...' : 'Confirm Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
