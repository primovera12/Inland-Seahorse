'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MapPin, Navigation, Trash2, Plus, Copy, CircleDot, ChevronDown, ChevronUp, Milestone } from 'lucide-react'
import type { InlandDestinationBlock, InlandLoadBlock, Waypoint } from '@/types/inland'
import { LoadBlockCard } from './load-block'
import { SavedLanes } from './saved-lanes'
import { AddressAutocomplete, type AddressComponents } from '@/components/ui/address-autocomplete'
import { formatCurrency } from '@/lib/utils'

interface DestinationBlockProps {
  block: InlandDestinationBlock
  onUpdate: (block: InlandDestinationBlock) => void
  onRemove: () => void
  onDuplicate?: () => void
  canRemove: boolean
  truckTypes: Array<{ id: string; name: string }>
  accessorialTypes: Array<{
    id: string
    name: string
    default_rate: number
    billing_unit: string
  }>
}

export function DestinationBlock({
  block,
  onUpdate,
  onRemove,
  onDuplicate,
  canRemove,
  truckTypes,
  accessorialTypes,
}: DestinationBlockProps) {
  const [showWaypoints, setShowWaypoints] = useState(
    (block.waypoints?.length || 0) > 0
  )

  const updateField = <K extends keyof InlandDestinationBlock>(
    field: K,
    value: InlandDestinationBlock[K]
  ) => {
    onUpdate({ ...block, [field]: value })
  }

  // Waypoint management
  const addWaypoint = () => {
    const newWaypoint: Waypoint = {
      id: crypto.randomUUID(),
      address: '',
      stop_type: 'both',
    }
    const waypoints = [...(block.waypoints || []), newWaypoint]
    onUpdate({ ...block, waypoints })
    setShowWaypoints(true)
  }

  const updateWaypoint = (index: number, waypoint: Waypoint) => {
    const waypoints = [...(block.waypoints || [])]
    waypoints[index] = waypoint
    onUpdate({ ...block, waypoints })
  }

  const removeWaypoint = (index: number) => {
    const waypoints = (block.waypoints || []).filter((_, i) => i !== index)
    onUpdate({ ...block, waypoints })
    if (waypoints.length === 0) {
      setShowWaypoints(false)
    }
  }

  const moveWaypoint = (index: number, direction: 'up' | 'down') => {
    const waypoints = [...(block.waypoints || [])]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= waypoints.length) return

    const temp = waypoints[index]
    waypoints[index] = waypoints[newIndex]
    waypoints[newIndex] = temp
    onUpdate({ ...block, waypoints })
  }

  const handleWaypointSelect = (index: number, components: AddressComponents) => {
    const waypoints = [...(block.waypoints || [])]
    waypoints[index] = {
      ...waypoints[index],
      address: components.address,
      city: components.city,
      state: components.state,
      zip: components.zip,
      lat: components.lat,
      lng: components.lng,
      place_id: components.placeId,
    }
    onUpdate({ ...block, waypoints })
  }

  const addLoadBlock = () => {
    const newLoadBlock: InlandLoadBlock = {
      id: crypto.randomUUID(),
      truck_type_id: truckTypes[0]?.id || '',
      truck_type_name: truckTypes[0]?.name || 'Flatbed',
      cargo_items: [],
      service_items: [
        {
          id: crypto.randomUUID(),
          name: 'Line Haul',
          rate: 0,
          quantity: 1,
          total: 0,
        },
      ],
      accessorial_charges: [],
      subtotal: 0,
    }

    const newLoadBlocks = [...block.load_blocks, newLoadBlock]
    const subtotal = newLoadBlocks.reduce((sum, lb) => sum + lb.subtotal, 0)
    onUpdate({ ...block, load_blocks: newLoadBlocks, subtotal })
  }

  const updateLoadBlock = (index: number, loadBlock: InlandLoadBlock) => {
    const newLoadBlocks = [...block.load_blocks]
    newLoadBlocks[index] = loadBlock
    const subtotal = newLoadBlocks.reduce((sum, lb) => sum + lb.subtotal, 0)
    onUpdate({ ...block, load_blocks: newLoadBlocks, subtotal })
  }

  const removeLoadBlock = (index: number) => {
    const newLoadBlocks = block.load_blocks.filter((_, i) => i !== index)
    const subtotal = newLoadBlocks.reduce((sum, lb) => sum + lb.subtotal, 0)
    onUpdate({ ...block, load_blocks: newLoadBlocks, subtotal })
  }

  const handleSelectLane = (pickup: string, dropoff: string) => {
    onUpdate({
      ...block,
      pickup_address: pickup,
      dropoff_address: dropoff,
    })
  }

  const handlePickupSelect = (components: AddressComponents) => {
    onUpdate({
      ...block,
      pickup_address: components.address,
      pickup_city: components.city || block.pickup_city,
      pickup_state: components.state || block.pickup_state,
      pickup_zip: components.zip || block.pickup_zip,
      pickup_lat: components.lat,
      pickup_lng: components.lng,
      pickup_place_id: components.placeId,
    })
  }

  const handleDropoffSelect = (components: AddressComponents) => {
    onUpdate({
      ...block,
      dropoff_address: components.address,
      dropoff_city: components.city || block.dropoff_city,
      dropoff_state: components.state || block.dropoff_state,
      dropoff_zip: components.zip || block.dropoff_zip,
      dropoff_lat: components.lat,
      dropoff_lng: components.lng,
      dropoff_place_id: components.placeId,
    })
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-lg font-bold px-3 py-1">
              {block.label}
            </Badge>
            <CardTitle className="text-lg">Destination</CardTitle>
            <SavedLanes
              onSelectLane={handleSelectLane}
              currentPickup={block.pickup_address}
              currentDropoff={block.dropoff_address}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              Subtotal: {formatCurrency(block.subtotal)}
            </span>
            {onDuplicate && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDuplicate}
                title="Duplicate destination block"
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
            {canRemove && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRemove}
                className="text-destructive"
                title="Remove destination block"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Route Info */}
        <div className="space-y-4">
          {/* Pickup */}
          <div className="space-y-3 p-4 rounded-lg border bg-green-50/50 dark:bg-green-950/20">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <MapPin className="h-4 w-4" />
              <Label className="font-medium">1. Pickup Location (Origin)</Label>
            </div>
            <AddressAutocomplete
              placeholder="Enter pickup address"
              value={block.pickup_address}
              onChange={(value) => updateField('pickup_address', value)}
              onSelect={handlePickupSelect}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                placeholder="City"
                value={block.pickup_city || ''}
                onChange={(e) => updateField('pickup_city', e.target.value)}
              />
              <Input
                placeholder="State"
                value={block.pickup_state || ''}
                onChange={(e) => updateField('pickup_state', e.target.value)}
              />
              <Input
                placeholder="ZIP"
                value={block.pickup_zip || ''}
                onChange={(e) => updateField('pickup_zip', e.target.value)}
              />
            </div>
          </div>

          {/* Waypoints Section */}
          {(block.waypoints?.length || 0) > 0 && (
            <div className="space-y-3">
              {block.waypoints?.map((waypoint, index) => (
                <div
                  key={waypoint.id}
                  className="space-y-3 p-4 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <Milestone className="h-4 w-4" />
                      <Label className="font-medium">
                        {index + 2}. Stop
                      </Label>
                      <Select
                        value={waypoint.stop_type}
                        onValueChange={(value: 'pickup' | 'dropoff' | 'both') =>
                          updateWaypoint(index, { ...waypoint, stop_type: value })
                        }
                      >
                        <SelectTrigger className="h-7 w-[120px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pickup">Pickup Only</SelectItem>
                          <SelectItem value="dropoff">Dropoff Only</SelectItem>
                          <SelectItem value="both">Pickup & Dropoff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => moveWaypoint(index, 'up')}
                        disabled={index === 0}
                        title="Move up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => moveWaypoint(index, 'down')}
                        disabled={index === (block.waypoints?.length || 0) - 1}
                        title="Move down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeWaypoint(index)}
                        title="Remove stop"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <AddressAutocomplete
                    placeholder="Enter stop address"
                    value={waypoint.address}
                    onChange={(value) =>
                      updateWaypoint(index, { ...waypoint, address: value })
                    }
                    onSelect={(components) => handleWaypointSelect(index, components)}
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Input
                      placeholder="City"
                      value={waypoint.city || ''}
                      onChange={(e) =>
                        updateWaypoint(index, { ...waypoint, city: e.target.value })
                      }
                    />
                    <Input
                      placeholder="State"
                      value={waypoint.state || ''}
                      onChange={(e) =>
                        updateWaypoint(index, { ...waypoint, state: e.target.value })
                      }
                    />
                    <Input
                      placeholder="ZIP"
                      value={waypoint.zip || ''}
                      onChange={(e) =>
                        updateWaypoint(index, { ...waypoint, zip: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Notes (optional)"
                      value={waypoint.notes || ''}
                      onChange={(e) =>
                        updateWaypoint(index, { ...waypoint, notes: e.target.value })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Stop Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={addWaypoint}
              className="border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Intermediate Stop
            </Button>
          </div>

          {/* Dropoff */}
          <div className="space-y-3 p-4 rounded-lg border bg-red-50/50 dark:bg-red-950/20">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <Navigation className="h-4 w-4" />
              <Label className="font-medium">
                {(block.waypoints?.length || 0) + 2}. Dropoff Location (Final Destination)
              </Label>
            </div>
            <AddressAutocomplete
              placeholder="Enter dropoff address"
              value={block.dropoff_address}
              onChange={(value) => updateField('dropoff_address', value)}
              onSelect={handleDropoffSelect}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                placeholder="City"
                value={block.dropoff_city || ''}
                onChange={(e) => updateField('dropoff_city', e.target.value)}
              />
              <Input
                placeholder="State"
                value={block.dropoff_state || ''}
                onChange={(e) => updateField('dropoff_state', e.target.value)}
              />
              <Input
                placeholder="ZIP"
                value={block.dropoff_zip || ''}
                onChange={(e) => updateField('dropoff_zip', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Route Summary */}
        {(block.distance_miles || block.duration_minutes || (block.waypoints?.length || 0) > 0) && (
          <div className="flex gap-6 p-3 rounded-lg bg-muted/50">
            {(block.waypoints?.length || 0) > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Total Stops:</span>{' '}
                <span className="font-medium">{(block.waypoints?.length || 0) + 2}</span>
              </div>
            )}
            {block.distance_miles && (
              <div>
                <span className="text-sm text-muted-foreground">Distance:</span>{' '}
                <span className="font-medium">{block.distance_miles} miles</span>
              </div>
            )}
            {block.duration_minutes && (
              <div>
                <span className="text-sm text-muted-foreground">Duration:</span>{' '}
                <span className="font-medium">
                  {Math.floor(block.duration_minutes / 60)}h{' '}
                  {block.duration_minutes % 60}m
                </span>
              </div>
            )}
          </div>
        )}

        {/* Load Blocks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Loads</Label>
            <Button variant="outline" size="sm" onClick={addLoadBlock}>
              <Plus className="h-4 w-4 mr-2" />
              Add Load
            </Button>
          </div>

          {block.load_blocks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
              No loads added. Click &quot;Add Load&quot; to add a load block.
            </div>
          ) : (
            <div className="space-y-4">
              {block.load_blocks.map((loadBlock, index) => (
                <LoadBlockCard
                  key={loadBlock.id}
                  loadBlock={loadBlock}
                  onUpdate={(lb) => updateLoadBlock(index, lb)}
                  onRemove={() => removeLoadBlock(index)}
                  canRemove={block.load_blocks.length > 0}
                  truckTypes={truckTypes}
                  accessorialTypes={accessorialTypes}
                  distanceMiles={block.distance_miles}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
