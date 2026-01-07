'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { DestinationBlock } from '@/components/inland/destination-block'
import { trpc } from '@/lib/trpc/client'
import { generateInlandQuoteNumber, formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { Plus, FileDown, Eye, Building2, Search } from 'lucide-react'
import type { InlandDestinationBlock, InlandLoadBlock } from '@/types/inland'

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

  // Margin
  const [marginPercentage, setMarginPercentage] = useState(15)

  // Notes
  const [internalNotes, setInternalNotes] = useState('')
  const [quoteNotes, setQuoteNotes] = useState('')

  // Company search
  const [showCompanySearch, setShowCompanySearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Generate quote number on mount
  useEffect(() => {
    setQuoteNumber(generateInlandQuoteNumber())
  }, [])

  // Fetch data
  const { data: truckTypes } = trpc.inland.getEquipmentTypes.useQuery()
  const { data: accessorialTypes } = trpc.inland.getAccessorialTypes.useQuery()

  // Company search
  const { data: searchResults } = trpc.companies.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  )

  // Calculate totals
  const subtotal = destinationBlocks.reduce((sum, block) => sum + block.subtotal, 0)
  const marginAmount = Math.round(subtotal * (marginPercentage / 100))
  const total = subtotal + marginAmount

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

  // Create quote mutation
  const createQuote = trpc.inland.create.useMutation({
    onSuccess: () => {
      toast.success('Inland quote created successfully')
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
      margin_percentage: marginPercentage,
      margin_amount: marginAmount,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Inland Quote</h1>
          <p className="text-muted-foreground">Quote #{quoteNumber}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" title="Preview PDF">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" title="Download PDF">
            <FileDown className="h-4 w-4" />
          </Button>
          <Button variant="outline">Save Draft</Button>
          <Button onClick={handleSaveQuote} disabled={createQuote.isPending}>
            {createQuote.isPending ? 'Saving...' : 'Create Quote'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  type="button"
                  variant={showCompanySearch ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowCompanySearch(!showCompanySearch)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  {showCompanySearch ? 'Manual Entry' : 'Search Companies'}
                </Button>
              </div>

              {showCompanySearch && (
                <div className="space-y-2 mb-4 p-4 rounded-lg border bg-muted/30">
                  <Label>Search Existing Companies</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by company name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {searchResults && searchResults.length > 0 && (
                    <div className="mt-2 border rounded-lg divide-y">
                      {searchResults.map((company) => (
                        <button
                          key={company.id}
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            setSelectedCompanyId(company.id)
                            setCustomerCompany(company.name)
                            if (company.phone) setCustomerPhone(company.phone)
                            setShowCompanySearch(false)
                            setSearchQuery('')
                          }}
                        >
                          <p className="font-medium">{company.name}</p>
                          {company.phone && (
                            <p className="text-sm text-muted-foreground">{company.phone}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Contact Name *</Label>
                  <Input
                    id="customerName"
                    placeholder="John Smith"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerCompany">Company</Label>
                  <Input
                    id="customerCompany"
                    placeholder="Acme Construction"
                    value={customerCompany}
                    onChange={(e) => setCustomerCompany(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    placeholder="john@company.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Destinations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Destinations</h2>
              <Button onClick={addDestination} disabled={destinationBlocks.length >= 6}>
                <Plus className="h-4 w-4 mr-2" />
                Add Destination
              </Button>
            </div>

            {destinationBlocks.map((block, index) => (
              <DestinationBlock
                key={block.id}
                block={block}
                onUpdate={(b) => updateDestination(index, b)}
                onRemove={() => removeDestination(index)}
                canRemove={destinationBlocks.length > 1}
                truckTypes={truckTypes || []}
                accessorialTypes={accessorialTypes || []}
              />
            ))}
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
        <div>
          <Card className="sticky top-20">
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

                <div className="space-y-1">
                  <Label htmlFor="margin" className="text-sm">
                    Margin (%)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="margin"
                      type="number"
                      min="0"
                      max="100"
                      value={marginPercentage}
                      onChange={(e) => setMarginPercentage(Number(e.target.value))}
                      className="w-20 text-right font-mono"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                    <span className="flex-1 text-right font-mono text-sm">
                      {formatCurrency(marginAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

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
        </div>
      </div>
    </div>
  )
}
