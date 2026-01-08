'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
import { trpc } from '@/lib/trpc/client'
import { COST_FIELDS, type LocationName, type CostField } from '@/types/equipment'
import type { EquipmentBlock, MiscellaneousFee } from '@/types/quotes'
import { generateQuoteNumber, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { FileDown, Eye, Plus, Layers, MonitorPlay, Loader2, Mail, Save, Trash2, FolderOpen } from 'lucide-react'
import { downloadQuotePDF, getQuotePDFDataUrl, type QuotePDFData } from '@/lib/pdf/quote-generator'
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
    location: 'New Jersey',
    quantity: 1,
    costs: initialCosts,
    enabled_costs: initialEnabled,
    cost_overrides: initialOverrides,
    subtotal: 0,
    total_with_quantity: 0,
  }
}

export default function NewQuotePage() {
  // Multi-equipment mode
  const [isMultiEquipment, setIsMultiEquipment] = useState(false)
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

  // PDF Preview
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null)

  // Live PDF Preview
  const [showLivePdfPreview, setShowLivePdfPreview] = useState(false)
  const [livePdfUrl, setLivePdfUrl] = useState<string | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

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
  }), [
    quoteNumber, isMultiEquipment, equipmentBlocks, selectedMakeId, selectedModelId,
    selectedLocation, makeName, modelName, dimensions, costs, enabledCosts, costOverrides,
    descriptionOverrides, customerName, customerEmail, customerPhone,
    customerCompany, customerAddress, notes, miscFees
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
      setIsMultiEquipment(false)
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
  const subtotal = costsSubtotal + miscFeesTotal
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

  // Build PDF data object
  const buildPdfData = useCallback((): QuotePDFData => {
    return {
      quoteNumber,
      date: formatDate(new Date()),
      expiresAt: getExpirationDate,
      customerName: customerName || 'N/A',
      customerEmail: customerEmail || undefined,
      customerPhone: customerPhone || undefined,
      customerCompany: customerCompany || undefined,
      customerAddress: getFullAddressString(customerAddress),
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
      costsSubtotal,
      miscFeesTotal,
      subtotal,
      total,
      notes: notes || undefined,
      companyName: 'Seahorse Express',
      primaryColor: '#6366F1',
    }
  }, [
    quoteNumber, getExpirationDate, customerName, customerEmail, customerPhone, customerCompany, customerAddress,
    makeName, modelName, selectedLocation, dimensions, equipmentImages, costs, enabledCosts,
    costOverrides, miscFees, costsSubtotal, miscFeesTotal, subtotal, total, notes
  ])

  // Generate PDF preview
  const handlePreviewPdf = useCallback(() => {
    try {
      const pdfData = buildPdfData()
      const dataUrl = getQuotePDFDataUrl(pdfData)
      setPdfDataUrl(dataUrl)
      setShowPdfPreview(true)
    } catch {
      toast.error('Failed to generate PDF preview')
    }
  }, [buildPdfData])

  // Download PDF
  const handleDownloadPdf = useCallback(() => {
    try {
      const pdfData = buildPdfData()
      downloadQuotePDF(pdfData)
      toast.success('PDF downloaded')
    } catch {
      toast.error('Failed to download PDF')
    }
  }, [buildPdfData])

  // Create a stable hash of the PDF data to detect changes
  const pdfDataHash = useMemo(() => {
    return JSON.stringify({
      quoteNumber,
      customerName,
      customerEmail,
      customerPhone,
      customerCompany,
      makeName,
      modelName,
      selectedLocation,
      dimensions,
      costs,
      enabledCosts,
      costOverrides,
      miscFees,
      subtotal,
      notes,
      isMultiEquipment,
      equipmentBlocks: isMultiEquipment ? equipmentBlocks.map(b => ({
        make_name: b.make_name,
        model_name: b.model_name,
        location: b.location,
        quantity: b.quantity,
        total_with_quantity: b.total_with_quantity,
      })) : [],
    })
  }, [
    quoteNumber, customerName, customerEmail, customerPhone, customerCompany,
    makeName, modelName, selectedLocation, dimensions, costs, enabledCosts,
    costOverrides, miscFees, subtotal, notes, isMultiEquipment, equipmentBlocks
  ])

  // Live PDF preview with debouncing
  useEffect(() => {
    // Only generate if live preview is enabled
    if (!showLivePdfPreview) return

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set generating state
    setIsGeneratingPdf(true)

    // Debounce the PDF generation by 800ms
    debounceTimerRef.current = setTimeout(() => {
      try {
        const pdfData = buildPdfData()
        const dataUrl = getQuotePDFDataUrl(pdfData)
        setLivePdfUrl(dataUrl)
      } catch (error) {
        console.error('Failed to generate live PDF preview:', error)
      } finally {
        setIsGeneratingPdf(false)
      }
    }, 800)

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [pdfDataHash, showLivePdfPreview, buildPdfData])

  // Toggle live preview
  const handleToggleLivePreview = useCallback(() => {
    setShowLivePdfPreview((prev) => {
      if (!prev) {
        // Generate initial preview when enabling
        try {
          const pdfData = buildPdfData()
          const dataUrl = getQuotePDFDataUrl(pdfData)
          setLivePdfUrl(dataUrl)
        } catch (error) {
          console.error('Failed to generate initial PDF preview:', error)
        }
      }
      return !prev
    })
  }, [buildPdfData])

  // Save quote mutation
  const createQuote = trpc.quotes.create.useMutation({
    onSuccess: (data) => {
      toast.success('Quote created successfully')
      if (data?.id) {
        setSavedQuoteId(data.id)
      }
      // Clear the draft after successful quote creation
      deleteDraftMutation.mutate()
      setHasDraft(false)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Quote</h1>
          <div className="flex items-center gap-3">
            <p className="text-muted-foreground">
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
        <div className="flex gap-2 items-center">
          <Button
            variant={showLivePdfPreview ? 'default' : 'outline'}
            size="icon"
            onClick={handleToggleLivePreview}
            title={showLivePdfPreview ? 'Hide Live Preview' : 'Show Live Preview'}
          >
            <MonitorPlay className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handlePreviewPdf} title="Preview PDF">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleDownloadPdf} title="Download PDF">
            <FileDown className="h-4 w-4" />
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
          <Button onClick={handleSaveQuote} disabled={createQuote.isPending}>
            {createQuote.isPending ? 'Saving...' : 'Create Quote'}
          </Button>
        </div>
      </div>

      {/* PDF Preview Modal */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Quote Preview</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleDownloadPdf}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {pdfDataUrl && (
              <iframe
                src={pdfDataUrl}
                className="w-full h-full rounded border"
                title="Quote PDF Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="customer" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="customer">Customer</TabsTrigger>
              <TabsTrigger value="equipment">Equipment</TabsTrigger>
              <TabsTrigger value="costs">Costs</TabsTrigger>
              <TabsTrigger value="fees">Fees{miscFees.length > 0 ? ` (${miscFees.length})` : ''}</TabsTrigger>
            </TabsList>

            <TabsContent value="equipment" className="mt-4 space-y-4">
              {/* Multi-Equipment Toggle */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Layers className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label htmlFor="multi-equipment" className="text-base font-medium">
                          Multi-Equipment Mode
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Add multiple equipment items to this quote
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="multi-equipment"
                      checked={isMultiEquipment}
                      onCheckedChange={setIsMultiEquipment}
                    />
                  </div>
                </CardContent>
              </Card>

              {isMultiEquipment ? (
                /* Multi-Equipment Mode */
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
                    Add Equipment
                  </Button>
                </div>
              ) : (
                /* Single Equipment Mode */
                <Card>
                  <CardHeader>
                    <CardTitle>Equipment Selection</CardTitle>
                    <CardDescription>
                      Select the equipment make, model, and location
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <EquipmentSelector
                      selectedMakeId={selectedMakeId}
                      selectedModelId={selectedModelId}
                      selectedLocation={selectedLocation}
                      onMakeChange={(id, name) => {
                        setSelectedMakeId(id)
                        setMakeName(name)
                        setSelectedModelId('')
                        setModelName('')
                      }}
                      onModelChange={(id, name) => {
                        setSelectedModelId(id)
                        setModelName(name)
                      }}
                      onLocationChange={setSelectedLocation}
                      dimensions={dimensions}
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="costs" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cost Breakdown</CardTitle>
                  <CardDescription>
                    Adjust costs and enable/disable line items
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CostBreakdown
                    costs={costs}
                    enabledCosts={enabledCosts}
                    costOverrides={costOverrides}
                    descriptionOverrides={descriptionOverrides}
                    onToggleCost={(field) =>
                      setEnabledCosts((prev) => ({
                        ...prev,
                        [field]: !prev[field],
                      }))
                    }
                    onOverrideCost={(field, value) =>
                      setCostOverrides((prev) => ({
                        ...prev,
                        [field]: value,
                      }))
                    }
                    onOverrideDescription={(field, value) =>
                      setDescriptionOverrides((prev) => ({
                        ...prev,
                        [field]: value,
                      }))
                    }
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fees" className="mt-4">
              <MiscFeesList
                fees={miscFees}
                onChange={setMiscFees}
                subtotal={costsSubtotal}
              />
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
          </Tabs>
        </div>

        <div className="space-y-4">
          <QuoteSummary
            makeName={isMultiEquipment ? `${equipmentBlocks.length} Equipment Items` : makeName}
            modelName={isMultiEquipment ? '' : modelName}
            location={isMultiEquipment ? 'Multiple' : selectedLocation}
            subtotal={isMultiEquipment ? multiEquipmentSubtotal : subtotal}
            total={isMultiEquipment ? multiEquipmentTotal : total}
            equipmentBlocks={isMultiEquipment ? equipmentBlocks : undefined}
          />

          {/* Live PDF Preview Panel */}
          {showLivePdfPreview && (
            <Card className="overflow-hidden">
              <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MonitorPlay className="h-4 w-4" />
                    Live Preview
                  </span>
                  {isGeneratingPdf && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Updating...
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <div className="h-[600px] bg-muted/30">
                {livePdfUrl ? (
                  <iframe
                    src={livePdfUrl}
                    className="w-full h-full"
                    title="Live Quote PDF Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Generating preview...
                  </div>
                )}
              </div>
            </Card>
          )}
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
