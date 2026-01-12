'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { DestinationBlock } from '@/components/inland/destination-block'
import { SortableDestination } from '@/components/inland/sortable-destination'
import { RouteMap } from '@/components/inland/route-map'
import { trpc } from '@/lib/trpc/client'
import { generateInlandQuoteNumber, formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { Plus, FileDown, Eye, X, MonitorPlay, Loader2, Mail, Save, Trash2 } from 'lucide-react'
import { CustomerForm } from '@/components/quotes/customer-form'
import { useAutoSave } from '@/hooks/use-auto-save'
import { AutoSaveIndicator } from '@/components/ui/auto-save-indicator'
import type { InlandDestinationBlock } from '@/types/inland'
import {
  downloadInlandQuotePDF,
  getInlandQuotePDFDataUrl,
  type InlandQuotePDFData,
} from '@/lib/pdf/inland-quote-generator'
import { EmailQuoteDialog } from '@/components/quotes/email-quote-dialog'

const DESTINATION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

function createEmptyDestination(label: string): InlandDestinationBlock {
  return {
    id: crypto.randomUUID(),
    label,
    pickup_address: '',
    dropoff_address: '',
    load_blocks: [],
    subtotal: 0,
  }
}

export default function NewInlandQuotePage() {
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Quote data
  const [quoteNumber, setQuoteNumber] = useState('')
  const [destinationBlocks, setDestinationBlocks] = useState<InlandDestinationBlock[]>([
    createEmptyDestination('A'),
  ])

  // Customer
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerCompany, setCustomerCompany] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)

  // Notes
  const [internalNotes, setInternalNotes] = useState('')
  const [quoteNotes, setQuoteNotes] = useState('')


  // PDF Preview
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  // Live PDF Preview
  const [showLivePdfPreview, setShowLivePdfPreview] = useState(false)
  const [livePdfUrl, setLivePdfUrl] = useState<string | null>(null)
  const [isGeneratingLivePdf, setIsGeneratingLivePdf] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Email & Template dialogs
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null)

  // Draft management
  const [draftRestored, setDraftRestored] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Generate quote number on mount
  useEffect(() => {
    setQuoteNumber(generateInlandQuoteNumber())
  }, [])

  // Fetch data
  const { data: truckTypes } = trpc.inland.getEquipmentTypes.useQuery()
  const { data: accessorialTypes } = trpc.inland.getAccessorialTypes.useQuery()

  // Draft queries and mutations
  const { data: existingDraft, isLoading: isDraftLoading } = trpc.inland.getDraft.useQuery(
    undefined,
    { enabled: !isInitialized }
  )

  const saveDraftMutation = trpc.inland.saveDraft.useMutation()
  const deleteDraftMutation = trpc.inland.deleteDraft.useMutation({
    onSuccess: () => {
      toast.success('Draft discarded')
    },
  })


  // Calculate totals
  const subtotal = destinationBlocks.reduce((sum, block) => sum + block.subtotal, 0)
  const total = subtotal

  // Draft data for auto-save
  const draftData = useMemo(
    () => ({
      quoteNumber,
      customerName,
      customerEmail,
      customerPhone,
      customerCompany,
      selectedCompanyId,
      internalNotes,
      quoteNotes,
      destinationBlocks,
    }),
    [
      quoteNumber,
      customerName,
      customerEmail,
      customerPhone,
      customerCompany,
      selectedCompanyId,
      internalNotes,
      quoteNotes,
      destinationBlocks,
    ]
  )

  // Auto-save hook
  const { status: autoSaveStatus, lastSaved } = useAutoSave({
    data: draftData,
    onSave: async (data) => {
      await saveDraftMutation.mutateAsync({ quote_data: data })
    },
    debounceMs: 2000,
    enabled: isInitialized,
  })

  // Restore draft on mount
  useEffect(() => {
    if (!isDraftLoading && existingDraft && !isInitialized) {
      const data = existingDraft.quote_data as typeof draftData
      if (data) {
        if (data.quoteNumber) setQuoteNumber(data.quoteNumber)
        if (data.customerName) setCustomerName(data.customerName)
        if (data.customerEmail) setCustomerEmail(data.customerEmail)
        if (data.customerPhone) setCustomerPhone(data.customerPhone)
        if (data.customerCompany) setCustomerCompany(data.customerCompany)
        if (data.selectedCompanyId) setSelectedCompanyId(data.selectedCompanyId)
        if (data.internalNotes) setInternalNotes(data.internalNotes)
        if (data.quoteNotes) setQuoteNotes(data.quoteNotes)
        if (data.destinationBlocks && data.destinationBlocks.length > 0) {
          setDestinationBlocks(data.destinationBlocks)
        }
        setDraftRestored(true)
        toast.success('Draft restored', { description: 'Your previous work has been loaded.' })
      }
      setIsInitialized(true)
    } else if (!isDraftLoading && !existingDraft && !isInitialized) {
      setIsInitialized(true)
    }
  }, [existingDraft, isDraftLoading, isInitialized])

  // Discard draft
  const handleDiscardDraft = () => {
    // Reset all fields
    setQuoteNumber(generateInlandQuoteNumber())
    setCustomerName('')
    setCustomerEmail('')
    setCustomerPhone('')
    setCustomerCompany('')
    setSelectedCompanyId(null)
    setInternalNotes('')
    setQuoteNotes('')
    setDestinationBlocks([createEmptyDestination('A')])
    setDraftRestored(false)
    deleteDraftMutation.mutate()
  }

  // Build PDF data
  const buildPdfData = useCallback((): InlandQuotePDFData => {
    return {
      quoteNumber,
      date: formatDate(new Date()),
      customerName,
      customerEmail: customerEmail || undefined,
      customerPhone: customerPhone || undefined,
      customerCompany: customerCompany || undefined,
      destinationBlocks,
      subtotal,
      total,
      quoteNotes: quoteNotes || undefined,
      companyName: 'Seahorse Express',
      primaryColor: '#6366F1',
    }
  }, [
    quoteNumber,
    customerName,
    customerEmail,
    customerPhone,
    customerCompany,
    destinationBlocks,
    subtotal,
    total,
    quoteNotes,
  ])

  // PDF Preview
  const handlePreviewPdf = async () => {
    setIsGeneratingPdf(true)
    try {
      const pdfData = buildPdfData()
      const dataUrl = getInlandQuotePDFDataUrl(pdfData)
      setPdfDataUrl(dataUrl)
      setShowPdfPreview(true)
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF preview')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // PDF Download
  const handleDownloadPdf = () => {
    try {
      const pdfData = buildPdfData()
      downloadInlandQuotePDF(pdfData, `inland-quote-${quoteNumber}.pdf`)
      toast.success('PDF downloaded successfully')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Failed to download PDF')
    }
  }

  // Create a stable hash of the PDF data to detect changes
  const pdfDataHash = useMemo(() => {
    return JSON.stringify({
      quoteNumber,
      customerName,
      customerEmail,
      customerPhone,
      customerCompany,
      destinationBlocks: destinationBlocks.map((d) => ({
        label: d.label,
        pickup_address: d.pickup_address,
        dropoff_address: d.dropoff_address,
        subtotal: d.subtotal,
        load_blocks: d.load_blocks.map((lb) => ({
          truck_type_id: lb.truck_type_id,
          subtotal: lb.subtotal,
        })),
      })),
      subtotal,
      quoteNotes,
    })
  }, [
    quoteNumber,
    customerName,
    customerEmail,
    customerPhone,
    customerCompany,
    destinationBlocks,
    subtotal,
    quoteNotes,
  ])

  // Live PDF preview with debouncing
  useEffect(() => {
    if (!showLivePdfPreview) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    setIsGeneratingLivePdf(true)

    debounceTimerRef.current = setTimeout(() => {
      try {
        const pdfData = buildPdfData()
        const dataUrl = getInlandQuotePDFDataUrl(pdfData)
        setLivePdfUrl(dataUrl)
      } catch (error) {
        console.error('Failed to generate live PDF preview:', error)
      } finally {
        setIsGeneratingLivePdf(false)
      }
    }, 800)

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
        try {
          const pdfData = buildPdfData()
          const dataUrl = getInlandQuotePDFDataUrl(pdfData)
          setLivePdfUrl(dataUrl)
        } catch (error) {
          console.error('Failed to generate initial PDF preview:', error)
        }
      }
      return !prev
    })
  }, [buildPdfData])

  // Destination management
  const addDestination = () => {
    if (destinationBlocks.length >= 6) {
      toast.error('Maximum 6 destinations allowed')
      return
    }
    const nextLabel = DESTINATION_LABELS[destinationBlocks.length]
    setDestinationBlocks([...destinationBlocks, createEmptyDestination(nextLabel)])
  }

  const updateDestination = (index: number, block: InlandDestinationBlock) => {
    const newBlocks = [...destinationBlocks]
    newBlocks[index] = block
    setDestinationBlocks(newBlocks)
  }

  const removeDestination = (index: number) => {
    if (destinationBlocks.length <= 1) return
    const newBlocks = destinationBlocks.filter((_, i) => i !== index)
    // Relabel remaining blocks
    const relabeled = newBlocks.map((block, i) => ({
      ...block,
      label: DESTINATION_LABELS[i],
    }))
    setDestinationBlocks(relabeled)
  }

  const duplicateDestination = (index: number) => {
    if (destinationBlocks.length >= 6) {
      toast.error('Maximum 6 destinations allowed')
      return
    }
    const blockToDuplicate = destinationBlocks[index]
    // Create a deep copy with new IDs
    const duplicatedBlock: InlandDestinationBlock = {
      ...blockToDuplicate,
      id: crypto.randomUUID(),
      label: DESTINATION_LABELS[destinationBlocks.length],
      load_blocks: blockToDuplicate.load_blocks.map((lb) => ({
        ...lb,
        id: crypto.randomUUID(),
        cargo_items: lb.cargo_items.map((ci) => ({ ...ci, id: crypto.randomUUID() })),
        service_items: lb.service_items.map((si) => ({ ...si, id: crypto.randomUUID() })),
        accessorial_charges: lb.accessorial_charges.map((ac) => ({ ...ac, id: crypto.randomUUID() })),
      })),
    }
    // Insert after current block
    const newBlocks = [
      ...destinationBlocks.slice(0, index + 1),
      duplicatedBlock,
      ...destinationBlocks.slice(index + 1),
    ]
    // Relabel all blocks
    const relabeled = newBlocks.map((block, i) => ({
      ...block,
      label: DESTINATION_LABELS[i],
    }))
    setDestinationBlocks(relabeled)
    toast.success(`Destination ${blockToDuplicate.label} duplicated`)
  }

  // Handle drag end for reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setDestinationBlocks((blocks) => {
        const oldIndex = blocks.findIndex((b) => b.id === active.id)
        const newIndex = blocks.findIndex((b) => b.id === over.id)
        const reordered = arrayMove(blocks, oldIndex, newIndex)
        // Relabel after reordering
        return reordered.map((block, i) => ({
          ...block,
          label: DESTINATION_LABELS[i],
        }))
      })
      toast.success('Destinations reordered')
    }
  }

  // TRPC utils for cache invalidation
  const utils = trpc.useUtils()

  // Create quote mutation
  const createQuote = trpc.inland.create.useMutation({
    onSuccess: (data) => {
      toast.success('Inland quote created successfully', {
        description: 'Quote saved to history.',
        action: {
          label: 'View History',
          onClick: () => window.location.href = '/inland/history',
        },
      })
      if (data?.id) {
        setSavedQuoteId(data.id)
      }
      // Clear draft on successful quote creation
      deleteDraftMutation.mutate()
      // Invalidate the inland quotes history cache so new quotes appear immediately
      utils.inland.getHistory.invalidate()
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
    const firstDest = destinationBlocks[0]
    const templateName = `Inland - ${firstDest?.pickup_address || 'Origin'} to ${firstDest?.dropoff_address || 'Destination'}`
    saveTemplate.mutate({
      name: templateName.slice(0, 100),
      description: `Inland transportation template with ${destinationBlocks.length} destination(s)`,
      template_type: 'inland',
      template_data: {
        destination_blocks: destinationBlocks.map((d) => ({
          pickup_address: d.pickup_address,
          dropoff_address: d.dropoff_address,
        })),
      },
    })
  }

  const handleSaveQuote = () => {
    if (!customerName) {
      toast.error('Please enter a customer name')
      return
    }
    if (destinationBlocks.every((b) => !b.pickup_address && !b.dropoff_address)) {
      toast.error('Please enter at least one destination')
      return
    }

    createQuote.mutate({
      quote_number: quoteNumber,
      status: 'draft',
      customer_name: customerName,
      customer_email: customerEmail || undefined,
      customer_phone: customerPhone || undefined,
      customer_company: customerCompany || undefined,
      company_id: selectedCompanyId || undefined,
      subtotal,
      total,
      quote_data: {
        destination_blocks: destinationBlocks,
        internal_notes: internalNotes,
        quote_notes: quoteNotes,
      },
    })
  }

  // Download PDF and auto-save if not already saved
  const handleDownloadAndSave = () => {
    // Validate required fields
    if (!customerName) {
      toast.error('Please enter a customer name before downloading')
      return
    }
    if (destinationBlocks.every((b) => !b.pickup_address && !b.dropoff_address)) {
      toast.error('Please enter at least one destination before downloading')
      return
    }

    // Download PDF
    try {
      const pdfData = buildPdfData()
      downloadInlandQuotePDF(pdfData, `inland-quote-${quoteNumber}.pdf`)
      toast.success('PDF downloaded successfully')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Failed to download PDF')
      return
    }

    // Auto-save the quote if not already saved
    if (!savedQuoteId && !createQuote.isPending) {
      createQuote.mutate({
        quote_number: quoteNumber,
        status: 'draft',
        customer_name: customerName,
        customer_email: customerEmail || undefined,
        customer_phone: customerPhone || undefined,
        customer_company: customerCompany || undefined,
        company_id: selectedCompanyId || undefined,
        subtotal,
        total,
        quote_data: {
          destination_blocks: destinationBlocks,
          internal_notes: internalNotes,
          quote_notes: quoteNotes,
        },
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">New Inland Quote</h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <p className="text-sm sm:text-base text-muted-foreground">Quote #{quoteNumber}</p>
              <AutoSaveIndicator status={autoSaveStatus} lastSaved={lastSaved} />
              {draftRestored && (
                <span className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                  Draft Restored
                </span>
              )}
            </div>
          </div>
          <Button onClick={handleSaveQuote} disabled={createQuote.isPending} className="w-full sm:w-auto">
            {createQuote.isPending ? 'Saving...' : 'Create Quote'}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={showLivePdfPreview ? 'default' : 'outline'}
            size="icon"
            title={showLivePdfPreview ? 'Hide Live Preview' : 'Show Live Preview'}
            onClick={handleToggleLivePreview}
            className="hidden lg:inline-flex"
          >
            <MonitorPlay className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            title="Preview PDF"
            onClick={handlePreviewPdf}
            disabled={isGeneratingPdf}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            title="Download PDF"
            onClick={handleDownloadAndSave}
          >
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
          {(draftRestored || autoSaveStatus !== 'idle') && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscardDraft}
              disabled={deleteDraftMutation.isPending}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Discard Draft</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info - using same component as Dismantle Quote */}
          <CustomerForm
            customerName={customerName}
            customerEmail={customerEmail}
            customerPhone={customerPhone}
            customerCompany={customerCompany}
            onCustomerChange={{
              setName: setCustomerName,
              setEmail: setCustomerEmail,
              setPhone: setCustomerPhone,
              setCompany: setCustomerCompany,
            }}
          />

          {/* Destinations */}
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg sm:text-xl font-semibold">Destinations</h2>
              <div className="flex items-center gap-2">
                {destinationBlocks.length > 1 && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Drag to reorder
                  </span>
                )}
                <Button onClick={addDestination} disabled={destinationBlocks.length >= 6} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Destination
                </Button>
              </div>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={destinationBlocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                {destinationBlocks.map((block, index) => (
                  <SortableDestination key={block.id} id={block.id}>
                    <DestinationBlock
                      block={block}
                      onUpdate={(b) => updateDestination(index, b)}
                      onRemove={() => removeDestination(index)}
                      onDuplicate={() => duplicateDestination(index)}
                      canRemove={destinationBlocks.length > 1}
                      truckTypes={truckTypes || []}
                      accessorialTypes={accessorialTypes || []}
                    />
                  </SortableDestination>
                ))}
              </SortableContext>
            </DndContext>
          </div>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quoteNotes">Quote Notes (visible to customer)</Label>
                <textarea
                  id="quoteNotes"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Terms, conditions, special instructions..."
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internalNotes">Internal Notes (not visible to customer)</Label>
                <textarea
                  id="internalNotes"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Internal notes..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Summary Sidebar */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle>Quote Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Destinations Summary */}
              <div className="space-y-2">
                {destinationBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex justify-between text-sm p-2 rounded bg-muted/50"
                  >
                    <span>Destination {block.label}</span>
                    <span className="font-mono">{formatCurrency(block.subtotal)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>

              </div>

              <div className="flex justify-between items-center">
                <span className="font-medium">Total</span>
                <span className="text-2xl font-bold font-mono text-primary">
                  {formatCurrency(total)}
                </span>
              </div>

              {/* Date */}
              <div className="text-sm text-muted-foreground text-center pt-2">
                {formatDate(new Date())}
              </div>
            </CardContent>
          </Card>

          {/* Route Map - moved here under Quote Summary */}
          <RouteMap destinationBlocks={destinationBlocks} />

          {/* Live PDF Preview Panel */}
          {showLivePdfPreview && (
            <Card className="overflow-hidden">
              <CardHeader className="py-2 px-3 border-b">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MonitorPlay className="h-4 w-4" />
                    Live Preview
                  </span>
                  {isGeneratingLivePdf && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Updating...
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <div className="h-[600px]">
                {livePdfUrl ? (
                  <iframe
                    src={livePdfUrl}
                    className="w-full h-full border-0"
                    title="Live Inland Quote PDF Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground bg-muted/30">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Generating preview...
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* PDF Preview Dialog */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <span>Quote Preview - {quoteNumber}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadAndSave}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPdfPreview(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {pdfDataUrl ? (
              <iframe
                src={pdfDataUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Loading preview...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Quote Dialog */}
      <EmailQuoteDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        quoteId={savedQuoteId || ''}
        quoteType="inland"
        quoteNumber={quoteNumber}
        customerName={customerName || undefined}
        customerEmail={customerEmail || undefined}
      />
    </div>
  )
}
