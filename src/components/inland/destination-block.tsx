'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MapPin, Navigation, Trash2, Plus } from 'lucide-react'
import type { InlandDestinationBlock, InlandLoadBlock } from '@/types/inland'
import { LoadBlockCard } from './load-block'
import { SavedLanes } from './saved-lanes'
import { formatCurrency } from '@/lib/utils'

interface DestinationBlockProps {
  block: InlandDestinationBlock
  onUpdate: (block: InlandDestinationBlock) => void
  onRemove: () => void
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
  canRemove,
  truckTypes,
  accessorialTypes,
}: DestinationBlockProps) {
  const updateField = <K extends keyof InlandDestinationBlock>(
    field: K,
    value: InlandDestinationBlock[K]
  ) => {
    onUpdate({ ...block, [field]: value })
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
            {canRemove && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRemove}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Route Info */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Pickup */}
          <div className="space-y-3 p-4 rounded-lg border bg-green-50/50 dark:bg-green-950/20">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <MapPin className="h-4 w-4" />
              <Label className="font-medium">Pickup Location</Label>
            </div>
            <Input
              placeholder="Enter pickup address"
              value={block.pickup_address}
              onChange={(e) => updateField('pickup_address', e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2">
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

          {/* Dropoff */}
          <div className="space-y-3 p-4 rounded-lg border bg-red-50/50 dark:bg-red-950/20">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <Navigation className="h-4 w-4" />
              <Label className="font-medium">Dropoff Location</Label>
            </div>
            <Input
              placeholder="Enter dropoff address"
              value={block.dropoff_address}
              onChange={(e) => updateField('dropoff_address', e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2">
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
        {(block.distance_miles || block.duration_minutes) && (
          <div className="flex gap-6 p-3 rounded-lg bg-muted/50">
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
