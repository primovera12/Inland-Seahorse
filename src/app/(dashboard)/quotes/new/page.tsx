'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EquipmentSelector } from '@/components/quotes/equipment-selector'
import { CustomerForm } from '@/components/quotes/customer-form'
import { CostBreakdown } from '@/components/quotes/cost-breakdown'
import { QuoteSummary } from '@/components/quotes/quote-summary'
import { trpc } from '@/lib/trpc/client'
import { LOCATIONS, COST_FIELDS, type LocationName, type CostField } from '@/types/equipment'
import { generateQuoteNumber } from '@/lib/utils'
import { toast } from 'sonner'

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

export default function NewQuotePage() {
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

  // Costs
  const [costs, setCosts] = useState<CostState>(initialCosts)
  const [enabledCosts, setEnabledCosts] = useState<EnabledState>(initialEnabled)
  const [costOverrides, setCostOverrides] = useState<Record<CostField, number | null>>(
    COST_FIELDS.reduce((acc, field) => ({ ...acc, [field]: null }), {} as Record<CostField, number | null>)
  )

  // Margin
  const [marginPercentage, setMarginPercentage] = useState(15)

  // Customer
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerCompany, setCustomerCompany] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)

  // Quote
  const [quoteNumber, setQuoteNumber] = useState('')
  const [notes, setNotes] = useState('')

  // Generate quote number on mount
  useEffect(() => {
    setQuoteNumber(generateQuoteNumber())
  }, [])

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
    }
  }, [modelDimensions])

  // Calculate totals
  const subtotal = COST_FIELDS.reduce((total, field) => {
    if (!enabledCosts[field]) return total
    const cost = costOverrides[field] ?? costs[field]
    return total + cost
  }, 0)

  const marginAmount = Math.round(subtotal * (marginPercentage / 100))
  const total = subtotal + marginAmount

  // Save quote mutation
  const createQuote = trpc.quotes.create.useMutation({
    onSuccess: () => {
      toast.success('Quote created successfully')
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
      company_id: selectedCompanyId || undefined,
      contact_id: selectedContactId || undefined,
      make_id: selectedMakeId || undefined,
      model_id: selectedModelId || undefined,
      make_name: makeName,
      model_name: modelName,
      location: selectedLocation,
      subtotal,
      margin_percentage: marginPercentage,
      margin_amount: marginAmount,
      total,
      quote_data: {
        costs,
        enabledCosts,
        costOverrides,
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
          <p className="text-muted-foreground">
            Quote #{quoteNumber}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Save Draft</Button>
          <Button onClick={handleSaveQuote} disabled={createQuote.isPending}>
            {createQuote.isPending ? 'Saving...' : 'Create Quote'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="equipment" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="equipment">Equipment</TabsTrigger>
              <TabsTrigger value="costs">Costs</TabsTrigger>
              <TabsTrigger value="customer">Customer</TabsTrigger>
            </TabsList>

            <TabsContent value="equipment" className="mt-4">
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
                  />
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
                    onCustomerNameChange={setCustomerName}
                    onCustomerEmailChange={setCustomerEmail}
                    onCustomerPhoneChange={setCustomerPhone}
                    onCustomerCompanyChange={setCustomerCompany}
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

        <div>
          <QuoteSummary
            makeName={makeName}
            modelName={modelName}
            location={selectedLocation}
            subtotal={subtotal}
            marginPercentage={marginPercentage}
            marginAmount={marginAmount}
            total={total}
            onMarginChange={setMarginPercentage}
          />
        </div>
      </div>
    </div>
  )
}
