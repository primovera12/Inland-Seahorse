'use client'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'
import { LOCATIONS, type LocationName } from '@/types/equipment'
import { formatDimension, formatWeight } from '@/lib/dimensions'

interface EquipmentSelectorProps {
  selectedMakeId: string
  selectedModelId: string
  selectedLocation: LocationName
  onMakeChange: (id: string, name: string) => void
  onModelChange: (id: string, name: string) => void
  onLocationChange: (location: LocationName) => void
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
  dimensions,
}: EquipmentSelectorProps) {
  // Fetch makes
  const { data: makes, isLoading: makesLoading } = trpc.equipment.getMakes.useQuery()

  // Fetch models when make is selected
  const { data: models, isLoading: modelsLoading } = trpc.equipment.getModels.useQuery(
    { makeId: selectedMakeId },
    { enabled: !!selectedMakeId }
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="make">Make</Label>
          <Select
            value={selectedMakeId}
            onValueChange={(value) => {
              const make = makes?.find((m) => m.id === value)
              onMakeChange(value, make?.name || '')
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={makesLoading ? 'Loading...' : 'Select make'} />
            </SelectTrigger>
            <SelectContent>
              {makes?.map((make) => (
                <SelectItem key={make.id} value={make.id}>
                  {make.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Select
            value={selectedModelId}
            onValueChange={(value) => {
              const model = models?.find((m) => m.id === value)
              onModelChange(value, model?.name || '')
            }}
            disabled={!selectedMakeId}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  !selectedMakeId
                    ? 'Select make first'
                    : modelsLoading
                    ? 'Loading...'
                    : 'Select model'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {models?.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <h4 className="font-medium mb-3">Equipment Dimensions</h4>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Length</p>
              <p className="font-mono text-lg">{formatDimension(dimensions.length_inches)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Width</p>
              <p className="font-mono text-lg">{formatDimension(dimensions.width_inches)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Height</p>
              <p className="font-mono text-lg">{formatDimension(dimensions.height_inches)}</p>
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
