'use client'

import { useState, useEffect } from 'react'
import { supabase, QuoteStatus, QUOTE_STATUSES } from '@/lib/supabase'
import QuoteStatusWorkflow from './QuoteStatusWorkflow'

interface Quote {
  id: string
  quote_number: string
  customer_name: string | null
  customer_company?: string | null
  customer_email: string | null
  total_with_margin: number
  created_at: string
  status: QuoteStatus
  equipment_make?: string | null
  equipment_model?: string | null
  location?: string | null
  expiration_date?: string | null
  // Inland specific
  pickup_city?: string | null
  pickup_state?: string | null
  dropoff_city?: string | null
  dropoff_state?: string | null
}

interface QuotePipelineViewProps {
  showToast: (message: string, type: 'success' | 'error') => void
}

const STATUS_COLUMNS = [
  { key: 'draft', label: 'Draft', color: 'bg-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', dropBg: 'bg-gray-100' },
  { key: 'sent', label: 'Sent', color: 'bg-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', dropBg: 'bg-blue-100' },
  { key: 'accepted', label: 'Accepted', color: 'bg-green-500', bgColor: 'bg-green-50', borderColor: 'border-green-200', dropBg: 'bg-green-100' },
  { key: 'rejected', label: 'Rejected', color: 'bg-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-200', dropBg: 'bg-red-100' },
]

export default function QuotePipelineView({ showToast }: QuotePipelineViewProps) {
  const [dismantlingQuotes, setDismantlingQuotes] = useState<Quote[]>([])
  const [inlandQuotes, setInlandQuotes] = useState<Quote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline')
  const [quoteType, setQuoteType] = useState<'all' | 'dismantling' | 'inland'>('all')
  const [selectedQuote, setSelectedQuote] = useState<(Quote & { type: 'dismantling' | 'inland' }) | null>(null)

  // Drag and drop state
  const [draggedQuote, setDraggedQuote] = useState<(Quote & { type: 'dismantling' | 'inland' }) | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Fetch quotes
  const fetchQuotes = async () => {
    setIsLoading(true)
    try {
      // Fetch dismantling quotes
      const { data: dismantling, error: dismantlingError } = await supabase
        .from('quote_history')
        .select('*')
        .order('created_at', { ascending: false })

      if (dismantlingError) throw dismantlingError

      // Fetch inland quotes
      const { data: inland, error: inlandError } = await supabase
        .from('inland_quotes')
        .select('*')
        .order('created_at', { ascending: false })

      if (inlandError) throw inlandError

      setDismantlingQuotes(dismantling || [])
      setInlandQuotes(inland || [])
    } catch (err) {
      console.error('Error fetching quotes:', err)
      showToast('Failed to load quotes', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotes()
  }, [])

  // Get all quotes based on filter
  const getAllQuotes = (): (Quote & { type: 'dismantling' | 'inland' })[] => {
    const quotes: (Quote & { type: 'dismantling' | 'inland' })[] = []

    if (quoteType === 'all' || quoteType === 'dismantling') {
      quotes.push(...dismantlingQuotes.map(q => ({ ...q, type: 'dismantling' as const })))
    }
    if (quoteType === 'all' || quoteType === 'inland') {
      quotes.push(...inlandQuotes.map(q => ({ ...q, type: 'inland' as const })))
    }

    return quotes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  // Get quotes by status
  const getQuotesByStatus = (status: string) => {
    return getAllQuotes().filter(q => q.status === status)
  }

  // Handle status change
  const handleStatusChange = (quoteId: string, quoteType: 'dismantling' | 'inland') => {
    // Refresh quotes after status change
    fetchQuotes()
    setSelectedQuote(null)
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, quote: Quote & { type: 'dismantling' | 'inland' }) => {
    setDraggedQuote(quote)
    e.dataTransfer.effectAllowed = 'move'
    // Add a custom drag image (optional)
    const target = e.target as HTMLElement
    target.style.opacity = '0.5'
  }

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement
    target.style.opacity = '1'
    setDraggedQuote(null)
    setDragOverColumn(null)
  }

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverColumn !== columnKey) {
      setDragOverColumn(columnKey)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if we're leaving the column entirely
    const relatedTarget = e.relatedTarget as HTMLElement
    const currentTarget = e.currentTarget as HTMLElement
    if (!currentTarget.contains(relatedTarget)) {
      setDragOverColumn(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    setDragOverColumn(null)

    if (!draggedQuote || draggedQuote.status === newStatus || isUpdatingStatus) return

    setIsUpdatingStatus(true)
    const tableName = draggedQuote.type === 'dismantling' ? 'quote_history' : 'inland_quotes'

    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', draggedQuote.id)

      if (error) throw error

      // Log activity (ignore errors)
      try {
        await supabase.from('activity_logs').insert({
          quote_id: draggedQuote.id,
          quote_type: draggedQuote.type,
          activity_type: 'status_change',
          title: `Quote status changed to ${newStatus}`
        })
      } catch {} // Ignore activity log errors

      showToast(`Quote moved to ${newStatus}`, 'success')
      fetchQuotes()
    } catch (err) {
      console.error('Error updating status:', err)
      showToast('Failed to update status', 'error')
    } finally {
      setIsUpdatingStatus(false)
      setDraggedQuote(null)
    }
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Calculate stats
  const stats = {
    draft: getQuotesByStatus('draft').length,
    sent: getQuotesByStatus('sent').length,
    accepted: getQuotesByStatus('accepted').length,
    rejected: getQuotesByStatus('rejected').length,
    totalValue: getQuotesByStatus('accepted').reduce((sum, q) => sum + (q.total_with_margin || 0), 0),
    pendingValue: getQuotesByStatus('sent').reduce((sum, q) => sum + (q.total_with_margin || 0), 0)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Quote Pipeline</h2>
          <p className="text-sm text-gray-500">Track and manage your quotes through the sales funnel</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Quote Type Filter */}
          <select
            value={quoteType}
            onChange={(e) => setQuoteType(e.target.value as 'all' | 'dismantling' | 'inland')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
          >
            <option value="all">All Quotes</option>
            <option value="dismantling">Dismantling</option>
            <option value="inland">Inland</option>
          </select>
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
            <button
              onClick={() => setViewMode('pipeline')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                viewMode === 'pipeline' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-700">{stats.draft}</div>
          <div className="text-sm text-gray-500">Draft</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="text-2xl font-bold text-blue-700">{stats.sent}</div>
          <div className="text-sm text-blue-600">Sent</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-700">{stats.accepted}</div>
          <div className="text-sm text-green-600">Accepted</div>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <div className="text-2xl font-bold text-red-700">{stats.rejected}</div>
          <div className="text-sm text-red-600">Rejected</div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
          <div className="text-2xl font-bold text-emerald-700">{formatCurrency(stats.totalValue)}</div>
          <div className="text-sm text-emerald-600">Won Value</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="text-2xl font-bold text-amber-700">{formatCurrency(stats.pendingValue)}</div>
          <div className="text-sm text-amber-600">Pending Value</div>
        </div>
      </div>

      {/* Drag and Drop Hint */}
      {viewMode === 'pipeline' && (
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          <span>Drag and drop quotes between columns to change their status</span>
        </div>
      )}

      {/* Pipeline View */}
      {viewMode === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map(column => {
            const quotes = getQuotesByStatus(column.key)
            const isDropTarget = dragOverColumn === column.key && draggedQuote?.status !== column.key
            return (
              <div
                key={column.key}
                className={`rounded-xl border ${column.borderColor} ${
                  isDropTarget ? column.dropBg : column.bgColor
                } min-h-[300px] transition-colors duration-200 ${
                  isDropTarget ? 'ring-2 ring-offset-2 ring-blue-400' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, column.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.key)}
              >
                {/* Column Header */}
                <div className="p-3 border-b border-gray-200 bg-white/50 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
                      <span className="font-semibold text-gray-900">{column.label}</span>
                    </div>
                    <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded-full">
                      {quotes.length}
                    </span>
                  </div>
                </div>

                {/* Quote Cards */}
                <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                  {isDropTarget && quotes.length === 0 && (
                    <div className="text-center py-8 text-blue-500 text-sm border-2 border-dashed border-blue-300 rounded-lg bg-blue-50/50">
                      Drop here to move to {column.label}
                    </div>
                  )}
                  {quotes.length === 0 && !isDropTarget ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No quotes
                    </div>
                  ) : (
                    quotes.map(quote => (
                      <div
                        key={`${quote.type}-${quote.id}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, quote)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedQuote(quote)}
                        className={`bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md cursor-grab active:cursor-grabbing transition-all ${
                          draggedQuote?.id === quote.id ? 'opacity-50 scale-95' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-xs font-mono text-gray-500">{quote.quote_number}</div>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            quote.type === 'dismantling' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {quote.type === 'dismantling' ? 'D' : 'I'}
                          </span>
                        </div>
                        <div className="font-medium text-gray-900 text-sm truncate">
                          {quote.customer_name || quote.customer_company || 'No Customer'}
                        </div>
                        {quote.type === 'dismantling' ? (
                          <div className="text-xs text-gray-500 truncate">
                            {quote.equipment_make} {quote.equipment_model}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 truncate">
                            {quote.pickup_city}, {quote.pickup_state} → {quote.dropoff_city}, {quote.dropoff_state}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                          <span className="font-semibold text-gray-900">{formatCurrency(quote.total_with_margin || 0)}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(quote.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quote #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getAllQuotes().map(quote => (
                <tr key={`${quote.type}-${quote.id}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">{quote.quote_number}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      quote.type === 'dismantling' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {quote.type === 'dismantling' ? 'Dismantling' : 'Inland'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {quote.customer_name || quote.customer_company || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {quote.type === 'dismantling' ? (
                      <span>{quote.equipment_make} {quote.equipment_model}</span>
                    ) : (
                      <span>{quote.pickup_city} → {quote.dropoff_city}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {formatCurrency(quote.total_with_margin || 0)}
                  </td>
                  <td className="px-4 py-3">
                    <QuoteStatusWorkflow
                      quoteId={quote.id}
                      quoteType={quote.type}
                      currentStatus={quote.status}
                      expirationDate={quote.expiration_date}
                      onStatusChange={() => handleStatusChange(quote.id, quote.type)}
                      onShowToast={showToast}
                      compact={true}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(quote.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedQuote(quote)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {getAllQuotes().length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No quotes found
            </div>
          )}
        </div>
      )}

      {/* Quote Detail Modal */}
      {selectedQuote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{selectedQuote.quote_number}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  selectedQuote.type === 'dismantling' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  {selectedQuote.type === 'dismantling' ? 'Dismantling Quote' : 'Inland Quote'}
                </span>
              </div>
              <button
                onClick={() => setSelectedQuote(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Customer Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Customer</h4>
                <div className="text-gray-900 font-medium">
                  {selectedQuote.customer_name || 'No Name'}
                </div>
                {selectedQuote.customer_company && (
                  <div className="text-sm text-gray-600">{selectedQuote.customer_company}</div>
                )}
                {selectedQuote.customer_email && (
                  <div className="text-sm text-gray-500">{selectedQuote.customer_email}</div>
                )}
              </div>

              {/* Quote Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Details</h4>
                {selectedQuote.type === 'dismantling' ? (
                  <>
                    <div className="text-gray-900">
                      {selectedQuote.equipment_make} {selectedQuote.equipment_model}
                    </div>
                    {selectedQuote.location && (
                      <div className="text-sm text-gray-600">Location: {selectedQuote.location}</div>
                    )}
                  </>
                ) : (
                  <div className="text-gray-900">
                    {selectedQuote.pickup_city}, {selectedQuote.pickup_state} → {selectedQuote.dropoff_city}, {selectedQuote.dropoff_state}
                  </div>
                )}
                <div className="text-2xl font-bold text-gray-900 mt-3">
                  {formatCurrency(selectedQuote.total_with_margin || 0)}
                </div>
              </div>

              {/* Status Workflow */}
              <QuoteStatusWorkflow
                quoteId={selectedQuote.id}
                quoteType={selectedQuote.type}
                currentStatus={selectedQuote.status}
                expirationDate={selectedQuote.expiration_date}
                onStatusChange={() => handleStatusChange(selectedQuote.id, selectedQuote.type)}
                onShowToast={showToast}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
