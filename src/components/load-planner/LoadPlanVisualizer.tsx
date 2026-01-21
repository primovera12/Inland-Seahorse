'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrailerDiagram } from './TrailerDiagram'
import { TruckSelector } from './TruckSelector'
import type { LoadItem, TruckType, LoadPlan, PlannedLoad } from '@/lib/load-planner/types'
import { Truck, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'

interface LoadPlanVisualizerProps {
  loadPlan: LoadPlan
  items: LoadItem[]
  onTruckChange: (loadIndex: number, newTruck: TruckType) => void
}

export function LoadPlanVisualizer({ loadPlan, items, onTruckChange }: LoadPlanVisualizerProps) {
  const [expandedLoadId, setExpandedLoadId] = useState<string | null>(
    loadPlan.loads.length > 0 ? loadPlan.loads[0].id : null
  )

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Load Plan
            </CardTitle>
            <Badge variant={loadPlan.warnings.length > 0 ? 'destructive' : 'default'}>
              {loadPlan.totalTrucks} Truck{loadPlan.totalTrucks > 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{loadPlan.totalItems}</div>
              <div className="text-xs text-gray-500">Items</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {(loadPlan.totalWeight / 1000).toFixed(1)}k
              </div>
              <div className="text-xs text-gray-500">Total lbs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{loadPlan.totalTrucks}</div>
              <div className="text-xs text-gray-500">Trucks</div>
            </div>
          </div>

          {loadPlan.warnings.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Warnings</span>
              </div>
              <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                {loadPlan.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Loads */}
      {loadPlan.loads.map((load, index) => (
        <LoadCard
          key={load.id}
          load={load}
          loadIndex={index}
          isExpanded={expandedLoadId === load.id}
          onToggle={() => setExpandedLoadId(expandedLoadId === load.id ? null : load.id)}
          onTruckChange={(truck) => onTruckChange(index, truck)}
          allItems={items}
        />
      ))}
    </div>
  )
}

interface LoadCardProps {
  load: PlannedLoad
  loadIndex: number
  isExpanded: boolean
  onToggle: () => void
  onTruckChange: (truck: TruckType) => void
  allItems: LoadItem[]
}

function LoadCard({ load, loadIndex, isExpanded, onToggle, onTruckChange }: LoadCardProps) {
  const hasWarnings = load.warnings.length > 0

  // Calculate utilization
  const totalWeight = load.items.reduce((sum, i) => sum + (i.weight * i.quantity), 0)
  const weightUtilization = Math.round((totalWeight / load.recommendedTruck.maxCargoWeight) * 100)
  const isOverweight = weightUtilization > 100

  // Calculate space utilization
  const totalArea = load.items.reduce((sum, i) => sum + (i.length * i.width * i.quantity), 0)
  const truckArea = load.recommendedTruck.deckLength * load.recommendedTruck.deckWidth
  const spaceUtilization = Math.round((totalArea / truckArea) * 100)
  const isOverspace = spaceUtilization > 100

  return (
    <Card className={`transition-all ${hasWarnings ? 'border-yellow-300' : ''}`}>
      {/* Header - Always Visible */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white
              ${hasWarnings ? 'bg-yellow-500' : 'bg-blue-500'}
            `}>
              {loadIndex + 1}
            </div>
            <div>
              <div className="font-medium text-gray-900">{load.recommendedTruck.name}</div>
              <div className="text-sm text-gray-500">
                {load.items.length} item{load.items.length > 1 ? 's' : ''} &bull;{' '}
                {(totalWeight / 1000).toFixed(1)}k lbs
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Utilization Indicators */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <div className={`text-sm font-medium ${isOverweight ? 'text-red-600' : 'text-gray-700'}`}>
                  {weightUtilization}%
                </div>
                <div className="text-xs text-gray-400">Weight</div>
              </div>
              <div className="w-16">
                <Progress
                  value={Math.min(weightUtilization, 100)}
                  className={`h-2 ${isOverweight ? '[&>div]:bg-red-500' : ''}`}
                />
              </div>
            </div>

            {/* Status Icon */}
            {hasWarnings ? (
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            )}

            {/* Expand/Collapse */}
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <CardContent className="pt-0 border-t">
          {/* Truck Selector */}
          <div className="py-4 border-b">
            <TruckSelector
              currentTruck={load.recommendedTruck}
              onChange={onTruckChange}
              itemsWeight={totalWeight}
              maxItemLength={Math.max(...load.items.map(i => i.length))}
              maxItemWidth={Math.max(...load.items.map(i => i.width))}
              maxItemHeight={Math.max(...load.items.map(i => i.height))}
            />
          </div>

          {/* Warnings */}
          {load.warnings.length > 0 && (
            <div className="py-3 border-b">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <ul className="text-sm text-yellow-700 space-y-1">
                  {load.warnings.map((warning, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Trailer Diagram */}
          <div className="py-4">
            <TrailerDiagram
              truck={load.recommendedTruck}
              items={load.items}
              placements={load.placements}
            />
          </div>

          {/* Utilization Details */}
          <div className="grid grid-cols-2 gap-4 py-4 border-t">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Weight Capacity</span>
                <span className={`font-medium ${isOverweight ? 'text-red-600' : 'text-gray-700'}`}>
                  {weightUtilization}%
                </span>
              </div>
              <Progress
                value={Math.min(weightUtilization, 100)}
                className={`h-2 ${isOverweight ? '[&>div]:bg-red-500' : ''}`}
              />
              <div className="text-xs text-gray-400 mt-1">
                {totalWeight.toLocaleString()} / {load.recommendedTruck.maxCargoWeight.toLocaleString()} lbs
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Deck Space</span>
                <span className={`font-medium ${isOverspace ? 'text-red-600' : 'text-gray-700'}`}>
                  {spaceUtilization}%
                </span>
              </div>
              <Progress
                value={Math.min(spaceUtilization, 100)}
                className={`h-2 ${isOverspace ? '[&>div]:bg-red-500' : ''}`}
              />
            </div>
          </div>

          {/* Items on this truck */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Items on this truck</h4>
            <div className="space-y-1">
              {load.items.map((item, i) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: getItemColor(i) }}
                    />
                    <span>{item.description}</span>
                    {item.quantity > 1 && (
                      <span className="text-gray-400">x{item.quantity}</span>
                    )}
                  </div>
                  <span className="text-gray-500">
                    {item.length.toFixed(1)}' x {item.width.toFixed(1)}' x {item.height.toFixed(1)}'
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// Color palette for items
const ITEM_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
]

export function getItemColor(index: number): string {
  return ITEM_COLORS[index % ITEM_COLORS.length]
}
