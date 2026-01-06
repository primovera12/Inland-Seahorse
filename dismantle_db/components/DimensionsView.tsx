'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, Make, Model, EquipmentDimensions, EquipmentSilhouetteType } from '@/lib/supabase'
import { sortMakesByPopularity } from '@/lib/sorting'
import { detectEquipmentType, EQUIPMENT_TYPE_LABELS, EQUIPMENT_TYPES } from './EquipmentSilhouette'

interface DimensionsViewProps {
  onShowToast: (message: string, type: 'success' | 'error') => void
}

interface ModelWithMake extends Model {
  make_name: string
}

const DIMENSION_FIELDS = [
  { key: 'operating_weight', label: 'Operating Weight', unit: 'lbs', type: 'weight' },
  { key: 'transport_length', label: 'Transport Length', unit: 'in', type: 'dimension' },
  { key: 'transport_width', label: 'Transport Width', unit: 'in', type: 'dimension' },
  { key: 'transport_height', label: 'Transport Height', unit: 'in', type: 'dimension' },
] as const

export default function DimensionsView({ onShowToast }: DimensionsViewProps) {
  const [makes, setMakes] = useState<Make[]>([])
  const [allModels, setAllModels] = useState<ModelWithMake[]>([])
  const [filteredModels, setFilteredModels] = useState<ModelWithMake[]>([])
  const [dimensions, setDimensions] = useState<Record<string, EquipmentDimensions>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  const [makeFilter, setMakeFilter] = useState('')
  const [modelSearch, setModelSearch] = useState('')
  const [showOnlyWithData, setShowOnlyWithData] = useState(false)
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set())

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  const frontImageRef = useRef<HTMLInputElement>(null)
  const sideImageRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [allModels, makeFilter, modelSearch, showOnlyWithData, dimensions])

  const fetchData = async () => {
    try {
      const { data: makesData, error: makesError } = await supabase
        .from('makes')
        .select('*')
        .order('name')

      if (makesError) throw makesError

      const { data: modelsData, error: modelsError } = await supabase
        .from('models')
        .select('*, makes(name)')
        .order('name')

      if (modelsError) throw modelsError

      const { data: dimensionsData, error: dimensionsError } = await supabase
        .from('equipment_dimensions')
        .select('*')

      if (dimensionsError && dimensionsError.code !== 'PGRST116') {
        console.warn('Dimensions table may not exist yet:', dimensionsError)
      }

      const sortedMakes = sortMakesByPopularity(makesData || [], (make) => make.name)
      setMakes(sortedMakes)

      const modelsWithMake: ModelWithMake[] = (modelsData || []).map((m: any) => ({
        ...m,
        make_name: m.makes?.name || 'Unknown'
      }))
      setAllModels(modelsWithMake)

      const dimensionsMap: Record<string, EquipmentDimensions> = {}
      dimensionsData?.forEach((d: EquipmentDimensions) => {
        dimensionsMap[d.model_id] = d
      })
      setDimensions(dimensionsMap)
    } catch (error) {
      console.error('Failed to load data:', error)
      onShowToast('Failed to load data. Make sure the dimensions table exists.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = useCallback(() => {
    let filtered = [...allModels]

    if (makeFilter) {
      filtered = filtered.filter((m) => m.make_id === makeFilter)
    }

    if (modelSearch) {
      const search = modelSearch.toLowerCase()
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(search) ||
          m.make_name.toLowerCase().includes(search)
      )
    }

    if (showOnlyWithData) {
      filtered = filtered.filter((m) => dimensions[m.id])
    }

    setFilteredModels(filtered)
    setCurrentPage(1)
  }, [allModels, makeFilter, modelSearch, showOnlyWithData, dimensions])

  const toggleExpand = (modelId: string) => {
    setExpandedModels((prev) => {
      const next = new Set(prev)
      if (next.has(modelId)) {
        next.delete(modelId)
      } else {
        next.add(modelId)
      }
      return next
    })
  }

  const updateDimension = async (modelId: string, field: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value)
    const key = `${modelId}-${field}`

    setSaving((prev) => ({ ...prev, [key]: true }))

    try {
      const existing = dimensions[modelId]

      if (existing) {
        const { error } = await supabase
          .from('equipment_dimensions')
          .update({ [field]: numValue, updated_at: new Date().toISOString() })
          .eq('id', existing.id)

        if (error) throw error

        setDimensions((prev) => ({
          ...prev,
          [modelId]: { ...prev[modelId], [field]: numValue }
        }))
      } else {
        const { data, error } = await supabase
          .from('equipment_dimensions')
          .insert({
            model_id: modelId,
            [field]: numValue
          })
          .select()
          .single()

        if (error) throw error

        setDimensions((prev) => ({
          ...prev,
          [modelId]: data
        }))
      }

      onShowToast('Saved', 'success')
    } catch (error: any) {
      console.error('Error saving dimension:', error)
      onShowToast(error.message || 'Failed to save', 'error')
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }))
    }
  }

  const updateEquipmentType = async (modelId: string, makeName: string, modelName: string, type: EquipmentSilhouetteType | 'auto') => {
    const key = `${modelId}-equipment_type`
    setSaving((prev) => ({ ...prev, [key]: true }))

    const finalType = type === 'auto' ? detectEquipmentType(makeName, modelName) : type

    try {
      const existing = dimensions[modelId]

      if (existing) {
        const { error } = await supabase
          .from('equipment_dimensions')
          .update({ equipment_type: finalType, updated_at: new Date().toISOString() })
          .eq('id', existing.id)

        if (error) throw error

        setDimensions((prev) => ({
          ...prev,
          [modelId]: { ...prev[modelId], equipment_type: finalType }
        }))
      } else {
        const { data, error } = await supabase
          .from('equipment_dimensions')
          .insert({
            model_id: modelId,
            equipment_type: finalType
          })
          .select()
          .single()

        if (error) throw error

        setDimensions((prev) => ({
          ...prev,
          [modelId]: data
        }))
      }

      onShowToast(`Equipment type set to ${EQUIPMENT_TYPE_LABELS[finalType]}`, 'success')
    } catch (error: any) {
      console.error('Error saving equipment type:', error)
      onShowToast(error.message || 'Failed to save', 'error')
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }))
    }
  }

  const handleImageUpload = async (modelId: string, imageType: 'front' | 'side', file: File) => {
    const key = `${modelId}-${imageType}_image`
    setUploadingImage((prev) => ({ ...prev, [key]: true }))

    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target?.result as string
        const field = imageType === 'front' ? 'front_image_base64' : 'side_image_base64'

        const existing = dimensions[modelId]

        if (existing) {
          const { error } = await supabase
            .from('equipment_dimensions')
            .update({ [field]: base64, updated_at: new Date().toISOString() })
            .eq('id', existing.id)

          if (error) throw error

          setDimensions((prev) => ({
            ...prev,
            [modelId]: { ...prev[modelId], [field]: base64 }
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

          setDimensions((prev) => ({
            ...prev,
            [modelId]: data
          }))
        }

        onShowToast(`${imageType === 'front' ? 'Front' : 'Side'} image uploaded`, 'success')
        setUploadingImage((prev) => ({ ...prev, [key]: false }))
      }

      reader.onerror = () => {
        onShowToast('Failed to read image file', 'error')
        setUploadingImage((prev) => ({ ...prev, [key]: false }))
      }

      reader.readAsDataURL(file)
    } catch (error: any) {
      console.error('Error uploading image:', error)
      onShowToast(error.message || 'Failed to upload image', 'error')
      setUploadingImage((prev) => ({ ...prev, [key]: false }))
    }
  }

  const removeImage = async (modelId: string, imageType: 'front' | 'side') => {
    const key = `${modelId}-${imageType}_image`
    setUploadingImage((prev) => ({ ...prev, [key]: true }))

    try {
      const field = imageType === 'front' ? 'front_image_base64' : 'side_image_base64'
      const existing = dimensions[modelId]

      if (existing) {
        const { error } = await supabase
          .from('equipment_dimensions')
          .update({ [field]: null, updated_at: new Date().toISOString() })
          .eq('id', existing.id)

        if (error) throw error

        setDimensions((prev) => ({
          ...prev,
          [modelId]: { ...prev[modelId], [field]: null }
        }))

        onShowToast(`${imageType === 'front' ? 'Front' : 'Side'} image removed`, 'success')
      }
    } catch (error: any) {
      console.error('Error removing image:', error)
      onShowToast(error.message || 'Failed to remove image', 'error')
    } finally {
      setUploadingImage((prev) => ({ ...prev, [key]: false }))
    }
  }

  const getDimensionValue = (modelId: string, field: string): string => {
    const dim = dimensions[modelId]
    if (!dim) return ''
    const value = dim[field as keyof EquipmentDimensions]
    return value !== null && value !== undefined ? String(value) : ''
  }

  const hasAnyDimension = (modelId: string): boolean => {
    const dim = dimensions[modelId]
    if (!dim) return false
    return DIMENSION_FIELDS.some(
      (f) => dim[f.key as keyof EquipmentDimensions] !== null
    ) || dim.front_image_base64 !== null || dim.side_image_base64 !== null
  }

  const paginatedModels = filteredModels.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  const totalPages = Math.ceil(filteredModels.length / itemsPerPage)

  const modelsWithDimensions = allModels.filter((m) => dimensions[m.id]).length
  const totalModels = allModels.length

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
      {/* Stats Bar */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Equipment Dimensions</h2>
            <p className="text-sm text-gray-600">
              {modelsWithDimensions} of {totalModels} models have dimension data (
              {totalModels > 0 ? ((modelsWithDimensions / totalModels) * 100).toFixed(1) : 0}%)
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-blue-200">
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${totalModels > 0 ? (modelsWithDimensions / totalModels) * 100 : 0}%` }}
              />
            </div>
            <span className="text-sm font-medium text-blue-700">
              {modelsWithDimensions}/{totalModels}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Make</label>
            <select
              value={makeFilter}
              onChange={(e) => setMakeFilter(e.target.value)}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Model</label>
            <input
              type="text"
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              placeholder="Search by model or make..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyWithData}
                onChange={(e) => setShowOnlyWithData(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Show only with data</span>
            </label>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="text-xs sm:text-sm text-gray-600">
        Showing {filteredModels.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
        {Math.min(currentPage * itemsPerPage, filteredModels.length)} of {filteredModels.length} models
      </div>

      {/* Models List */}
      {filteredModels.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:p-12 text-center">
          <div className="text-4xl mb-4">📏</div>
          <div className="text-lg md:text-xl font-semibold text-gray-700 mb-2">
            No models found
          </div>
          <div className="text-sm md:text-base text-gray-500">
            {makeFilter || modelSearch || showOnlyWithData
              ? 'Try adjusting your filters'
              : 'No equipment models in the database'}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedModels.map((model) => {
            const isExpanded = expandedModels.has(model.id)
            const hasDimensions = hasAnyDimension(model.id)
            const dim = dimensions[model.id]
            const detectedType = detectEquipmentType(model.make_name, model.name)

            return (
              <div
                key={model.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Model Header Row */}
                <div
                  className={`flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                    isExpanded ? 'border-b border-gray-200 bg-gray-50' : ''
                  }`}
                  onClick={() => toggleExpand(model.id)}
                >
                  <button className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                    {isExpanded ? '−' : '+'}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{model.make_name}</span>
                      <span className="text-gray-400">/</span>
                      <span className="text-gray-700">{model.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasDimensions ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Has Data
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                        No Data
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Dimensions Form */}
                {isExpanded && (
                  <div className="p-4 bg-gray-50">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Left Column: Dimensions & Weight */}
                      <div className="space-y-4">
                        {/* Equipment Type */}
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-indigo-100 rounded flex items-center justify-center text-indigo-600">
                              🏷
                            </span>
                            Equipment Type
                          </h4>
                          <div className="flex items-center gap-2">
                            <select
                              value={dim?.equipment_type || ''}
                              onChange={(e) => updateEquipmentType(model.id, model.make_name, model.name, e.target.value as EquipmentSilhouetteType)}
                              className={`flex-1 border rounded px-3 py-2 text-sm ${
                                saving[`${model.id}-equipment_type`]
                                  ? 'bg-yellow-50 border-yellow-300'
                                  : 'border-gray-300'
                              }`}
                            >
                              <option value="">Select type...</option>
                              {EQUIPMENT_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {EQUIPMENT_TYPE_LABELS[type]}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => updateEquipmentType(model.id, model.make_name, model.name, 'auto')}
                              className="px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                              title={`Auto-detect: ${EQUIPMENT_TYPE_LABELS[detectedType]}`}
                            >
                              Auto ({EQUIPMENT_TYPE_LABELS[detectedType].split(' ')[0]})
                            </button>
                          </div>
                        </div>

                        {/* Weight */}
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-orange-100 rounded flex items-center justify-center text-orange-600">
                              ⚖
                            </span>
                            Operating Weight
                          </h4>
                          <div className="relative">
                            <input
                              type="number"
                              step="1"
                              value={getDimensionValue(model.id, 'operating_weight')}
                              onChange={(e) => updateDimension(model.id, 'operating_weight', e.target.value)}
                              className={`w-full border rounded px-3 py-2 pr-12 text-sm ${
                                saving[`${model.id}-operating_weight`]
                                  ? 'bg-yellow-50 border-yellow-300'
                                  : 'border-gray-300'
                              }`}
                              placeholder="0"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                              lbs
                            </span>
                          </div>
                        </div>

                        {/* Transport Dimensions */}
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center text-blue-600">
                              📦
                            </span>
                            Transport Dimensions
                          </h4>
                          <div className="space-y-3">
                            {[
                              { key: 'transport_length', label: 'Length' },
                              { key: 'transport_width', label: 'Width' },
                              { key: 'transport_height', label: 'Height' },
                            ].map((field) => (
                              <div key={field.key}>
                                <label className="block text-xs text-gray-600 mb-1">{field.label}</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={getDimensionValue(model.id, field.key)}
                                    onChange={(e) => updateDimension(model.id, field.key, e.target.value)}
                                    className={`w-full border rounded px-3 py-2 pr-12 text-sm ${
                                      saving[`${model.id}-${field.key}`]
                                        ? 'bg-yellow-50 border-yellow-300'
                                        : 'border-gray-300'
                                    }`}
                                    placeholder="0"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                    in
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Image Uploads */}
                      <div className="space-y-4">
                        {/* Front View Image */}
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-green-100 rounded flex items-center justify-center text-green-600">
                              📷
                            </span>
                            Front View Image
                          </h4>
                          {dim?.front_image_base64 ? (
                            <div className="relative">
                              <img
                                src={dim.front_image_base64}
                                alt="Front view"
                                className="w-full h-40 object-contain bg-gray-50 rounded border"
                              />
                              <button
                                onClick={() => removeImage(model.id, 'front')}
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                disabled={uploadingImage[`${model.id}-front_image`]}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="mb-2 text-sm text-gray-500">
                                  <span className="font-semibold">Click to upload</span> front view
                                </p>
                                <p className="text-xs text-gray-500">PNG, JPG up to 2MB</p>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) handleImageUpload(model.id, 'front', file)
                                }}
                                disabled={uploadingImage[`${model.id}-front_image`]}
                              />
                            </label>
                          )}
                          {uploadingImage[`${model.id}-front_image`] && (
                            <div className="mt-2 text-xs text-blue-600">Uploading...</div>
                          )}
                        </div>

                        {/* Side View Image */}
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center text-purple-600">
                              📷
                            </span>
                            Side View Image
                          </h4>
                          {dim?.side_image_base64 ? (
                            <div className="relative">
                              <img
                                src={dim.side_image_base64}
                                alt="Side view"
                                className="w-full h-40 object-contain bg-gray-50 rounded border"
                              />
                              <button
                                onClick={() => removeImage(model.id, 'side')}
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                disabled={uploadingImage[`${model.id}-side_image`]}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="mb-2 text-sm text-gray-500">
                                  <span className="font-semibold">Click to upload</span> side view
                                </p>
                                <p className="text-xs text-gray-500">PNG, JPG up to 2MB</p>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) handleImageUpload(model.id, 'side', file)
                                }}
                                disabled={uploadingImage[`${model.id}-side_image`]}
                              />
                            </label>
                          )}
                          {uploadingImage[`${model.id}-side_image`] && (
                            <div className="mt-2 text-xs text-blue-600">Uploading...</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {filteredModels.length > 0 && totalPages > 1 && (
        <div className="px-4 md:px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-lg shadow-sm">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-full sm:w-auto px-3 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-xs sm:text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="w-full sm:w-auto px-3 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
