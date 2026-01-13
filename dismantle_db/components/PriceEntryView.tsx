'use client'

import { useState, useEffect } from 'react'
import { supabase, RateLookup, Make, Model, LocationCost, LOCATIONS, ALL_COST_FIELDS, Location, EquipmentDimensions, EquipmentSilhouetteType } from '@/lib/supabase'
import { sortMakesByPopularity } from '@/lib/sorting'
import { validatePrice, getPriceValidationColor } from '@/lib/priceValidation'
import { getFavorites, toggleFavorite } from '@/lib/favorites'

interface PriceEntryViewProps {
  onShowToast: (message: string, type: 'success' | 'error') => void
}

interface ExpandedRowData {
  rateId: string
  locationCosts: Record<string, LocationCost>
  dimensions: EquipmentDimensions | null
}

const EQUIPMENT_TYPES: { value: EquipmentSilhouetteType; label: string }[] = [
  { value: 'excavator', label: 'Excavator' },
  { value: 'bulldozer', label: 'Bulldozer' },
  { value: 'wheel_loader', label: 'Wheel Loader' },
  { value: 'dump_truck', label: 'Dump Truck' },
  { value: 'crane', label: 'Crane' },
  { value: 'forklift', label: 'Forklift' },
  { value: 'skid_steer', label: 'Skid Steer' },
  { value: 'motor_grader', label: 'Motor Grader' },
  { value: 'backhoe', label: 'Backhoe' },
  { value: 'roller', label: 'Roller/Compactor' },
  { value: 'compact_track_loader', label: 'Compact Track Loader' },
  { value: 'telehandler', label: 'Telehandler' },
  { value: 'other', label: 'Other' },
]

// Thresholds for smart dimension parsing (in feet)
// Values above these are treated as inches, below as feet
const DIMENSION_THRESHOLDS = {
  length: 70,  // 70 feet = 840 inches
  width: 16,   // 16 feet = 192 inches
  height: 18   // 18 feet = 216 inches
}

// Smart dimension parser: detects if input is feet.inches or plain inches
// - If input contains a decimal (e.g., 10.5), treat as ft.in format (10 feet 5 inches = 125 inches)
// - If input is a whole number above threshold, treat as inches
// - If input is a whole number below threshold, treat as feet and convert to inches
function parseSmartDimension(
  value: string,
  dimensionType: 'length' | 'width' | 'height'
): number | null {
  if (!value || value.trim() === '') return null

  const trimmed = value.trim()

  // If contains a dot, treat as ft.in format (e.g., 10.5 = 10 feet 5 inches)
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.')
    const feet = parseInt(parts[0]) || 0
    const inches = parseInt(parts[1]) || 0
    return feet * 12 + inches
  }

  // Single number - check threshold to determine if inches or feet
  const numValue = parseFloat(trimmed)
  if (isNaN(numValue)) return null

  const threshold = DIMENSION_THRESHOLDS[dimensionType]
  if (numValue > threshold) {
    // Treat as inches
    return Math.round(numValue)
  } else {
    // Treat as feet, convert to inches
    return Math.round(numValue * 12)
  }
}

interface AddModelModalProps {
  isOpen: boolean
  onClose: () => void
  makeId: string
  makeName: string
  onSuccess: () => void
  onShowToast: (message: string, type: 'success' | 'error') => void
}

function AddModelModal({ isOpen, onClose, makeId, makeName, onSuccess, onShowToast }: AddModelModalProps) {
  const [modelName, setModelName] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!modelName.trim()) {
      onShowToast('Please enter a model name', 'error')
      return
    }

    setSaving(true)
    try {
      // Create the model
      const { data: newModel, error: modelError } = await supabase
        .from('models')
        .insert({ name: modelName.trim(), make_id: makeId })
        .select()
        .single()

      if (modelError) {
        if (modelError.message?.includes('duplicate') || modelError.code === '23505') {
          onShowToast(`Model "${modelName}" already exists for ${makeName}`, 'error')
        } else {
          onShowToast(`Failed to create model: ${modelError.message}`, 'error')
        }
        setSaving(false)
        return
      }

      // Create the rate entry
      const priceNum = price ? parseFloat(price) : null
      const { error: rateError } = await supabase.from('rates').insert({
        make_id: makeId,
        model_id: newModel.id,
        price: priceNum,
      })

      if (rateError) {
        onShowToast(`Model created but rate entry failed: ${rateError.message}`, 'error')
      } else {
        onShowToast(`Model "${modelName}" added successfully`, 'success')
      }

      setModelName('')
      setPrice('')
      onSuccess()
      onClose()
    } catch (error: any) {
      onShowToast(`Error: ${error.message || 'Failed to add model'}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add New Model</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-800">Adding model for: <strong>{makeName}</strong></span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              placeholder="e.g., 320, D6, WA380..."
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price ($) <span className="text-gray-400 text-xs font-normal">(optional)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              placeholder="Leave empty if no base price"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-white transition-colors ${
                saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {saving ? 'Adding...' : 'Add Model'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PriceEntryView({ onShowToast }: PriceEntryViewProps) {
  const [rates, setRates] = useState<RateLookup[]>([])
  const [filteredRates, setFilteredRates] = useState<RateLookup[]>([])
  const [makes, setMakes] = useState<Make[]>([])
  const [allModels, setAllModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [makeFilter, setMakeFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')

  const [modifiedRates, setModifiedRates] = useState<Map<string, string>>(new Map())
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [autoSaving, setAutoSaving] = useState(false)

  // Location costs expansion state
  const [expandedRows, setExpandedRows] = useState<Record<string, ExpandedRowData>>({})
  const [savingLocationCost, setSavingLocationCost] = useState<Record<string, boolean>>({})
  const [savingDimension, setSavingDimension] = useState<Record<string, boolean>>({})
  const [uploadingImage, setUploadingImage] = useState<Record<string, boolean>>({})
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})

  // Add Model modal state
  const [showAddModelModal, setShowAddModelModal] = useState(false)

  useEffect(() => {
    fetchData()
    setFavorites(getFavorites())
  }, [])

  // Auto-save effect - triggers 2 seconds after last modification
  useEffect(() => {
    if (modifiedRates.size === 0) return

    const timer = setTimeout(() => {
      handleAutoSave()
    }, 2000)

    return () => clearTimeout(timer)
  }, [modifiedRates])

  useEffect(() => {
    applyFilters()
  }, [rates, makeFilter, modelFilter])

  const fetchData = async () => {
    try {
      // Fetch all rates using pagination to bypass the 1000 row limit
      let allRates: RateLookup[] = []
      let hasMore = true
      let page = 0
      const pageSize = 1000

      while (hasMore) {
        const { data, error } = await supabase
          .from('rate_lookup')
          .select('*')
          .order('make')
          .order('model')
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) throw error
        if (data) {
          allRates = [...allRates, ...data]
          hasMore = data.length === pageSize
          page++
        } else {
          hasMore = false
        }
      }

      // Fetch makes and models
      const [makesRes, modelsRes] = await Promise.all([
        supabase.from('makes').select('*'),
        supabase.from('models').select('*').order('name'),
      ])

      setRates(allRates)
      if (makesRes.data) {
        // Sort makes by popularity first, then alphabetically
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

  const applyFilters = () => {
    let filtered = [...rates]

    if (makeFilter) {
      filtered = filtered.filter((r) => r.make_id === makeFilter)
    }

    if (modelFilter) {
      filtered = filtered.filter((r) => r.model_id === modelFilter)
    }

    setFilteredRates(filtered)
    setCurrentPage(1)
  }

  // Get models for selected make
  const availableModels = makeFilter
    ? allModels.filter((m) => m.make_id === makeFilter)
    : allModels

  const handlePriceChange = (rateId: string, value: string) => {
    const newModified = new Map(modifiedRates)
    if (value === '') {
      newModified.delete(rateId)
    } else {
      newModified.set(rateId, value)
    }
    setModifiedRates(newModified)
  }

  const handleClearPrice = (rate: RateLookup) => {
    // Mark this rate as modified with empty value (will set to NULL)
    const newModified = new Map(modifiedRates)
    newModified.set(rate.id, '')
    setModifiedRates(newModified)
  }

  const getDisplayPrice = (rate: RateLookup): string => {
    if (modifiedRates.has(rate.id)) {
      return modifiedRates.get(rate.id)!
    }
    return rate.price?.toString() || ''
  }

  const getValidation = (rate: RateLookup) => {
    // Create a temporary rate object with the current value for validation
    const currentValue = getDisplayPrice(rate)
    if (!currentValue) return null

    const priceNum = parseFloat(currentValue)
    if (isNaN(priceNum)) return null

    const tempRate = {
      ...rate,
      price: priceNum
    }
    return validatePrice(tempRate, rates)
  }

  const handleToggleFavorite = (rateId: string) => {
    toggleFavorite(rateId)
    setFavorites(getFavorites())
  }

  // Location costs functions
  const fetchLocationCosts = async (rateId: string): Promise<Record<string, LocationCost>> => {
    const { data, error } = await supabase
      .from('location_costs')
      .select('*')
      .eq('rate_id', rateId)

    if (error) {
      console.error('Error fetching location costs:', error)
      return {}
    }

    const costsMap: Record<string, LocationCost> = {}
    data?.forEach(cost => {
      costsMap[cost.location] = cost
    })
    return costsMap
  }

  // Fetch dimensions for a model
  const fetchDimensions = async (modelId: string): Promise<EquipmentDimensions | null> => {
    const { data, error } = await supabase
      .from('equipment_dimensions')
      .select('*')
      .eq('model_id', modelId)
      .single()

    if (error) {
      if (error.code !== 'PGRST116') { // Not found is ok
        console.error('Error fetching dimensions:', error)
      }
      return null
    }

    return data
  }

  const toggleRowExpansion = async (rateId: string) => {
    if (expandedRows[rateId]) {
      // Collapse
      const newExpanded = { ...expandedRows }
      delete newExpanded[rateId]
      setExpandedRows(newExpanded)
    } else {
      // Expand and fetch location costs and dimensions
      const rate = rates.find(r => r.id === rateId)
      const [locationCosts, dimensions] = await Promise.all([
        fetchLocationCosts(rateId),
        rate ? fetchDimensions(rate.model_id) : Promise.resolve(null)
      ])
      setExpandedRows(prev => ({
        ...prev,
        [rateId]: { rateId, locationCosts, dimensions }
      }))
    }
  }

  const updateLocationCost = async (
    rateId: string,
    location: Location,
    field: string,
    value: string
  ) => {
    const numValue = value === '' ? null : parseFloat(value)
    const key = `${rateId}-${location}`

    setSavingLocationCost(prev => ({ ...prev, [key]: true }))

    try {
      const existingCost = expandedRows[rateId]?.locationCosts[location]

      if (existingCost) {
        // Update existing
        const { error } = await supabase
          .from('location_costs')
          .update({ [field]: numValue })
          .eq('id', existingCost.id)

        if (error) throw error

        // Update local state
        setExpandedRows(prev => ({
          ...prev,
          [rateId]: {
            ...prev[rateId],
            locationCosts: {
              ...prev[rateId].locationCosts,
              [location]: {
                ...prev[rateId].locationCosts[location],
                [field]: numValue
              }
            }
          }
        }))
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('location_costs')
          .insert({
            rate_id: rateId,
            location,
            [field]: numValue
          })
          .select()
          .single()

        if (error) throw error

        // Update local state
        setExpandedRows(prev => ({
          ...prev,
          [rateId]: {
            ...prev[rateId],
            locationCosts: {
              ...prev[rateId].locationCosts,
              [location]: data
            }
          }
        }))
      }

      onShowToast('Cost saved', 'success')
    } catch (error) {
      console.error('Error saving location cost:', error)
      onShowToast('Error saving cost', 'error')
    } finally {
      setSavingLocationCost(prev => ({ ...prev, [key]: false }))
    }
  }

  // Update dimension for a model
  const updateDimension = async (
    rateId: string,
    modelId: string,
    field: keyof EquipmentDimensions,
    value: string | null
  ) => {
    const key = `${rateId}-${field}`
    setSavingDimension(prev => ({ ...prev, [key]: true }))

    try {
      const existingDimensions = expandedRows[rateId]?.dimensions
      let processedValue: string | number | null = value

      // Convert numeric fields
      if (['operating_weight', 'shipping_weight', 'transport_length', 'transport_width', 'transport_height'].includes(field)) {
        processedValue = value === '' || value === null ? null : parseFloat(value)
      }

      if (existingDimensions) {
        // Update existing
        const { error } = await supabase
          .from('equipment_dimensions')
          .update({ [field]: processedValue, updated_at: new Date().toISOString() })
          .eq('id', existingDimensions.id)

        if (error) throw error

        // Update local state
        setExpandedRows(prev => ({
          ...prev,
          [rateId]: {
            ...prev[rateId],
            dimensions: {
              ...prev[rateId].dimensions!,
              [field]: processedValue
            }
          }
        }))
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('equipment_dimensions')
          .insert({
            model_id: modelId,
            [field]: processedValue
          })
          .select()
          .single()

        if (error) throw error

        // Update local state
        setExpandedRows(prev => ({
          ...prev,
          [rateId]: {
            ...prev[rateId],
            dimensions: data
          }
        }))
      }

      onShowToast('Dimension saved', 'success')
    } catch (error) {
      console.error('Error saving dimension:', error)
      onShowToast('Error saving dimension', 'error')
    } finally {
      setSavingDimension(prev => ({ ...prev, [key]: false }))
    }
  }

  // Handle image upload for equipment dimensions
  const handleImageUpload = async (rateId: string, modelId: string, imageType: 'front' | 'side', file: File) => {
    const key = `${rateId}-${imageType}_image`
    setUploadingImage(prev => ({ ...prev, [key]: true }))

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target?.result as string
        const field = imageType === 'front' ? 'front_image_base64' : 'side_image_base64'

        const existingDimensions = expandedRows[rateId]?.dimensions

        if (existingDimensions) {
          const { error } = await supabase
            .from('equipment_dimensions')
            .update({ [field]: base64, updated_at: new Date().toISOString() })
            .eq('id', existingDimensions.id)

          if (error) throw error

          setExpandedRows(prev => ({
            ...prev,
            [rateId]: {
              ...prev[rateId],
              dimensions: {
                ...prev[rateId].dimensions!,
                [field]: base64
              }
            }
          }))
        } else {
          const { data, error } = await supabase
            .from('equipment_dimensions')
            .insert({
              model_id: modelId,
              [field]: base64
            })
            .select()
            .single()

          if (error) throw error

          setExpandedRows(prev => ({
            ...prev,
            [rateId]: {
              ...prev[rateId],
              dimensions: data
            }
          }))
        }

        onShowToast(`${imageType === 'front' ? 'Front' : 'Side'} image uploaded`, 'success')
        setUploadingImage(prev => ({ ...prev, [key]: false }))
      }

      reader.onerror = () => {
        onShowToast('Failed to read image file', 'error')
        setUploadingImage(prev => ({ ...prev, [key]: false }))
      }

      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading image:', error)
      onShowToast('Failed to upload image', 'error')
      setUploadingImage(prev => ({ ...prev, [key]: false }))
    }
  }

  // Remove image from equipment dimensions
  const removeImage = async (rateId: string, imageType: 'front' | 'side') => {
    const key = `${rateId}-${imageType}_image`
    setUploadingImage(prev => ({ ...prev, [key]: true }))

    try {
      const field = imageType === 'front' ? 'front_image_base64' : 'side_image_base64'
      const existingDimensions = expandedRows[rateId]?.dimensions

      if (existingDimensions) {
        const { error } = await supabase
          .from('equipment_dimensions')
          .update({ [field]: null, updated_at: new Date().toISOString() })
          .eq('id', existingDimensions.id)

        if (error) throw error

        setExpandedRows(prev => ({
          ...prev,
          [rateId]: {
            ...prev[rateId],
            dimensions: {
              ...prev[rateId].dimensions!,
              [field]: null
            }
          }
        }))

        onShowToast(`${imageType === 'front' ? 'Front' : 'Side'} image removed`, 'success')
      }
    } catch (error) {
      console.error('Error removing image:', error)
      onShowToast('Failed to remove image', 'error')
    } finally {
      setUploadingImage(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleAutoSave = async () => {
    if (modifiedRates.size === 0 || saving || autoSaving) return

    setAutoSaving(true)
    try {
      const updates = Array.from(modifiedRates.entries()).map(([id, price]) => {
        // Find the original rate to get make_id and model_id
        const rate = rates.find(r => r.id === id)
        if (!rate) throw new Error('Rate not found')

        return {
          id,
          make_id: rate.make_id,
          model_id: rate.model_id,
          price: price === '' ? null : parseFloat(price),
          updated_at: new Date().toISOString(),
        }
      })

      const { error } = await supabase.from('rates').upsert(updates, {
        onConflict: 'id'
      })

      if (error) {
        console.error('Auto-save error:', error)
        throw error
      }

      setModifiedRates(new Map())
      fetchData()
    } catch (error: any) {
      console.error('Failed to auto-save:', error)
      onShowToast(error.message || 'Auto-save failed', 'error')
    } finally {
      setAutoSaving(false)
    }
  }

  const handleSaveAll = async () => {
    if (modifiedRates.size === 0) return

    setSaving(true)
    try {
      const updates = Array.from(modifiedRates.entries()).map(([id, price]) => {
        // Find the original rate to get make_id and model_id
        const rate = rates.find(r => r.id === id)
        if (!rate) throw new Error('Rate not found')

        return {
          id,
          make_id: rate.make_id,
          model_id: rate.model_id,
          price: price === '' ? null : parseFloat(price),
          updated_at: new Date().toISOString(),
        }
      })

      const { error } = await supabase.from('rates').upsert(updates, {
        onConflict: 'id'
      })

      if (error) {
        console.error('Save error:', error)
        throw error
      }

      onShowToast(`${updates.length} price${updates.length > 1 ? 's' : ''} saved successfully`, 'success')
      setModifiedRates(new Map())
      fetchData()
    } catch (error: any) {
      console.error('Failed to save:', error)
      onShowToast(error.message || 'Failed to save prices', 'error')
    } finally {
      setSaving(false)
    }
  }

  const paginatedRates = filteredRates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  const totalPages = Math.ceil(filteredRates.length / itemsPerPage)

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="bg-gray-200 animate-pulse rounded h-12" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Make</label>
            <select
              value={makeFilter}
              onChange={(e) => {
                setMakeFilter(e.target.value)
                setModelFilter('') // Reset model when make changes
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            >
              <option value="">All Makes</option>
              {makes.map((make) => (
                <option key={make.id} value={make.id}>
                  {make.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Model</label>
            <div className="flex gap-2">
              <select
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                disabled={!makeFilter && allModels.length > 100}
              >
                <option value="">All Models</option>
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              {makeFilter && (
                <button
                  onClick={() => setShowAddModelModal(true)}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 text-sm font-medium whitespace-nowrap"
                  title="Add new model for selected make"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Model
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="text-xs sm:text-sm text-gray-600">
        Showing {filteredRates.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
        {Math.min(currentPage * itemsPerPage, filteredRates.length)} of {filteredRates.length} entries
      </div>

      {/* Data Table */}
      {filteredRates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:p-12 text-center">
          <div className="text-4xl mb-4">😕</div>
          <div className="text-lg md:text-xl font-semibold text-gray-700 mb-2">
            No entries found
          </div>
          <div className="text-sm md:text-base text-gray-500 mb-4">
            {makeFilter || modelFilter ? (
              <div>
                <p>No entries matching your current filters:</p>
                <ul className="mt-2 text-left inline-block">
                  {makeFilter && <li>• Make: {makes.find(m => m.id === makeFilter)?.name}</li>}
                  {modelFilter && <li>• Model: {allModels.find(m => m.id === modelFilter)?.name}</li>}
                </ul>
                <p className="mt-4">Try clearing your filters</p>
              </div>
            ) : (
              'No equipment entries in the database'
            )}
          </div>
          <div className="text-xs text-gray-400">
            Total rates in database: {rates.length}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-2 md:px-3 py-3 w-10"></th>
                  <th className="px-2 md:px-3 py-3 w-10"></th>
                  <th className="px-2 md:px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700">Make</th>
                  <th className="px-2 md:px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700">Model</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRates.map((rate) => {
                  const validation = getValidation(rate)
                  const validationColor = validation ? getPriceValidationColor(validation.type) : ''
                  const hasWarning = validation && (validation.type === 'low' || validation.type === 'high' || validation.type === 'suspicious')
                  const isFav = favorites.has(rate.id)

                  return (
                    <>
                      <tr key={rate.id} className="hover:bg-gray-50 border-b border-gray-100">
                        <td className="px-2 md:px-3 py-3">
                          <button
                            onClick={() => toggleRowExpansion(rate.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
                            title={expandedRows[rate.id] ? 'Collapse location costs' : 'Expand to add location costs'}
                          >
                            <span className="text-lg font-bold text-blue-600">
                              {expandedRows[rate.id] ? '−' : '+'}
                            </span>
                          </button>
                        </td>
                        <td className="px-2 md:px-3 py-3">
                          <button
                            onClick={() => handleToggleFavorite(rate.id)}
                            className="transition-colors"
                            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <svg
                              className={`w-5 h-5 ${isFav ? 'text-yellow-500 fill-current' : 'text-gray-300 hover:text-yellow-400'}`}
                              fill={isFav ? 'currentColor' : 'none'}
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                              />
                            </svg>
                          </button>
                        </td>
                        <td className="px-2 md:px-3 py-3 text-xs md:text-sm text-gray-900">{rate.make}</td>
                        <td className="px-2 md:px-3 py-3 text-xs md:text-sm text-gray-900">{rate.model}</td>
                      </tr>
                      {/* Expanded Row - Location Costs Table */}
                      {expandedRows[rate.id] && (
                        <tr key={`${rate.id}-expanded`}>
                          <td colSpan={4} className="px-4 py-4 bg-blue-50">
                            {/* Base Costs Section */}
                            <div className="ml-6 border rounded-lg overflow-hidden bg-white shadow-sm mb-4">
                              <div className="bg-purple-100 px-4 py-2 border-b">
                                <h4 className="font-semibold text-purple-900 text-sm flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Base Costs for {rate.make} {rate.model}
                                </h4>
                                <p className="text-xs text-purple-700 mt-1">Default costs that apply to all locations unless overridden</p>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      {ALL_COST_FIELDS.map(field => (
                                        <th key={field.key} className="px-2 py-2 text-center font-semibold text-gray-700 min-w-[110px] text-xs">
                                          {field.label}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="bg-purple-50">
                                      {ALL_COST_FIELDS.map(field => {
                                        const cost = expandedRows[rate.id]?.locationCosts['_default']
                                        const value = cost ? cost[field.key as keyof LocationCost] as number | null : null
                                        const isSaving = savingLocationCost[`${rate.id}-_default`]

                                        return (
                                          <td key={field.key} className="px-2 py-2">
                                            <div className="relative">
                                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={value ?? ''}
                                                onChange={(e) => updateLocationCost(rate.id, '_default' as Location, field.key, e.target.value)}
                                                className={`w-full pl-5 pr-2 py-1 border rounded text-right text-xs ${
                                                  isSaving ? 'bg-yellow-50 border-yellow-300' : 'border-purple-200 bg-white'
                                                } focus:outline-none focus:ring-1 focus:ring-purple-500`}
                                                placeholder="0.00"
                                              />
                                            </div>
                                          </td>
                                        )
                                      })}
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Location-Based Costs Section */}
                            <div className="ml-6 border rounded-lg overflow-hidden bg-white shadow-sm">
                              <div className="bg-blue-100 px-4 py-2 border-b">
                                <h4 className="font-semibold text-blue-900 text-sm flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  Location-Specific Cost Overrides
                                </h4>
                                <p className="text-xs text-blue-700 mt-1">Override base costs for specific locations</p>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 min-w-[100px]">
                                        Location
                                      </th>
                                      {ALL_COST_FIELDS.map(field => (
                                        <th key={field.key} className="px-2 py-2 text-center font-semibold text-gray-700 min-w-[110px] text-xs">
                                          {field.label}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {LOCATIONS.map(location => (
                                      <tr key={location} className="border-t hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium text-gray-900 sticky left-0 bg-white text-sm">
                                          {location}
                                        </td>
                                        {ALL_COST_FIELDS.map(field => {
                                          const cost = expandedRows[rate.id]?.locationCosts[location]
                                          const baseCost = expandedRows[rate.id]?.locationCosts['_default']
                                          const value = cost ? cost[field.key as keyof LocationCost] as number | null : null
                                          const baseValue = baseCost ? baseCost[field.key as keyof LocationCost] as number | null : null
                                          const isSaving = savingLocationCost[`${rate.id}-${location}`]

                                          return (
                                            <td key={field.key} className="px-2 py-2">
                                              <div className="relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  value={value ?? ''}
                                                  onChange={(e) => updateLocationCost(rate.id, location, field.key, e.target.value)}
                                                  className={`w-full pl-5 pr-2 py-1 border rounded text-right text-xs ${
                                                    isSaving ? 'bg-yellow-50 border-yellow-300' : 'border-gray-300 bg-white'
                                                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                                                  placeholder={baseValue ? `(${baseValue})` : '0.00'}
                                                />
                                              </div>
                                            </td>
                                          )
                                        })}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Dimensions Section */}
                            <div className="ml-6 mt-4 border rounded-lg overflow-hidden bg-white shadow-sm">
                              <div className="bg-green-100 px-4 py-2 border-b">
                                <h4 className="font-semibold text-green-900 text-sm">
                                  Equipment Dimensions for {rate.make} {rate.model}
                                </h4>
                              </div>
                              <div className="p-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {/* Equipment Type */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Equipment Type</label>
                                    <select
                                      value={expandedRows[rate.id]?.dimensions?.equipment_type || ''}
                                      onChange={(e) => updateDimension(rate.id, rate.model_id, 'equipment_type', e.target.value || null)}
                                      className={`w-full px-3 py-1.5 border rounded text-sm ${
                                        savingDimension[`${rate.id}-equipment_type`] ? 'bg-yellow-50 border-yellow-300' : 'border-gray-300'
                                      } focus:outline-none focus:ring-1 focus:ring-green-500`}
                                    >
                                      <option value="">Select type...</option>
                                      {EQUIPMENT_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Operating Weight */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Operating Weight (lbs)</label>
                                    <input
                                      type="number"
                                      step="1"
                                      value={expandedRows[rate.id]?.dimensions?.operating_weight ?? ''}
                                      onChange={(e) => updateDimension(rate.id, rate.model_id, 'operating_weight', e.target.value)}
                                      className={`w-full px-3 py-1.5 border rounded text-sm ${
                                        savingDimension[`${rate.id}-operating_weight`] ? 'bg-yellow-50 border-yellow-300' : 'border-gray-300'
                                      } focus:outline-none focus:ring-1 focus:ring-green-500`}
                                      placeholder="e.g., 50000"
                                    />
                                  </div>

                                  {/* Shipping Weight */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Shipping Weight (lbs)</label>
                                    <input
                                      type="number"
                                      step="1"
                                      value={expandedRows[rate.id]?.dimensions?.shipping_weight ?? ''}
                                      onChange={(e) => updateDimension(rate.id, rate.model_id, 'shipping_weight', e.target.value)}
                                      className={`w-full px-3 py-1.5 border rounded text-sm ${
                                        savingDimension[`${rate.id}-shipping_weight`] ? 'bg-yellow-50 border-yellow-300' : 'border-gray-300'
                                      } focus:outline-none focus:ring-1 focus:ring-green-500`}
                                      placeholder="e.g., 48000"
                                    />
                                  </div>

                                  {/* Transport Length */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Transport Length (ft.in or inches)</label>
                                    <input
                                      type="text"
                                      key={`length-${rate.id}-${expandedRows[rate.id]?.dimensions?.transport_length ?? 'empty'}`}
                                      defaultValue={(() => {
                                        const len = expandedRows[rate.id]?.dimensions?.transport_length
                                        if (!len) return ''
                                        const feet = Math.floor(len / 12)
                                        const inches = Math.round(len % 12)
                                        return inches > 0 ? `${feet}.${inches}` : `${feet}`
                                      })()}
                                      onBlur={(e) => {
                                        const val = e.target.value.trim()
                                        if (val === '') {
                                          updateDimension(rate.id, rate.model_id, 'transport_length', '')
                                        } else {
                                          const converted = parseSmartDimension(val, 'length')
                                          if (converted !== null) {
                                            updateDimension(rate.id, rate.model_id, 'transport_length', String(converted))
                                          }
                                        }
                                      }}
                                      className={`w-full px-3 py-1.5 border rounded text-sm ${
                                        savingDimension[`${rate.id}-transport_length`] ? 'bg-yellow-50 border-yellow-300' : 'border-gray-300'
                                      } focus:outline-none focus:ring-1 focus:ring-green-500`}
                                      placeholder="e.g., 30.6 or 366"
                                    />
                                  </div>

                                  {/* Transport Width */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Transport Width (ft.in or inches)</label>
                                    <input
                                      type="text"
                                      key={`width-${rate.id}-${expandedRows[rate.id]?.dimensions?.transport_width ?? 'empty'}`}
                                      defaultValue={(() => {
                                        const width = expandedRows[rate.id]?.dimensions?.transport_width
                                        if (!width) return ''
                                        const feet = Math.floor(width / 12)
                                        const inches = Math.round(width % 12)
                                        return inches > 0 ? `${feet}.${inches}` : `${feet}`
                                      })()}
                                      onBlur={(e) => {
                                        const val = e.target.value.trim()
                                        if (val === '') {
                                          updateDimension(rate.id, rate.model_id, 'transport_width', '')
                                        } else {
                                          const converted = parseSmartDimension(val, 'width')
                                          if (converted !== null) {
                                            updateDimension(rate.id, rate.model_id, 'transport_width', String(converted))
                                          }
                                        }
                                      }}
                                      className={`w-full px-3 py-1.5 border rounded text-sm ${
                                        savingDimension[`${rate.id}-transport_width`] ? 'bg-yellow-50 border-yellow-300' : 'border-gray-300'
                                      } focus:outline-none focus:ring-1 focus:ring-green-500`}
                                      placeholder="e.g., 10.6 or 126"
                                    />
                                  </div>

                                  {/* Transport Height */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Transport Height (ft.in or inches)</label>
                                    <input
                                      type="text"
                                      key={`height-${rate.id}-${expandedRows[rate.id]?.dimensions?.transport_height ?? 'empty'}`}
                                      defaultValue={(() => {
                                        const height = expandedRows[rate.id]?.dimensions?.transport_height
                                        if (!height) return ''
                                        const feet = Math.floor(height / 12)
                                        const inches = Math.round(height % 12)
                                        return inches > 0 ? `${feet}.${inches}` : `${feet}`
                                      })()}
                                      onBlur={(e) => {
                                        const val = e.target.value.trim()
                                        if (val === '') {
                                          updateDimension(rate.id, rate.model_id, 'transport_height', '')
                                        } else {
                                          const converted = parseSmartDimension(val, 'height')
                                          if (converted !== null) {
                                            updateDimension(rate.id, rate.model_id, 'transport_height', String(converted))
                                          }
                                        }
                                      }}
                                      className={`w-full px-3 py-1.5 border rounded text-sm ${
                                        savingDimension[`${rate.id}-transport_height`] ? 'bg-yellow-50 border-yellow-300' : 'border-gray-300'
                                      } focus:outline-none focus:ring-1 focus:ring-green-500`}
                                      placeholder="e.g., 11.6 or 138"
                                    />
                                  </div>
                                </div>

                                {/* Dimensions Summary */}
                                {expandedRows[rate.id]?.dimensions && (
                                  <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="text-xs text-gray-500">
                                      {(() => {
                                        const dims = expandedRows[rate.id]?.dimensions
                                        if (dims?.transport_length && dims?.transport_width && dims?.transport_height) {
                                          const l = dims.transport_length
                                          const w = dims.transport_width
                                          const h = dims.transport_height
                                          return (
                                            <span className="mr-4">
                                              <strong>LxWxH:</strong> {Math.floor(l / 12)}'{Math.round(l % 12)}" x {Math.floor(w / 12)}'{Math.round(w % 12)}" x {Math.floor(h / 12)}'{Math.round(h % 12)}"
                                            </span>
                                          )
                                        }
                                        return null
                                      })()}
                                      {expandedRows[rate.id]?.dimensions?.operating_weight && (
                                        <span>
                                          <strong>Weight:</strong> {expandedRows[rate.id]?.dimensions?.operating_weight?.toLocaleString()} lbs
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Equipment Images */}
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <h5 className="text-xs font-semibold text-gray-700 mb-3">Equipment Images</h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Front View Image */}
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Front View</label>
                                      {expandedRows[rate.id]?.dimensions?.front_image_base64 && !failedImages[`${rate.id}-front`] ? (
                                        <div className="relative">
                                          <img
                                            src={expandedRows[rate.id]?.dimensions?.front_image_base64 || ''}
                                            alt="Front view"
                                            className="w-full h-32 object-contain bg-gray-50 rounded border"
                                            onError={() => {
                                              setFailedImages(prev => ({ ...prev, [`${rate.id}-front`]: true }))
                                            }}
                                          />
                                          <button
                                            onClick={() => removeImage(rate.id, 'front')}
                                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                            disabled={uploadingImage[`${rate.id}-front_image`]}
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          </button>
                                        </div>
                                      ) : failedImages[`${rate.id}-front`] ? (
                                        <div className="relative w-full h-32 bg-red-50 rounded border border-red-200 flex flex-col items-center justify-center">
                                          <svg className="w-8 h-8 text-red-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                          </svg>
                                          <p className="text-xs text-red-600 mb-2">Image failed to load</p>
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => {
                                                setFailedImages(prev => ({ ...prev, [`${rate.id}-front`]: false }))
                                              }}
                                              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                            >
                                              Retry
                                            </button>
                                            <button
                                              onClick={() => removeImage(rate.id, 'front')}
                                              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                            >
                                              Remove
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                          <div className="flex flex-col items-center justify-center py-2">
                                            <svg className="w-6 h-6 mb-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            <p className="text-xs text-gray-500">
                                              <span className="font-semibold">Click to upload</span>
                                            </p>
                                          </div>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0]
                                              if (file) handleImageUpload(rate.id, rate.model_id, 'front', file)
                                            }}
                                            disabled={uploadingImage[`${rate.id}-front_image`]}
                                          />
                                        </label>
                                      )}
                                      {uploadingImage[`${rate.id}-front_image`] && (
                                        <div className="mt-1 text-xs text-blue-600">Uploading...</div>
                                      )}
                                    </div>

                                    {/* Side View Image */}
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Side View</label>
                                      {expandedRows[rate.id]?.dimensions?.side_image_base64 && !failedImages[`${rate.id}-side`] ? (
                                        <div className="relative">
                                          <img
                                            src={expandedRows[rate.id]?.dimensions?.side_image_base64 || ''}
                                            alt="Side view"
                                            className="w-full h-32 object-contain bg-gray-50 rounded border"
                                            onError={() => {
                                              setFailedImages(prev => ({ ...prev, [`${rate.id}-side`]: true }))
                                            }}
                                          />
                                          <button
                                            onClick={() => removeImage(rate.id, 'side')}
                                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                            disabled={uploadingImage[`${rate.id}-side_image`]}
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          </button>
                                        </div>
                                      ) : failedImages[`${rate.id}-side`] ? (
                                        <div className="relative w-full h-32 bg-red-50 rounded border border-red-200 flex flex-col items-center justify-center">
                                          <svg className="w-8 h-8 text-red-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                          </svg>
                                          <p className="text-xs text-red-600 mb-2">Image failed to load</p>
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => {
                                                setFailedImages(prev => ({ ...prev, [`${rate.id}-side`]: false }))
                                              }}
                                              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                            >
                                              Retry
                                            </button>
                                            <button
                                              onClick={() => removeImage(rate.id, 'side')}
                                              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                            >
                                              Remove
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                          <div className="flex flex-col items-center justify-center py-2">
                                            <svg className="w-6 h-6 mb-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            <p className="text-xs text-gray-500">
                                              <span className="font-semibold">Click to upload</span>
                                            </p>
                                          </div>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0]
                                              if (file) handleImageUpload(rate.id, rate.model_id, 'side', file)
                                            }}
                                            disabled={uploadingImage[`${rate.id}-side_image`]}
                                          />
                                        </label>
                                      )}
                                      {uploadingImage[`${rate.id}-side_image`] && (
                                        <div className="mt-1 text-xs text-blue-600">Uploading...</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {filteredRates.length > 0 && totalPages > 1 && (
        <div className="px-4 md:px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-lg shadow-sm">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-full sm:w-auto px-3 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-xs sm:text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="w-full sm:w-auto px-3 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}

      {/* Add Model Modal */}
      <AddModelModal
        isOpen={showAddModelModal}
        onClose={() => setShowAddModelModal(false)}
        makeId={makeFilter}
        makeName={makes.find(m => m.id === makeFilter)?.name || ''}
        onSuccess={fetchData}
        onShowToast={onShowToast}
      />
    </div>
  )
}
