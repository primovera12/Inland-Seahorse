'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import { CustomerForm, type CustomerAddress } from '@/components/quotes/customer-form'
import { trpc } from '@/lib/trpc/client'
import { generateInlandQuoteNumber, formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import {
  MapPin,
  Package,
  Truck,
  DollarSign,
  User,
  Save,
  AlertTriangle,
  Upload,
  Plus,
  Trash2,
  FileText,
} from 'lucide-react'

// Load Planner Components
import { UniversalDropzone } from '@/components/load-planner/UniversalDropzone'
import { ExtractedItemsList } from '@/components/load-planner/ExtractedItemsList'
import { TrailerDiagram } from '@/components/load-planner/TrailerDiagram'
import { TruckSelector } from '@/components/load-planner/TruckSelector'
import {
  planLoads,
  selectTrucks,
  type LoadItem,
  type LoadPlan,
  type TruckType,
} from '@/lib/load-planner'
import { useRouter } from 'next/navigation'

export default function NewInlandQuoteV2Page() {
  const router = useRouter()

  // Tab state
  const [activeTab, setActiveTab] = useState('route')

  // Quote number
  const [quoteNumber, setQuoteNumber] = useState('')

  // Route state
  const [pickupAddress, setPickupAddress] = useState('')
  const [pickupCity, setPickupCity] = useState('')
  const [pickupState, setPickupState] = useState('')
  const [pickupZip, setPickupZip] = useState('')
  const [pickupLat, setPickupLat] = useState<number>()
  const [pickupLng, setPickupLng] = useState<number>()
  const [dropoffAddress, setDropoffAddress] = useState('')
  const [dropoffCity, setDropoffCity] = useState('')
  const [dropoffState, setDropoffState] = useState('')
  const [dropoffZip, setDropoffZip] = useState('')
  const [dropoffLat, setDropoffLat] = useState<number>()
  const [dropoffLng, setDropoffLng] = useState<number>()
  const [distanceMiles, setDistanceMiles] = useState<number | null>(null)

  // Cargo state (NEW - using feet, AI-parsed)
  const [cargoItems, setCargoItems] = useState<LoadItem[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // Load plan state (automatically calculated)
  const [loadPlan, setLoadPlan] = useState<LoadPlan | null>(null)

  // Customer state
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

  // Pricing
  const [lineHaulRate, setLineHaulRate] = useState(0)
  const [fuelSurcharge, setFuelSurcharge] = useState(0)
  const [accessorialFees, setAccessorialFees] = useState(0)

  // Generate quote number on mount
  useEffect(() => {
    setQuoteNumber(generateInlandQuoteNumber())
  }, [])

  // Auto-calculate load plan when cargo changes
  useEffect(() => {
    if (cargoItems.length === 0) {
      setLoadPlan(null)
      return
    }

    // Check if all items have valid dimensions
    const validItems = cargoItems.filter(
      (item) => item.length > 0 && item.width > 0 && item.height > 0 && item.weight > 0
    )

    if (validItems.length === 0) {
      setLoadPlan(null)
      return
    }

    // Convert LoadItem[] to ParsedLoad for planLoads
    const maxLength = Math.max(...validItems.map(i => i.length))
    const maxWidth = Math.max(...validItems.map(i => i.width))
    const maxHeight = Math.max(...validItems.map(i => i.height))
    const maxWeight = Math.max(...validItems.map(i => i.weight * i.quantity))
    const totalWeight = validItems.reduce((sum, i) => sum + i.weight * i.quantity, 0)

    const parsedLoad = {
      length: maxLength,
      width: maxWidth,
      height: maxHeight,
      weight: maxWeight,
      totalWeight,
      items: validItems,
      confidence: 100,
    }

    // Calculate full load plan
    const plan = planLoads(parsedLoad)
    setLoadPlan(plan)
  }, [cargoItems])

  // Calculate totals
  const subtotal = useMemo(() => {
    return lineHaulRate + fuelSurcharge + accessorialFees
  }, [lineHaulRate, fuelSurcharge, accessorialFees])

  const total = subtotal

  // Handle file/text analysis
  const handleAnalyzed = (result: {
    items: LoadItem[]
    loadPlan: {
      loads: Array<{
        id: string
        items: LoadItem[]
        truck: TruckType
        placements: Array<{ itemId: string; x: number; z: number; rotated: boolean }>
        utilization: { weight: number; space: number }
        warnings: string[]
      }>
      totalTrucks: number
      totalWeight: number
      totalItems: number
      warnings: string[]
    }
    parseMethod: 'AI' | 'pattern'
  }) => {
    setCargoItems(result.items)
    // Convert the LoadPlanResult format to LoadPlan format
    if (result.loadPlan) {
      const convertedPlan: LoadPlan = {
        loads: result.loadPlan.loads.map(load => ({
          id: load.id,
          items: load.items,
          length: Math.max(...load.items.map(i => i.length), 0),
          width: Math.max(...load.items.map(i => i.width), 0),
          height: Math.max(...load.items.map(i => i.height), 0),
          weight: load.items.reduce((sum, i) => sum + i.weight * i.quantity, 0),
          recommendedTruck: load.truck,
          truckScore: 85,
          placements: load.placements,
          permitsRequired: [],
          warnings: load.warnings,
          isLegal: true,
        })),
        totalTrucks: result.loadPlan.totalTrucks,
        totalWeight: result.loadPlan.totalWeight,
        totalItems: result.loadPlan.totalItems,
        unassignedItems: [],
        warnings: result.loadPlan.warnings,
      }
      setLoadPlan(convertedPlan)
    }
  }

  // Handle truck change for a specific load
  const handleTruckChange = (loadIndex: number, newTruck: TruckType) => {
    if (!loadPlan) return

    const updatedLoads = [...loadPlan.loads]
    updatedLoads[loadIndex] = {
      ...updatedLoads[loadIndex],
      recommendedTruck: newTruck,
    }

    setLoadPlan({
      ...loadPlan,
      loads: updatedLoads,
    })
  }

  // TRPC utils
  const utils = trpc.useUtils()

  // Create quote mutation
  const createQuote = trpc.inland.create.useMutation({
    onSuccess: () => {
      toast.success('Quote created successfully')
      utils.inland.getHistory.invalidate()
      router.push('/inland/history')
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
    if (!pickupAddress && !dropoffAddress) {
      toast.error('Please enter at least one address')
      return
    }

    // Convert LoadItems (feet) back to legacy format (inches) for storage
    const legacyCargoItems = cargoItems.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      length_inches: item.length * 12,
      width_inches: item.width * 12,
      height_inches: item.height * 12,
      weight_lbs: item.weight,
      is_oversize: item.width > 8.5 || item.height > 10,
      is_overweight: item.weight > 48000,
    }))

    createQuote.mutate({
      quote_number: quoteNumber,
      status: 'draft',
      customer_name: customerName,
      customer_email: customerEmail || undefined,
      customer_phone: customerPhone || undefined,
      customer_company: customerCompany || undefined,
      company_id: selectedCompanyId || undefined,
      subtotal: subtotal * 100, // Convert to cents
      total: total * 100,
      quote_data: {
        version: 2, // Mark as v2 quote with load planner
        pickup: {
          address: pickupAddress,
          city: pickupCity,
          state: pickupState,
          zip: pickupZip,
          lat: pickupLat,
          lng: pickupLng,
        },
        dropoff: {
          address: dropoffAddress,
          city: dropoffCity,
          state: dropoffState,
          zip: dropoffZip,
          lat: dropoffLat,
          lng: dropoffLng,
        },
        distance_miles: distanceMiles,
        cargo_items: legacyCargoItems,
        load_plan: loadPlan
          ? {
              totalTrucks: loadPlan.totalTrucks,
              totalWeight: loadPlan.totalWeight,
              totalItems: loadPlan.totalItems,
              loads: loadPlan.loads.map((load) => ({
                id: load.id,
                truck: {
                  id: load.recommendedTruck.id,
                  name: load.recommendedTruck.name,
                  category: load.recommendedTruck.category,
                },
                items: load.items.map((i) => i.id),
                placements: load.placements,
                weight: load.weight,
                warnings: load.warnings,
              })),
              warnings: loadPlan.warnings,
            }
          : null,
        pricing: {
          lineHaulRate,
          fuelSurcharge,
          accessorialFees,
        },
        internalNotes,
        quoteNotes,
        customerAddress,
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">New Inland Quote</h1>
              <Badge variant="secondary" className="text-xs">
                v2 with Load Planner
              </Badge>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">Quote #{quoteNumber}</p>
          </div>
          <Button onClick={handleSaveQuote} disabled={createQuote.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createQuote.isPending ? 'Saving...' : 'Save Quote'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="route" className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Route</span>
              </TabsTrigger>
              <TabsTrigger value="cargo" className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Cargo</span>
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Pricing</span>
              </TabsTrigger>
              <TabsTrigger value="customer" className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Customer</span>
              </TabsTrigger>
            </TabsList>

            {/* Route Tab */}
            <TabsContent value="route" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-green-600" />
                    <CardTitle>Pickup Location</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AddressAutocomplete
                    id="pickup"
                    placeholder="Enter pickup address..."
                    value={pickupAddress}
                    onChange={setPickupAddress}
                    onSelect={(components) => {
                      setPickupAddress(components.address)
                      setPickupCity(components.city || '')
                      setPickupState(components.state || '')
                      setPickupZip(components.zip || '')
                      setPickupLat(components.lat)
                      setPickupLng(components.lng)
                    }}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">City</Label>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={pickupCity}
                        onChange={(e) => setPickupCity(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">State</Label>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={pickupState}
                        onChange={(e) => setPickupState(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">ZIP</Label>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={pickupZip}
                        onChange={(e) => setPickupZip(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-red-600" />
                    <CardTitle>Dropoff Location</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AddressAutocomplete
                    id="dropoff"
                    placeholder="Enter dropoff address..."
                    value={dropoffAddress}
                    onChange={setDropoffAddress}
                    onSelect={(components) => {
                      setDropoffAddress(components.address)
                      setDropoffCity(components.city || '')
                      setDropoffState(components.state || '')
                      setDropoffZip(components.zip || '')
                      setDropoffLat(components.lat)
                      setDropoffLng(components.lng)
                    }}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">City</Label>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={dropoffCity}
                        onChange={(e) => setDropoffCity(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">State</Label>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={dropoffState}
                        onChange={(e) => setDropoffState(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">ZIP</Label>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={dropoffZip}
                        onChange={(e) => setDropoffZip(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={() => setActiveTab('cargo')} className="w-full">
                Continue to Cargo
              </Button>
            </TabsContent>

            {/* Cargo Tab */}
            <TabsContent value="cargo" className="space-y-4 mt-4">
              {/* AI Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Cargo Data
                  </CardTitle>
                  <CardDescription>
                    Drop an Excel file, image, or paste cargo info - AI will extract the details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UniversalDropzone
                    onAnalyzed={handleAnalyzed}
                    onLoading={setIsAnalyzing}
                    onError={setAnalysisError}
                  />
                  {analysisError && (
                    <p className="text-sm text-red-500 mt-2">{analysisError}</p>
                  )}
                </CardContent>
              </Card>

              {/* Extracted Items */}
              {cargoItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Cargo Items ({cargoItems.length})
                    </CardTitle>
                    <CardDescription>
                      Review and edit the extracted cargo. All dimensions are in feet.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ExtractedItemsList items={cargoItems} onChange={setCargoItems} />
                  </CardContent>
                </Card>
              )}

              {/* Load Plan Visualization */}
              {loadPlan && loadPlan.loads.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Load Plan
                    </CardTitle>
                    <CardDescription>
                      {loadPlan.totalTrucks} truck{loadPlan.totalTrucks > 1 ? 's' : ''} required for{' '}
                      {loadPlan.totalItems} item{loadPlan.totalItems > 1 ? 's' : ''} ({(loadPlan.totalWeight / 1000).toFixed(1)}k lbs)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loadPlan.warnings.length > 0 && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-800 mb-1">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm font-medium">Warnings</span>
                        </div>
                        <ul className="text-sm text-yellow-700 list-disc list-inside">
                          {loadPlan.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {loadPlan.loads.map((load, index) => (
                      <Card key={load.id} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-medium">{load.recommendedTruck.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {load.items.length} items &bull; {(load.weight / 1000).toFixed(1)}k lbs
                                </div>
                              </div>
                            </div>
                            <TruckSelector
                              currentTruck={load.recommendedTruck}
                              onChange={(truck) => handleTruckChange(index, truck)}
                              itemsWeight={load.weight}
                              maxItemLength={Math.max(...load.items.map((i) => i.length))}
                              maxItemWidth={Math.max(...load.items.map((i) => i.width))}
                              maxItemHeight={Math.max(...load.items.map((i) => i.height))}
                            />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <TrailerDiagram
                            truck={load.recommendedTruck}
                            items={load.items}
                            placements={load.placements}
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setActiveTab('route')}>
                  Back
                </Button>
                <Button onClick={() => setActiveTab('pricing')} className="flex-1">
                  Continue to Pricing
                </Button>
              </div>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pricing</CardTitle>
                  <CardDescription>Enter transportation rates and fees</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Line Haul Rate</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <input
                          type="number"
                          className="flex h-10 w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm font-mono"
                          value={lineHaulRate || ''}
                          onChange={(e) => setLineHaulRate(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Fuel Surcharge</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <input
                          type="number"
                          className="flex h-10 w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm font-mono"
                          value={fuelSurcharge || ''}
                          onChange={(e) => setFuelSurcharge(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Accessorial Fees</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <input
                          type="number"
                          className="flex h-10 w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm font-mono"
                          value={accessorialFees || ''}
                          onChange={(e) => setAccessorialFees(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-medium">Total</span>
                    <span className="text-2xl font-bold font-mono text-primary">
                      {formatCurrency(total * 100)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Quote Notes (visible to customer)</Label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Terms, conditions, special instructions..."
                      value={quoteNotes}
                      onChange={(e) => setQuoteNotes(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Internal Notes (not visible to customer)</Label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Internal notes..."
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setActiveTab('cargo')}>
                  Back
                </Button>
                <Button onClick={() => setActiveTab('customer')} className="flex-1">
                  Continue to Customer
                </Button>
              </div>
            </TabsContent>

            {/* Customer Tab */}
            <TabsContent value="customer" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                  <CardDescription>Enter customer details or select from existing companies</CardDescription>
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
                    notes=""
                    onNotesChange={() => {}}
                  />
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setActiveTab('pricing')}>
                  Back
                </Button>
                <Button
                  onClick={handleSaveQuote}
                  className="flex-1"
                  disabled={createQuote.isPending}
                >
                  {createQuote.isPending ? 'Creating...' : 'Create Quote'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quote Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Route Summary */}
              {(pickupAddress || dropoffAddress) && (
                <div className="space-y-2">
                  {pickupAddress && (
                    <div className="text-sm">
                      <span className="text-green-600 font-medium">From:</span>{' '}
                      {pickupCity || pickupAddress}
                      {pickupState && `, ${pickupState}`}
                    </div>
                  )}
                  {dropoffAddress && (
                    <div className="text-sm">
                      <span className="text-red-600 font-medium">To:</span>{' '}
                      {dropoffCity || dropoffAddress}
                      {dropoffState && `, ${dropoffState}`}
                    </div>
                  )}
                  {distanceMiles && (
                    <div className="text-sm text-muted-foreground">
                      Distance: {distanceMiles.toLocaleString()} miles
                    </div>
                  )}
                </div>
              )}

              {/* Cargo Summary */}
              {cargoItems.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Cargo</div>
                    <div className="text-sm text-muted-foreground">
                      {cargoItems.reduce((sum, i) => sum + i.quantity, 0)} items
                      {loadPlan && (
                        <>
                          {' '}
                          &bull; {(loadPlan.totalWeight / 1000).toFixed(1)}k lbs
                        </>
                      )}
                    </div>
                    {loadPlan && (
                      <Badge variant="outline">
                        {loadPlan.totalTrucks} truck{loadPlan.totalTrucks > 1 ? 's' : ''} needed
                      </Badge>
                    )}
                  </div>
                </>
              )}

              {/* Pricing Summary */}
              {subtotal > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Line Haul</span>
                      <span className="font-mono">{formatCurrency(lineHaulRate * 100)}</span>
                    </div>
                    {fuelSurcharge > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Fuel Surcharge</span>
                        <span className="font-mono">{formatCurrency(fuelSurcharge * 100)}</span>
                      </div>
                    )}
                    {accessorialFees > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Accessorials</span>
                        <span className="font-mono">{formatCurrency(accessorialFees * 100)}</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              <Separator />

              <div className="flex justify-between items-center">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold font-mono text-primary">
                  {formatCurrency(total * 100)}
                </span>
              </div>

              <div className="text-sm text-muted-foreground text-center pt-2">
                {formatDate(new Date())}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
