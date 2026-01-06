'use client'

import { useState, useEffect } from 'react'
import { supabase, Make, Model } from '@/lib/supabase'
import { sortMakesByPopularity } from '@/lib/sorting'

interface ManageViewProps {
  onShowToast: (message: string, type: 'success' | 'error') => void
}

export default function ManageView({ onShowToast }: ManageViewProps) {
  const [makes, setMakes] = useState<Make[]>([])
  const [allModels, setAllModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedMakeFilter, setSelectedMakeFilter] = useState('')
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set())

  const [deleteConfirmMake, setDeleteConfirmMake] = useState<Make | null>(null)
  const [deleteConfirmModels, setDeleteConfirmModels] = useState(false)
  const [resetConfirmModels, setResetConfirmModels] = useState(false)
  const [percentageAdjustConfirm, setPercentageAdjustConfirm] = useState(false)
  const [percentageValue, setPercentageValue] = useState('')

  const [deleting, setDeleting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [adjusting, setAdjusting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [makesRes, modelsRes] = await Promise.all([
        supabase.from('makes').select('*'),
        supabase.from('models').select('*').order('name'),
      ])

      if (makesRes.data) {
        const sortedMakes = sortMakesByPopularity(makesRes.data, (make) => make.name)
        setMakes(sortedMakes)
      }
      if (modelsRes.data) setAllModels(modelsRes.data)
    } catch (error) {
      onShowToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredModels = selectedMakeFilter
    ? allModels.filter((m) => m.make_id === selectedMakeFilter)
    : allModels

  const handleDeleteMake = async (make: Make) => {
    setDeleting(true)
    try {
      const { error } = await supabase.from('makes').delete().eq('id', make.id)
      if (error) throw error

      onShowToast(`${make.name} and all its models have been deleted`, 'success')
      setDeleteConfirmMake(null)
      fetchData()
    } catch (error: any) {
      onShowToast(error.message || 'Failed to delete make', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteModels = async () => {
    if (selectedModels.size === 0) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('models')
        .delete()
        .in('id', Array.from(selectedModels))

      if (error) throw error

      onShowToast(`${selectedModels.size} model${selectedModels.size > 1 ? 's' : ''} deleted`, 'success')
      setSelectedModels(new Set())
      setDeleteConfirmModels(false)
      fetchData()
    } catch (error: any) {
      onShowToast(error.message || 'Failed to delete models', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const handleResetPrices = async () => {
    if (selectedModels.size === 0) return

    setResetting(true)
    try {
      // Get rates for selected models
      const { data: ratesToUpdate, error: fetchError } = await supabase
        .from('rates')
        .select('*')
        .in('model_id', Array.from(selectedModels))

      if (fetchError) throw fetchError

      if (ratesToUpdate && ratesToUpdate.length > 0) {
        const updates = ratesToUpdate.map(rate => ({
          ...rate,
          price: null,
          updated_at: new Date().toISOString(),
        }))

        const { error: updateError } = await supabase
          .from('rates')
          .upsert(updates)

        if (updateError) throw updateError

        onShowToast(`Prices reset for ${selectedModels.size} model${selectedModels.size > 1 ? 's' : ''}`, 'success')
      } else {
        onShowToast('No rates found for selected models', 'error')
      }

      setSelectedModels(new Set())
      setResetConfirmModels(false)
    } catch (error: any) {
      onShowToast(error.message || 'Failed to reset prices', 'error')
    } finally {
      setResetting(false)
    }
  }

  const handlePercentageAdjust = async () => {
    if (selectedModels.size === 0 || !percentageValue) return

    const percentage = parseFloat(percentageValue)
    if (isNaN(percentage) || percentage < -100) {
      onShowToast('Invalid percentage value', 'error')
      return
    }

    setAdjusting(true)
    try {
      // Get rates for selected models
      const { data: ratesToUpdate, error: fetchError } = await supabase
        .from('rates')
        .select('*')
        .in('model_id', Array.from(selectedModels))
        .not('price', 'is', null)

      if (fetchError) throw fetchError

      if (ratesToUpdate && ratesToUpdate.length > 0) {
        const updates = ratesToUpdate.map(rate => ({
          ...rate,
          price: Math.round(rate.price! * (1 + percentage / 100)),
          updated_at: new Date().toISOString(),
        }))

        const { error: updateError } = await supabase
          .from('rates')
          .upsert(updates)

        if (updateError) throw updateError

        const direction = percentage > 0 ? 'increased' : 'decreased'
        onShowToast(`Prices ${direction} by ${Math.abs(percentage)}% for ${ratesToUpdate.length} model${ratesToUpdate.length > 1 ? 's' : ''}`, 'success')
      } else {
        onShowToast('No priced models found in selection', 'error')
      }

      setSelectedModels(new Set())
      setPercentageAdjustConfirm(false)
      setPercentageValue('')
    } catch (error: any) {
      onShowToast(error.message || 'Failed to adjust prices', 'error')
    } finally {
      setAdjusting(false)
    }
  }

  const toggleModelSelection = (modelId: string) => {
    const newSelection = new Set(selectedModels)
    if (newSelection.has(modelId)) {
      newSelection.delete(modelId)
    } else {
      newSelection.add(modelId)
    }
    setSelectedModels(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedModels.size === filteredModels.length) {
      setSelectedModels(new Set())
    } else {
      setSelectedModels(new Set(filteredModels.map(m => m.id)))
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-200 animate-pulse rounded h-32" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Manage Makes Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-4">Manage Makes</h2>
        <p className="text-sm text-gray-600 mb-4">
          Warning: Deleting a make will also delete all its models and rates.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {makes.map((make) => (
            <div
              key={make.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <span className="text-sm font-medium text-gray-700">{make.name}</span>
              <button
                onClick={() => setDeleteConfirmMake(make)}
                className="text-red-500 hover:text-red-700 transition-colors p-1"
                title="Delete make"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Manage Models Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-4">Manage Models</h2>

        {/* Filter and Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <select
            value={selectedMakeFilter}
            onChange={(e) => {
              setSelectedMakeFilter(e.target.value)
              setSelectedModels(new Set())
            }}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
          >
            <option value="">All Makes</option>
            {makes.map((make) => (
              <option key={make.id} value={make.id}>
                {make.name}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => setResetConfirmModels(true)}
              disabled={selectedModels.size === 0 || resetting}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
            >
              Reset Prices ({selectedModels.size})
            </button>
            <button
              onClick={() => setPercentageAdjustConfirm(true)}
              disabled={selectedModels.size === 0 || adjusting}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
            >
              Adjust Prices ({selectedModels.size})
            </button>
            <button
              onClick={() => setDeleteConfirmModels(true)}
              disabled={selectedModels.size === 0 || deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
            >
              Delete ({selectedModels.size})
            </button>
          </div>
        </div>

        {/* Select All */}
        {filteredModels.length > 0 && (
          <div className="mb-3 pb-3 border-b border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedModels.size === filteredModels.length && filteredModels.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Select All ({filteredModels.length})
              </span>
            </label>
          </div>
        )}

        {/* Models List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredModels.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No models found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredModels.map((model) => {
                const make = makes.find(m => m.id === model.make_id)
                return (
                  <label
                    key={model.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedModels.has(model.id)}
                      onChange={() => toggleModelSelection(model.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{model.name}</div>
                      {!selectedMakeFilter && (
                        <div className="text-xs text-gray-500">{make?.name}</div>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Make Confirmation Modal */}
      {deleteConfirmMake && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Make</h3>
            </div>

            <p className="text-gray-700 mb-2">
              Are you sure you want to delete <strong>{deleteConfirmMake.name}</strong>?
            </p>
            <p className="text-sm text-red-600 mb-6">
              This will permanently delete all models and rates associated with this make. This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmMake(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteMake(deleteConfirmMake)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-red-400"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Models Confirmation Modal */}
      {deleteConfirmModels && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Models</h3>
            </div>

            <p className="text-gray-700 mb-2">
              Are you sure you want to delete <strong>{selectedModels.size}</strong> model{selectedModels.size > 1 ? 's' : ''}?
            </p>
            <p className="text-sm text-red-600 mb-6">
              This will permanently delete the selected models and their rates. This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmModels(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteModels}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-red-400"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Prices Confirmation Modal */}
      {resetConfirmModels && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Reset Prices</h3>
            </div>

            <p className="text-gray-700 mb-6">
              Are you sure you want to reset prices for <strong>{selectedModels.size}</strong> model{selectedModels.size > 1 ? 's' : ''}? All prices will be set to empty (NULL).
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setResetConfirmModels(false)}
                disabled={resetting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPrices}
                disabled={resetting}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium disabled:bg-amber-400"
              >
                {resetting ? 'Resetting...' : 'Reset Prices'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Percentage Adjustment Modal */}
      {percentageAdjustConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Adjust Prices</h3>
            </div>

            <p className="text-gray-700 mb-4">
              Adjust prices by percentage for <strong>{selectedModels.size}</strong> selected model{selectedModels.size > 1 ? 's' : ''}:
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Percentage Change
              </label>
              <input
                type="number"
                step="0.01"
                value={percentageValue}
                onChange={(e) => setPercentageValue(e.target.value)}
                placeholder="e.g., 10 for +10%, -5 for -5%"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-400"
                autoFocus
              />
              <p className="mt-2 text-xs text-gray-500">
                Enter a positive number to increase prices or negative to decrease.
                <br />
                <span className="text-teal-600 font-medium">Only models with existing prices will be updated.</span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPercentageAdjustConfirm(false)
                  setPercentageValue('')
                }}
                disabled={adjusting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handlePercentageAdjust}
                disabled={adjusting || !percentageValue}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:bg-teal-400 disabled:cursor-not-allowed"
              >
                {adjusting ? 'Adjusting...' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
