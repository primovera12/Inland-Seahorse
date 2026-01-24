'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Truck,
  Package,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Weight,
  Ruler,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlannedLoad, LoadItem, TruckType } from '@/lib/load-planner/types'

interface TruckCargoCardProps {
  load: PlannedLoad
  truckIndex: number
  onItemEdit?: (itemId: string) => void
  onItemDelete?: (itemId: string) => void
  onItemMove?: (itemId: string, fromTruckIndex: number) => void
  showMoveOption?: boolean
  totalTrucks?: number
}

export function TruckCargoCard({
  load,
  truckIndex,
  onItemEdit,
  onItemDelete,
  onItemMove,
  showMoveOption = false,
  totalTrucks = 1,
}: TruckCargoCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Calculate weight utilization
  const maxWeight = load.recommendedTruck?.maxCargoWeight || 48000
  const weightUtilization = Math.min(100, (load.weight / maxWeight) * 100)

  // Check if oversize/overweight
  const isOversize = load.width > 8.5 || load.height > 13.5 || load.length > 53
  const isOverweight = load.weight > 48000

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      isOversize || isOverweight
        ? "border-l-4 border-l-amber-500"
        : "border-l-4 border-l-blue-500"
    )}>
      {/* Header */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              isOversize || isOverweight ? "bg-amber-100" : "bg-blue-100"
            )}>
              <Truck className={cn(
                "h-5 w-5",
                isOversize || isOverweight ? "text-amber-600" : "text-blue-600"
              )} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Load {truckIndex + 1}</h3>
                <Badge variant="secondary" className="text-xs">
                  {load.recommendedTruck?.name || 'Standard Flatbed'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {load.items.length} item{load.items.length !== 1 ? 's' : ''} &bull; {(load.weight / 1000).toFixed(1)}k lbs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status badges */}
            {isOversize && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Oversize
              </Badge>
            )}
            {isOverweight && (
              <Badge variant="destructive" className="text-xs">
                <Weight className="h-3 w-3 mr-1" />
                Overweight
              </Badge>
            )}
            {!isOversize && !isOverweight && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                Legal
              </Badge>
            )}

            {/* Expand/Collapse */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Weight utilization bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Weight Capacity</span>
            <span className={cn(
              "font-medium",
              weightUtilization > 90 ? "text-amber-600" : "text-muted-foreground"
            )}>
              {weightUtilization.toFixed(0)}%
            </span>
          </div>
          <Progress
            value={weightUtilization}
            className={cn(
              "h-2",
              weightUtilization > 100 ? "[&>div]:bg-red-500" :
              weightUtilization > 90 ? "[&>div]:bg-amber-500" :
              "[&>div]:bg-green-500"
            )}
          />
        </div>

        {/* Dimensions summary */}
        <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Ruler className="h-3 w-3" />
            <span>L: {load.length.toFixed(1)}′</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <span>W: {load.width.toFixed(1)}′</span>
            {load.width > 8.5 && <AlertTriangle className="h-3 w-3 text-amber-500" />}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <span>H: {load.height.toFixed(1)}′</span>
            {load.height > 13.5 && <AlertTriangle className="h-3 w-3 text-amber-500" />}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Weight className="h-3 w-3" />
            <span>{(load.weight / 1000).toFixed(1)}k</span>
          </div>
        </div>
      </CardHeader>

      {/* Items list - collapsible */}
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-2 mt-2">
            {load.items.map((item, itemIndex) => (
              <CargoItemRow
                key={item.id}
                item={item}
                onEdit={onItemEdit ? () => onItemEdit(item.id) : undefined}
                onDelete={onItemDelete ? () => onItemDelete(item.id) : undefined}
                onMove={onItemMove && totalTrucks > 1
                  ? () => onItemMove(item.id, truckIndex)
                  : undefined
                }
              />
            ))}
          </div>

          {/* Warnings */}
          {load.warnings && load.warnings.length > 0 && (
            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800 text-sm font-medium mb-1">
                <AlertTriangle className="h-4 w-4" />
                Warnings
              </div>
              <ul className="text-xs text-amber-700 space-y-1">
                {load.warnings.map((warning, i) => (
                  <li key={i}>&bull; {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// Individual cargo item row
interface CargoItemRowProps {
  item: LoadItem
  onEdit?: () => void
  onDelete?: () => void
  onMove?: () => void
}

function CargoItemRow({ item, onEdit, onDelete, onMove }: CargoItemRowProps) {
  const isOversize = item.width > 8.5 || item.height > 13.5 || item.length > 53
  const isHeavy = item.weight > 20000

  return (
    <div className={cn(
      "flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors",
      isOversize && "border-amber-200 bg-amber-50/50"
    )}>
      {/* Icon/Thumbnail placeholder */}
      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
        <Package className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{item.description}</p>
          {item.quantity > 1 && (
            <Badge variant="secondary" className="text-xs">
              x{item.quantity}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {item.length.toFixed(1)}′ × {item.width.toFixed(1)}′ × {item.height.toFixed(1)}′ &bull; {(item.weight / 1000).toFixed(1)}k lbs
        </p>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {isOversize && (
          <Badge variant="outline" className="text-xs border-amber-200 text-amber-700 bg-amber-50">
            Oversize
          </Badge>
        )}
        {isHeavy && (
          <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
            Heavy
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {onMove && (
          <Button variant="ghost" size="sm" onClick={onMove} title="Move to another truck">
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
        )}
        {onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600 hover:text-red-700">
            Delete
          </Button>
        )}
      </div>
    </div>
  )
}

export default TruckCargoCard
