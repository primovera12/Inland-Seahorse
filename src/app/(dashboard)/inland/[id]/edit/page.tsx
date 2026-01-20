'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { Plus, Eye, Loader2, Mail, ArrowLeft } from 'lucide-react'
import { CustomerForm, type CustomerAddress } from '@/components/quotes/customer-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { InlandDestinationBlock } from '@/types/inland'
import {
  getInlandQuotePDFDataUrl,
  type InlandQuotePDFData,
} from '@/lib/pdf/inland-quote-generator'
import { EmailQuoteDialog } from '@/components/quotes/email-quote-dialog'
import { QuotePDFPreview, buildUnifiedPDFData, type UnifiedPDFData } from '@/lib/pdf'

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

export default function EditInlandQuotePage() {
  const params = useParams()
  const router = useRouter()
  const quoteId = params.id as string

  // Loading state
  const [isLoading, setIsLoading] = useState(true)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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

  // PDF Preview
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null)

  // Email dialog
  const [showEmailDialog, setShowEmailDialog] = useState(false)

  // Active tab
  const [activeTab, setActiveTab] = useState('customer')

  // Fetch existing quote data
  const { data: quote, isLoading: isLoadingQuote } = trpc.inland.getById.useQuery(
    { id: quoteId },
    { enabled: !!quoteId }
  )

  // Fetch data
  const { data: truckTypes } = trpc.inland.getEquipmentTypes.useQuery()
  const { data: accessorialTypes } = trpc.inland.getAccessorialTypes.useQuery()
  const { data: settings } = trpc.settings.get.useQuery()

  // Load quote data into state
  useEffect(() => {
    if (quote && !dataLoaded) {
      // Basic quote info
      setQuoteNumber(quote.quote_number)

      // Customer info
      setCustomerName(quote.customer_name || '')
      setCustomerEmail(quote.customer_email || '')
      setCustomerPhone(quote.customer_phone || '')
      setCustomerCompany(quote.customer_company || '')
      if (quote.company_id) setSelectedCompanyId(quote.company_id)

      // Load quote_data - handle both camelCase and snake_case for backwards compatibility
      const quoteData = quote.quote_data as {
        // camelCase (new format)
        destinationBlocks?: InlandDestinationBlock[]
        internalNotes?: string
        quoteNotes?: string
        customerAddress?: CustomerAddress
        // snake_case (legacy format from new page)
        destination_blocks?: InlandDestinationBlock[]
        internal_notes?: string
        quote_notes?: string
        customer_address?: CustomerAddress
      }

      if (quoteData) {
        // Load destination blocks (check both formats)
        const blocks = quoteData.destinationBlocks || quoteData.destination_blocks
        if (blocks && blocks.length > 0) {
          setDestinationBlocks(blocks)
        }
        // Load notes (check both formats)
        const intNotes = quoteData.internalNotes || quoteData.internal_notes
        if (intNotes) setInternalNotes(intNotes)
        const qNotes = quoteData.quoteNotes || quoteData.quote_notes
        if (qNotes) setQuoteNotes(qNotes)
        // Load customer address (check both formats)
        const custAddr = quoteData.customerAddress || quoteData.customer_address
        if (custAddr) setCustomerAddress(custAddr)
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

  // Calculate totals
  const subtotal = destinationBlocks.reduce((sum, block) => sum + block.subtotal, 0)
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
      equipment: [],
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
      notes: quoteNotes || undefined,
      termsAndConditions: settings.terms_inland || undefined,
    }
  }, [settings, quoteNumber, customerName, customerCompany, customerEmail, customerPhone, destinationBlocks, subtotal, total, quoteNotes])

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
      companyName: settings?.company_name || 'Seahorse Express',
      companyLogoUrl: settings?.company_logo_url || undefined,
      logoSizePercentage: settings?.logo_size_percentage || 100,
      companyAddress: [settings?.company_address, settings?.company_city, settings?.company_state, settings?.company_zip].filter(Boolean).join(', ') || undefined,
      companyPhone: settings?.company_phone || undefined,
      companyEmail: settings?.company_email || undefined,
      companyWebsite: settings?.company_website || undefined,
      primaryColor: settings?.primary_color || '#6366F1',
      secondaryColor: settings?.secondary_color || undefined,
      termsAndConditions: settings?.terms_inland || undefined,
    }
  }, [
    quoteNumber,
    customerName,
    customerEmail,
    customerPhone,
    customerCompany,
    destinationBlocks,
    settings,
    subtotal,
    total,
    quoteNotes,
  ])

  // PDF Preview
  const handlePreviewPdf = async () => {
    try {
      const pdfData = buildPdfData()
      const dataUrl = await getInlandQuotePDFDataUrl(pdfData)
      setPdfDataUrl(dataUrl)
      setShowPdfPreview(true)
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF preview')
    }
  }

  // Destination block management
  const addDestinationBlock = () => {
    const nextLabel = DESTINATION_LABELS[destinationBlocks.length] || String(destinationBlocks.length + 1)
    setDestinationBlocks(prev => [...prev, createEmptyDestination(nextLabel)])
  }

  const updateDestinationBlock = (blockId: string, updatedBlock: InlandDestinationBlock) => {
    setDestinationBlocks(prev =>
      prev.map(block =>
        block.id === blockId ? updatedBlock : block
      )
    )
  }

  const removeDestinationBlock = (blockId: string) => {
    setDestinationBlocks(prev => {
      const filtered = prev.filter(block => block.id !== blockId)
      return filtered.map((block, idx) => ({
        ...block,
        label: DESTINATION_LABELS[idx] || String(idx + 1),
      }))
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setDestinationBlocks((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over.id)
        const reordered = arrayMove(items, oldIndex, newIndex)
        return reordered.map((block, idx) => ({
          ...block,
          label: DESTINATION_LABELS[idx] || String(idx + 1),
        }))
      })
    }
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

  // Update quote mutation
  const updateQuote = trpc.inland.update.useMutation({
    onSuccess: () => {
      toast.success('Quote updated successfully')
      router.push('/inland/history')
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

    updateQuote.mutate({
      id: quoteId,
      data: {
        customer_name: customerName,
        customer_email: customerEmail || undefined,
        customer_phone: customerPhone || undefined,
        customer_company: customerCompany || undefined,
        company_id: selectedCompanyId || undefined,
        subtotal,
        total,
        quote_data: {
          destinationBlocks,
          internalNotes,
          quoteNotes,
          customerAddress,
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
        <Button variant="outline" className="mt-4" onClick={() => router.push('/inland/history')}>
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
            <Button variant="ghost" size="icon" onClick={() => router.push('/inland/history')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Edit Inland Quote</h1>
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
            {pdfDataUrl && (
              <iframe
                src={pdfDataUrl}
                className="w-full h-full border rounded-lg"
                title="PDF Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full flex overflow-x-auto no-scrollbar">
              <TabsTrigger value="customer" className="flex-1 min-w-[80px]">Customer</TabsTrigger>
              <TabsTrigger value="quote" className="flex-1 min-w-[80px]">Quote Details</TabsTrigger>
              <TabsTrigger value="preview" className="flex-1 min-w-[80px] flex items-center justify-center gap-1">
                <Eye className="h-3 w-3 hidden sm:inline" />
                <span>Preview</span>
              </TabsTrigger>
            </TabsList>

            {/* Customer Tab */}
            <TabsContent value="customer" className="mt-6 space-y-6">
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
            </TabsContent>

            {/* Quote Details Tab */}
            <TabsContent value="quote" className="mt-6 space-y-6">
              {/* Route Map */}
              <RouteMap destinationBlocks={destinationBlocks} onRouteCalculated={handleRouteCalculated} />

              {/* Destination Blocks */}
              <Card>
                <CardHeader>
                  <CardTitle>Transportation Routes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={destinationBlocks.map(d => d.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {destinationBlocks.map((destination) => (
                        <SortableDestination key={destination.id} id={destination.id}>
                          <DestinationBlock
                            block={destination}
                            truckTypes={truckTypes || []}
                            accessorialTypes={accessorialTypes || []}
                            onUpdate={(updatedBlock) => updateDestinationBlock(destination.id, updatedBlock)}
                            onRemove={() => removeDestinationBlock(destination.id)}
                            canRemove={destinationBlocks.length > 1}
                          />
                        </SortableDestination>
                      ))}
                    </SortableContext>
                  </DndContext>

                  {destinationBlocks.length < 6 && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={addDestinationBlock}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Destination
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quote Preview</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {previewPdfData ? (
                    <QuotePDFPreview
                      data={previewPdfData}
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

        {/* Quote Summary Sidebar */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle>Quote Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Destinations</span>
                  <span>{destinationBlocks.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Loads</span>
                  <span>
                    {destinationBlocks.reduce(
                      (sum, d) => sum + d.load_blocks.length,
                      0
                    )}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Email Quote Dialog */}
      <EmailQuoteDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        quoteId={quoteId}
        quoteType="inland"
        quoteNumber={quoteNumber}
        customerName={customerName || undefined}
        customerEmail={customerEmail || undefined}
      />
    </div>
  )
}
