'use client'

import { useState } from 'react'
import type { TruckType, LoadItem, ItemPlacement } from '@/lib/load-planner/types'
import { getItemColor } from './LoadPlanVisualizer'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

interface TrailerDiagramProps {
  truck: TruckType
  items: LoadItem[]
  placements: ItemPlacement[]
}

export function TrailerDiagram({ truck, items, placements }: TrailerDiagramProps) {
  const [scale, setScale] = useState(10) // pixels per foot
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const SCALE = scale
  const PADDING = 20

  const deckLength = truck.deckLength
  const deckWidth = truck.deckWidth
  const deckHeight = truck.deckHeight
  const maxLegalHeight = 13.5 // Standard legal height limit

  // SVG dimensions
  const topViewWidth = deckLength * SCALE + PADDING * 2
  const topViewHeight = deckWidth * SCALE + PADDING * 2
  const sideViewWidth = deckLength * SCALE + PADDING * 2
  const sideViewHeight = maxLegalHeight * SCALE + PADDING * 2

  // Get placement by item ID
  const getPlacement = (itemId: string) => placements.find(p => p.itemId === itemId)

  const handleZoomIn = () => setScale(s => Math.min(s + 2, 16))
  const handleZoomOut = () => setScale(s => Math.max(s - 2, 6))
  const handleResetZoom = () => setScale(10)

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Reset zoom"
          >
            <Maximize2 className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-xs text-gray-400 ml-2">{scale}px/ft</span>
        </div>
        <div className="text-xs text-gray-500">
          {items.length} item{items.length !== 1 ? 's' : ''} placed
        </div>
      </div>

      {/* Legend */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`
                flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer
                transition-all
                ${hoveredItem === item.id ? 'ring-2 ring-blue-400' : ''}
              `}
              style={{ backgroundColor: `${getItemColor(index)}20` }}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: getItemColor(index) }}
              />
              <span className="text-gray-700">{item.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Top View */}
      <div>
        <h4 className="text-sm font-medium text-gray-600 mb-2">Top View (Looking Down)</h4>
        <div className="bg-gray-100 rounded-lg p-2 overflow-x-auto">
          <svg
            width={topViewWidth}
            height={topViewHeight}
            viewBox={`0 0 ${topViewWidth} ${topViewHeight}`}
            className="mx-auto"
          >
            {/* Trailer Deck */}
            <rect
              x={PADDING}
              y={PADDING}
              width={deckLength * SCALE}
              height={deckWidth * SCALE}
              fill="#f3f4f6"
              stroke="#9ca3af"
              strokeWidth="2"
            />

            {/* Grid Lines */}
            {Array.from({ length: Math.floor(deckLength / 5) + 1 }).map((_, i) => (
              <line
                key={`v-${i}`}
                x1={PADDING + i * 5 * SCALE}
                y1={PADDING}
                x2={PADDING + i * 5 * SCALE}
                y2={PADDING + deckWidth * SCALE}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            ))}

            {/* Gooseneck indicator (front of trailer) */}
            <polygon
              points={`
                ${PADDING - 10},${PADDING + deckWidth * SCALE / 2 - 15}
                ${PADDING},${PADDING + deckWidth * SCALE / 2}
                ${PADDING - 10},${PADDING + deckWidth * SCALE / 2 + 15}
              `}
              fill="#6b7280"
            />

            {/* Cargo Items */}
            {items.map((item, index) => {
              const placement = getPlacement(item.id)
              if (!placement) return null

              const itemLength = placement.rotated ? item.width : item.length
              const itemWidth = placement.rotated ? item.length : item.width
              const isHovered = hoveredItem === item.id

              return (
                <g
                  key={item.id}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="cursor-pointer"
                >
                  <rect
                    x={PADDING + placement.x * SCALE}
                    y={PADDING + placement.z * SCALE}
                    width={itemLength * SCALE}
                    height={itemWidth * SCALE}
                    fill={getItemColor(index)}
                    fillOpacity={isHovered ? "1" : "0.8"}
                    stroke={isHovered ? "#3b82f6" : getItemColor(index)}
                    strokeWidth={isHovered ? "3" : "2"}
                    rx="2"
                    style={{ transition: 'all 0.15s ease' }}
                  />
                  {/* Item label */}
                  {itemLength * SCALE > 40 && itemWidth * SCALE > 20 && (
                    <text
                      x={PADDING + placement.x * SCALE + (itemLength * SCALE) / 2}
                      y={PADDING + placement.z * SCALE + (itemWidth * SCALE) / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {item.description.slice(0, 12)}
                    </text>
                  )}
                  {/* Dimensions */}
                  {itemLength * SCALE > 60 && (
                    <text
                      x={PADDING + placement.x * SCALE + (itemLength * SCALE) / 2}
                      y={PADDING + placement.z * SCALE + (itemWidth * SCALE) / 2 + 12}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="8"
                      opacity="0.8"
                    >
                      {itemLength.toFixed(1)}' x {itemWidth.toFixed(1)}'
                    </text>
                  )}
                </g>
              )
            })}

            {/* Labels */}
            <text
              x={PADDING - 5}
              y={PADDING + deckWidth * SCALE / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#6b7280"
              fontSize="10"
            >
              FRONT
            </text>
            <text
              x={PADDING + deckLength * SCALE + 5}
              y={PADDING + deckWidth * SCALE / 2}
              textAnchor="start"
              dominantBaseline="middle"
              fill="#6b7280"
              fontSize="10"
            >
              REAR
            </text>
            <text
              x={PADDING + deckLength * SCALE / 2}
              y={topViewHeight - 5}
              textAnchor="middle"
              fill="#9ca3af"
              fontSize="10"
            >
              {deckLength}' x {deckWidth}'
            </text>
          </svg>
        </div>
      </div>

      {/* Side View */}
      <div>
        <h4 className="text-sm font-medium text-gray-600 mb-2">Side View</h4>
        <div className="bg-gray-100 rounded-lg p-2 overflow-x-auto">
          <svg
            width={sideViewWidth}
            height={sideViewHeight}
            viewBox={`0 0 ${sideViewWidth} ${sideViewHeight}`}
            className="mx-auto"
          >
            {/* Legal Height Line */}
            <line
              x1={PADDING}
              y1={PADDING + (maxLegalHeight - maxLegalHeight) * SCALE}
              x2={PADDING + deckLength * SCALE}
              y2={PADDING + (maxLegalHeight - maxLegalHeight) * SCALE}
              stroke="#ef4444"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            <text
              x={PADDING + deckLength * SCALE + 5}
              y={PADDING + 5}
              fill="#ef4444"
              fontSize="8"
            >
              13.5' Legal
            </text>

            {/* Deck */}
            <rect
              x={PADDING}
              y={PADDING + (maxLegalHeight - deckHeight) * SCALE}
              width={deckLength * SCALE}
              height={deckHeight * SCALE}
              fill="#9ca3af"
            />

            {/* Wheels (simplified) */}
            <circle
              cx={PADDING + 20}
              cy={PADDING + maxLegalHeight * SCALE}
              r={8}
              fill="#374151"
            />
            <circle
              cx={PADDING + 40}
              cy={PADDING + maxLegalHeight * SCALE}
              r={8}
              fill="#374151"
            />
            <circle
              cx={PADDING + deckLength * SCALE - 40}
              cy={PADDING + maxLegalHeight * SCALE}
              r={8}
              fill="#374151"
            />
            <circle
              cx={PADDING + deckLength * SCALE - 20}
              cy={PADDING + maxLegalHeight * SCALE}
              r={8}
              fill="#374151"
            />

            {/* Gooseneck */}
            <polygon
              points={`
                ${PADDING - 15},${PADDING + (maxLegalHeight - deckHeight) * SCALE}
                ${PADDING},${PADDING + (maxLegalHeight - deckHeight) * SCALE}
                ${PADDING - 10},${PADDING + maxLegalHeight * SCALE - 10}
                ${PADDING - 25},${PADDING + maxLegalHeight * SCALE - 10}
              `}
              fill="#6b7280"
            />

            {/* Cargo Items (side view shows height) */}
            {items.map((item, index) => {
              const placement = getPlacement(item.id)
              if (!placement) return null

              const itemLength = placement.rotated ? item.width : item.length
              const itemHeight = item.height
              const isHovered = hoveredItem === item.id

              return (
                <g
                  key={item.id}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="cursor-pointer"
                >
                  <rect
                    x={PADDING + placement.x * SCALE}
                    y={PADDING + (maxLegalHeight - deckHeight - itemHeight) * SCALE}
                    width={itemLength * SCALE}
                    height={itemHeight * SCALE}
                    fill={getItemColor(index)}
                    fillOpacity={isHovered ? "1" : "0.8"}
                    stroke={isHovered ? "#3b82f6" : getItemColor(index)}
                    strokeWidth={isHovered ? "3" : "2"}
                    rx="2"
                    style={{ transition: 'all 0.15s ease' }}
                  />
                  {/* Height label */}
                  {itemLength * SCALE > 30 && itemHeight * SCALE > 15 && (
                    <text
                      x={PADDING + placement.x * SCALE + (itemLength * SCALE) / 2}
                      y={PADDING + (maxLegalHeight - deckHeight - itemHeight / 2) * SCALE}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      {itemHeight.toFixed(1)}' H
                    </text>
                  )}
                </g>
              )
            })}

            {/* Dimension Labels */}
            <text
              x={PADDING + deckLength * SCALE / 2}
              y={sideViewHeight - 5}
              textAnchor="middle"
              fill="#9ca3af"
              fontSize="10"
            >
              {deckLength}' Length &bull; {deckHeight}' Deck Height
            </text>
          </svg>
        </div>
      </div>

      {/* Height Warning */}
      {items.some(item => item.height + deckHeight > maxLegalHeight) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Warning: Some items exceed the legal height limit of {maxLegalHeight} feet
        </div>
      )}
    </div>
  )
}
