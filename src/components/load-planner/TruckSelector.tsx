'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import type { TruckType, TrailerCategory } from '@/lib/load-planner/types'
import { trucks } from '@/lib/load-planner/trucks'
import { ChevronDown, Check, AlertTriangle, Search, X, Filter } from 'lucide-react'

interface TruckSelectorProps {
  currentTruck: TruckType
  onChange: (truck: TruckType) => void
  itemsWeight: number
  maxItemLength: number
  maxItemWidth: number
  maxItemHeight: number
}

export function TruckSelector({
  currentTruck,
  onChange,
  itemsWeight,
  maxItemLength,
  maxItemWidth,
  maxItemHeight
}: TruckSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showOnlyFitting, setShowOnlyFitting] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
    if (!isOpen) {
      setSearchQuery('')
    }
  }, [isOpen])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Check if truck can handle the cargo (defined early for use in filtering)
  const canHandle = (truck: TruckType) => {
    const fitsWeight = itemsWeight <= truck.maxCargoWeight
    const fitsLength = maxItemLength <= truck.deckLength
    const fitsWidth = maxItemWidth <= truck.deckWidth
    const fitsHeight = maxItemHeight <= truck.maxLegalCargoHeight

    return {
      fits: fitsWeight && fitsLength && fitsWidth && fitsHeight,
      fitsWeight,
      fitsLength,
      fitsWidth,
      fitsHeight
    }
  }

  // Categorize, filter, and sort trucks
  const categorizedTrucks = useMemo(() => {
    const categories: Record<string, TruckType[]> = {}
    const query = searchQuery.toLowerCase().trim()

    trucks.forEach(truck => {
      // Apply search filter
      if (query) {
        const matchesSearch =
          truck.name.toLowerCase().includes(query) ||
          truck.category.toLowerCase().includes(query) ||
          truck.description.toLowerCase().includes(query) ||
          truck.bestFor.some(b => b.toLowerCase().includes(query))

        if (!matchesSearch) return
      }

      // Apply "fits only" filter
      if (showOnlyFitting) {
        const fit = canHandle(truck)
        if (!fit.fits) return
      }

      const category = truck.category
      if (!categories[category]) {
        categories[category] = []
      }
      categories[category].push(truck)
    })

    // Sort by deck length within each category
    Object.keys(categories).forEach(cat => {
      categories[cat].sort((a, b) => a.deckLength - b.deckLength)
    })

    return categories
  }, [searchQuery, showOnlyFitting, itemsWeight, maxItemLength, maxItemWidth, maxItemHeight])

  // Count total matching trucks
  const matchingTruckCount = useMemo(() => {
    return Object.values(categorizedTrucks).reduce((sum, trucks) => sum + trucks.length, 0)
  }, [categorizedTrucks])

  // Category display names
  const categoryNames: Record<TrailerCategory, string> = {
    'FLATBED': 'Flatbed Trailers',
    'STEP_DECK': 'Step Deck Trailers',
    'RGN': 'RGN (Removable Gooseneck)',
    'LOWBOY': 'Lowboy Trailers',
    'DOUBLE_DROP': 'Double Drop Trailers',
    'LANDOLL': 'Landoll / Tilt Trailers',
    'CONESTOGA': 'Conestoga (Covered Flatbed)',
    'DRY_VAN': 'Dry Van',
    'REEFER': 'Refrigerated',
    'CURTAIN_SIDE': 'Curtain Side',
    'MULTI_AXLE': 'Multi-Axle Heavy Haul',
    'SCHNABEL': 'Schnabel',
    'PERIMETER': 'Perimeter Trailers',
    'STEERABLE': 'Steerable Trailers',
    'BLADE': 'Blade Trailers',
    'TANKER': 'Tank Trailers',
    'HOPPER': 'Hopper Trailers',
    'SPECIALIZED': 'Specialized Trailers'
  }

  // Category order (most common first)
  const categoryOrder: TrailerCategory[] = [
    'FLATBED',
    'STEP_DECK',
    'RGN',
    'LOWBOY',
    'DOUBLE_DROP',
    'MULTI_AXLE',
    'LANDOLL',
    'CONESTOGA',
    'DRY_VAN',
    'REEFER',
    'CURTAIN_SIDE',
    'SCHNABEL',
    'PERIMETER',
    'STEERABLE',
    'BLADE',
    'TANKER',
    'HOPPER',
    'SPECIALIZED'
  ]

  const currentFit = canHandle(currentTruck)

  return (
    <div className="relative">
      {/* Selected Truck Display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between px-4 py-3 rounded-lg border
          transition-colors text-left
          ${!currentFit.fits
            ? 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100'
            : 'border-gray-300 bg-white hover:bg-gray-50'}
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`
            w-8 h-8 rounded-lg flex items-center justify-center
            ${!currentFit.fits ? 'bg-yellow-200 text-yellow-800' : 'bg-blue-100 text-blue-800'}
          `}>
            {!currentFit.fits ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          </div>
          <div>
            <div className="font-medium text-gray-900">{currentTruck.name}</div>
            <div className="text-xs text-gray-500">
              {currentTruck.deckLength}' x {currentTruck.deckWidth}' &bull; {(currentTruck.maxCargoWeight / 1000).toFixed(0)}k lbs max
            </div>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Fit Warnings */}
      {!currentFit.fits && (
        <div className="mt-2 text-xs text-yellow-700 space-y-0.5">
          {!currentFit.fitsWeight && <div>• Weight exceeds capacity ({(itemsWeight / 1000).toFixed(1)}k lbs &gt; {(currentTruck.maxCargoWeight / 1000).toFixed(0)}k lbs)</div>}
          {!currentFit.fitsLength && <div>• Item too long ({maxItemLength.toFixed(1)}' &gt; {currentTruck.deckLength}')</div>}
          {!currentFit.fitsWidth && <div>• Item too wide ({maxItemWidth.toFixed(1)}' &gt; {currentTruck.deckWidth}')</div>}
          {!currentFit.fitsHeight && <div>• Item too tall ({maxItemHeight.toFixed(1)}' &gt; {currentTruck.maxLegalCargoHeight}')</div>}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Panel */}
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col"
            style={{ maxHeight: '28rem' }}
          >
            {/* Search Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-2 space-y-2 z-10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search trucks by name, type, or use..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowOnlyFitting(!showOnlyFitting)}
                  className={`
                    flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors
                    ${showOnlyFitting
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                  `}
                >
                  <Filter className="w-3 h-3" />
                  {showOnlyFitting ? 'Showing fitting only' : 'Show all trucks'}
                </button>
                <span className="text-xs text-gray-500">
                  {matchingTruckCount} truck{matchingTruckCount !== 1 ? 's' : ''} found
                </span>
              </div>
            </div>

            {/* Truck List */}
            <div className="overflow-y-auto flex-1">
            {matchingTruckCount === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No trucks match your search</p>
                {showOnlyFitting && (
                  <button
                    type="button"
                    onClick={() => setShowOnlyFitting(false)}
                    className="mt-2 text-xs text-blue-600 hover:underline"
                  >
                    Try showing all trucks
                  </button>
                )}
              </div>
            ) : (
            categoryOrder.map(category => {
              const trucksInCategory = categorizedTrucks[category]
              if (!trucksInCategory || trucksInCategory.length === 0) return null

              return (
                <div key={category}>
                  <div className="sticky top-0 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                    {categoryNames[category] || category}
                  </div>
                  {trucksInCategory.map(truck => {
                    const fit = canHandle(truck)
                    const isSelected = truck.id === currentTruck.id

                    return (
                      <button
                        key={truck.id}
                        type="button"
                        onClick={() => {
                          onChange(truck)
                          setIsOpen(false)
                        }}
                        className={`
                          w-full flex items-center justify-between px-4 py-2 text-left
                          transition-colors
                          ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                          ${!fit.fits ? 'opacity-75' : ''}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`
                            w-6 h-6 rounded flex items-center justify-center text-xs
                            ${isSelected
                              ? 'bg-blue-500 text-white'
                              : fit.fits
                                ? 'bg-green-100 text-green-600'
                                : 'bg-yellow-100 text-yellow-600'}
                          `}>
                            {isSelected ? <Check className="w-4 h-4" /> : fit.fits ? '✓' : '!'}
                          </div>
                          <div>
                            <div className={`text-sm ${isSelected ? 'font-medium text-blue-900' : 'text-gray-900'}`}>
                              {truck.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {truck.deckLength}' x {truck.deckWidth}' x {truck.maxLegalCargoHeight}'
                              &bull; {(truck.maxCargoWeight / 1000).toFixed(0)}k lbs
                            </div>
                          </div>
                        </div>
                        {!fit.fits && (
                          <div className="text-xs text-yellow-600">
                            {!fit.fitsWeight && 'Weight '}
                            {!fit.fitsLength && 'Length '}
                            {!fit.fitsWidth && 'Width '}
                            {!fit.fitsHeight && 'Height'}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
