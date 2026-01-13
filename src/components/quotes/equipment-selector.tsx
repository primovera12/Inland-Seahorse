'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { trpc } from '@/lib/trpc/client'
import { LOCATIONS, type LocationName, sortMakesByPopularity } from '@/types/equipment'
import { SelectSeparator, SelectGroup, SelectLabel } from '@/components/ui/select'
import { formatWeight } from '@/lib/dimensions'
import { useRecentEquipment } from '@/hooks/use-recent-equipment'
import { useFavorites } from '@/hooks/use-favorites'
import { Clock, X, Star, Ruler, DollarSign, Upload, RefreshCw, Trash2, AlertCircle } from 'lucide-react'
import { DimensionDisplay } from '@/components/ui/dimension-display'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { ImageUpload } from '@/components/ui/image-upload'
import { toast } from 'sonner'

interface EquipmentSelectorProps {
  selectedMakeId: string
  selectedModelId: string
  selectedLocation: LocationName
  onMakeChange: (id: string, name: string) => void
  onModelChange: (id: string, name: string) => void
  onLocationChange: (location: LocationName) => void
  onEquipmentSelect?: (makeId: string, makeName: string, modelId: string, modelName: string) => void
  dimensions: {
    length_inches: number
    width_inches: number
    height_inches: number
    weight_lbs: number
  }
}

export function EquipmentSelector({
  selectedMakeId,
  selectedModelId,
  selectedLocation,
  onMakeChange,
  onModelChange,
  onLocationChange,
  onEquipmentSelect,
  dimensions,
}: EquipmentSelectorProps) {
  const { recentEquipment, trackEquipmentUsage, clearRecentEquipment } = useRecentEquipment()
  const { favorites, isFavorite, toggleFavorite } = useFavorites()

  // Filter state
  const [filterHasDimensions, setFilterHasDimensions] = useState(false)
  const [filterHasRates, setFilterHasRates] = useState(false)

  // Track failed images
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})

  // Handle image error
  const handleImageError = (imageType: 'front' | 'side') => {
    setFailedImages((prev) => ({ ...prev, [imageType]: true }))
  }

  // Handle image retry
  const handleImageRetry = (imageType: 'front' | 'side') => {
    setFailedImages((prev) => ({ ...prev, [imageType]: false }))
    refetchDimensions()
  }

  // Handle removing failed image
  const handleRemoveImage = (imageType: 'front' | 'side') => {
    if (!selectedModelId) return
    updateImagesMutation.mutate({
      modelId: selectedModelId,
      frontImageUrl: imageType === 'front' ? null : undefined,
      sideImageUrl: imageType === 'side' ? null : undefined,
    })
    setFailedImages((prev) => ({ ...prev, [imageType]: false }))
  }

  // Fetch makes
  const { data: makes, isLoading: makesLoading } = trpc.equipment.getMakes.useQuery()

  // Fetch configurable popular makes from settings
  const { data: popularMakesList } = trpc.settings.getPopularMakes.useQuery()

  // Fetch models with availability info when make is selected
  const { data: modelsWithAvailability, isLoading: modelsLoading } = trpc.equipment.getModelsWithAvailability.useQuery(
    { makeId: selectedMakeId, location: selectedLocation },
    { enabled: !!selectedMakeId }
  )

  // Filter models based on selected filters
  const models = useMemo(() => {
    if (!modelsWithAvailability) return []
    return modelsWithAvailability.filter((model) => {
      if (filterHasDimensions && !model.has_dimensions) return false
      if (filterHasRates && !model.has_rates) return false
      return true
    })
  }, [modelsWithAvailability, filterHasDimensions, filterHasRates])

  // Fetch full dimensions with images
  const { data: fullDimensions, refetch: refetchDimensions } = trpc.equipment.getDimensions.useQuery(
    { modelId: selectedModelId },
    { enabled: !!selectedModelId }
  )

  // Mutation to update equipment images
  const updateImagesMutation = trpc.equipment.updateImages.useMutation({
    onSuccess: () => {
      refetchDimensions()
      toast.success('Image updated successfully')
    },
    onError: (error) => {
      toast.error(`Failed to update image: ${error.message}`)
    },
  })

  // Helper to check if a make is in the popular list (case-insensitive)
  const isPopularMake = useMemo(() => {
    const popularSet = new Set((popularMakesList || []).map((m: string) => m.toLowerCase().trim()))
    return (makeName: string) => popularSet.has(makeName.toLowerCase().trim())
  }, [popularMakesList])

  // Sort and group makes by popularity
  const { popularMakes, otherMakes } = useMemo(() => {
    if (!makes) return { popularMakes: [], otherMakes: [] }
    const sorted = sortMakesByPopularity(makes)
    const popular = sorted.filter((m) => isPopularMake(m.name))
    const others = sorted.filter((m) => !isPopularMake(m.name))
    return { popularMakes: popular, otherMakes: others }
  }, [makes, isPopularMake])

  // Handle selecting recent equipment or favorite
  const handleQuickSelect = (item: { makeId: string; makeName: string; modelId: string; modelName: string }) => {
    onMakeChange(item.makeId, item.makeName)
    // Small delay to allow make change to propagate
    setTimeout(() => {
      onModelChange(item.modelId, item.modelName)
      if (onEquipmentSelect) {
        onEquipmentSelect(item.makeId, item.makeName, item.modelId, item.modelName)
      }
    }, 100)
  }

  // Handle toggling favorite for current selection
  const handleToggleFavorite = () => {
    const make = makes?.find((m) => m.id === selectedMakeId)
    const model = models?.find((m) => m.id === selectedModelId)
    if (make && model) {
      toggleFavorite({
        modelId: model.id,
        makeId: make.id,
        makeName: make.name,
        modelName: model.name,
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Favorites Section */}
      {favorites.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <Label className="text-sm font-medium">Favorites</Label>
          </div>
          <div className="flex flex-wrap gap-2">
            {favorites.map((item) => (
              <Button
                key={item.modelId}
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(item)}
                className="h-auto py-1.5 px-3 border-yellow-300 dark:border-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-950"
              >
                <Star className="h-3 w-3 mr-1.5 text-yellow-500 fill-yellow-500" />
                <span className="font-medium">{item.makeName}</span>
                <span className="text-muted-foreground mx-1">·</span>
                <span>{item.modelName}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Equipment Section */}
      {recentEquipment.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Recent Equipment</Label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearRecentEquipment}
              className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentEquipment.slice(0, 5).map((item) => (
              <Button
                key={item.modelId}
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(item)}
                className="h-auto py-1.5 px-3"
              >
                <span className="font-medium">{item.makeName}</span>
                <span className="text-muted-foreground mx-1">·</span>
                <span>{item.modelName}</span>
                {item.useCount > 1 && (
                  <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-[10px]">
                    {item.useCount}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="make">Make</Label>
          <SearchableSelect
            options={[
              // Popular makes first
              ...popularMakes.map((make) => ({
                value: make.id,
                label: make.name,
                description: 'Popular',
              })),
              // Then other makes
              ...otherMakes.map((make) => ({
                value: make.id,
                label: make.name,
              })),
            ]}
            value={selectedMakeId}
            onChange={(value) => {
              const make = makes?.find((m) => m.id === value)
              onMakeChange(value, make?.name || '')
            }}
            placeholder={makesLoading ? 'Loading...' : 'Select make'}
            searchPlaceholder="Search makes..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <SearchableSelect
            options={
              models?.map((model) => ({
                value: model.id,
                label: model.name,
                description: [
                  model.has_dimensions ? 'Has Dimensions' : null,
                  model.has_rates ? 'Has Rates' : null,
                ].filter(Boolean).join(', ') || undefined,
              })) || []
            }
            value={selectedModelId}
            onChange={(value) => {
              const model = models?.find((m) => m.id === value)
              const make = makes?.find((m) => m.id === selectedMakeId)
              onModelChange(value, model?.name || '')
              // Track equipment usage
              if (make && model) {
                trackEquipmentUsage({
                  modelId: model.id,
                  makeId: make.id,
                  makeName: make.name,
                  modelName: model.name,
                })
              }
            }}
            disabled={!selectedMakeId}
            placeholder={
              !selectedMakeId
                ? 'Select make first'
                : modelsLoading
                ? 'Loading...'
                : 'Select model'
            }
            searchPlaceholder="Search models..."
          />

          {/* Model Filters */}
          {selectedMakeId && (
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id="filter-dimensions"
                  checked={filterHasDimensions}
                  onCheckedChange={(checked) => setFilterHasDimensions(checked === true)}
                />
                <label
                  htmlFor="filter-dimensions"
                  className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1"
                >
                  <Ruler className="h-3 w-3 text-blue-500" />
                  Has Dimensions
                </label>
              </div>
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id="filter-rates"
                  checked={filterHasRates}
                  onCheckedChange={(checked) => setFilterHasRates(checked === true)}
                />
                <label
                  htmlFor="filter-rates"
                  className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1"
                >
                  <DollarSign className="h-3 w-3 text-green-500" />
                  Has Rates ({selectedLocation})
                </label>
              </div>
              {modelsWithAvailability && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {models.length} of {modelsWithAvailability.length} models
                </span>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Select
            value={selectedLocation}
            onValueChange={(value) => onLocationChange(value as LocationName)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {LOCATIONS.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedModelId && (
        <div className="rounded-lg border p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Equipment Dimensions</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleFavorite}
              className="h-8 px-2"
              title={isFavorite(selectedModelId) ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star
                className={`h-4 w-4 ${
                  isFavorite(selectedModelId)
                    ? 'text-yellow-500 fill-yellow-500'
                    : 'text-muted-foreground'
                }`}
              />
              <span className="ml-1.5 text-xs">
                {isFavorite(selectedModelId) ? 'Favorited' : 'Add to Favorites'}
              </span>
            </Button>
          </div>

          {/* Equipment Images */}
          <div className="grid gap-4 md:grid-cols-2 mb-4">
            {/* Front Image */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Front View</p>
              {fullDimensions?.front_image_url && !failedImages.front ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border bg-background">
                  <Image
                    src={fullDimensions.front_image_url}
                    alt="Front view"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 300px"
                    unoptimized={fullDimensions.front_image_url.endsWith('.svg')}
                    onError={() => handleImageError('front')}
                  />
                </div>
              ) : failedImages.front ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted/50 flex flex-col items-center justify-center gap-3">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <p className="text-sm text-muted-foreground">Failed to load image</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImageRetry('front')}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Retry
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveImage('front')}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <ImageUpload
                  value={null}
                  onChange={(url) => {
                    if (url && selectedModelId) {
                      updateImagesMutation.mutate({
                        modelId: selectedModelId,
                        frontImageUrl: url,
                      })
                    }
                  }}
                  label="Upload Front Image"
                  folder={`equipment/${selectedModelId}`}
                />
              )}
            </div>
            {/* Side Image */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Side View</p>
              {fullDimensions?.side_image_url && !failedImages.side ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border bg-background">
                  <Image
                    src={fullDimensions.side_image_url}
                    alt="Side view"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 300px"
                    unoptimized={fullDimensions.side_image_url.endsWith('.svg')}
                    onError={() => handleImageError('side')}
                  />
                </div>
              ) : failedImages.side ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted/50 flex flex-col items-center justify-center gap-3">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <p className="text-sm text-muted-foreground">Failed to load image</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImageRetry('side')}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Retry
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveImage('side')}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <ImageUpload
                  value={null}
                  onChange={(url) => {
                    if (url && selectedModelId) {
                      updateImagesMutation.mutate({
                        modelId: selectedModelId,
                        sideImageUrl: url,
                      })
                    }
                  }}
                  label="Upload Side Image"
                  folder={`equipment/${selectedModelId}`}
                />
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Length</p>
              <DimensionDisplay inches={dimensions.length_inches} size="lg" showDual />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Width</p>
              <DimensionDisplay inches={dimensions.width_inches} size="lg" showDual />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Height</p>
              <DimensionDisplay inches={dimensions.height_inches} size="lg" showDual />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Weight</p>
              <p className="font-mono text-lg">{formatWeight(dimensions.weight_lbs)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
