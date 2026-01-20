'use client'

import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { toast } from 'sonner'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { SignaturePad } from '@/components/ui/signature-pad'
import { QuotePDFTemplate, settingsToCompanyInfo, buildUnifiedPDFData } from '@/lib/pdf'
import type { UnifiedPDFData, InlandTransportInfo } from '@/lib/pdf'

type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired'

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

  // Transform quote data to UnifiedPDFData for rendering
  const pdfData = useMemo((): UnifiedPDFData | null => {
    if (!quote || !quote.company_settings) return null

    const settings = quote.company_settings
    const quoteData = quote.quote_data as Record<string, unknown> | null

    // Build company info from settings
    const companyInfo = settingsToCompanyInfo({
      company_name: settings.company_name || 'Company',
      company_logo_url: settings.company_logo_url,
      logo_size_percentage: settings.logo_size_percentage,
      company_address: settings.company_address,
      company_city: settings.company_city,
      company_state: settings.company_state,
      company_zip: settings.company_zip,
      company_phone: settings.company_phone,
      company_email: settings.company_email,
      company_website: settings.company_website,
      primary_color: settings.primary_color,
      secondary_color: settings.secondary_color,
    })

    if (quoteType === 'inland') {
      // Inland quote transformation
      const destinationBlocks = quoteData?.destinationBlocks as Array<{
        id: string
        label: string
        pickup_address: string
        pickup_city: string
        pickup_state: string
        pickup_zip: string
        dropoff_address: string
        dropoff_city: string
        dropoff_state: string
        dropoff_zip: string
        distance_miles?: number
        static_map_url?: string
        load_blocks: Array<{
          id: string
          truck_type_id: string
          truck_type_name: string
          cargo_items?: Array<{
            id: string
            description: string
            quantity: number
            length_inches: number
            width_inches: number
            height_inches: number
            weight_lbs: number
            is_oversize?: boolean
            is_overweight?: boolean
            is_equipment?: boolean
            equipment_make_name?: string
            equipment_model_name?: string
            custom_make_name?: string
            custom_model_name?: string
            image_url?: string
            front_image_url?: string
            side_image_url?: string
          }>
          service_items: Array<{
            id: string
            name: string
            rate: number
            quantity: number
            total: number
          }>
          accessorial_charges: Array<{
            id: string
            name: string
            billing_unit: string
            rate: number
            quantity: number
            total: number
          }>
          subtotal: number
          accessorials_total?: number
        }>
        subtotal: number
        accessorials_total?: number
      }> | undefined

      // Build inland transport info
      const inlandTransport: InlandTransportInfo = {
        enabled: true,
        pickup: {
          address: (quote as { origin_address?: string }).origin_address || '',
          city: (quote as { origin_city?: string }).origin_city || '',
          state: (quote as { origin_state?: string }).origin_state || '',
          zip: (quote as { origin_zip?: string }).origin_zip || '',
        },
        dropoff: {
          address: (quote as { destination_address?: string }).destination_address || '',
          city: (quote as { destination_city?: string }).destination_city || '',
          state: (quote as { destination_state?: string }).destination_state || '',
          zip: (quote as { destination_zip?: string }).destination_zip || '',
        },
        distance_miles: (quote as { distance_miles?: number }).distance_miles,
        static_map_url: quoteData?.static_map_url as string | undefined,
        total: quote.total || 0,
        accessorials_total: quoteData?.accessorials_total as number | undefined,
        destinationBlocks: destinationBlocks?.map(dest => ({
          id: dest.id,
          label: dest.label,
          pickup_address: dest.pickup_address,
          pickup_city: dest.pickup_city,
          pickup_state: dest.pickup_state,
          pickup_zip: dest.pickup_zip,
          dropoff_address: dest.dropoff_address,
          dropoff_city: dest.dropoff_city,
          dropoff_state: dest.dropoff_state,
          dropoff_zip: dest.dropoff_zip,
          distance_miles: dest.distance_miles,
          static_map_url: dest.static_map_url,
          load_blocks: dest.load_blocks.map(lb => ({
            id: lb.id,
            truck_type_id: lb.truck_type_id,
            truck_type_name: lb.truck_type_name,
            cargo_items: lb.cargo_items || [],
            service_items: lb.service_items,
            accessorial_charges: lb.accessorial_charges,
            subtotal: lb.subtotal,
            accessorials_total: lb.accessorials_total || 0,
          })),
          subtotal: dest.subtotal,
          accessorials_total: dest.accessorials_total,
        })) as InlandTransportInfo['destinationBlocks'],
      }

      return {
        quoteType: 'inland',
        quoteNumber: quote.quote_number || '',
        issueDate: new Date(quote.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        validUntil: quote.expires_at
          ? new Date(quote.expires_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : undefined,
        company: companyInfo,
        customer: {
          name: quote.customer_name || 'Customer',
          company: quote.customer_company,
          email: quote.customer_email,
          phone: quote.customer_phone,
        },
        equipment: [],
        isMultiEquipment: false,
        inlandTransport,
        equipmentSubtotal: 0,
        miscFeesTotal: 0,
        inlandTotal: quote.total || 0,
        grandTotal: quote.total || 0,
        customerNotes: quoteData?.notes as string | undefined,
        termsAndConditions: (settings as { quote_terms?: string }).quote_terms,
      }
    } else {
      // Dismantle quote transformation
      const equipmentBlocks = quoteData?.equipmentBlocks as Array<{
        id: string
        make_name: string
        model_name: string
        location?: string
        quantity: number
        length_inches?: number
        width_inches?: number
        height_inches?: number
        weight_lbs?: number
        front_image_url?: string
        side_image_url?: string
        costs: Record<string, number>
        enabled_costs: Record<string, boolean>
        cost_overrides: Record<string, number | null>
        cost_descriptions?: Record<string, string>
        misc_fees?: Array<{
          id: string
          title: string
          description?: string
          amount: number
          is_percentage: boolean
        }>
        subtotal: number
        misc_fees_total?: number
        total_with_quantity: number
      }> | undefined

      // Parse customer address if available
      const customerAddress = quote.customer_address
        ? parseAddress(quote.customer_address as string)
        : undefined

      const pdfResult = buildUnifiedPDFData({
        quoteNumber: quote.quote_number || '',
        quoteType: 'dismantle',
        customerName: quote.customer_name || 'Customer',
        customerEmail: quote.customer_email,
        customerPhone: quote.customer_phone,
        customerCompany: quote.customer_company,
        customerAddress,
        makeName: quote.make_name || 'Equipment',
        modelName: quote.model_name || '',
        location: quote.location,
        dimensions: quoteData?.dimensions ? {
          length_inches: (quoteData.dimensions as { length_inches?: number }).length_inches || 0,
          width_inches: (quoteData.dimensions as { width_inches?: number }).width_inches || 0,
          height_inches: (quoteData.dimensions as { height_inches?: number }).height_inches || 0,
          weight_lbs: (quoteData.dimensions as { weight_lbs?: number }).weight_lbs || 0,
        } : undefined,
        frontImageUrl: quoteData?.frontImageUrl as string | undefined,
        sideImageUrl: quoteData?.sideImageUrl as string | undefined,
        costs: quoteData?.costs as Record<string, number> | undefined,
        enabledCosts: quoteData?.enabledCosts as Record<string, boolean> | undefined,
        costOverrides: quoteData?.costOverrides as Record<string, number | null> | undefined,
        costDescriptions: quoteData?.costDescriptions as Record<string, string> | undefined,
        miscFees: quoteData?.miscFees as Array<{ id: string; title: string; description?: string; amount: number; is_percentage: boolean }> | undefined,
        isMultiEquipment: quoteData?.isMultiEquipment as boolean | undefined ?? (equipmentBlocks && equipmentBlocks.length > 0),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        equipmentBlocks: equipmentBlocks as any,
        inlandTransport: quoteData?.inlandTransport as {
          enabled: boolean
          pickup_address?: string
          pickup_city?: string
          pickup_state?: string
          pickup_zip?: string
          dropoff_address?: string
          dropoff_city?: string
          dropoff_state?: string
          dropoff_zip?: string
          transport_cost?: number
          distance_miles?: number
          duration_minutes?: number
          static_map_url?: string
        } | undefined,
        subtotal: quote.subtotal || 0,
        total: quote.total || 0,
        inlandTransportCost: quoteData?.inlandTransport ? (quoteData.inlandTransport as { transport_cost?: number }).transport_cost : undefined,
        miscFeesTotal: quoteData?.miscFeesTotal as number | undefined,
        notes: quoteData?.notes as string | undefined,
        settings: {
          company_name: settings.company_name || 'Company',
          company_logo_url: settings.company_logo_url,
          logo_size_percentage: settings.logo_size_percentage,
          company_address: settings.company_address,
          company_city: settings.company_city,
          company_state: settings.company_state,
          company_zip: settings.company_zip,
          company_phone: settings.company_phone,
          company_email: settings.company_email,
          company_website: settings.company_website,
          primary_color: settings.primary_color,
          secondary_color: settings.secondary_color,
          quote_validity_days: settings.quote_validity_days || 30,
          terms_dismantle: (settings as { terms_dismantle?: string }).terms_dismantle,
        },
      })

      // Override validUntil with the actual stored expiration date
      if (quote.expires_at) {
        pdfResult.validUntil = new Date(quote.expires_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      }

      return pdfResult
    }
  }, [quote, quoteType])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container max-w-5xl mx-auto py-12 px-4">
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
  const isExpired = status === 'expired' || (quote.expires_at && new Date(quote.expires_at) < new Date())
  const canRespond = status === 'sent' || status === 'viewed'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Status Banners */}
      <div className="container max-w-5xl mx-auto pt-8 px-4">
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
      </div>

      {/* Full Quote Template */}
      {pdfData ? (
        <QuotePDFTemplate data={pdfData} />
      ) : (
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Unable to load quote details.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      {canRespond && !isExpired && (
        <div className="container max-w-5xl mx-auto pb-12 px-4">
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
        </div>
      )}

      {/* Footer */}
      <div className="text-center pb-8 text-sm text-muted-foreground">
        <p>Questions about this quote?</p>
        <p>Please contact us for assistance.</p>
      </div>
    </div>
  )
}

// Helper function to parse address string
function parseAddress(address: string): { address?: string; city?: string; state?: string; zip?: string } {
  const parts = address.split(', ')
  return {
    address: parts[0] || undefined,
    city: parts[1] || undefined,
    state: parts[2] || undefined,
    zip: parts[3] || undefined,
  }
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
