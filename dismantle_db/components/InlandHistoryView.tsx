'use client'

import { useState, useEffect } from 'react'
import { supabase, InlandQuote, InlandQuoteStatus, InlandQuoteFormData } from '@/lib/supabase'
import { generateInlandQuotePdf } from '@/lib/inlandQuoteGenerator'

interface InlandHistoryViewProps {
  onEditQuote?: (quoteData: { quoteNumber: string; formData: InlandQuoteFormData; quoteId: string }) => void
}

// Format currency
function formatCurrency(amount: number | null): string {
  if (amount === null) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

// Format date
function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr))
}

// Status badge colors
const statusColors: Record<InlandQuoteStatus, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
  sent: { bg: 'bg-blue-100', text: 'text-blue-700' },
  accepted: { bg: 'bg-green-100', text: 'text-green-700' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700' },
  expired: { bg: 'bg-amber-100', text: 'text-amber-700' },
}

export default function InlandHistoryView({ onEditQuote }: InlandHistoryViewProps) {
  const [quotes, setQuotes] = useState<InlandQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<InlandQuoteStatus | 'all'>('all')
  const [selectedQuote, setSelectedQuote] = useState<InlandQuote | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  // Load quotes on mount
  useEffect(() => {
    loadQuotes()
  }, [])

  const loadQuotes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('inland_quotes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setQuotes(data || [])
    } catch (err) {
      console.error('Error loading quotes:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter quotes
  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch =
      !searchTerm ||
      quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.client_company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.pickup_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.dropoff_city?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Update quote status
  const updateStatus = async (quoteId: string, newStatus: InlandQuoteStatus) => {
    try {
      const { error } = await supabase
        .from('inland_quotes')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', quoteId)

      if (error) throw error

      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: newStatus } : q))
      )

      if (selectedQuote?.id === quoteId) {
        setSelectedQuote((prev) => (prev ? { ...prev, status: newStatus } : null))
      }
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  // Delete quote
  const deleteQuote = async (quoteId: string) => {
    if (!confirm('Are you sure you want to delete this quote?')) return

    try {
      const { error } = await supabase.from('inland_quotes').delete().eq('id', quoteId)

      if (error) throw error

      setQuotes((prev) => prev.filter((q) => q.id !== quoteId))
      if (selectedQuote?.id === quoteId) {
        setSelectedQuote(null)
      }
    } catch (err) {
      console.error('Error deleting quote:', err)
    }
  }

  // Download PDF for a quote
  const downloadPdf = async (quote: InlandQuote) => {
    setIsGeneratingPdf(true)
    try {
      // Reconstruct the data needed for PDF generation
      const pdfBlob = await generateInlandQuotePdf({
        quoteNumber: quote.quote_number,
        formData: {
          client_name: quote.client_name,
          client_company: quote.client_company || '',
          client_email: quote.client_email || '',
          client_phone: quote.client_phone || '',
          client_address: '',
          billing_address: quote.billing_address || '',
          billing_city: quote.billing_city || '',
          billing_state: quote.billing_state || '',
          billing_zip: quote.billing_zip || '',
          payment_terms: quote.payment_terms || 'Net 30',
          work_order_number: '',
          pickup: quote.pickup_place_id
            ? {
                address: quote.pickup_address,
                city: quote.pickup_city || '',
                state: quote.pickup_state || '',
                zip: quote.pickup_zip || '',
                country: quote.pickup_country || 'USA',
                formatted_address: quote.pickup_formatted_address || quote.pickup_address,
                place_id: quote.pickup_place_id,
                lat: quote.pickup_lat || 0,
                lng: quote.pickup_lng || 0,
              }
            : null,
          dropoff: quote.dropoff_place_id
            ? {
                address: quote.dropoff_address,
                city: quote.dropoff_city || '',
                state: quote.dropoff_state || '',
                zip: quote.dropoff_zip || '',
                country: quote.dropoff_country || 'USA',
                formatted_address: quote.dropoff_formatted_address || quote.dropoff_address,
                place_id: quote.dropoff_place_id,
                lat: quote.dropoff_lat || 0,
                lng: quote.dropoff_lng || 0,
              }
            : null,
          route: quote.distance_miles
            ? {
                distance_meters: quote.distance_meters || 0,
                distance_miles: quote.distance_miles,
                duration_seconds: (quote.duration_minutes || 0) * 60,
                duration_minutes: quote.duration_minutes || 0,
                duration_text: quote.duration_text || '',
                polyline: quote.route_polyline || '',
              }
            : null,
          rate_per_mile: quote.rate_per_mile || 0,
          base_rate: quote.base_rate || 0,
          fuel_surcharge_percent: quote.fuel_surcharge_percent || 0,
          margin_percentage: quote.margin_percentage || 0,
          manual_total: null,
          use_manual_pricing: false,
          equipment_type_id: '',
          equipment_description: quote.equipment_description || '',
          weight_lbs: quote.weight_lbs,
          internal_notes: quote.internal_notes || '',
          customer_notes: quote.customer_notes || '',
          special_instructions: quote.special_instructions || '',
          accessorial_charges: [],
          stops: [],
          service_items: [],
          cargo_items: [],
          load_image_base64: null,
          load_blocks: [],
          destination_blocks: [],
        },
        totals: {
          lineHaul: quote.line_haul_total || 0,
          fuelSurcharge: quote.fuel_surcharge_amount || 0,
          accessorialTotal: quote.accessorial_total || 0,
          serviceItemsTotal: 0,
          subtotal: quote.subtotal || 0,
          marginAmount: quote.margin_amount || 0,
          total: quote.total_amount || 0,
        },
        route: quote.distance_miles
          ? {
              distance_meters: quote.distance_meters || 0,
              distance_miles: quote.distance_miles,
              duration_seconds: (quote.duration_minutes || 0) * 60,
              duration_minutes: quote.duration_minutes || 0,
              duration_text: quote.duration_text || '',
              polyline: quote.route_polyline || '',
            }
          : null,
        accessorialCharges: [],
      })

      // Download
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Inland_Quote_${quote.quote_number}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error generating PDF:', err)
      alert('Failed to generate PDF')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // Edit quote - reconstruct form data and navigate to edit
  const editQuote = (quote: InlandQuote) => {
    if (!onEditQuote) return

    // Reconstruct form data from saved quote
    const formData: InlandQuoteFormData = {
      client_name: quote.client_name,
      client_company: quote.client_company || '',
      client_email: quote.client_email || '',
      client_phone: quote.client_phone || '',
      client_address: '',
      billing_address: quote.billing_address || '',
      billing_city: quote.billing_city || '',
      billing_state: quote.billing_state || '',
      billing_zip: quote.billing_zip || '',
      payment_terms: quote.payment_terms || 'Net 30',
      work_order_number: '',
      pickup: quote.pickup_place_id
        ? {
            address: quote.pickup_address,
            city: quote.pickup_city || '',
            state: quote.pickup_state || '',
            zip: quote.pickup_zip || '',
            country: quote.pickup_country || 'USA',
            formatted_address: quote.pickup_formatted_address || quote.pickup_address,
            place_id: quote.pickup_place_id,
            lat: quote.pickup_lat || 0,
            lng: quote.pickup_lng || 0,
          }
        : null,
      dropoff: quote.dropoff_place_id
        ? {
            address: quote.dropoff_address,
            city: quote.dropoff_city || '',
            state: quote.dropoff_state || '',
            zip: quote.dropoff_zip || '',
            country: quote.dropoff_country || 'USA',
            formatted_address: quote.dropoff_formatted_address || quote.dropoff_address,
            place_id: quote.dropoff_place_id,
            lat: quote.dropoff_lat || 0,
            lng: quote.dropoff_lng || 0,
          }
        : null,
      route: quote.distance_miles
        ? {
            distance_meters: quote.distance_meters || 0,
            distance_miles: quote.distance_miles,
            duration_seconds: (quote.duration_minutes || 0) * 60,
            duration_minutes: quote.duration_minutes || 0,
            duration_text: quote.duration_text || '',
            polyline: quote.route_polyline || '',
          }
        : null,
      rate_per_mile: quote.rate_per_mile || 0,
      base_rate: quote.base_rate || 0,
      fuel_surcharge_percent: quote.fuel_surcharge_percent || 0,
      margin_percentage: quote.margin_percentage || 0,
      manual_total: null,
      use_manual_pricing: false,
      equipment_type_id: '',
      equipment_description: quote.equipment_description || '',
      weight_lbs: quote.weight_lbs,
      internal_notes: quote.internal_notes || '',
      customer_notes: quote.customer_notes || '',
      special_instructions: quote.special_instructions || '',
      accessorial_charges: quote.accessorial_charges || [],
      stops: [],
      service_items: quote.service_items || [],
      cargo_items: quote.cargo_items || [],
      load_image_base64: quote.load_image_base64 || null,
      load_blocks: quote.load_blocks || [],
      destination_blocks: (quote as { destination_blocks?: InlandQuoteFormData['destination_blocks'] }).destination_blocks || [],
    }

    onEditQuote({
      quoteNumber: quote.quote_number,
      formData,
      quoteId: quote.id,
    })
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inland Transportation History</h1>
          <p className="text-gray-500 text-sm mt-1">{quotes.length} quotes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by quote #, client, or location..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as InlandQuoteStatus | 'all')}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Refresh button */}
          <button
            onClick={loadQuotes}
            className="px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex gap-6">
        {/* Quotes list */}
        <div className="flex-1">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading quotes...</p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 mt-4">No quotes found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuotes.map((quote) => (
                <div
                  key={quote.id}
                  onClick={() => setSelectedQuote(quote)}
                  className={`bg-white rounded-xl shadow-sm border p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedQuote?.id === quote.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{quote.quote_number}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[quote.status].bg} ${statusColors[quote.status].text}`}>
                          {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{quote.client_name}</p>
                      {quote.client_company && (
                        <p className="text-xs text-gray-500">{quote.client_company}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(quote.total_amount)}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(quote.created_at)}</p>
                    </div>
                  </div>

                  {/* Route info */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <span className="text-green-600">From:</span>
                      <span>{quote.pickup_city}, {quote.pickup_state}</span>
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    <div className="flex items-center gap-1">
                      <span className="text-red-600">To:</span>
                      <span>{quote.dropoff_city}, {quote.dropoff_state}</span>
                    </div>
                    {quote.distance_miles && (
                      <span className="text-gray-400 ml-auto">
                        {quote.distance_miles.toFixed(0)} mi
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details panel */}
        {selectedQuote && (
          <div className="w-96 bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6 h-fit">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Quote Details</h2>
              <button
                onClick={() => setSelectedQuote(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Quote info */}
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Quote Number</label>
                <p className="font-medium text-gray-900">{selectedQuote.quote_number}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Client</label>
                <p className="font-medium text-gray-900">{selectedQuote.client_name}</p>
                {selectedQuote.client_company && (
                  <p className="text-sm text-gray-600">{selectedQuote.client_company}</p>
                )}
                {selectedQuote.client_email && (
                  <p className="text-sm text-gray-600">{selectedQuote.client_email}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Distance</label>
                  <p className="font-medium text-gray-900">
                    {selectedQuote.distance_miles?.toFixed(1) || '-'} mi
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Rate/Mile</label>
                  <p className="font-medium text-gray-900">
                    {formatCurrency(selectedQuote.rate_per_mile)}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Route</label>
                <div className="mt-1 space-y-1">
                  <p className="text-sm">
                    <span className="text-green-600 font-medium">From:</span>{' '}
                    {selectedQuote.pickup_formatted_address || selectedQuote.pickup_address}
                  </p>
                  <p className="text-sm">
                    <span className="text-red-600 font-medium">To:</span>{' '}
                    {selectedQuote.dropoff_formatted_address || selectedQuote.dropoff_address}
                  </p>
                </div>
              </div>

              {/* Pricing breakdown - Load Blocks or Legacy */}
              <div className="pt-4 border-t border-gray-200">
                <label className="text-xs text-gray-500 uppercase tracking-wide">Pricing</label>

                {/* New Load Blocks format */}
                {selectedQuote.load_blocks && selectedQuote.load_blocks.length > 0 ? (
                  <div className="mt-2 space-y-3">
                    {selectedQuote.load_blocks.map((block, idx) => {
                      const blockServiceTotal = block.service_items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0
                      return (
                        <div key={block.id || idx} className="bg-blue-50 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-semibold text-blue-700">Load Block #{idx + 1}</span>
                            <span className="text-sm font-medium text-blue-600">{formatCurrency(blockServiceTotal)}</span>
                          </div>
                          {/* Service Items / Rates */}
                          {block.service_items && block.service_items.length > 0 && (
                            <div className="space-y-1 text-xs">
                              {block.service_items.map((item, itemIdx) => (
                                <div key={item.id || itemIdx} className="flex justify-between text-gray-600">
                                  <span>{item.name} {item.quantity > 1 ? `(x${item.quantity})` : ''}</span>
                                  <span>{formatCurrency(item.price * item.quantity)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Cargo summary */}
                          {block.cargo_items && block.cargo_items.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-blue-200 text-xs text-gray-500">
                              Cargo: {block.cargo_items.map(c => c.description || c.cargo_type).join(', ')}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(selectedQuote.total_amount)}</span>
                    </div>
                  </div>
                ) : (
                  /* Legacy pricing format */
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Line Haul</span>
                      <span>{formatCurrency(selectedQuote.line_haul_total)}</span>
                    </div>
                    {selectedQuote.fuel_surcharge_amount && selectedQuote.fuel_surcharge_amount > 0 && (
                      <div className="flex justify-between">
                        <span>Fuel Surcharge</span>
                        <span>{formatCurrency(selectedQuote.fuel_surcharge_amount)}</span>
                      </div>
                    )}
                    {selectedQuote.accessorial_total && selectedQuote.accessorial_total > 0 && (
                      <div className="flex justify-between">
                        <span>Accessorials</span>
                        <span>{formatCurrency(selectedQuote.accessorial_total)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-100 font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(selectedQuote.total_amount)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Status update */}
              <div className="pt-4 border-t border-gray-200">
                <label className="text-xs text-gray-500 uppercase tracking-wide">Update Status</label>
                <select
                  value={selectedQuote.status}
                  onChange={(e) => updateStatus(selectedQuote.id, e.target.value as InlandQuoteStatus)}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              {/* Actions */}
              <div className="pt-4 space-y-2">
                {onEditQuote && (
                  <button
                    onClick={() => editQuote(selectedQuote)}
                    className="w-full px-4 py-2.5 text-white bg-indigo-600 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Quote
                  </button>
                )}
                <button
                  onClick={() => downloadPdf(selectedQuote)}
                  disabled={isGeneratingPdf}
                  className="w-full px-4 py-2.5 text-white bg-blue-600 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                </button>
                <button
                  onClick={() => deleteQuote(selectedQuote.id)}
                  className="w-full px-4 py-2.5 text-red-600 bg-white border border-red-200 rounded-lg font-medium hover:bg-red-50 transition-colors"
                >
                  Delete Quote
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
