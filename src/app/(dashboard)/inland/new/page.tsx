'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
import { Plus, Save, Trash2, FolderOpen } from 'lucide-react'
import { CustomerForm, type CustomerAddress } from '@/components/quotes/customer-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAutoSave } from '@/hooks/use-auto-save'
import { AutoSaveIndicator } from '@/components/ui/auto-save-indicator'
import type { InlandDestinationBlock } from '@/types/inland'
import { QuotePDFPreview, type UnifiedPDFData } from '@/lib/pdf'

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
  const [customerAddress, setCustomerAddress] = useState<CustomerAddress>({
    address: '',
    city: '',
    state: '',
    zip: '',
  })
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)

  // Notes
  const [internalNotes, setInternalNotes] = useState('')
  const [quoteNotes, setQuoteNotes] = useState('')


  // Template dialogs
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
  const { data: settings } = trpc.settings.get.useQuery()

  // Draft queries and mutations
  const { data: existingDraft, isLoading: isDraftLoading } = trpc.inland.getDraft.useQuery(
    undefined,
    { enabled: !isInitialized }
  )

  const saveDraftMutation = trpc.inland.saveDraft.useMutation()
  const deleteDraftMutation = trpc.inland.deleteDraft.useMutation({
    onSuccess: () => {
      // Invalidate the draft cache so it doesn't restore on navigation
      utils.inland.getDraft.invalidate()
      toast.success('Draft discarded')
    },
  })


  // Calculate totals (services only - accessorials tracked separately)
  const subtotal = destinationBlocks.reduce((sum, block) => sum + block.subtotal, 0)
  const accessorialsTotal = destinationBlocks.reduce((sum, block) => sum + (block.accessorials_total || 0), 0)
  const total = subtotal

  // Build preview PDF data for the Preview tab
  const previewPdfData: UnifiedPDFData | null = useMemo(() => {
    if (!settings) return null

    return {
      quoteType: 'inland' as const,
      quoteNumber,
      issueDate: formatDate(new Date()),
      validUntil: (() => {
        const date = new Date()
        date.setDate(date.getDate() + (settings.quote_validity_days || 30))
        return formatDate(date)
      })(),
      company: {
        name: settings.company_name,
        address: [settings.company_address, settings.company_city, settings.company_state, settings.company_zip].filter(Boolean).join(', ') || undefined,
        phone: settings.company_phone,
        email: settings.company_email,
        website: settings.company_website,
        logoUrl: settings.company_logo_url,
        logoSizePercentage: settings.logo_size_percentage || 100,
        primaryColor: settings.primary_color || '#1e3a8a',
        secondaryColor: settings.secondary_color,
      },
      customer: {
        name: customerName || 'N/A',
        company: customerCompany || undefined,
        email: customerEmail || undefined,
        phone: customerPhone || undefined,
      },
      equipment: [], // Inland quotes don't have equipment in the same sense
      isMultiEquipment: false,
      inlandTransport: {
        enabled: true,
        pickup: {
          address: destinationBlocks[0]?.pickup_address || '',
          city: destinationBlocks[0]?.pickup_city,
          state: destinationBlocks[0]?.pickup_state,
          zip: destinationBlocks[0]?.pickup_zip,
        },
        dropoff: {
          address: destinationBlocks[destinationBlocks.length - 1]?.dropoff_address || '',
          city: destinationBlocks[destinationBlocks.length - 1]?.dropoff_city,
          state: destinationBlocks[destinationBlocks.length - 1]?.dropoff_state,
          zip: destinationBlocks[destinationBlocks.length - 1]?.dropoff_zip,
        },
        destinationBlocks,
        // Build load_blocks from all destination blocks' load_blocks
        load_blocks: destinationBlocks.flatMap(dest =>
          dest.load_blocks.map(loadBlock => ({
            id: loadBlock.id,
            truck_type_id: loadBlock.truck_type_id,
            truck_type_name: loadBlock.truck_type_name,
            cargo_items: loadBlock.cargo_items?.map(cargo => ({
              id: cargo.id,
              description: cargo.description,
              quantity: cargo.quantity,
              length_inches: cargo.length_inches,
              width_inches: cargo.width_inches,
              height_inches: cargo.height_inches,
              weight_lbs: cargo.weight_lbs,
              is_oversize: cargo.is_oversize,
              is_overweight: cargo.is_overweight,
              is_equipment: cargo.is_equipment,
              equipment_make_name: cargo.equipment_make_name,
              equipment_model_name: cargo.equipment_model_name,
              custom_make_name: cargo.custom_make_name,
              custom_model_name: cargo.custom_model_name,
              image_url: cargo.image_url,
              front_image_url: cargo.front_image_url,
              side_image_url: cargo.side_image_url,
            })),
            service_items: loadBlock.service_items,
            accessorial_charges: loadBlock.accessorial_charges,
            subtotal: loadBlock.subtotal,
            accessorials_total: loadBlock.accessorial_charges.reduce((sum, a) => sum + a.total, 0),
          }))
        ),
        // Calculate total distance across all destinations
        distance_miles: destinationBlocks.reduce((sum, dest) => sum + (dest.distance_miles || 0), 0) || undefined,
        duration_minutes: destinationBlocks.reduce((sum, dest) => sum + (dest.duration_minutes || 0), 0) || undefined,
        // Generate static map URL if we have coordinates
        static_map_url: (() => {
          const firstDest = destinationBlocks[0]
          const lastDest = destinationBlocks[destinationBlocks.length - 1]
          if (firstDest?.pickup_lat && firstDest?.pickup_lng && lastDest?.dropoff_lat && lastDest?.dropoff_lng) {
            const origin = `${firstDest.pickup_lat},${firstDest.pickup_lng}`
            const destination = `${lastDest.dropoff_lat},${lastDest.dropoff_lng}`
            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

            // Collect polylines from destination blocks that have them
            const polylines = destinationBlocks
              .filter(dest => dest.route_polyline)
              .map(dest => dest.route_polyline as string)

            // Use encoded polylines for actual route display if available
            if (polylines.length > 0) {
              // Build path parameters for each polyline
              const pathParams = polylines
                .map(polyline => `path=color:0x4285F4|weight:4|enc:${encodeURIComponent(polyline)}`)
                .join('&')

              return `https://maps.googleapis.com/maps/api/staticmap?size=800x300&maptype=roadmap&markers=color:green|label:A|${origin}&markers=color:red|label:B|${destination}&${pathParams}&key=${apiKey}`
            }

            // Fallback to straight line if no polylines available yet
            const waypoints: string[] = []
            destinationBlocks.forEach((dest, idx) => {
              if (idx > 0 && dest.pickup_lat && dest.pickup_lng) {
                waypoints.push(`${dest.pickup_lat},${dest.pickup_lng}`)
              }
              if (idx < destinationBlocks.length - 1 && dest.dropoff_lat && dest.dropoff_lng) {
                waypoints.push(`${dest.dropoff_lat},${dest.dropoff_lng}`)
              }
            })
            return `https://maps.googleapis.com/maps/api/staticmap?size=800x300&maptype=roadmap&markers=color:green|label:A|${origin}&markers=color:red|label:B|${destination}&path=color:0x4285F4|weight:4|${origin}|${waypoints.join('|')}${waypoints.length > 0 ? '|' : ''}${destination}&key=${apiKey}`
          }
          return undefined
        })(),
        total: subtotal,
        // Calculate total accessorials
        accessorials_total: destinationBlocks.reduce((sum, dest) =>
          sum + dest.load_blocks.reduce((lbSum, lb) =>
            lbSum + lb.accessorial_charges.reduce((accSum, acc) => accSum + acc.total, 0), 0), 0),
      },
      equipmentSubtotal: 0,
      miscFeesTotal: 0,
      inlandTotal: subtotal,
      grandTotal: total,
      customerNotes: quoteNotes || undefined,
      termsAndConditions: settings.terms_inland || undefined,
    }
  }, [settings, quoteNumber, customerName, customerCompany, customerEmail, customerPhone, destinationBlocks, subtotal, total, quoteNotes])

  // Draft data for auto-save
  const draftData = useMemo(
    () => ({
      quoteNumber,
      customerName,
      customerEmail,
      customerPhone,
      customerCompany,
      customerAddress,
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
      customerAddress,
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
        if (data.customerAddress) setCustomerAddress(data.customerAddress)
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
    if (!confirm('Are you sure you want to discard this draft? All changes will be lost.')) {
      return
    }
    // Reset all fields
    setQuoteNumber(generateInlandQuoteNumber())
    setCustomerName('')
    setCustomerEmail('')
    setCustomerPhone('')
    setCustomerCompany('')
    setCustomerAddress({ address: '', city: '', state: '', zip: '' })
    setSelectedCompanyId(null)
    setInternalNotes('')
    setQuoteNotes('')
    setDestinationBlocks([createEmptyDestination('A')])
    setDraftRestored(false)
    deleteDraftMutation.mutate()
  }



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

  // Handle route calculated callback from RouteMap
  const handleRouteCalculated = useCallback((data: {
    destinationId: string
    polyline: string
    distance_miles: number
    duration_minutes: number
  }) => {
    setDestinationBlocks(prevBlocks =>
      prevBlocks.map(block =>
        block.id === data.destinationId
          ? {
              ...block,
              route_polyline: data.polyline,
              distance_miles: data.distance_miles,
              duration_minutes: data.duration_minutes,
            }
          : block
      )
    )
  }, [])

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
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 px-2 py-1 rounded-full">
                  <FolderOpen className="h-3 w-3" />
                  Draft Restored
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button onClick={handleSaveQuote} disabled={createQuote.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createQuote.isPending ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            variant="outline"
            onClick={handleDiscardDraft}
            disabled={deleteDraftMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Draft
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="customer" className="w-full">
            <TabsList className="w-full flex overflow-x-auto no-scrollbar">
              <TabsTrigger value="customer" className="flex-1 min-w-[80px]">Customer</TabsTrigger>
              <TabsTrigger value="details" className="flex-1 min-w-[80px]">Cargo Details</TabsTrigger>
              <TabsTrigger value="preview" className="flex-1 min-w-[80px]">Preview</TabsTrigger>
            </TabsList>

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
                    notes={internalNotes}
                    onNotesChange={setInternalNotes}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="mt-4 space-y-4">
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
                  {settings && previewPdfData ? (
                    <QuotePDFPreview data={previewPdfData} showControls />
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      Loading preview...
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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

              {/* Accessorial Fees (If Applicable) */}
              {accessorialsTotal > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-amber-700 dark:text-amber-400 font-medium">
                      Accessorial Fees (if applicable)
                    </span>
                    <span className="text-amber-900 dark:text-amber-300 font-bold font-mono">
                      {formatCurrency(accessorialsTotal)}
                    </span>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                    These fees are charged only when the listed services are required.
                  </p>
                </div>
              )}

              {/* Date */}
              <div className="text-sm text-muted-foreground text-center pt-2">
                {formatDate(new Date())}
              </div>
            </CardContent>
          </Card>

          {/* Route Map */}
          <RouteMap destinationBlocks={destinationBlocks} onRouteCalculated={handleRouteCalculated} />
        </div>
      </div>

    </div>
  )
}
