'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, ArrowRight, Truck, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlannedLoad, LoadItem } from '@/lib/load-planner/types'

interface MoveCargoDialogProps {
  isOpen: boolean
  onClose: () => void
  item: LoadItem | null
  currentTruckIndex: number
  loads: PlannedLoad[]
  onMove: (itemId: string, fromTruckIndex: number, toTruckIndex: number) => void
}

export function MoveCargoDialog({
  isOpen,
  onClose,
  item,
  currentTruckIndex,
  loads,
  onMove,
}: MoveCargoDialogProps) {
  const [selectedTruckIndex, setSelectedTruckIndex] = useState<number | null>(null)

  if (!item) return null

  // Get available trucks (excluding current)
  const availableTrucks = loads.filter((_, index) => index !== currentTruckIndex)

  // Check if item will cause oversize/overweight on destination truck
  const checkFitOnTruck = (truckIndex: number) => {
    const targetLoad = loads[truckIndex]
    if (!targetLoad) return { fits: true, warnings: [] }

    const warnings: string[] = []

    // Check weight
    const newWeight = targetLoad.weight + (item.weight * item.quantity)
    const maxWeight = targetLoad.recommendedTruck?.maxCargoWeight || 48000
    if (newWeight > maxWeight) {
      warnings.push(`Will exceed weight capacity (${(newWeight / 1000).toFixed(1)}k / ${(maxWeight / 1000).toFixed(0)}k lbs)`)
    }

    // Check dimensions
    const newWidth = Math.max(targetLoad.width, item.width)
    const newHeight = Math.max(targetLoad.height, item.height)
    const newLength = targetLoad.length + item.length // Simplified - assumes end-to-end

    if (newWidth > 8.5) {
      warnings.push(`Will be oversize width (${newWidth.toFixed(1)}' > 8.5')`)
    }
    if (newHeight > 13.5) {
      warnings.push(`Will be oversize height (${newHeight.toFixed(1)}' > 13.5')`)
    }

    return {
      fits: warnings.length === 0,
      warnings,
    }
  }

  const handleMove = () => {
    if (selectedTruckIndex !== null && item) {
      onMove(item.id, currentTruckIndex, selectedTruckIndex)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Move Cargo Item
          </DialogTitle>
          <DialogDescription>
            Select destination truck for this item
          </DialogDescription>
        </DialogHeader>

        {/* Item being moved */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">{item.description}</p>
              <p className="text-xs text-muted-foreground">
                {item.length.toFixed(1)}′ × {item.width.toFixed(1)}′ × {item.height.toFixed(1)}′ &bull; {(item.weight / 1000).toFixed(1)}k lbs
              </p>
            </div>
          </div>
        </div>

        {/* Current location */}
        <div className="text-sm text-muted-foreground">
          Currently on: <span className="font-medium">Load {currentTruckIndex + 1}</span>
        </div>

        {/* Destination options */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Move to:</p>
          {availableTrucks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No other trucks available. Add more cargo to create additional loads.
            </p>
          ) : (
            <div className="space-y-2">
              {loads.map((load, index) => {
                if (index === currentTruckIndex) return null

                const { fits, warnings } = checkFitOnTruck(index)

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedTruckIndex(index)}
                    className={cn(
                      "w-full p-3 rounded-lg border text-left transition-all",
                      selectedTruckIndex === index
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Load {index + 1}</span>
                        <Badge variant="secondary" className="text-xs">
                          {load.recommendedTruck?.name || 'Flatbed'}
                        </Badge>
                      </div>
                      {!fits && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {load.items.length} items &bull; {(load.weight / 1000).toFixed(1)}k lbs
                    </p>
                    {warnings.length > 0 && (
                      <div className="mt-2 text-xs text-amber-600">
                        {warnings.map((w, i) => (
                          <p key={i}>&bull; {w}</p>
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={selectedTruckIndex === null}
          >
            Move Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MoveCargoDialog
