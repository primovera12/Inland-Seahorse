'use client'

import { useState, useEffect } from 'react'
import { supabase, RateTierConfig, FuelSurchargeSettings, FuelSurchargeIndex } from '@/lib/supabase'

interface RateTiersViewProps {
  onShowToast: (message: string, type: 'success' | 'error') => void
}

export default function RateTiersView({ onShowToast }: RateTiersViewProps) {
  const [rateTiers, setRateTiers] = useState<RateTierConfig[]>([])
  const [fuelSettings, setFuelSettings] = useState<FuelSurchargeSettings | null>(null)
  const [fuelIndex, setFuelIndex] = useState<FuelSurchargeIndex[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingTier, setEditingTier] = useState<RateTierConfig | null>(null)
  const [showTierModal, setShowTierModal] = useState(false)
  const [showFuelModal, setShowFuelModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'tiers' | 'fuel'>('tiers')

  const [tierForm, setTierForm] = useState({
    name: '',
    min_miles: 0,
    max_miles: '',
    rate_per_mile: 0,
    base_rate: 0,
    notes: ''
  })

  const [fuelForm, setFuelForm] = useState({
    base_fuel_price: 2.50,
    increment_per_cent: 0.50,
    min_surcharge: 0,
    max_surcharge: 50
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load rate tiers
      const { data: tiers } = await supabase
        .from('rate_tiers')
        .select('*')
        .order('sort_order')

      if (tiers) setRateTiers(tiers)

      // Load fuel surcharge settings
      const { data: settings } = await supabase
        .from('fuel_surcharge_settings')
        .select('*')
        .single()

      if (settings) {
        setFuelSettings(settings)
        setFuelForm({
          base_fuel_price: settings.base_fuel_price,
          increment_per_cent: settings.increment_per_cent,
          min_surcharge: settings.min_surcharge,
          max_surcharge: settings.max_surcharge
        })
      }

      // Load fuel index history
      const { data: index } = await supabase
        .from('fuel_surcharge_index')
        .select('*')
        .order('effective_date', { ascending: false })
        .limit(10)

      if (index) setFuelIndex(index)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const saveTier = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const tierData = {
        name: tierForm.name,
        min_miles: tierForm.min_miles,
        max_miles: tierForm.max_miles ? parseInt(tierForm.max_miles) : null,
        rate_per_mile: tierForm.rate_per_mile,
        base_rate: tierForm.base_rate,
        notes: tierForm.notes || null,
        is_active: true
      }

      if (editingTier) {
        const { error } = await supabase
          .from('rate_tiers')
          .update({ ...tierData, updated_at: new Date().toISOString() })
          .eq('id', editingTier.id)

        if (error) throw error
        onShowToast('Rate tier updated', 'success')
      } else {
        const { error } = await supabase.from('rate_tiers').insert(tierData)
        if (error) throw error
        onShowToast('Rate tier created', 'success')
      }

      setShowTierModal(false)
      setEditingTier(null)
      resetTierForm()
      loadData()
    } catch (err) {
      console.error('Error saving tier:', err)
      onShowToast('Failed to save tier', 'error')
    }
  }

  const deleteTier = async (id: string) => {
    if (!confirm('Delete this rate tier?')) return

    try {
      const { error } = await supabase.from('rate_tiers').delete().eq('id', id)
      if (error) throw error
      onShowToast('Rate tier deleted', 'success')
      loadData()
    } catch (err) {
      console.error('Error deleting tier:', err)
      onShowToast('Failed to delete tier', 'error')
    }
  }

  const saveFuelSettings = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (fuelSettings) {
        const { error } = await supabase
          .from('fuel_surcharge_settings')
          .update({ ...fuelForm, last_updated: new Date().toISOString() })
          .eq('id', fuelSettings.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('fuel_surcharge_settings').insert(fuelForm)
        if (error) throw error
      }

      onShowToast('Fuel settings saved', 'success')
      setShowFuelModal(false)
      loadData()
    } catch (err) {
      console.error('Error saving fuel settings:', err)
      onShowToast('Failed to save settings', 'error')
    }
  }

  const addFuelIndexEntry = async () => {
    const price = prompt('Enter current DOE diesel price per gallon (e.g., 3.85):')
    if (!price) return

    const priceNum = parseFloat(price)
    if (isNaN(priceNum)) {
      onShowToast('Invalid price', 'error')
      return
    }

    // Calculate surcharge
    const basePrice = fuelSettings?.base_fuel_price || 2.50
    const increment = fuelSettings?.increment_per_cent || 0.50
    const minSurcharge = fuelSettings?.min_surcharge || 0
    const maxSurcharge = fuelSettings?.max_surcharge || 50

    let surcharge = (priceNum - basePrice) * increment * 100
    surcharge = Math.max(minSurcharge, Math.min(surcharge, maxSurcharge))

    try {
      const { error } = await supabase.from('fuel_surcharge_index').insert({
        effective_date: new Date().toISOString().split('T')[0],
        doe_price_per_gallon: priceNum,
        surcharge_percent: surcharge,
        region: 'national'
      })

      if (error) throw error
      onShowToast(`Fuel surcharge set to ${surcharge.toFixed(1)}%`, 'success')
      loadData()
    } catch (err) {
      console.error('Error adding fuel entry:', err)
      onShowToast('Failed to add fuel entry', 'error')
    }
  }

  const resetTierForm = () => {
    setTierForm({
      name: '',
      min_miles: 0,
      max_miles: '',
      rate_per_mile: 0,
      base_rate: 0,
      notes: ''
    })
  }

  const openEditTier = (tier: RateTierConfig) => {
    setEditingTier(tier)
    setTierForm({
      name: tier.name,
      min_miles: tier.min_miles,
      max_miles: tier.max_miles?.toString() || '',
      rate_per_mile: tier.rate_per_mile,
      base_rate: tier.base_rate,
      notes: tier.notes || ''
    })
    setShowTierModal(true)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value)
  }

  const currentSurcharge = fuelIndex.length > 0 ? fuelIndex[0].surcharge_percent : null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header with Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold text-gray-900">Rate Configuration</h2>
          {currentSurcharge !== null && (
            <div className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium">
              Current Fuel Surcharge: {currentSurcharge.toFixed(1)}%
            </div>
          )}
        </div>
        <div className="flex px-4">
          <button
            onClick={() => setActiveTab('tiers')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'tiers'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Distance-Based Rate Tiers
          </button>
          <button
            onClick={() => setActiveTab('fuel')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'fuel'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Fuel Surcharge Index
          </button>
        </div>
      </div>

      {/* Rate Tiers Tab */}
      {activeTab === 'tiers' && (
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">
              Define rate tiers based on distance. The system will automatically select the appropriate tier.
            </p>
            <button
              onClick={() => { resetTierForm(); setShowTierModal(true) }}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              + Add Tier
            </button>
          </div>

          {rateTiers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No rate tiers configured</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distance Range</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate/Mile</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Base Rate</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rateTiers.map((tier) => (
                    <tr key={tier.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{tier.name}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {tier.min_miles} - {tier.max_miles || '∞'} miles
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(tier.rate_per_mile)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {formatCurrency(tier.base_rate)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          tier.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {tier.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditTier(tier)}
                          className="text-indigo-600 hover:text-indigo-800 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteTier(tier.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Fuel Surcharge Tab */}
      {activeTab === 'fuel' && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Settings */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Calculation Settings</h3>
                <button
                  onClick={() => setShowFuelModal(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Edit
                </button>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Base Fuel Price</dt>
                  <dd className="font-medium">{formatCurrency(fuelSettings?.base_fuel_price || 2.50)}/gal</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Increment per $0.01</dt>
                  <dd className="font-medium">{fuelSettings?.increment_per_cent || 0.50}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Min Surcharge</dt>
                  <dd className="font-medium">{fuelSettings?.min_surcharge || 0}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Max Surcharge</dt>
                  <dd className="font-medium">{fuelSettings?.max_surcharge || 50}%</dd>
                </div>
              </dl>
            </div>

            {/* Update Fuel Price */}
            <div className="bg-amber-50 rounded-lg p-4">
              <h3 className="font-medium text-amber-900 mb-3">Update DOE Fuel Price</h3>
              <p className="text-sm text-amber-700 mb-4">
                Enter the current DOE diesel price to calculate the new fuel surcharge percentage.
              </p>
              <button
                onClick={addFuelIndexEntry}
                className="w-full px-4 py-2 text-amber-700 bg-white border border-amber-300 rounded-lg font-medium hover:bg-amber-100"
              >
                Update Fuel Price
              </button>
            </div>
          </div>

          {/* Fuel Price History */}
          <div className="mt-6">
            <h3 className="font-medium text-gray-900 mb-3">Fuel Price History</h3>
            {fuelIndex.length === 0 ? (
              <p className="text-gray-500 text-sm">No fuel price entries</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">DOE Price</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Surcharge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fuelIndex.map((entry, i) => (
                      <tr key={entry.id} className={i === 0 ? 'bg-amber-50' : ''}>
                        <td className="px-4 py-2 text-gray-600">
                          {new Date(entry.effective_date).toLocaleDateString()}
                          {i === 0 && <span className="ml-2 text-xs text-amber-600 font-medium">Current</span>}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {formatCurrency(entry.doe_price_per_gallon)}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {entry.surcharge_percent.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rate Tier Modal */}
      {showTierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingTier ? 'Edit Rate Tier' : 'Add Rate Tier'}
              </h3>
              <button onClick={() => { setShowTierModal(false); setEditingTier(null) }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={saveTier} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tier Name *</label>
                <input
                  type="text"
                  value={tierForm.name}
                  onChange={(e) => setTierForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                  placeholder="e.g., Local (0-100 mi)"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Miles</label>
                  <input
                    type="number"
                    value={tierForm.min_miles}
                    onChange={(e) => setTierForm(prev => ({ ...prev, min_miles: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Miles</label>
                  <input
                    type="number"
                    value={tierForm.max_miles}
                    onChange={(e) => setTierForm(prev => ({ ...prev, max_miles: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                    placeholder="Leave empty for ∞"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate/Mile ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tierForm.rate_per_mile}
                    onChange={(e) => setTierForm(prev => ({ ...prev, rate_per_mile: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tierForm.base_rate}
                    onChange={(e) => setTierForm(prev => ({ ...prev, base_rate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={tierForm.notes}
                  onChange={(e) => setTierForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowTierModal(false); setEditingTier(null) }}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2.5 text-white bg-indigo-600 rounded-lg font-medium hover:bg-indigo-700">
                  {editingTier ? 'Update' : 'Add Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fuel Settings Modal */}
      {showFuelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Fuel Surcharge Settings</h3>
              <button onClick={() => setShowFuelModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={saveFuelSettings} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Fuel Price ($/gal)</label>
                <input
                  type="number"
                  step="0.01"
                  value={fuelForm.base_fuel_price}
                  onChange={(e) => setFuelForm(prev => ({ ...prev, base_fuel_price: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Fuel price at which surcharge is 0%</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Increment per $0.01</label>
                <input
                  type="number"
                  step="0.01"
                  value={fuelForm.increment_per_cent}
                  onChange={(e) => setFuelForm(prev => ({ ...prev, increment_per_cent: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Surcharge % increase for each $0.01 fuel increase</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Surcharge %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={fuelForm.min_surcharge}
                    onChange={(e) => setFuelForm(prev => ({ ...prev, min_surcharge: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Surcharge %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={fuelForm.max_surcharge}
                    onChange={(e) => setFuelForm(prev => ({ ...prev, max_surcharge: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowFuelModal(false)}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2.5 text-white bg-indigo-600 rounded-lg font-medium hover:bg-indigo-700">
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
