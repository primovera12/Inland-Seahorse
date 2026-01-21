/**
 * LoadPlanPDFRenderer
 *
 * SVG rendering functions for PDF generation.
 * These functions return SVG strings (not JSX) that can be converted to PNG for PDF embedding.
 */

import type { TruckType, LoadItem, ItemPlacement } from '@/lib/load-planner/types'
import { getItemColor } from './LoadPlanVisualizer'

// Options for SVG rendering
interface SVGRenderOptions {
  width?: number
  scale?: number
  showLabels?: boolean
  showDimensions?: boolean
}

/**
 * Convert SVG string to data URL for image loading
 */
export function svgToDataUrl(svgString: string): string {
  const encoded = encodeURIComponent(svgString)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
  return `data:image/svg+xml,${encoded}`
}

/**
 * Render top view SVG as a string (looking down at the trailer)
 */
export function renderTopViewSvg(
  truck: TruckType,
  items: LoadItem[],
  placements: ItemPlacement[],
  options: SVGRenderOptions = {}
): string {
  const SCALE = options.scale || 8 // pixels per foot
  const PADDING = 25
  const showLabels = options.showLabels !== false
  const showDimensions = options.showDimensions !== false

  const deckLength = truck.deckLength
  const deckWidth = truck.deckWidth

  const svgWidth = options.width || (deckLength * SCALE + PADDING * 2)
  const actualScale = options.width ? (options.width - PADDING * 2) / deckLength : SCALE
  const svgHeight = deckWidth * actualScale + PADDING * 2

  // Get placement by item ID
  const getPlacement = (itemId: string) => placements.find(p => p.itemId === itemId)

  // Build cargo items SVG
  let cargoSvg = ''
  items.forEach((item, index) => {
    const placement = getPlacement(item.id)
    if (!placement) return

    const itemLength = placement.rotated ? item.width : item.length
    const itemWidth = placement.rotated ? item.length : item.width
    const color = getItemColor(index)

    const x = PADDING + placement.x * actualScale
    const y = PADDING + placement.z * actualScale
    const w = itemLength * actualScale
    const h = itemWidth * actualScale

    cargoSvg += `
      <rect
        x="${x}"
        y="${y}"
        width="${w}"
        height="${h}"
        fill="${color}"
        fill-opacity="0.8"
        stroke="${color}"
        stroke-width="2"
        rx="2"
      />`

    // Item label
    if (showLabels && w > 35 && h > 18) {
      const label = item.description.slice(0, 10)
      cargoSvg += `
        <text
          x="${x + w / 2}"
          y="${y + h / 2}"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="white"
          font-size="9"
          font-weight="bold"
          font-family="Arial, sans-serif"
        >${escapeXml(label)}</text>`
    }

    // Dimensions
    if (showDimensions && w > 50) {
      cargoSvg += `
        <text
          x="${x + w / 2}"
          y="${y + h / 2 + 10}"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="white"
          font-size="7"
          font-family="Arial, sans-serif"
          opacity="0.9"
        >${itemLength.toFixed(0)}' x ${itemWidth.toFixed(0)}'</text>`
    }
  })

  // Build grid lines
  let gridSvg = ''
  const gridSpacing = 5 // feet
  for (let i = 0; i <= Math.floor(deckLength / gridSpacing); i++) {
    const x = PADDING + i * gridSpacing * actualScale
    gridSvg += `
      <line
        x1="${x}"
        y1="${PADDING}"
        x2="${x}"
        y2="${PADDING + deckWidth * actualScale}"
        stroke="#e5e7eb"
        stroke-width="1"
        stroke-dasharray="2,2"
      />`
  }

  // Build full SVG
  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="${svgWidth}"
      height="${svgHeight}"
      viewBox="0 0 ${svgWidth} ${svgHeight}"
    >
      <!-- White background -->
      <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="white"/>

      <!-- Trailer Deck -->
      <rect
        x="${PADDING}"
        y="${PADDING}"
        width="${deckLength * actualScale}"
        height="${deckWidth * actualScale}"
        fill="#f3f4f6"
        stroke="#9ca3af"
        stroke-width="2"
      />

      <!-- Grid Lines -->
      ${gridSvg}

      <!-- Gooseneck indicator (front of trailer) -->
      <polygon
        points="
          ${PADDING - 8},${PADDING + deckWidth * actualScale / 2 - 10}
          ${PADDING},${PADDING + deckWidth * actualScale / 2}
          ${PADDING - 8},${PADDING + deckWidth * actualScale / 2 + 10}
        "
        fill="#6b7280"
      />

      <!-- Cargo Items -->
      ${cargoSvg}

      <!-- Labels -->
      <text
        x="${PADDING - 12}"
        y="${PADDING + deckWidth * actualScale / 2}"
        text-anchor="end"
        dominant-baseline="middle"
        fill="#6b7280"
        font-size="9"
        font-family="Arial, sans-serif"
      >FRONT</text>
      <text
        x="${PADDING + deckLength * actualScale + 5}"
        y="${PADDING + deckWidth * actualScale / 2}"
        text-anchor="start"
        dominant-baseline="middle"
        fill="#6b7280"
        font-size="9"
        font-family="Arial, sans-serif"
      >REAR</text>

      <!-- Dimension Label -->
      <text
        x="${PADDING + deckLength * actualScale / 2}"
        y="${svgHeight - 5}"
        text-anchor="middle"
        fill="#9ca3af"
        font-size="9"
        font-family="Arial, sans-serif"
      >${deckLength}' x ${deckWidth}'</text>
    </svg>
  `.trim()

  return svg
}

/**
 * Render side view SVG as a string (profile view of the trailer)
 */
export function renderSideViewSvg(
  truck: TruckType,
  items: LoadItem[],
  placements: ItemPlacement[],
  options: SVGRenderOptions = {}
): string {
  const SCALE = options.scale || 8 // pixels per foot
  const PADDING = 25
  const showLabels = options.showLabels !== false

  const deckLength = truck.deckLength
  const deckHeight = truck.deckHeight
  const maxLegalHeight = 13.5 // Standard legal height limit

  const svgWidth = options.width || (deckLength * SCALE + PADDING * 2)
  const actualScale = options.width ? (options.width - PADDING * 2) / deckLength : SCALE
  const svgHeight = maxLegalHeight * actualScale + PADDING * 2

  // Get placement by item ID
  const getPlacement = (itemId: string) => placements.find(p => p.itemId === itemId)

  // Build cargo items SVG
  let cargoSvg = ''
  items.forEach((item, index) => {
    const placement = getPlacement(item.id)
    if (!placement) return

    const itemLength = placement.rotated ? item.width : item.length
    const itemHeight = item.height
    const color = getItemColor(index)

    const x = PADDING + placement.x * actualScale
    const y = PADDING + (maxLegalHeight - deckHeight - itemHeight) * actualScale
    const w = itemLength * actualScale
    const h = itemHeight * actualScale

    cargoSvg += `
      <rect
        x="${x}"
        y="${y}"
        width="${w}"
        height="${h}"
        fill="${color}"
        fill-opacity="0.8"
        stroke="${color}"
        stroke-width="2"
        rx="2"
      />`

    // Height label
    if (showLabels && w > 25 && h > 12) {
      cargoSvg += `
        <text
          x="${x + w / 2}"
          y="${y + h / 2}"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="white"
          font-size="8"
          font-weight="bold"
          font-family="Arial, sans-serif"
        >${itemHeight.toFixed(1)}' H</text>`
    }
  })

  // Build wheels SVG
  const wheelRadius = 6
  const wheelSvg = `
    <circle cx="${PADDING + 15}" cy="${PADDING + maxLegalHeight * actualScale}" r="${wheelRadius}" fill="#374151"/>
    <circle cx="${PADDING + 30}" cy="${PADDING + maxLegalHeight * actualScale}" r="${wheelRadius}" fill="#374151"/>
    <circle cx="${PADDING + deckLength * actualScale - 30}" cy="${PADDING + maxLegalHeight * actualScale}" r="${wheelRadius}" fill="#374151"/>
    <circle cx="${PADDING + deckLength * actualScale - 15}" cy="${PADDING + maxLegalHeight * actualScale}" r="${wheelRadius}" fill="#374151"/>
  `

  // Build full SVG
  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="${svgWidth}"
      height="${svgHeight}"
      viewBox="0 0 ${svgWidth} ${svgHeight}"
    >
      <!-- White background -->
      <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="white"/>

      <!-- Legal Height Line -->
      <line
        x1="${PADDING}"
        y1="${PADDING}"
        x2="${PADDING + deckLength * actualScale}"
        y2="${PADDING}"
        stroke="#ef4444"
        stroke-width="1"
        stroke-dasharray="4,4"
      />
      <text
        x="${PADDING + deckLength * actualScale + 5}"
        y="${PADDING + 4}"
        fill="#ef4444"
        font-size="8"
        font-family="Arial, sans-serif"
      >13.5' Legal</text>

      <!-- Deck -->
      <rect
        x="${PADDING}"
        y="${PADDING + (maxLegalHeight - deckHeight) * actualScale}"
        width="${deckLength * actualScale}"
        height="${deckHeight * actualScale}"
        fill="#9ca3af"
      />

      <!-- Gooseneck -->
      <polygon
        points="
          ${PADDING - 12},${PADDING + (maxLegalHeight - deckHeight) * actualScale}
          ${PADDING},${PADDING + (maxLegalHeight - deckHeight) * actualScale}
          ${PADDING - 8},${PADDING + maxLegalHeight * actualScale - 8}
          ${PADDING - 20},${PADDING + maxLegalHeight * actualScale - 8}
        "
        fill="#6b7280"
      />

      <!-- Wheels -->
      ${wheelSvg}

      <!-- Cargo Items -->
      ${cargoSvg}

      <!-- Dimension Labels -->
      <text
        x="${PADDING + deckLength * actualScale / 2}"
        y="${svgHeight - 5}"
        text-anchor="middle"
        fill="#9ca3af"
        font-size="9"
        font-family="Arial, sans-serif"
      >${deckLength}' Length | ${deckHeight}' Deck</text>
    </svg>
  `.trim()

  return svg
}

/**
 * Escape special XML characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Calculate maximum height used by items (item height + deck height)
 */
export function calculateMaxHeightUsed(
  truck: TruckType,
  items: LoadItem[]
): number {
  if (items.length === 0) return truck.deckHeight
  const maxItemHeight = Math.max(...items.map(i => i.height))
  return truck.deckHeight + maxItemHeight
}
