'use client'

import { useState } from 'react'
import { supabase, QuoteStatus, QUOTE_STATUSES, InlandQuoteStatus } from '@/lib/supabase'

interface QuoteStatusWorkflowProps {
  quoteId: string
  quoteType: 'dismantling' | 'inland'
  currentStatus: QuoteStatus | InlandQuoteStatus
  expirationDate?: string | null
  onStatusChange?: (newStatus: QuoteStatus | InlandQuoteStatus) => void
  onShowToast?: (message: string, type: 'success' | 'error') => void
  compact?: boolean
}

export default function QuoteStatusWorkflow({
  quoteId,
  quoteType,
  currentStatus,
  expirationDate,
  onStatusChange,
  onShowToast,
  compact = false
}: QuoteStatusWorkflowProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const tableName = quoteType === 'dismantling' ? 'quote_history' : 'inland_quotes'

  const updateStatus = async (newStatus: QuoteStatus | InlandQuoteStatus, additionalData?: Record<string, unknown>) => {
    setIsUpdating(true)
    try {
      // Only update status and updated_at to avoid column mismatch errors
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', quoteId)

      if (error) throw error

      // Log activity (ignore errors from activity log)
      try {
        await supabase.from('activity_logs').insert({
          quote_id: quoteId,
          quote_type: quoteType,
          activity_type: 'status_change',
          title: `Quote status changed to ${newStatus}`,
          description: newStatus === 'rejected' && rejectionReason ? `Reason: ${rejectionReason}` : null
        })
      } catch {} // Ignore activity log errors

      onStatusChange?.(newStatus)
      onShowToast?.(`Quote marked as ${newStatus}`, 'success')
    } catch (err) {
      console.error('Error updating status:', err)
      onShowToast?.('Failed to update status', 'error')
    } finally {
      setIsUpdating(false)
      setShowRejectModal(false)
      setRejectionReason('')
    }
  }

  const handleReject = () => {
    updateStatus('rejected', { rejection_reason: rejectionReason })
  }

  const isExpired = expirationDate && new Date(expirationDate) < new Date()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200'
      case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'accepted': return 'bg-green-100 text-green-700 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200'
      case 'expired': return 'bg-amber-100 text-amber-700 border-amber-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStepStatus = (step: string) => {
    const order = ['draft', 'sent', 'accepted']
    const currentIndex = order.indexOf(currentStatus)
    const stepIndex = order.indexOf(step)

    if (currentStatus === 'rejected' || currentStatus === 'expired') {
      return step === 'draft' || step === 'sent' ? 'completed' : 'inactive'
    }

    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex) return 'current'
    return 'upcoming'
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(isExpired ? 'expired' : currentStatus)}`}>
          {isExpired ? 'Expired' : currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
        </span>
        {currentStatus === 'draft' && (
          <button
            onClick={() => updateStatus('sent')}
            disabled={isUpdating}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Mark Sent
          </button>
        )}
        {currentStatus === 'sent' && !isExpired && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateStatus('accepted')}
              disabled={isUpdating}
              className="text-xs text-green-600 hover:text-green-700 font-medium"
            >
              Accept
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={isUpdating}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Quote Status</h3>

      {/* Status Timeline */}
      <div className="flex items-center justify-between mb-6">
        {['draft', 'sent', 'accepted'].map((step, i) => {
          const status = getStepStatus(step)
          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  status === 'completed' ? 'bg-green-500 text-white' :
                  status === 'current' ? 'bg-indigo-600 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {status === 'completed' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={`text-xs mt-1 ${status === 'current' ? 'font-medium text-indigo-600' : 'text-gray-500'}`}>
                  {step.charAt(0).toUpperCase() + step.slice(1)}
                </span>
              </div>
              {i < 2 && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  getStepStatus(['sent', 'accepted'][i]) === 'completed' || getStepStatus(['sent', 'accepted'][i]) === 'current'
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Current Status Badge */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4">
        <div>
          <span className="text-sm text-gray-500">Current Status:</span>
          <span className={`ml-2 px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(isExpired ? 'expired' : currentStatus)}`}>
            {isExpired ? 'Expired' : currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
          </span>
        </div>
        {expirationDate && (
          <div className="text-xs text-gray-500">
            {isExpired ? 'Expired:' : 'Valid until:'} {new Date(expirationDate).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {currentStatus === 'draft' && (
          <button
            onClick={() => updateStatus('sent')}
            disabled={isUpdating}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isUpdating ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
            Mark as Sent
          </button>
        )}

        {currentStatus === 'sent' && !isExpired && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => updateStatus('accepted')}
              disabled={isUpdating}
              className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Accept
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={isUpdating}
              className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject
            </button>
          </div>
        )}

        {(currentStatus === 'accepted' || currentStatus === 'rejected' || isExpired) && (
          <button
            onClick={() => updateStatus('draft')}
            disabled={isUpdating}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Reset to Draft
          </button>
        )}
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Reject Quote</h3>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason (optional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-500"
                placeholder="Why was this quote rejected?"
              />
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isUpdating}
                className="flex-1 px-4 py-2.5 text-white bg-red-600 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                Reject Quote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
