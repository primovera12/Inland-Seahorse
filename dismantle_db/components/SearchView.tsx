'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase, RateLookup, LocationCost, LOCATIONS, ALL_COST_FIELDS, Location, EquipmentDimensions } from '@/lib/supabase'
import { sortMakesByPopularity } from '@/lib/sorting'
import { exportToCSV, exportComprehensiveToCSV, RateWithFullData } from '@/lib/exportUtils'
import { getFavorites, toggleFavorite, isFavorite } from '@/lib/favorites'

interface SearchViewProps {
  onShowToast: (message: string, type: 'success' | 'error') => void
}

type SortField = 'make' | 'model' | 'price' | 'updated_at'
type SortDirection = 'asc' | 'desc'

interface RateWithCosts extends RateLookup {
  locationCosts: LocationCost[]
  dimensions?: EquipmentDimensions | null
}

export default function SearchView({ onShowToast }: SearchViewProps) {
  const [rates, setRates] = useState<RateWithCosts[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('make')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  const [makeFilter, setMakeFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [expandedRates, setExpandedRates] = useState<Set<string>>(new Set())

  // Reset confirmation modal
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetTarget, setResetTarget] = useState<RateWithCosts | null>(null)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  useEffect(() => {
    fetchRates()
    setFavorites(getFavorites())
  }, [])

  const fetchRates = async () => {
    try {
      // First fetch all rates
      const { data: ratesData, error: ratesError } = await supabase
        .from('rate_lookup')
        .select('*')
        .order('make')

      if (ratesError) throw ratesError

      // Then fetch all location costs
      const { data: costsData, error: costsError } = await supabase
        .from('location_costs')
        .select('*')
        .order('location')

      if (costsError) throw costsError

      // Fetch all equipment dimensions
      const { data: dimensionsData, error: dimensionsError } = await supabase
        .from('equipment_dimensions')
        .select('*')

      if (dimensionsError) throw dimensionsError

      // Combine rates with their location costs and dimensions
      const ratesWithCosts: RateWithCosts[] = (ratesData || []).map(rate => ({
        ...rate,
        locationCosts: (costsData || []).filter(cost => cost.rate_id === rate.id),
        dimensions: (dimensionsData || []).find(dim => dim.model_id === rate.model_id) || null
      }))

      // Filter to only show rates that have at least one location cost with data
      const ratesWithData = ratesWithCosts.filter(rate =>
        rate.locationCosts.some(lc =>
          ALL_COST_FIELDS.some(field => lc[field.key as keyof LocationCost] !== null)
        )
      )

      setRates(ratesWithData)
    } catch (error) {
      onShowToast('Failed to load rates', 'error')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (rateId: string) => {
    setExpandedRates(prev => {
      const newSet = new Set(prev)
      if (newSet.has(rateId)) {
        newSet.delete(rateId)
      } else {
        newSet.add(rateId)
      }
      return newSet
    })
  }

  const handleResetClick = (rate: RateWithCosts) => {
    setResetTarget(rate)
    setResetConfirmText('')
    setShowResetModal(true)
  }

  const handleResetConfirm = async () => {
    if (!resetTarget || resetConfirmText !== 'RESET') return

    setIsResetting(true)
    try {
      // Delete all location costs for this rate
      const { error } = await supabase
        .from('location_costs')
        .delete()
        .eq('rate_id', resetTarget.id)

      if (error) throw error

      onShowToast(`Cleared all data for ${resetTarget.make} ${resetTarget.model}`, 'success')
      setShowResetModal(false)
      setResetTarget(null)
      setResetConfirmText('')

      // Refresh the data
      fetchRates()
    } catch (error) {
      onShowToast('Failed to reset data', 'error')
    } finally {
      setIsResetting(false)
    }
  }

  const uniqueMakes = useMemo(() => {
    const makes = [...new Set(rates.map((r) => r.make))]
    const sorted = sortMakesByPopularity(
      makes.map(name => ({ name })),
      (item) => item.name
    )
    return sorted.map(item => item.name)
  }, [rates])
  const uniqueModels = useMemo(() => [...new Set(rates.map((r) => r.model))].sort(), [rates])

  const handleToggleFavorite = (rateId: string) => {
    toggleFavorite(rateId)
    setFavorites(getFavorites())
  }

  const filteredAndSortedRates = useMemo(() => {
    let filtered = rates

    // Global search
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.make.toLowerCase().includes(search) ||
          r.model.toLowerCase().includes(search)
      )
    }

    // Single-value filters
    if (makeFilter) {
      filtered = filtered.filter((r) => r.make === makeFilter)
    }
    if (modelFilter) {
      filtered = filtered.filter((r) => r.model === modelFilter)
    }

    // Location filter - only show rates that have costs for the selected location
    if (locationFilter) {
      filtered = filtered.filter((r) =>
        r.locationCosts.some(lc =>
          lc.location === locationFilter &&
          ALL_COST_FIELDS.some(field => lc[field.key as keyof LocationCost] !== null)
        )
      )
    }

    // Favorites filter
    if (favoritesOnly) {
      filtered = filtered.filter((r) => favorites.has(r.id))
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      if (aVal === null) return 1
      if (bVal === null) return -1

      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [rates, searchTerm, makeFilter, modelFilter, locationFilter, favoritesOnly, favorites, sortField, sortDirection])

  const paginatedRates = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredAndSortedRates.slice(start, start + itemsPerPage)
  }, [filteredAndSortedRates, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredAndSortedRates.length / itemsPerPage)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const clearAllFilters = () => {
    setMakeFilter('')
    setModelFilter('')
    setLocationFilter('')
    setSearchTerm('')
    setFavoritesOnly(false)
  }

  const hasActiveFilters = makeFilter || modelFilter || locationFilter || searchTerm || favoritesOnly

  const handleExportCSV = () => {
    const data = filteredAndSortedRates
    if (data.length === 0) {
      onShowToast('No data to export', 'error')
      return
    }

    const filename = `rates-export-${new Date().toISOString().split('T')[0]}.csv`
    exportToCSV(data, filename)
    onShowToast(`Exported ${data.length} rates to CSV`, 'success')
  }

  const handleDetailedExport = () => {
    const data = filteredAndSortedRates
    if (data.length === 0) {
      onShowToast('No data to export', 'error')
      return
    }

    // Convert to RateWithFullData format for comprehensive export
    const fullData: RateWithFullData[] = data.map(rate => ({
      ...rate,
      locationCosts: new Map(rate.locationCosts.map(lc => [lc.location, lc]))
    }))

    const filename = `equipment-comprehensive-${new Date().toISOString().split('T')[0]}.csv`
    exportComprehensiveToCSV(fullData, filename)
    onShowToast(`Exported ${data.length} equipment with all data to CSV`, 'success')
  }

  // Calculate stats including dimensions
  const statsWithDimensions = useMemo(() => {
    const withDimensions = filteredAndSortedRates.filter(r => r.dimensions)
    const withImages = filteredAndSortedRates.filter(r =>
      r.dimensions?.front_image_base64 || r.dimensions?.side_image_base64
    )
    return {
      total: filteredAndSortedRates.length,
      withDimensions: withDimensions.length,
      withImages: withImages.length
    }
  }, [filteredAndSortedRates])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const day = date.getDate()
    const year = date.getFullYear()

    if (year === now.getFullYear()) {
      return `${month} ${day}`
    }
    return `${month} ${day}, ${year}`
  }

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
      {/* Stats & Export Bar */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 flex-1">
            <div>
              <div className="text-xs text-gray-600">Equipment with Data</div>
              <div className="text-lg font-semibold text-gray-900">{filteredAndSortedRates.length}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600">With Dimensions</div>
              <div className="text-lg font-semibold text-orange-600">{statsWithDimensions.withDimensions}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Total Location Costs</div>
              <div className="text-lg font-semibold text-green-600">
                {filteredAndSortedRates.reduce((sum, r) => sum + r.locationCosts.length, 0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Unique Makes</div>
              <div className="text-lg font-semibold text-blue-600">{uniqueMakes.length}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Locations Available</div>
              <div className="text-lg font-semibold text-purple-600">{LOCATIONS.length}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              disabled={filteredAndSortedRates.length === 0}
              className="whitespace-nowrap px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={handleDetailedExport}
              disabled={filteredAndSortedRates.length === 0}
              className="whitespace-nowrap px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Detailed Export
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Make</label>
            <select
              value={makeFilter}
              onChange={(e) => {
                setMakeFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            >
              <option value="">All Makes</option>
              {uniqueMakes.map((make) => (
                <option key={make} value={make}>
                  {make}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Model</label>
            <select
              value={modelFilter}
              onChange={(e) => {
                setModelFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            >
              <option value="">All Models</option>
              {uniqueModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Location</label>
            <select
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            >
              <option value="">All Locations</option>
              {LOCATIONS.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap mt-6">
              <input
                type="checkbox"
                checked={favoritesOnly}
                onChange={(e) => {
                  setFavoritesOnly(e.target.checked)
                  setCurrentPage(1)
                }}
                className="w-4 h-4 text-yellow-600 rounded"
              />
              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Favorites Only</span>
            </label>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center">
              <button
                onClick={clearAllFilters}
                className="text-sm text-blue-600 hover:text-blue-700 underline font-medium whitespace-nowrap mt-6"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
          placeholder="Search by make or model..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setCurrentPage(1)
          }}
        />
      </div>

      {/* Data Table */}
      {filteredAndSortedRates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:p-12 text-center">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-lg md:text-xl font-semibold text-gray-700 mb-2">No equipment data found</div>
          <div className="text-sm md:text-base text-gray-500">
            {rates.length === 0 ? 'Add location costs to equipment models to see them here' : 'Try adjusting your search or filters'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedRates.map((rate) => {
            const isFav = favorites.has(rate.id)
            const isExpanded = expandedRates.has(rate.id)
            const hasLocationCosts = rate.locationCosts.length > 0

            return (
              <div key={rate.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header row */}
                <div
                  className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 ${isExpanded ? 'border-b border-gray-200 bg-gray-50' : ''}`}
                  onClick={() => toggleExpanded(rate.id)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleFavorite(rate.id)
                    }}
                    className="mr-3 transition-colors"
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

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{rate.make}</span>
                      <span className="text-gray-600">{rate.model}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {rate.locationCosts.length} location{rate.locationCosts.length !== 1 ? 's' : ''} with costs
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleResetClick(rate)
                      }}
                      className="px-3 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      title="Clear all data for this equipment"
                    >
                      Reset
                    </button>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded content - Location costs */}
                {isExpanded && hasLocationCosts && (
                  <div className="p-4 bg-gray-50">
                    {rate.locationCosts.map((lc) => {
                      // Check if this location has any cost data
                      const hasCostData = ALL_COST_FIELDS.some(
                        field => lc[field.key as keyof LocationCost] !== null
                      )
                      if (!hasCostData) return null

                      return (
                        <div key={lc.id} className="mb-4 last:mb-0 bg-white rounded-lg border border-gray-200 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-blue-600">{lc.location}</h4>
                            <span className="text-xs text-gray-400">
                              Updated: {formatDate(lc.updated_at)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {ALL_COST_FIELDS.map((field) => {
                              const value = lc[field.key as keyof LocationCost]
                              if (value === null) return null
                              return (
                                <div key={field.key} className="bg-gray-50 rounded-lg p-2">
                                  <div className="text-xs text-gray-500">{field.label}</div>
                                  <div className="font-semibold text-gray-900">
                                    ${(value as number).toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          {lc.notes && (
                            <div className="mt-3 text-sm text-gray-600 bg-yellow-50 rounded-lg p-2 border border-yellow-200">
                              <span className="font-medium">Notes:</span> {lc.notes}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Empty state for expanded but no location costs */}
                {isExpanded && !hasLocationCosts && (
                  <div className="p-8 text-center text-gray-500 bg-gray-50">
                    No location cost data available for this equipment
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {filteredAndSortedRates.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 md:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-xs sm:text-sm text-gray-600">
            Showing {(currentPage - 1) * itemsPerPage + 1}-
            {Math.min(currentPage * itemsPerPage, filteredAndSortedRates.length)} of{' '}
            {filteredAndSortedRates.length} results
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <label className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Per page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="border border-gray-200 rounded-md px-2 py-1 text-xs sm:text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex-1 sm:flex-initial px-3 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ←
              </button>
              <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Page {currentPage}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex-1 sm:flex-initial px-3 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && resetTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Reset Equipment Data</h3>
              <p className="text-gray-600 text-sm">
                This will permanently delete all location cost data for:
              </p>
              <p className="font-semibold text-gray-900 mt-2">
                {resetTarget.make} {resetTarget.model}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                ({resetTarget.locationCosts.length} location{resetTarget.locationCosts.length !== 1 ? 's' : ''} will be cleared)
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-mono bg-gray-100 px-1 rounded">RESET</span> to confirm:
              </label>
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value.toUpperCase())}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-200 focus:border-red-400"
                placeholder="RESET"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResetModal(false)
                  setResetTarget(null)
                  setResetConfirmText('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isResetting}
              >
                Cancel
              </button>
              <button
                onClick={handleResetConfirm}
                disabled={resetConfirmText !== 'RESET' || isResetting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isResetting ? 'Resetting...' : 'Reset Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
