'use client'

import { useState, useEffect } from 'react'
import { supabase, QuoteHistory, ALL_COST_FIELDS, CompanySettings, QuoteData, Location, LocationCost, MiscellaneousFee, QuoteStatus, QUOTE_STATUSES, QuoteHistoryExtended } from '../lib/supabase'
import { generateQuotePDF } from '../lib/quoteGenerator'

interface QuoteHistoryViewProps {
  showToast: (message: string, type: 'success' | 'error') => void
}

export default function QuoteHistoryView({ showToast }: QuoteHistoryViewProps) {
  const [quotes, setQuotes] = useState<QuoteHistoryExtended[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null)
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [locationFilter, setLocationFilter] = useState('')

  // Edit modal state
  const [editingQuote, setEditingQuote] = useState<QuoteHistory | null>(null)
  const [editForm, setEditForm] = useState<Record<string, number | null>>({})
  const [editMargin, setEditMargin] = useState(0)
  const [editCustomerName, setEditCustomerName] = useState('')
  const [editCustomerEmail, setEditCustomerEmail] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchQuotes()
    fetchCompanySettings()
  }, [])

  const fetchCompanySettings = async () => {
    const { data } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .single()
    if (data) setCompanySettings(data)
  }

  const fetchQuotes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('quote_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setQuotes(data || [])
    } catch (error) {
      console.error('Error fetching quotes:', error)
      showToast('Error loading quote history', 'error')
    } finally {
      setLoading(false)
    }
  }

  const deleteQuote = async (id: string) => {
    if (!confirm('Delete this quote from history?')) return

    try {
      const { error } = await supabase
        .from('quote_history')
        .delete()
        .eq('id', id)

      if (error) throw error
      setQuotes(prev => prev.filter(q => q.id !== id))
      showToast('Quote deleted', 'success')
    } catch (error) {
      console.error('Error deleting quote:', error)
      showToast('Error deleting quote', 'error')
    }
  }

  // Download PDF from quote history
  const downloadQuote = (quote: QuoteHistory) => {
    // Build LocationCost-like object from quote data
    const costs: Partial<LocationCost> = {}
    ALL_COST_FIELDS.forEach(field => {
      const value = quote[field.key as keyof QuoteHistory] as number | null
      if (value !== null) {
        (costs as Record<string, number | null>)[field.key] = value
      }
    })

    const quoteData: QuoteData = {
      equipment: {
        id: quote.rate_id || '',
        make: quote.equipment_make,
        model: quote.equipment_model,
        price: null,
        notes: quote.notes,
        updated_at: quote.created_at,
        make_id: '',
        model_id: ''
      },
      location: quote.location as Location,
      costs: costs as LocationCost,
      customerName: quote.customer_name || undefined,
      customerEmail: quote.customer_email || undefined,
      quoteDate: new Date(quote.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      quoteNumber: quote.quote_number,
      marginPercentage: quote.margin_percentage,
      companySettings: companySettings || undefined
    }

    generateQuotePDF(quoteData)
    showToast('Quote PDF downloaded!', 'success')
  }

  // Open edit modal
  const openEditModal = (quote: QuoteHistory) => {
    setEditingQuote(quote)
    const form: Record<string, number | null> = {}
    ALL_COST_FIELDS.forEach(field => {
      form[field.key] = quote[field.key as keyof QuoteHistory] as number | null
    })
    setEditForm(form)
    setEditMargin(quote.margin_percentage)
    setEditCustomerName(quote.customer_name || '')
    setEditCustomerEmail(quote.customer_email || '')
  }

  // Save edited quote as new version
  const saveEditedQuote = async (saveAsNew: boolean) => {
    if (!editingQuote) return

    setSaving(true)
    try {
      const subtotal = ALL_COST_FIELDS.reduce((sum, field) => {
        return sum + (editForm[field.key] || 0)
      }, 0)
      const marginAmount = subtotal * (editMargin / 100)
      const totalWithMargin = subtotal + marginAmount

      // Generate new quote number for new version
      const date = new Date()
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
      const newQuoteNumber = saveAsNew
        ? `QT-${year}${month}${day}-${random}`
        : editingQuote.quote_number

      // Base quote record
      const quoteRecord: Record<string, unknown> = {
        quote_number: newQuoteNumber,
        rate_id: editingQuote.rate_id,
        equipment_make: editingQuote.equipment_make,
        equipment_model: editingQuote.equipment_model,
        location: editingQuote.location,
        dismantling_loading_cost: editForm.dismantling_loading_cost,
        loading_cost: editForm.loading_cost,
        blocking_bracing_cost: editForm.blocking_bracing_cost,
        ncb_survey_cost: editForm.ncb_survey_cost,
        local_drayage_cost: editForm.local_drayage_cost,
        chassis_cost: editForm.chassis_cost,
        tolls_cost: editForm.tolls_cost,
        escorts_cost: editForm.escorts_cost,
        power_wash_cost: editForm.power_wash_cost,
        waste_fluids_disposal_fee: editForm.waste_fluids_disposal_fee,
        miscellaneous_costs: editForm.miscellaneous_costs,
        margin_percentage: editMargin,
        margin_amount: marginAmount,
        subtotal: subtotal,
        total_with_margin: totalWithMargin,
        customer_name: editCustomerName || null,
        customer_email: editCustomerEmail || null
      }

      if (saveAsNew) {
        // Version tracking: increment version, set parent and original
        const newVersion = (editingQuote.version || 1) + 1
        const originalId = editingQuote.original_quote_id || editingQuote.id

        quoteRecord.version = newVersion
        quoteRecord.parent_quote_id = editingQuote.id
        quoteRecord.original_quote_id = originalId

        // Insert as new quote version
        const { data, error } = await supabase
          .from('quote_history')
          .insert(quoteRecord)
          .select()
          .single()

        if (error) throw error
        if (data) {
          setQuotes(prev => [data, ...prev])
        }
        showToast(`Version ${newVersion} saved!`, 'success')
      } else {
        // Update existing quote
        const { error } = await supabase
          .from('quote_history')
          .update(quoteRecord)
          .eq('id', editingQuote.id)

        if (error) throw error
        setQuotes(prev => prev.map(q =>
          q.id === editingQuote.id ? { ...q, ...quoteRecord } : q
        ))
        showToast('Quote updated!', 'success')
      }

      setEditingQuote(null)
    } catch (error) {
      console.error('Error saving quote:', error)
      showToast('Error saving quote', 'error')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Duplicate quote function
  const duplicateQuote = (quote: QuoteHistoryExtended) => {
    // Emit event or callback to QuoteView to pre-fill with this quote's data
    // For now, show a toast with instructions
    showToast(`To duplicate: Go to Generate Quote and select ${quote.equipment_make} ${quote.equipment_model}`, 'success')
  }

  // Update quote status
  const updateQuoteStatus = async (quoteId: string, newStatus: QuoteStatus) => {
    try {
      const { error } = await supabase
        .from('quote_history')
        .update({ status: newStatus })
        .eq('id', quoteId)

      if (error) throw error

      setQuotes(prev => prev.map(q =>
        q.id === quoteId ? { ...q, status: newStatus } : q
      ))
      showToast(`Quote status updated to ${newStatus}`, 'success')
    } catch (error) {
      console.error('Error updating status:', error)
      showToast('Failed to update status', 'error')
    }
  }

  // Get status badge color
  const getStatusColor = (status?: QuoteStatus) => {
    const statusConfig = QUOTE_STATUSES.find(s => s.value === status)
    if (!statusConfig) return 'bg-gray-100 text-gray-700'
    switch (statusConfig.color) {
      case 'blue': return 'bg-blue-100 text-blue-700'
      case 'green': return 'bg-green-100 text-green-700'
      case 'red': return 'bg-red-100 text-red-700'
      case 'amber': return 'bg-amber-100 text-amber-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setDateFrom('')
    setDateTo('')
    setAmountMin('')
    setAmountMax('')
    setLocationFilter('')
  }

  // Check if any filters are active
  const hasActiveFilters = searchTerm || statusFilter || dateFrom || dateTo || amountMin || amountMax || locationFilter

  const filteredQuotes = quotes.filter(quote => {
    // Text search
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const matchesSearch = (
        quote.quote_number.toLowerCase().includes(search) ||
        quote.equipment_make.toLowerCase().includes(search) ||
        quote.equipment_model.toLowerCase().includes(search) ||
        quote.customer_name?.toLowerCase().includes(search) ||
        quote.location.toLowerCase().includes(search)
      )
      if (!matchesSearch) return false
    }

    // Status filter
    if (statusFilter && quote.status !== statusFilter) return false

    // Location filter
    if (locationFilter && quote.location !== locationFilter) return false

    // Date range filter
    if (dateFrom) {
      const quoteDate = new Date(quote.created_at)
      const fromDate = new Date(dateFrom)
      if (quoteDate < fromDate) return false
    }
    if (dateTo) {
      const quoteDate = new Date(quote.created_at)
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59) // Include the entire day
      if (quoteDate > toDate) return false
    }

    // Amount range filter
    if (amountMin && quote.total_with_margin < parseFloat(amountMin)) return false
    if (amountMax && quote.total_with_margin > parseFloat(amountMax)) return false

    return true
  })

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Skeleton for search */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="h-10 bg-gray-200 rounded-md animate-pulse" />
        </div>
        {/* Skeleton for quotes list */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-4 border-b last:border-b-0">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
                    <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Get unique locations from quotes
  const uniqueLocations = [...new Set(quotes.map(q => q.location))].sort()

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
        {/* Main Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by quote #, equipment, customer, or location..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-md transition-colors flex items-center gap-2 ${
              showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {hasActiveFilters && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">!</span>
            )}
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="pt-4 border-t space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | '')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  {QUOTE_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Locations</option>
                  {uniqueLocations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Amount Min */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Min Amount</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={amountMin}
                    onChange={(e) => setAmountMin(e.target.value)}
                    placeholder="0"
                    className="w-full pl-6 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Amount Max */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Max Amount</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={amountMax}
                    onChange={(e) => setAmountMax(e.target.value)}
                    placeholder="∞"
                    className="w-full pl-6 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm text-gray-500">
                  Showing {filteredQuotes.length} of {quotes.length} quotes
                </span>
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quotes List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {filteredQuotes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'No quotes match your search' : 'No quotes generated yet'}
          </div>
        ) : (
          <div className="divide-y">
            {filteredQuotes.map(quote => (
              <div key={quote.id} className="hover:bg-gray-50">
                {/* Main Row */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedQuote(expandedQuote === quote.id ? null : quote.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-semibold text-blue-600">{quote.quote_number}</span>
                      {(quote.version || 1) > 1 && (
                        <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">
                          v{quote.version}
                        </span>
                      )}
                      {/* Status Badge */}
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getStatusColor(quote.status)}`}>
                        {QUOTE_STATUSES.find(s => s.value === quote.status)?.label || 'Sent'}
                      </span>
                      <span className="text-gray-600">{quote.equipment_make} {quote.equipment_model}</span>
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">{quote.location}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>{formatDate(quote.created_at)}</span>
                      {quote.customer_name && (
                        <span>Customer: {quote.customer_name}</span>
                      )}
                      {quote.expiration_date && (
                        <span className={new Date(quote.expiration_date) < new Date() ? 'text-red-500' : ''}>
                          Expires: {new Date(quote.expiration_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-2">
                      <div className="font-semibold text-gray-900">{formatCurrency(quote.total_with_margin)}</div>
                      {quote.margin_percentage > 0 && (
                        <div className="text-xs text-green-600">+{quote.margin_percentage}% margin</div>
                      )}
                    </div>
                    {/* Status Dropdown */}
                    <select
                      value={quote.status || 'sent'}
                      onChange={(e) => {
                        e.stopPropagation()
                        updateQuoteStatus(quote.id, e.target.value as QuoteStatus)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {QUOTE_STATUSES.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        downloadQuote(quote)
                      }}
                      className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded flex items-center gap-1"
                      title="Download PDF"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      PDF
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        duplicateQuote(quote)
                      }}
                      className="px-3 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded"
                      title="Duplicate this quote"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditModal(quote)
                      }}
                      className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteQuote(quote.id)
                      }}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                    >
                      Delete
                    </button>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedQuote === quote.id ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedQuote === quote.id && (
                  <div className="px-4 pb-4 bg-gray-50 border-t">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                      {ALL_COST_FIELDS.map(field => {
                        const value = quote[field.key as keyof QuoteHistory] as number | null
                        if (value === null) return null
                        return (
                          <div key={field.key}>
                            <div className="text-xs text-gray-500 uppercase">{field.label}</div>
                            <div className="font-medium">{formatCurrency(value)}</div>
                          </div>
                        )
                      })}
                      <div>
                        <div className="text-xs text-gray-500 uppercase">Subtotal</div>
                        <div className="font-medium">{formatCurrency(quote.subtotal)}</div>
                      </div>
                      {quote.margin_percentage > 0 && (
                        <>
                          <div>
                            <div className="text-xs text-gray-500 uppercase">Margin ({quote.margin_percentage}%)</div>
                            <div className="font-medium text-green-600">+{formatCurrency(quote.margin_amount)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 uppercase">Total with Margin</div>
                            <div className="font-semibold text-lg">{formatCurrency(quote.total_with_margin)}</div>
                          </div>
                        </>
                      )}
                    </div>
                    {quote.customer_email && (
                      <div className="text-sm text-gray-600">
                        Email: {quote.customer_email}
                      </div>
                    )}
                    {quote.notes && (
                      <div className="mt-2 text-sm text-gray-600">
                        Notes: {quote.notes}
                      </div>
                    )}
                    {quote.internal_notes && (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="text-xs font-medium text-amber-700 mb-1">Internal Notes</div>
                        <div className="text-sm text-amber-900">{quote.internal_notes}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {quotes.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{quotes.length}</div>
              <div className="text-sm text-gray-500">Total Quotes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(quotes.reduce((sum, q) => sum + q.total_with_margin, 0))}
              </div>
              <div className="text-sm text-gray-500">Total Value</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(quotes.reduce((sum, q) => sum + q.total_with_margin, 0) / quotes.length)}
              </div>
              <div className="text-sm text-gray-500">Average Quote</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(quotes.reduce((sum, q) => sum + q.margin_amount, 0))}
              </div>
              <div className="text-sm text-gray-500">Total Margin</div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Quote: {editingQuote.quote_number}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {editingQuote.equipment_make} {editingQuote.equipment_model} - {editingQuote.location}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
                  <input
                    type="email"
                    value={editCustomerEmail}
                    onChange={(e) => setEditCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Cost Fields */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Cost Items</h4>
                <div className="grid grid-cols-2 gap-4">
                  {ALL_COST_FIELDS.map(field => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editForm[field.key] ?? ''}
                          onChange={(e) => setEditForm(prev => ({
                            ...prev,
                            [field.key]: e.target.value === '' ? null : parseFloat(e.target.value)
                          }))}
                          className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Margin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Margin %</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={editMargin}
                  onChange={(e) => setEditMargin(parseFloat(e.target.value) || 0)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Calculated Totals */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">
                    {formatCurrency(ALL_COST_FIELDS.reduce((sum, field) => sum + (editForm[field.key] || 0), 0))}
                  </span>
                </div>
                {editMargin > 0 && (
                  <div className="flex justify-between py-1 text-green-600">
                    <span>Margin ({editMargin}%):</span>
                    <span className="font-medium">
                      +{formatCurrency(ALL_COST_FIELDS.reduce((sum, field) => sum + (editForm[field.key] || 0), 0) * (editMargin / 100))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-t mt-2 font-bold">
                  <span>Total:</span>
                  <span>
                    {formatCurrency(
                      ALL_COST_FIELDS.reduce((sum, field) => sum + (editForm[field.key] || 0), 0) * (1 + editMargin / 100)
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-between">
              <button
                onClick={() => setEditingQuote(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => saveEditedQuote(false)}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Update Quote'}
                </button>
                <button
                  onClick={() => saveEditedQuote(true)}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Save as New Version'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
