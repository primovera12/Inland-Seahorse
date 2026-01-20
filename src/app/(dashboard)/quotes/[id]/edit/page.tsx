'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { CustomerForm, type CustomerAddress } from '@/components/quotes/customer-form'
import { QuoteSummary } from '@/components/quotes/quote-summary'
import { EquipmentBlockCard } from '@/components/quotes/equipment-block-card'
import { calculateMiscFeesTotal } from '@/components/quotes/misc-fees-list'
import { InlandTransportForm, initialInlandTransportData, type InlandTransportData } from '@/components/quotes/inland-transport-form'
import { trpc } from '@/lib/trpc/client'
import { COST_FIELDS, type LocationName, type CostField } from '@/types/equipment'
import type { EquipmentBlock, MiscellaneousFee } from '@/types/quotes'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { Eye, Plus, Loader2, Mail, ArrowLeft, Truck } from 'lucide-react'
import { QuotePDFPreview, buildUnifiedPDFData, type UnifiedPDFData } from '@/lib/pdf'
import { EmailQuoteDialog } from '@/components/quotes/email-quote-dialog'

type CostState = Record<CostField, number>
type EnabledState = Record<CostField, boolean>
type OverrideState = Record<CostField, number | null>

const initialCosts: CostState = COST_FIELDS.reduce(
  (acc, field) => ({ ...acc, [field]: 0 }),
  {} as CostState
)

const initialEnabled: EnabledState = COST_FIELDS.reduce(
  (acc, field) => ({ ...acc, [field]: true }),
  {} as EnabledState
)

const initialOverrides: Record<CostField, number | null> = COST_FIELDS.reduce(
  (acc, field) => ({ ...acc, [field]: null }),
  {} as Record<CostField, number | null>
)

function createEmptyEquipmentBlock(): EquipmentBlock {
  return {
    id: crypto.randomUUID(),
    make_name: '',
    model_name: '',
    location: 'New Jersey',
    quantity: 1,
    costs: initialCosts,
    enabled_costs: initialEnabled,
    cost_overrides: initialOverrides,
    misc_fees: [],
    subtotal: 0,
    misc_fees_total: 0,
    total_with_quantity: 0,
  }
}

export default function EditQuotePage() {
  const params = useParams()
  const router = useRouter()
  const quoteId = params.id as string

  // Loading state
  const [isLoading, setIsLoading] = useState(true)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Multi-equipment mode - always enabled for consistency with new quote page
  const [equipmentBlocks, setEquipmentBlocks] = useState<EquipmentBlock[]>([
    createEmptyEquipmentBlock(),
  ])
  // Equipment state
  const [selectedMakeId, setSelectedMakeId] = useState<string>('')
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [selectedLocation, setSelectedLocation] = useState<LocationName>('New Jersey')
  const [makeName, setMakeName] = useState('')
  const [modelName, setModelName] = useState('')

  // Dimensions
  const [dimensions, setDimensions] = useState({
    length_inches: 0,
    width_inches: 0,
    height_inches: 0,
    weight_lbs: 0,
  })

  // Equipment images
  const [equipmentImages, setEquipmentImages] = useState<{
    frontImageUrl?: string
    sideImageUrl?: string
  }>({})

  // Costs
  const [costs, setCosts] = useState<CostState>(initialCosts)
  const [enabledCosts, setEnabledCosts] = useState<EnabledState>(initialEnabled)
  const [costOverrides, setCostOverrides] = useState<Record<CostField, number | null>>(
    COST_FIELDS.reduce((acc, field) => ({ ...acc, [field]: null }), {} as Record<CostField, number | null>)
  )
  const [descriptionOverrides, setDescriptionOverrides] = useState<Record<CostField, string | null>>(
    COST_FIELDS.reduce((acc, field) => ({ ...acc, [field]: null }), {} as Record<CostField, string | null>)
  )


  // Customer
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerCompany, setCustomerCompany] = useState('')
  const [customerAddress, setCustomerAddress] = useState<CustomerAddress>({
    address: '',
    city: '',
    state: '',
    zip: '',
  })
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedContactId] = useState<string | null>(null)


  // Quote
  const [quoteNumber, setQuoteNumber] = useState('')
  const [notes, setNotes] = useState('')

  // Miscellaneous Fees
  const [miscFees, setMiscFees] = useState<MiscellaneousFee[]>([])

  // Inland Transportation
  const [inlandTransport, setInlandTransport] = useState<InlandTransportData>(initialInlandTransportData)

  // PDF Preview
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [pdfData, setPdfData] = useState<UnifiedPDFData | null>(null)

  // Email dialog
  const [showEmailDialog, setShowEmailDialog] = useState(false)

  // Fetch existing quote data
  const { data: quote, isLoading: isLoadingQuote } = trpc.quotes.getById.useQuery(
    { id: quoteId },
    { enabled: !!quoteId }
  )

  // Fetch settings for quote validity
  const { data: settings } = trpc.settings.get.useQuery()

  // Load quote data into state
  useEffect(() => {
    if (quote && !dataLoaded) {
      // Basic quote info
      setQuoteNumber(quote.quote_number)
      setMakeName(quote.make_name || '')
      setModelName(quote.model_name || '')
      setSelectedLocation(quote.location as LocationName)
      if (quote.make_id) setSelectedMakeId(quote.make_id)
      if (quote.model_id) setSelectedModelId(quote.model_id)

      // Customer info
      setCustomerName(quote.customer_name || '')
      setCustomerEmail(quote.customer_email || '')
      setCustomerPhone(quote.customer_phone || '')
      setCustomerCompany(quote.customer_company || '')
      if (quote.company_id) setSelectedCompanyId(quote.company_id)

      // Parse customer address if stored as string
      if (quote.customer_address) {
        // Try to parse the address string back into components
        const parts = quote.customer_address.split(', ')
        if (parts.length >= 1) {
          setCustomerAddress({
            address: parts[0] || '',
            city: parts[1] || '',
            state: parts[2] || '',
            zip: parts[3] || '',
          })
        }
      }

      // Load quote_data (costs, enabled costs, overrides, misc fees, notes, dimensions, inland)
      const quoteData = quote.quote_data as {
        costs?: CostState
        enabledCosts?: EnabledState
        costOverrides?: Record<CostField, number | null>
        descriptionOverrides?: Record<CostField, string | null>
        miscFees?: MiscellaneousFee[]
        notes?: string
        dimensions?: typeof dimensions
        isMultiEquipment?: boolean
        equipmentBlocks?: EquipmentBlock[]
        inlandTransport?: InlandTransportData
      }

      if (quoteData) {
        // Helper to sanitize cost values
        const sanitizeCost = (value: number | null | undefined): number => {
          if (value === null || value === undefined || isNaN(value)) return 0
          return value
        }

        const sanitizeCosts = (costs: Record<string, number | null | undefined>): Record<string, number> => {
          const result: Record<string, number> = {}
          for (const key of Object.keys(costs)) {
            result[key] = sanitizeCost(costs[key])
          }
          return result
        }

        if (quoteData.costs) setCosts(sanitizeCosts(quoteData.costs) as CostState)
        if (quoteData.enabledCosts) setEnabledCosts(quoteData.enabledCosts)
        // Sanitize cost overrides - convert NaN/undefined/null to null (meaning use base cost)
        if (quoteData.costOverrides) {
          const sanitizedOverrides: Record<string, number | null> = {}
          const overridesObj = quoteData.costOverrides as Record<string, number | null | undefined>
          for (const key of Object.keys(overridesObj)) {
            const val = overridesObj[key]
            sanitizedOverrides[key] = (val === null || val === undefined || isNaN(val as number)) ? null : val
          }
          setCostOverrides(sanitizedOverrides as OverrideState)
        }
        if (quoteData.descriptionOverrides) setDescriptionOverrides(quoteData.descriptionOverrides)
        if (quoteData.miscFees) setMiscFees(quoteData.miscFees)
        if (quoteData.notes) setNotes(quoteData.notes)
        if (quoteData.dimensions) setDimensions(quoteData.dimensions)
        if (quoteData.inlandTransport) setInlandTransport(quoteData.inlandTransport)

        // Helper to sanitize cost overrides - convert NaN/undefined to null
        const sanitizeOverrides = (overrides: Record<string, number | null | undefined>): Record<string, number | null> => {
          const result: Record<string, number | null> = {}
          for (const key of Object.keys(overrides)) {
            const val = overrides[key]
            result[key] = (val === null || val === undefined || isNaN(val as number)) ? null : val
          }
          return result
        }

        // Normalize equipment block to ensure all required fields exist (for migrated quotes)
        const normalizeEquipmentBlock = (block: Partial<EquipmentBlock>): EquipmentBlock => {
          return {
            id: block.id || crypto.randomUUID(),
            make_id: block.make_id,
            model_id: block.model_id,
            make_name: block.make_name || '',
            model_name: block.model_name || '',
            location: block.location || 'New Jersey',
            quantity: block.quantity || 1,
            length_inches: block.length_inches,
            width_inches: block.width_inches,
            height_inches: block.height_inches,
            weight_lbs: block.weight_lbs,
            front_image_url: block.front_image_url,
            side_image_url: block.side_image_url,
            costs: sanitizeCosts(block.costs || {}) as CostState,
            enabled_costs: block.enabled_costs || initialEnabled,
            cost_overrides: sanitizeOverrides(block.cost_overrides || {}) as OverrideState,
            misc_fees: block.misc_fees || [],
            subtotal: sanitizeCost(block.subtotal),
            misc_fees_total: sanitizeCost(block.misc_fees_total),
            total_with_quantity: sanitizeCost(block.total_with_quantity),
          }
        }

        // Load equipment blocks - convert legacy single-equipment quotes to multi-equipment format
        if (quoteData.equipmentBlocks && quoteData.equipmentBlocks.length > 0) {
          // Normalize equipment blocks to ensure all required fields exist
          const normalizedBlocks = (quoteData.equipmentBlocks as Partial<EquipmentBlock>[]).map(normalizeEquipmentBlock)
          setEquipmentBlocks(normalizedBlocks)
        } else if (quote.make_name || quote.model_name) {
          // Convert legacy single-equipment data to equipment block format
          const legacyBlock: EquipmentBlock = {
            id: crypto.randomUUID(),
            make_id: quote.make_id || undefined,
            model_id: quote.model_id || undefined,
            make_name: quote.make_name || '',
            model_name: quote.model_name || '',
            location: quote.location as LocationName,
            quantity: 1,
            costs: sanitizeCosts(quoteData.costs || initialCosts),
            enabled_costs: quoteData.enabledCosts || initialEnabled,
            cost_overrides: sanitizeOverrides(quoteData.costOverrides || initialOverrides),
            misc_fees: quoteData.miscFees || [],
            subtotal: sanitizeCost(quote.subtotal) || 0,
            misc_fees_total: 0,
            total_with_quantity: sanitizeCost(quote.total) || 0,
          }
          setEquipmentBlocks([legacyBlock])
        }
      }

      setDataLoaded(true)
      setIsLoading(false)
    }
  }, [quote, dataLoaded])

  // Update loading state
  useEffect(() => {
    if (!isLoadingQuote && !quote) {
      setIsLoading(false)
    }
  }, [isLoadingQuote, quote])

  // Fetch rates when model and location change (only if model changed after initial load)
  const { data: rates } = trpc.equipment.getRates.useQuery(
    { modelId: selectedModelId, location: selectedLocation },
    { enabled: !!selectedModelId && dataLoaded }
  )

  // Fetch dimensions when model changes
  const { data: modelDimensions } = trpc.equipment.getDimensions.useQuery(
    { modelId: selectedModelId },
    { enabled: !!selectedModelId && dataLoaded }
  )

  // Update costs when rates change (only after initial load)
  useEffect(() => {
    if (rates && dataLoaded) {
      const newCosts: CostState = {} as CostState
      COST_FIELDS.forEach((field) => {
        newCosts[field] = rates[field] || 0
      })
      setCosts(newCosts)
    }
  }, [rates, dataLoaded])

  // Update dimensions when model changes (only after initial load)
  useEffect(() => {
    if (modelDimensions && dataLoaded) {
      setDimensions({
        length_inches: modelDimensions.length_inches,
        width_inches: modelDimensions.width_inches,
        height_inches: modelDimensions.height_inches,
        weight_lbs: modelDimensions.weight_lbs,
      })
      // Set equipment images if available
      setEquipmentImages({
        frontImageUrl: modelDimensions.front_image_url || undefined,
        sideImageUrl: modelDimensions.side_image_url || undefined,
      })
    }
  }, [modelDimensions, dataLoaded])

  // Equipment block management functions
  const addEquipmentBlock = () => {
    setEquipmentBlocks((prev) => [...prev, createEmptyEquipmentBlock()])
  }

  const updateEquipmentBlock = (blockId: string, updates: Partial<EquipmentBlock>) => {
    setEquipmentBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId ? { ...block, ...updates } : block
      )
    )
  }

  const removeEquipmentBlock = (blockId: string) => {
    setEquipmentBlocks((prev) => prev.filter((block) => block.id !== blockId))
  }

  const duplicateEquipmentBlock = (blockId: string) => {
    setEquipmentBlocks((prev) => {
      const blockToDuplicate = prev.find((b) => b.id === blockId)
      if (!blockToDuplicate) return prev
      const newBlock: EquipmentBlock = {
        ...blockToDuplicate,
        id: crypto.randomUUID(),
      }
      const index = prev.findIndex((b) => b.id === blockId)
      const newBlocks = [...prev]
      newBlocks.splice(index + 1, 0, newBlock)
      return newBlocks
    })
  }

  // Calculate multi-equipment total
  const multiEquipmentSubtotal = equipmentBlocks.reduce(
    (sum, block) => sum + block.total_with_quantity,
    0
  )
  const multiEquipmentTotal = multiEquipmentSubtotal

  // Calculate totals
  const costsSubtotal = COST_FIELDS.reduce((total, field) => {
    if (!enabledCosts[field]) return total
    const cost = costOverrides[field] ?? costs[field]
    return total + cost
  }, 0)

  const miscFeesTotal = calculateMiscFeesTotal(miscFees, costsSubtotal)
  const inlandTransportCost = inlandTransport.enabled ? inlandTransport.transport_cost : 0
  const subtotal = costsSubtotal + miscFeesTotal + inlandTransportCost
  const total = subtotal

  // Helper to get full address string
  const getFullAddressString = (addr: CustomerAddress): string | undefined => {
    const parts = [addr.address, addr.city, addr.state, addr.zip].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : undefined
  }

  // Calculate quote expiration date based on settings
  const getExpirationDate = useMemo(() => {
    const validityDays = settings?.quote_validity_days || 30
    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() + validityDays)
    return formatDate(expirationDate)
  }, [settings?.quote_validity_days])

  // Build PDF data object using settings
  const buildPdfDataFromState = useCallback((): UnifiedPDFData | null => {
    if (!settings) return null

    return buildUnifiedPDFData({
      quoteNumber,
      quoteType: 'dismantle',
      customerName: customerName || 'N/A',
      customerEmail: customerEmail || undefined,
      customerPhone: customerPhone || undefined,
      customerCompany: customerCompany || undefined,
      customerAddress,
      makeName: makeName || 'Custom',
      modelName: modelName || 'Equipment',
      location: selectedLocation,
      dimensions,
      frontImageUrl: equipmentImages.frontImageUrl,
      sideImageUrl: equipmentImages.sideImageUrl,
      costs,
      enabledCosts,
      costOverrides,
      miscFees,
      isMultiEquipment: true,
      equipmentBlocks,
      inlandTransport: inlandTransport.enabled ? {
        enabled: true,
        pickup_address: inlandTransport.pickup_address,
        pickup_city: inlandTransport.pickup_city,
        pickup_state: inlandTransport.pickup_state,
        pickup_zip: inlandTransport.pickup_zip,
        dropoff_address: inlandTransport.dropoff_address,
        dropoff_city: inlandTransport.dropoff_city,
        dropoff_state: inlandTransport.dropoff_state,
        dropoff_zip: inlandTransport.dropoff_zip,
        transport_cost: inlandTransport.transport_cost,
        distance_miles: inlandTransport.distance_miles,
        duration_minutes: inlandTransport.duration_minutes,
        static_map_url: inlandTransport.static_map_url,
      } : undefined,
      subtotal: multiEquipmentSubtotal + inlandTransportCost,
      total: multiEquipmentTotal + inlandTransportCost,
      inlandTransportCost,
      miscFeesTotal,
      notes: notes || undefined,
      settings: {
        company_name: settings.company_name,
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
        terms_dismantle: settings.terms_dismantle,
        terms_inland: settings.terms_inland,
        quote_validity_days: settings.quote_validity_days,
      },
    })
  }, [
    settings, quoteNumber, customerName, customerEmail, customerPhone, customerCompany, customerAddress,
    makeName, modelName, selectedLocation, dimensions, equipmentImages, costs, enabledCosts,
    costOverrides, miscFees, equipmentBlocks, inlandTransport, inlandTransportCost,
    multiEquipmentSubtotal, multiEquipmentTotal, miscFeesTotal, notes
  ])

  // Generate PDF preview
  const handlePreviewPdf = useCallback(() => {
    const data = buildPdfDataFromState()
    if (data) {
      setPdfData(data)
      setShowPdfPreview(true)
    } else {
      toast.error('Please wait for settings to load')
    }
  }, [buildPdfDataFromState])

  // Update quote mutation
  const updateQuote = trpc.quotes.update.useMutation({
    onSuccess: () => {
      toast.success('Quote updated successfully')
      router.push('/quotes/history')
    },
    onError: (error) => {
      toast.error(`Failed to update quote: ${error.message}`)
    },
  })

  const handleUpdateQuote = () => {
    if (!customerName) {
      toast.error('Please enter a customer name')
      return
    }
    if (!selectedModelId && !modelName) {
      toast.error('Please select equipment')
      return
    }

    updateQuote.mutate({
      id: quoteId,
      data: {
        customer_name: customerName,
        customer_email: customerEmail || undefined,
        customer_phone: customerPhone || undefined,
        customer_company: customerCompany || undefined,
        customer_address: getFullAddressString(customerAddress),
        company_id: selectedCompanyId || undefined,
        contact_id: selectedContactId || undefined,
        make_id: selectedMakeId || undefined,
        model_id: selectedModelId || undefined,
        make_name: makeName,
        model_name: modelName,
        location: selectedLocation,
        subtotal,
        total,
        quote_data: {
          costs,
          enabledCosts,
          costOverrides,
          descriptionOverrides,
          miscFees,
          dimensions,
          notes,
          isMultiEquipment: true,
          equipmentBlocks,
          inlandTransport: inlandTransport.enabled ? inlandTransport : undefined,
        },
      },
    })
  }

  if (isLoading || isLoadingQuote) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Quote not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/quotes/history')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to History
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="icon" onClick={() => router.push('/quotes/history')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Edit Quote</h1>
          </div>
          <p className="text-muted-foreground ml-10">
            Quote #{quoteNumber}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="icon" onClick={handlePreviewPdf} title="Preview PDF">
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowEmailDialog(true)}
            title="Send via Email"
          >
            <Mail className="h-4 w-4" />
          </Button>
          <Button onClick={handleUpdateQuote} disabled={updateQuote.isPending}>
            {updateQuote.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* PDF Preview Modal */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-6xl h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Quote Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto">
            {pdfData && (
              <QuotePDFPreview data={pdfData} showControls />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="customer" className="w-full">
            <TabsList className="w-full flex overflow-x-auto no-scrollbar">
              <TabsTrigger value="customer" className="flex-1 min-w-[80px]">Customer</TabsTrigger>
              <TabsTrigger value="equipment" className="flex-1 min-w-[80px]">Equipment</TabsTrigger>
              <TabsTrigger value="inland" className="flex-1 min-w-[80px] flex items-center justify-center gap-1">
                <Truck className="h-3 w-3 hidden sm:inline" />
                <span>Inland{inlandTransport.enabled ? ' *' : ''}</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex-1 min-w-[80px] flex items-center justify-center gap-1">
                <Eye className="h-3 w-3 hidden sm:inline" />
                <span>Preview</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="equipment" className="mt-4 space-y-4">
              {/* Equipment Blocks - Multi-Equipment Mode is always active */}
              <div className="space-y-4">
                {equipmentBlocks.map((block, index) => (
                  <EquipmentBlockCard
                    key={block.id}
                    block={block}
                    index={index}
                    onUpdate={(updatedBlock) => updateEquipmentBlock(block.id, updatedBlock)}
                    onRemove={() => removeEquipmentBlock(block.id)}
                    onDuplicate={() => duplicateEquipmentBlock(block.id)}
                    canRemove={equipmentBlocks.length > 1}
                  />
                ))}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={addEquipmentBlock}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Equipment
                </Button>
              </div>

              {/* Quote Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Quote Notes</CardTitle>
                  <CardDescription>
                    Additional notes to include in the quote
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <textarea
                      id="notes"
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Additional notes for this quote..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customer" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                  <CardDescription>
                    Enter customer details or select from existing companies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CustomerForm
                    customerName={customerName}
                    customerEmail={customerEmail}
                    customerPhone={customerPhone}
                    customerCompany={customerCompany}
                    customerAddress={customerAddress}
                    onCustomerNameChange={setCustomerName}
                    onCustomerEmailChange={setCustomerEmail}
                    onCustomerPhoneChange={setCustomerPhone}
                    onCustomerCompanyChange={setCustomerCompany}
                    onCustomerAddressChange={setCustomerAddress}
                    onCompanySelect={(id, name) => {
                      setSelectedCompanyId(id)
                      setCustomerCompany(name)
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inland" className="mt-4">
              <InlandTransportForm
                data={inlandTransport}
                onChange={setInlandTransport}
              />
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Quote Preview</CardTitle>
                  <CardDescription>
                    Preview how the quote will appear to the customer
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {settings ? (
                    <QuotePDFPreview
                      data={buildUnifiedPDFData({
                        quoteNumber,
                        quoteType: 'dismantle',
                        customerName: customerName || 'N/A',
                        customerEmail: customerEmail || undefined,
                        customerPhone: customerPhone || undefined,
                        customerCompany: customerCompany || undefined,
                        customerAddress,
                        makeName: makeName || 'Custom',
                        modelName: modelName || 'Equipment',
                        location: selectedLocation,
                        dimensions,
                        frontImageUrl: equipmentImages.frontImageUrl,
                        sideImageUrl: equipmentImages.sideImageUrl,
                        costs,
                        enabledCosts,
                        costOverrides,
                        miscFees,
                        isMultiEquipment: true,
                        equipmentBlocks,
                        inlandTransport: inlandTransport.enabled ? {
                          enabled: true,
                          pickup_address: inlandTransport.pickup_address,
                          pickup_city: inlandTransport.pickup_city,
                          pickup_state: inlandTransport.pickup_state,
                          pickup_zip: inlandTransport.pickup_zip,
                          dropoff_address: inlandTransport.dropoff_address,
                          dropoff_city: inlandTransport.dropoff_city,
                          dropoff_state: inlandTransport.dropoff_state,
                          dropoff_zip: inlandTransport.dropoff_zip,
                          transport_cost: inlandTransport.transport_cost,
                          distance_miles: inlandTransport.distance_miles,
                          duration_minutes: inlandTransport.duration_minutes,
                          static_map_url: inlandTransport.static_map_url,
                        } : undefined,
                        subtotal: multiEquipmentSubtotal + inlandTransportCost,
                        total: multiEquipmentTotal + inlandTransportCost,
                        inlandTransportCost,
                        miscFeesTotal,
                        notes: notes || undefined,
                        settings: {
                          company_name: settings.company_name,
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
                          terms_dismantle: settings.terms_dismantle,
                          terms_inland: settings.terms_inland,
                          quote_validity_days: settings.quote_validity_days,
                        },
                      })}
                      showControls
                    />
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <QuoteSummary
            makeName={`${equipmentBlocks.length} Equipment Items`}
            modelName=""
            location="Multiple"
            subtotal={multiEquipmentSubtotal + inlandTransportCost}
            total={multiEquipmentTotal + inlandTransportCost}
            equipmentBlocks={equipmentBlocks}
            costsSubtotal={multiEquipmentSubtotal}
            miscFeesTotal={0}
            inlandTransportCost={inlandTransportCost}
          />

        </div>
      </div>

      {/* Email Quote Dialog */}
      <EmailQuoteDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        quoteId={quoteId}
        quoteType="dismantle"
        quoteNumber={quoteNumber}
        customerName={customerName || undefined}
        customerEmail={customerEmail || undefined}
      />
    </div>
  )
}
