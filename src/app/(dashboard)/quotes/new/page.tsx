'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { EquipmentSelector } from '@/components/quotes/equipment-selector'
import { CustomerForm, type CustomerAddress } from '@/components/quotes/customer-form'
import { CostBreakdown } from '@/components/quotes/cost-breakdown'
import { QuoteSummary } from '@/components/quotes/quote-summary'
import { EquipmentBlockCard } from '@/components/quotes/equipment-block-card'
import { MiscFeesList, calculateMiscFeesTotal } from '@/components/quotes/misc-fees-list'
import { InlandTransportForm, initialInlandTransportData, type InlandTransportData, type EquipmentDimensions } from '@/components/quotes/inland-transport-form'
import { trpc } from '@/lib/trpc/client'
import { COST_FIELDS, type LocationName, type CostField } from '@/types/equipment'
import type { EquipmentBlock, MiscellaneousFee } from '@/types/quotes'
import { generateQuoteNumber, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { Eye, Plus, Layers, Loader2, Mail, Save, Trash2, FolderOpen, Truck } from 'lucide-react'
import { QuotePDFPreview, buildUnifiedPDFData, type UnifiedPDFData } from '@/lib/pdf'
import { EmailQuoteDialog } from '@/components/quotes/email-quote-dialog'
import { useAutoSave } from '@/hooks/use-auto-save'
import { AutoSaveIndicator } from '@/components/ui/auto-save-indicator'

type CostState = Record<CostField, number>
type EnabledState = Record<CostField, boolean>

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
    // No default location - user must select one to load rates
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

export default function NewQuotePage() {
  // Multi-equipment mode - always enabled by default
  const [isMultiEquipment, setIsMultiEquipment] = useState(true)
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

  // Email & Template dialogs
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null)

  // Draft management
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)

  // Auto-save draft data
  const draftData = useMemo(() => ({
    quoteNumber,
    isMultiEquipment,
    equipmentBlocks,
    selectedMakeId,
    selectedModelId,
    selectedLocation,
    makeName,
    modelName,
    dimensions,
    costs,
    enabledCosts,
    costOverrides,
    descriptionOverrides,
    customerName,
    customerEmail,
    customerPhone,
    customerCompany,
    customerAddress,
    notes,
    miscFees,
    inlandTransport,
  }), [
    quoteNumber, isMultiEquipment, equipmentBlocks, selectedMakeId, selectedModelId,
    selectedLocation, makeName, modelName, dimensions, costs, enabledCosts, costOverrides,
    descriptionOverrides, customerName, customerEmail, customerPhone,
    customerCompany, customerAddress, notes, miscFees, inlandTransport
  ])

  // Save draft mutation
  const saveDraftMutation = trpc.quotes.saveDraft.useMutation()

  // Get existing draft
  const { data: existingDraft } = trpc.quotes.getDraft.useQuery(undefined, {
    enabled: !draftLoaded,
  })

  // Delete draft mutation
  const deleteDraftMutation = trpc.quotes.deleteDraft.useMutation({
    onSuccess: () => {
      setHasDraft(false)
      toast.success('Draft discarded')
    },
  })

  // Load draft data on mount
  useEffect(() => {
    if (existingDraft && !draftLoaded) {
      const data = existingDraft.quote_data as typeof draftData
      if (data) {
        // Load all the draft data into state
        if (data.quoteNumber) setQuoteNumber(data.quoteNumber)
        if (data.isMultiEquipment !== undefined) setIsMultiEquipment(data.isMultiEquipment)
        if (data.equipmentBlocks) setEquipmentBlocks(data.equipmentBlocks)
        if (data.selectedMakeId) setSelectedMakeId(data.selectedMakeId)
        if (data.selectedModelId) setSelectedModelId(data.selectedModelId)
        if (data.selectedLocation) setSelectedLocation(data.selectedLocation)
        if (data.makeName) setMakeName(data.makeName)
        if (data.modelName) setModelName(data.modelName)
        if (data.dimensions) setDimensions(data.dimensions)
        if (data.costs) setCosts(data.costs)
        if (data.enabledCosts) setEnabledCosts(data.enabledCosts)
        if (data.costOverrides) setCostOverrides(data.costOverrides)
        if (data.descriptionOverrides) setDescriptionOverrides(data.descriptionOverrides)
        if (data.customerName) setCustomerName(data.customerName)
        if (data.customerEmail) setCustomerEmail(data.customerEmail)
        if (data.customerPhone) setCustomerPhone(data.customerPhone)
        if (data.customerCompany) setCustomerCompany(data.customerCompany)
        if (data.customerAddress) setCustomerAddress(data.customerAddress)
        if (data.notes) setNotes(data.notes)
        if (data.miscFees) setMiscFees(data.miscFees)
        if (data.inlandTransport) setInlandTransport(data.inlandTransport)

        setHasDraft(true)
        toast.info('Draft loaded', { description: 'Your previous draft has been restored' })
      }
      setDraftLoaded(true)
    } else if (!existingDraft && !draftLoaded) {
      setDraftLoaded(true)
    }
  }, [existingDraft, draftLoaded])

  // Handle discard draft
  const handleDiscardDraft = () => {
    if (confirm('Are you sure you want to discard this draft? All changes will be lost.')) {
      // Reset all state to defaults
      setQuoteNumber(generateQuoteNumber())
      setIsMultiEquipment(true)
      setEquipmentBlocks([createEmptyEquipmentBlock()])
      setSelectedMakeId('')
      setSelectedModelId('')
      setSelectedLocation('New Jersey')
      setMakeName('')
      setModelName('')
      setDimensions({ length_inches: 0, width_inches: 0, height_inches: 0, weight_lbs: 0 })
      setCosts(initialCosts)
      setEnabledCosts(initialEnabled)
      setCostOverrides(initialOverrides)
      setDescriptionOverrides(COST_FIELDS.reduce((acc, field) => ({ ...acc, [field]: null }), {} as Record<CostField, string | null>))
      setCustomerName('')
      setCustomerEmail('')
      setCustomerPhone('')
      setCustomerCompany('')
      setCustomerAddress({ address: '', city: '', state: '', zip: '' })
      setNotes('')
      setMiscFees([])
      setInlandTransport(initialInlandTransportData)

      deleteDraftMutation.mutate()
    }
  }

  // Auto-save hook
  const autoSave = useAutoSave({
    data: draftData,
    onSave: async (data) => {
      await saveDraftMutation.mutateAsync({ quote_data: data })
    },
    debounceMs: 3000,
    enabled: true,
  })

  // Generate quote number on mount
  useEffect(() => {
    setQuoteNumber(generateQuoteNumber())
  }, [])

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

  // Fetch rates when model and location change
  const { data: rates } = trpc.equipment.getRates.useQuery(
    { modelId: selectedModelId, location: selectedLocation },
    { enabled: !!selectedModelId }
  )

  // Fetch dimensions when model changes
  const { data: modelDimensions } = trpc.equipment.getDimensions.useQuery(
    { modelId: selectedModelId },
    { enabled: !!selectedModelId }
  )

  // Fetch settings for quote validity and other defaults
  const { data: settings } = trpc.settings.get.useQuery()

  // Update costs when rates change
  useEffect(() => {
    if (rates) {
      const newCosts: CostState = {} as CostState
      COST_FIELDS.forEach((field) => {
        newCosts[field] = rates[field] || 0
      })
      setCosts(newCosts)
    }
  }, [rates])

  // Update dimensions when model changes
  useEffect(() => {
    if (modelDimensions) {
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
  }, [modelDimensions])

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
      isMultiEquipment,
      equipmentBlocks: isMultiEquipment ? equipmentBlocks : undefined,
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
      subtotal: isMultiEquipment ? multiEquipmentSubtotal + inlandTransportCost : subtotal,
      total: isMultiEquipment ? multiEquipmentTotal + inlandTransportCost : total,
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
    costOverrides, miscFees, isMultiEquipment, equipmentBlocks, inlandTransport, inlandTransportCost,
    subtotal, total, multiEquipmentSubtotal, multiEquipmentTotal, miscFeesTotal, notes
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

  // TRPC utils for cache invalidation
  const utils = trpc.useUtils()

  // Save quote mutation
  const createQuote = trpc.quotes.create.useMutation({
    onSuccess: (data) => {
      toast.success('Quote created successfully', {
        description: 'Quote saved to history.',
        action: {
          label: 'View History',
          onClick: () => window.location.href = '/quotes/history',
        },
      })
      if (data?.id) {
        setSavedQuoteId(data.id)
      }
      // Clear the draft after successful quote creation
      deleteDraftMutation.mutate()
      setHasDraft(false)
      // Invalidate the quotes history cache so new quotes appear immediately
      utils.quotes.getHistory.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to create quote: ${error.message}`)
    },
  })

  // Save as template mutation
  const saveTemplate = trpc.templates.create.useMutation({
    onSuccess: () => {
      toast.success('Template saved successfully')
    },
    onError: (error) => {
      toast.error(`Failed to save template: ${error.message}`)
    },
  })

  const handleSaveAsTemplate = () => {
    const templateName = `${makeName || 'Custom'} ${modelName || 'Equipment'} - ${selectedLocation}`
    saveTemplate.mutate({
      name: templateName,
      description: `Quote template for ${makeName} ${modelName}`,
      template_type: 'dismantle',
      template_data: {
        selectedLocation,
        costs,
        enabledCosts,
        costOverrides,
      },
    })
  }

  const handleSaveQuote = () => {
    if (!customerName) {
      toast.error('Please enter a customer name')
      return
    }
    if (!selectedModelId && !modelName) {
      toast.error('Please select equipment')
      return
    }

    createQuote.mutate({
      quote_number: quoteNumber,
      status: 'draft',
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
        miscFees,
        dimensions,
        notes,
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">New Quote</h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <p className="text-sm sm:text-base text-muted-foreground">
                Quote #{quoteNumber}
              </p>
              {hasDraft && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 px-2 py-1 rounded-full">
                  <FolderOpen className="h-3 w-3" />
                  Draft Restored
                </span>
              )}
              <AutoSaveIndicator
                status={autoSave.status}
                lastSaved={autoSave.lastSaved}
                error={autoSave.error}
              />
            </div>
          </div>
          <Button onClick={handleSaveQuote} disabled={createQuote.isPending} className="w-full sm:w-auto">
            {createQuote.isPending ? 'Saving...' : 'Create Quote'}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="outline" size="icon" onClick={handlePreviewPdf} title="Preview PDF">
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowEmailDialog(true)}
            title="Send via Email"
            disabled={!savedQuoteId}
          >
            <Mail className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleSaveAsTemplate}
            title="Save as Template"
            disabled={saveTemplate.isPending}
          >
            <Save className="h-4 w-4" />
          </Button>
          {hasDraft && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleDiscardDraft}
              title="Discard Draft"
              disabled={deleteDraftMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
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
                    notes={notes}
                    onNotesChange={setNotes}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inland" className="mt-4">
              <InlandTransportForm
                data={inlandTransport}
                onChange={setInlandTransport}
                equipmentDimensions={
                  isMultiEquipment
                    ? equipmentBlocks
                        .filter(b => b.make_name || b.model_name)
                        .map(b => ({
                          length_inches: b.length_inches || 0,
                          width_inches: b.width_inches || 0,
                          height_inches: b.height_inches || 0,
                          weight_lbs: (b.weight_lbs || 0) * (b.quantity || 1),
                          name: `${b.make_name} ${b.model_name}`.trim(),
                        }))
                    : dimensions.length_inches || dimensions.width_inches || dimensions.height_inches || dimensions.weight_lbs
                      ? [{
                          length_inches: dimensions.length_inches,
                          width_inches: dimensions.width_inches,
                          height_inches: dimensions.height_inches,
                          weight_lbs: dimensions.weight_lbs,
                          name: `${makeName} ${modelName}`.trim(),
                        }]
                      : undefined
                }
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
                        isMultiEquipment,
                        equipmentBlocks: isMultiEquipment ? equipmentBlocks : undefined,
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
                        subtotal: isMultiEquipment ? multiEquipmentSubtotal + inlandTransportCost : subtotal,
                        total: isMultiEquipment ? multiEquipmentTotal + inlandTransportCost : total,
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
            makeName={isMultiEquipment ? `${equipmentBlocks.length} Equipment Items` : makeName}
            modelName={isMultiEquipment ? '' : modelName}
            location={isMultiEquipment ? 'Multiple' : selectedLocation}
            subtotal={isMultiEquipment ? multiEquipmentSubtotal + inlandTransportCost : subtotal}
            total={isMultiEquipment ? multiEquipmentTotal + inlandTransportCost : total}
            equipmentBlocks={isMultiEquipment ? equipmentBlocks : undefined}
            costsSubtotal={isMultiEquipment ? multiEquipmentSubtotal : costsSubtotal}
            miscFeesTotal={isMultiEquipment ? 0 : miscFeesTotal}
            inlandTransportCost={inlandTransportCost}
          />

        </div>
      </div>

      {/* Email Quote Dialog */}
      <EmailQuoteDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        quoteId={savedQuoteId || ''}
        quoteType="dismantle"
        quoteNumber={quoteNumber}
        customerName={customerName || undefined}
        customerEmail={customerEmail || undefined}
      />
    </div>
  )
}
