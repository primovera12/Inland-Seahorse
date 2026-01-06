'use client'

import { useState, useEffect } from 'react'
import { supabase, PermitType, QuotePermit } from '@/lib/supabase'

interface PermitRequirementsViewProps {
  quoteId?: string
  quoteType?: 'dismantling' | 'inland'
  weight?: number  // in lbs
  length?: number  // in inches
  width?: number   // in inches
  height?: number  // in inches
  originState?: string
  destinationState?: string
  onShowToast?: (message: string, type: 'success' | 'error') => void
  onPermitsChange?: (permits: QuotePermit[]) => void
  compact?: boolean
}

export default function PermitRequirementsView({
  quoteId,
  quoteType = 'inland',
  weight,
  length,
  width,
  height,
  originState,
  destinationState,
  onShowToast,
  onPermitsChange,
  compact = false
}: PermitRequirementsViewProps) {
  const [permitTypes, setPermitTypes] = useState<PermitType[]>([])
  const [selectedPermits, setSelectedPermits] = useState<QuotePermit[]>([])
  const [suggestedPermits, setSuggestedPermits] = useState<PermitType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  // Standard limits (can be configured)
  const LIMITS = {
    maxWeight: 80000,      // lbs (80,000 lbs = standard limit)
    maxLength: 636,        // inches (53 ft)
    maxWidth: 102,         // inches (8.5 ft)
    maxHeight: 162         // inches (13.5 ft)
  }

  const isOverweight = weight ? weight > LIMITS.maxWeight : false
  const isOversize = (length && length > LIMITS.maxLength) ||
                     (width && width > LIMITS.maxWidth) ||
                     (height && height > LIMITS.maxHeight)

  useEffect(() => {
    loadData()
  }, [quoteId])

  useEffect(() => {
    // Auto-suggest permits based on dimensions
    if (permitTypes.length > 0) {
      const suggested: PermitType[] = []

      permitTypes.forEach(permit => {
        if (permit.required_for_overweight && isOverweight) {
          suggested.push(permit)
        }
        if (permit.required_for_oversize && isOversize) {
          suggested.push(permit)
        }
      })

      setSuggestedPermits(suggested)
    }
  }, [permitTypes, weight, length, width, height, isOverweight, isOversize])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load permit types
      const { data: types } = await supabase
        .from('permit_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (types) setPermitTypes(types)

      // Load existing permits for this quote
      if (quoteId) {
        const { data: permits } = await supabase
          .from('quote_permits')
          .select('*, permit_type:permit_types(*)')
          .eq('quote_id', quoteId)
          .eq('quote_type', quoteType)

        if (permits) {
          setSelectedPermits(permits)
          onPermitsChange?.(permits)
        }
      }
    } catch (err) {
      console.error('Error loading permits:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const addPermit = async (permitType: PermitType) => {
    const newPermit: Partial<QuotePermit> = {
      quote_id: quoteId || 'temp-' + Date.now(),
      quote_type: quoteType,
      permit_type_id: permitType.id,
      permit_code: permitType.code,
      estimated_cost: permitType.typical_cost,
      status: 'pending',
      notes: null
    }

    if (quoteId) {
      try {
        const { data, error } = await supabase
          .from('quote_permits')
          .insert(newPermit)
          .select('*, permit_type:permit_types(*)')
          .single()

        if (error) throw error
        const updatedPermits = [...selectedPermits, data]
        setSelectedPermits(updatedPermits)
        onPermitsChange?.(updatedPermits)
        onShowToast?.('Permit added', 'success')
      } catch (err) {
        console.error('Error adding permit:', err)
        onShowToast?.('Failed to add permit', 'error')
      }
    } else {
      // For unsaved quotes, just track locally
      const localPermit = {
        ...newPermit,
        id: 'temp-' + Date.now(),
        created_at: new Date().toISOString(),
        permit_type: permitType
      } as QuotePermit & { permit_type: PermitType }

      const updatedPermits = [...selectedPermits, localPermit]
      setSelectedPermits(updatedPermits)
      onPermitsChange?.(updatedPermits)
    }

    setShowAddModal(false)
  }

  const removePermit = async (permitId: string) => {
    if (quoteId && !permitId.startsWith('temp-')) {
      try {
        const { error } = await supabase
          .from('quote_permits')
          .delete()
          .eq('id', permitId)

        if (error) throw error
        onShowToast?.('Permit removed', 'success')
      } catch (err) {
        console.error('Error removing permit:', err)
        onShowToast?.('Failed to remove permit', 'error')
        return
      }
    }

    const updatedPermits = selectedPermits.filter(p => p.id !== permitId)
    setSelectedPermits(updatedPermits)
    onPermitsChange?.(updatedPermits)
  }

  const updatePermitStatus = async (permitId: string, status: QuotePermit['status']) => {
    if (quoteId && !permitId.startsWith('temp-')) {
      try {
        const { error } = await supabase
          .from('quote_permits')
          .update({ status })
          .eq('id', permitId)

        if (error) throw error
      } catch (err) {
        console.error('Error updating permit:', err)
        return
      }
    }

    const updatedPermits = selectedPermits.map(p =>
      p.id === permitId ? { ...p, status } : p
    )
    setSelectedPermits(updatedPermits)
    onPermitsChange?.(updatedPermits)
  }

  const totalPermitCost = selectedPermits.reduce((sum, p) => sum + (p.estimated_cost || 0), 0)

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-600',
      applied: 'bg-blue-100 text-blue-600',
      approved: 'bg-green-100 text-green-600',
      denied: 'bg-red-100 text-red-600'
    }
    return colors[status] || colors.pending
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className={compact ? '' : 'bg-white rounded-xl shadow-sm border border-gray-200'}>
      {/* Header */}
      <div className={`flex items-center justify-between ${compact ? 'mb-3' : 'p-4 border-b border-gray-200'}`}>
        <div>
          <h3 className={`font-semibold ${compact ? 'text-sm' : 'text-lg'} text-gray-900`}>
            Permit Requirements
          </h3>
          {(isOverweight || isOversize) && (
            <div className="flex gap-2 mt-1">
              {isOverweight && (
                <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                  Overweight
                </span>
              )}
              {isOversize && (
                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                  Oversize
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg"
        >
          + Add Permit
        </button>
      </div>

      {/* Suggested Permits Alert */}
      {suggestedPermits.length > 0 && selectedPermits.length === 0 && (
        <div className={`${compact ? 'mb-3' : 'mx-4 mt-4'} p-3 bg-amber-50 border border-amber-200 rounded-lg`}>
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">Permits may be required</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Based on dimensions, you may need: {suggestedPermits.map(p => p.name).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected Permits */}
      <div className={compact ? '' : 'p-4'}>
        {selectedPermits.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No permits added
          </div>
        ) : (
          <div className="space-y-2">
            {selectedPermits.map((permit) => {
              const permitType = (permit as QuotePermit & { permit_type?: PermitType }).permit_type
              return (
                <div
                  key={permit.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">
                        {permitType?.name || permit.permit_code}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(permit.status)}`}>
                        {permit.status}
                      </span>
                    </div>
                    {permit.estimated_cost && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Est. cost: ${permit.estimated_cost.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={permit.status}
                      onChange={(e) => updatePermitStatus(permit.id, e.target.value as QuotePermit['status'])}
                      className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="applied">Applied</option>
                      <option value="approved">Approved</option>
                      <option value="denied">Denied</option>
                    </select>
                    <button
                      onClick={() => removePermit(permit.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Total */}
            {totalPermitCost > 0 && (
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-sm font-medium text-gray-700">Total Permit Cost</span>
                <span className="text-sm font-semibold text-gray-900">${totalPermitCost.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Permit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add Permit</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-2">
                {permitTypes
                  .filter(pt => !selectedPermits.some(sp => sp.permit_type_id === pt.id))
                  .map((permitType) => {
                    const isSuggested = suggestedPermits.some(sp => sp.id === permitType.id)
                    return (
                      <button
                        key={permitType.id}
                        onClick={() => addPermit(permitType)}
                        className={`w-full p-3 text-left rounded-lg border transition-colors ${
                          isSuggested
                            ? 'border-amber-300 bg-amber-50 hover:bg-amber-100'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{permitType.name}</span>
                              <span className="text-xs text-gray-500">({permitType.code})</span>
                              {isSuggested && (
                                <span className="px-1.5 py-0.5 text-xs bg-amber-200 text-amber-800 rounded">
                                  Suggested
                                </span>
                              )}
                            </div>
                            {permitType.description && (
                              <p className="text-sm text-gray-500 mt-1">{permitType.description}</p>
                            )}
                          </div>
                          {permitType.typical_cost && (
                            <span className="text-sm font-medium text-gray-700">
                              ${permitType.typical_cost}
                            </span>
                          )}
                        </div>
                        {permitType.typical_processing_days && (
                          <p className="text-xs text-gray-400 mt-1">
                            ~{permitType.typical_processing_days} days processing
                          </p>
                        )}
                      </button>
                    )
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
