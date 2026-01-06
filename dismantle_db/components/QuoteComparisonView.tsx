'use client'

import { useState, useEffect } from 'react'
import { supabase, QuoteHistory, InlandQuote, QuoteComparison } from '@/lib/supabase'

interface QuoteComparisonViewProps {
  quoteType: 'dismantling' | 'inland'
  onShowToast?: (message: string, type: 'success' | 'error') => void
}

interface QuoteForComparison {
  id: string
  quote_number: string
  customer_name: string | null
  customer_company?: string | null
  total: number
  created_at: string
  status: string
  // For dismantling
  equipment_make?: string | null
  equipment_model?: string | null
  location?: string | null
  margin_percentage?: number | null
  subtotal?: number | null
  // For inland
  pickup_city?: string | null
  pickup_state?: string | null
  dropoff_city?: string | null
  dropoff_state?: string | null
  distance_miles?: number | null
  rate_per_mile?: number | null
}

export default function QuoteComparisonView({ quoteType, onShowToast }: QuoteComparisonViewProps) {
  const [availableQuotes, setAvailableQuotes] = useState<QuoteForComparison[]>([])
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([])
  const [selectedQuotes, setSelectedQuotes] = useState<QuoteForComparison[]>([])
  const [savedComparisons, setSavedComparisons] = useState<QuoteComparison[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showQuoteSelector, setShowQuoteSelector] = useState(false)
  const [comparisonName, setComparisonName] = useState('')

  useEffect(() => {
    loadData()
  }, [quoteType])

  useEffect(() => {
    // Update selected quotes when IDs change
    const quotes = availableQuotes.filter(q => selectedQuoteIds.includes(q.id))
    setSelectedQuotes(quotes)
  }, [selectedQuoteIds, availableQuotes])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load quotes based on type
      if (quoteType === 'dismantling') {
        const { data } = await supabase
          .from('quote_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)

        if (data) {
          const quotes: QuoteForComparison[] = data.map(q => ({
            id: q.id,
            quote_number: q.quote_number,
            customer_name: q.customer_name,
            total: q.total_with_margin || 0,
            created_at: q.created_at,
            status: (q as QuoteHistory & { status?: string }).status || 'draft',
            equipment_make: q.equipment_make,
            equipment_model: q.equipment_model,
            location: q.location,
            margin_percentage: q.margin_percentage,
            subtotal: q.subtotal
          }))
          setAvailableQuotes(quotes)
        }
      } else {
        const { data } = await supabase
          .from('inland_quotes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)

        if (data) {
          const quotes: QuoteForComparison[] = data.map((q: InlandQuote) => ({
            id: q.id,
            quote_number: q.quote_number,
            customer_name: q.client_name,
            customer_company: q.client_company,
            total: q.total_amount || 0,
            created_at: q.created_at,
            status: q.status,
            pickup_city: q.pickup_city,
            pickup_state: q.pickup_state,
            dropoff_city: q.dropoff_city,
            dropoff_state: q.dropoff_state,
            distance_miles: q.distance_miles,
            rate_per_mile: q.rate_per_mile,
            margin_percentage: q.margin_percentage,
            subtotal: q.subtotal
          }))
          setAvailableQuotes(quotes)
        }
      }

      // Load saved comparisons
      const { data: comparisons } = await supabase
        .from('quote_comparisons')
        .select('*')
        .eq('quote_type', quoteType)
        .order('created_at', { ascending: false })
        .limit(10)

      if (comparisons) setSavedComparisons(comparisons)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleQuote = (quoteId: string) => {
    setSelectedQuoteIds(prev => {
      if (prev.includes(quoteId)) {
        return prev.filter(id => id !== quoteId)
      }
      if (prev.length >= 5) {
        onShowToast?.('Maximum 5 quotes can be compared', 'error')
        return prev
      }
      return [...prev, quoteId]
    })
  }

  const saveComparison = async () => {
    if (selectedQuoteIds.length < 2) {
      onShowToast?.('Select at least 2 quotes to compare', 'error')
      return
    }

    try {
      const { error } = await supabase.from('quote_comparisons').insert({
        name: comparisonName || `Comparison ${new Date().toLocaleDateString()}`,
        quote_ids: selectedQuoteIds,
        quote_type: quoteType
      })

      if (error) throw error
      onShowToast?.('Comparison saved', 'success')
      setComparisonName('')
      loadData()
    } catch (err) {
      console.error('Error saving comparison:', err)
      onShowToast?.('Failed to save comparison', 'error')
    }
  }

  const loadSavedComparison = (comparison: QuoteComparison) => {
    setSelectedQuoteIds(comparison.quote_ids)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Find best values for highlighting
  const lowestTotal = selectedQuotes.length > 0
    ? Math.min(...selectedQuotes.map(q => q.total))
    : 0
  const lowestMargin = selectedQuotes.length > 0
    ? Math.min(...selectedQuotes.map(q => q.margin_percentage || 0))
    : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Quote Comparison</h2>
            <p className="text-sm text-gray-500">
              Compare up to 5 {quoteType === 'dismantling' ? 'dismantling' : 'inland transportation'} quotes side by side
            </p>
          </div>
          <button
            onClick={() => setShowQuoteSelector(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            Select Quotes ({selectedQuoteIds.length}/5)
          </button>
        </div>

        {/* Saved Comparisons */}
        {savedComparisons.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Saved Comparisons</p>
            <div className="flex gap-2 flex-wrap">
              {savedComparisons.map(comp => (
                <button
                  key={comp.id}
                  onClick={() => loadSavedComparison(comp)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
                >
                  {comp.name || 'Comparison'} ({comp.quote_ids.length})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Comparison Table */}
      <div className="p-4">
        {selectedQuotes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            <p className="text-lg font-medium">No quotes selected</p>
            <p className="text-sm">Select at least 2 quotes to compare them side by side</p>
            <button
              onClick={() => setShowQuoteSelector(true)}
              className="mt-4 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg"
            >
              Select Quotes
            </button>
          </div>
        ) : selectedQuotes.length === 1 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Select at least one more quote to compare</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50 sticky left-0">
                      Attribute
                    </th>
                    {selectedQuotes.map(quote => (
                      <th key={quote.id} className="px-4 py-3 text-center text-xs font-medium text-gray-900 bg-gray-50 min-w-[180px]">
                        <div className="flex flex-col items-center">
                          <span className="font-semibold">{quote.quote_number}</span>
                          <span className="text-gray-500 font-normal">{formatDate(quote.created_at)}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Customer */}
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 sticky left-0">Customer</td>
                    {selectedQuotes.map(quote => (
                      <td key={quote.id} className="px-4 py-3 text-sm text-center">
                        {quote.customer_name || '-'}
                        {quote.customer_company && (
                          <span className="block text-xs text-gray-500">{quote.customer_company}</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Status */}
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 sticky left-0">Status</td>
                    {selectedQuotes.map(quote => (
                      <td key={quote.id} className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          quote.status === 'accepted' ? 'bg-green-100 text-green-700' :
                          quote.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                          quote.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {quote.status}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Type-specific fields */}
                  {quoteType === 'dismantling' ? (
                    <>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 sticky left-0">Equipment</td>
                        {selectedQuotes.map(quote => (
                          <td key={quote.id} className="px-4 py-3 text-sm text-center">
                            {quote.equipment_make} {quote.equipment_model}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 sticky left-0">Location</td>
                        {selectedQuotes.map(quote => (
                          <td key={quote.id} className="px-4 py-3 text-sm text-center">
                            {quote.location || '-'}
                          </td>
                        ))}
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 sticky left-0">Route</td>
                        {selectedQuotes.map(quote => (
                          <td key={quote.id} className="px-4 py-3 text-sm text-center">
                            <span className="text-green-600">{quote.pickup_city}, {quote.pickup_state}</span>
                            <span className="mx-1 text-gray-400">→</span>
                            <span className="text-red-600">{quote.dropoff_city}, {quote.dropoff_state}</span>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 sticky left-0">Distance</td>
                        {selectedQuotes.map(quote => (
                          <td key={quote.id} className="px-4 py-3 text-sm text-center">
                            {quote.distance_miles ? `${quote.distance_miles.toFixed(0)} mi` : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 sticky left-0">Rate/Mile</td>
                        {selectedQuotes.map(quote => (
                          <td key={quote.id} className="px-4 py-3 text-sm text-center">
                            {quote.rate_per_mile ? formatCurrency(quote.rate_per_mile) : '-'}
                          </td>
                        ))}
                      </tr>
                    </>
                  )}

                  {/* Subtotal */}
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 sticky left-0">Subtotal</td>
                    {selectedQuotes.map(quote => (
                      <td key={quote.id} className="px-4 py-3 text-sm text-center">
                        {quote.subtotal ? formatCurrency(quote.subtotal) : '-'}
                      </td>
                    ))}
                  </tr>

                  {/* Margin */}
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 sticky left-0">Margin</td>
                    {selectedQuotes.map(quote => (
                      <td key={quote.id} className={`px-4 py-3 text-sm text-center ${
                        quote.margin_percentage === lowestMargin && selectedQuotes.length > 1 ? 'bg-amber-50' : ''
                      }`}>
                        {quote.margin_percentage != null ? `${quote.margin_percentage}%` : '-'}
                        {quote.margin_percentage === lowestMargin && selectedQuotes.length > 1 && (
                          <span className="block text-xs text-amber-600">Lowest</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Total - Highlighted */}
                  <tr className="bg-gray-50">
                    <td className="px-4 py-4 text-sm font-bold text-gray-900 sticky left-0">Total</td>
                    {selectedQuotes.map(quote => (
                      <td key={quote.id} className={`px-4 py-4 text-center ${
                        quote.total === lowestTotal && selectedQuotes.length > 1 ? 'bg-green-50' : ''
                      }`}>
                        <span className="text-lg font-bold text-gray-900">
                          {formatCurrency(quote.total)}
                        </span>
                        {quote.total === lowestTotal && selectedQuotes.length > 1 && (
                          <span className="block text-xs text-green-600 font-medium">Best Price</span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Save Comparison */}
            <div className="mt-4 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                value={comparisonName}
                onChange={(e) => setComparisonName(e.target.value)}
                placeholder="Comparison name (optional)"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
              />
              <button
                onClick={saveComparison}
                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50"
              >
                Save Comparison
              </button>
            </div>
          </>
        )}
      </div>

      {/* Quote Selector Modal */}
      {showQuoteSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Select Quotes to Compare</h3>
              <button onClick={() => setShowQuoteSelector(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-2">
                {availableQuotes.map(quote => (
                  <button
                    key={quote.id}
                    onClick={() => toggleQuote(quote.id)}
                    className={`w-full p-3 text-left rounded-lg border transition-colors ${
                      selectedQuoteIds.includes(quote.id)
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-900">{quote.quote_number}</span>
                        <span className="ml-2 text-sm text-gray-500">
                          {quote.customer_name || 'No customer'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">{formatCurrency(quote.total)}</span>
                        {selectedQuoteIds.includes(quote.id) && (
                          <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {quoteType === 'dismantling' ? (
                        <span>{quote.equipment_make} {quote.equipment_model} • {quote.location}</span>
                      ) : (
                        <span>{quote.pickup_city}, {quote.pickup_state} → {quote.dropoff_city}, {quote.dropoff_state}</span>
                      )}
                      <span className="ml-2">• {formatDate(quote.created_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => setSelectedQuoteIds([])}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear Selection
              </button>
              <button
                onClick={() => setShowQuoteSelector(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Compare {selectedQuoteIds.length} Quotes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
