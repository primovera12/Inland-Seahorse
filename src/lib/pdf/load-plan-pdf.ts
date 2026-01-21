'use client'

/**
 * Load Plan PDF Generator
 *
 * Functions to add load plan sections to existing PDF generators.
 * Includes:
 * - Load configuration summary
 * - Per-truck breakdown with diagrams
 * - Permit requirements summary
 */

import jsPDF from 'jspdf'
import type { LoadPlan, PlannedLoad, TruckType, LoadItem, ItemPlacement } from '@/lib/load-planner/types'
import { renderTopViewSvg, renderSideViewSvg, svgToDataUrl } from '@/components/load-planner/LoadPlanPDFRenderer'
import { formatCurrency } from '@/lib/utils'
import { formatFeetInches } from '@/lib/load-planner/unit-helpers'

/**
 * Convert SVG to PNG using canvas (for PDF compatibility)
 */
async function svgToPng(svgString: string, width: number, height: number): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = 2 // Higher quality
        canvas.width = width * scale
        canvas.height = height * scale
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = 'white'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/png'))
        } else {
          resolve(null)
        }
      }
      img.onerror = () => resolve(null)
      img.src = svgToDataUrl(svgString)
    } catch {
      resolve(null)
    }
  })
}

interface LoadPlanSectionOptions {
  pageWidth?: number
  margin?: number
  primaryColor?: { r: number; g: number; b: number }
  showDiagrams?: boolean
  showWarnings?: boolean
  showPermitCosts?: boolean
}

/**
 * Add load plan section to PDF
 * Returns the new Y position after rendering
 */
export async function addLoadPlanSection(
  doc: jsPDF,
  loadPlan: LoadPlan,
  startY: number,
  options?: LoadPlanSectionOptions
): Promise<number> {
  const pageWidth = options?.pageWidth || doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = options?.margin || 20
  const contentWidth = pageWidth - margin * 2
  const primaryColor = options?.primaryColor || { r: 99, g: 102, b: 241 }
  const showDiagrams = options?.showDiagrams !== false
  const showWarnings = options?.showWarnings !== false

  let y = startY

  // Section Header
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b)
  doc.rect(margin, y, contentWidth, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('LOAD CONFIGURATION', margin + 3, y + 5.5)
  y += 12

  // Summary
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  const summaryParts = [
    `Total Trucks Required: ${loadPlan.totalTrucks}`,
    `Total Cargo Weight: ${loadPlan.totalWeight.toLocaleString()} lbs`,
  ]

  if (loadPlan.warnings.length > 0) {
    summaryParts.push(`Warnings: ${loadPlan.warnings.length}`)
  }

  doc.text(summaryParts.join('  |  '), margin, y)
  y += 8

  // Each load
  for (let i = 0; i < loadPlan.loads.length; i++) {
    const load = loadPlan.loads[i]

    // Check if we need a new page
    const estimatedHeight = showDiagrams ? 120 : 60
    if (y + estimatedHeight > pageHeight - 30) {
      doc.addPage()
      y = 20
    }

    y = await addSingleLoadSection(doc, load, y, {
      loadNumber: i + 1,
      totalLoads: loadPlan.totalTrucks,
      pageWidth,
      margin,
      contentWidth,
      primaryColor,
      showDiagrams,
      showWarnings
    })

    y += 5 // Space between loads
  }

  return y
}

interface SingleLoadOptions {
  loadNumber: number
  totalLoads: number
  pageWidth: number
  margin: number
  contentWidth: number
  primaryColor: { r: number; g: number; b: number }
  showDiagrams: boolean
  showWarnings: boolean
}

/**
 * Add a single load (truck) section to PDF
 */
async function addSingleLoadSection(
  doc: jsPDF,
  load: PlannedLoad,
  startY: number,
  options: SingleLoadOptions
): Promise<number> {
  const { loadNumber, totalLoads, margin, contentWidth, primaryColor, showDiagrams, showWarnings } = options
  let y = startY

  // Calculate utilization
  const totalWeight = load.items.reduce((sum, i) => sum + (i.weight * i.quantity), 0)
  const weightUtilization = Math.round((totalWeight / load.recommendedTruck.maxCargoWeight) * 100)
  const totalArea = load.items.reduce((sum, i) => sum + (i.length * i.width * i.quantity), 0)
  const truckArea = load.recommendedTruck.deckLength * load.recommendedTruck.deckWidth
  const spaceUtilization = Math.round((totalArea / truckArea) * 100)
  const maxItemHeight = load.items.length > 0 ? Math.max(...load.items.map(i => i.height)) : 0
  const heightUsed = load.recommendedTruck.deckHeight + maxItemHeight

  // Load header
  doc.setFillColor(245, 245, 245)
  doc.rect(margin, y, contentWidth, 7, 'F')
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')

  const headerText = totalLoads > 1
    ? `Truck ${loadNumber} of ${totalLoads}: ${load.recommendedTruck.name}`
    : load.recommendedTruck.name

  doc.text(headerText, margin + 3, y + 5)

  // Category badge
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const categoryWidth = doc.getTextWidth(load.recommendedTruck.category) + 6
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b)
  doc.roundedRect(margin + contentWidth - categoryWidth - 3, y + 1, categoryWidth, 5, 1, 1, 'F')
  doc.setTextColor(255, 255, 255)
  doc.text(load.recommendedTruck.category, margin + contentWidth - categoryWidth, y + 4.5)

  y += 10

  // Truck specs
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  const specs = [
    `Deck: ${load.recommendedTruck.deckLength}' x ${load.recommendedTruck.deckWidth}'`,
    `Deck Height: ${load.recommendedTruck.deckHeight}'`,
    `Max Cargo: ${load.recommendedTruck.maxCargoWeight.toLocaleString()} lbs`,
    `Loading: ${load.recommendedTruck.loadingMethod}`
  ]
  doc.text(specs.join('  |  '), margin, y)
  y += 6

  // Utilization
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(9)

  const utilText = [
    `Weight: ${weightUtilization}%`,
    `Space: ${spaceUtilization}%`,
    `Total Height: ${formatFeetInches(heightUsed)}`
  ]

  // Color-code weight utilization
  if (weightUtilization > 100) {
    doc.setTextColor(220, 38, 38) // Red
  } else if (weightUtilization > 90) {
    doc.setTextColor(245, 158, 11) // Amber
  } else {
    doc.setTextColor(34, 197, 94) // Green
  }
  doc.text(utilText[0], margin, y)

  doc.setTextColor(0, 0, 0)
  doc.text('  |  ' + utilText.slice(1).join('  |  '), margin + doc.getTextWidth(utilText[0]), y)
  y += 8

  // Diagrams
  if (showDiagrams && load.placements.length > 0) {
    const diagramWidth = 400
    const diagramHeight = 100

    // Top View
    try {
      const topSvg = renderTopViewSvg(load.recommendedTruck, load.items, load.placements, { width: diagramWidth })
      const topPng = await svgToPng(topSvg, diagramWidth, diagramHeight)

      if (topPng) {
        const imgWidth = contentWidth * 0.85
        const imgHeight = imgWidth * 0.25
        doc.addImage(topPng, 'PNG', margin + (contentWidth - imgWidth) / 2, y, imgWidth, imgHeight)
        y += imgHeight + 2
      }
    } catch {
      // Skip diagram on error
    }

    // Side View
    try {
      const sideSvg = renderSideViewSvg(load.recommendedTruck, load.items, load.placements, { width: diagramWidth })
      const sidePng = await svgToPng(sideSvg, diagramWidth, diagramHeight)

      if (sidePng) {
        const imgWidth = contentWidth * 0.85
        const imgHeight = imgWidth * 0.25
        doc.addImage(sidePng, 'PNG', margin + (contentWidth - imgWidth) / 2, y, imgWidth, imgHeight)
        y += imgHeight + 4
      }
    } catch {
      // Skip diagram on error
    }
  }

  // Cargo items table
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Cargo Items:', margin, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)

  for (const item of load.items) {
    const qtyStr = item.quantity > 1 ? ` (x${item.quantity})` : ''
    const dimStr = `${item.length.toFixed(1)}' x ${item.width.toFixed(1)}' x ${item.height.toFixed(1)}'`
    const itemLine = `- ${item.description}${qtyStr}: ${dimStr} - ${item.weight.toLocaleString()} lbs`
    doc.text(itemLine, margin + 3, y)
    y += 4
  }

  y += 2

  // Warnings
  if (showWarnings && load.warnings.length > 0) {
    const warningBoxHeight = load.warnings.length * 5 + 4
    doc.setFillColor(255, 251, 235) // Amber-50
    doc.rect(margin, y, contentWidth, warningBoxHeight, 'F')
    doc.setDrawColor(245, 158, 11)
    doc.rect(margin, y, contentWidth, warningBoxHeight, 'S')

    doc.setTextColor(146, 64, 14) // Amber-800
    doc.setFontSize(8)

    y += 3
    for (const warning of load.warnings) {
      doc.text(`! ${warning}`, margin + 3, y + 2)
      y += 5
    }
    y += 2
  }

  return y
}

interface PermitSummaryData {
  states: string[]
  totalCost: number
  escortRequired: boolean
  policeRequired: boolean
  permitTypes: string[]
}

interface PermitSummaryOptions {
  margin?: number
  pageWidth?: number
}

/**
 * Generate permit summary section
 */
export function addPermitSummary(
  doc: jsPDF,
  permits: PermitSummaryData,
  startY: number,
  options?: PermitSummaryOptions
): number {
  const margin = options?.margin || 20
  const pageWidth = options?.pageWidth || doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - margin * 2

  let y = startY

  // Header
  doc.setFillColor(254, 243, 199) // Amber-100
  doc.rect(margin, y, contentWidth, 7, 'F')
  doc.setTextColor(146, 64, 14) // Amber-800
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('PERMIT REQUIREMENTS', margin + 3, y + 5)
  y += 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)

  // States
  if (permits.states.length > 0) {
    doc.text(`States Requiring Permits: ${permits.states.join(', ')}`, margin, y)
    y += 5
  }

  // Permit types
  if (permits.permitTypes.length > 0) {
    doc.text(`Permit Types: ${permits.permitTypes.join(', ')}`, margin, y)
    y += 5
  }

  // Escorts
  if (permits.escortRequired) {
    const escortType = permits.policeRequired ? 'Police + Pilot Car' : 'Pilot Car'
    doc.text(`Escort: ${escortType} Required`, margin, y)
    y += 5
  }

  // Estimated cost
  doc.setFont('helvetica', 'bold')
  doc.text(`Estimated Permit Cost: ${formatCurrency(permits.totalCost / 100)}`, margin, y)
  y += 8

  return y
}

/**
 * Pre-render SVGs for a load plan (to be stored with the quote)
 */
export async function preRenderLoadPlanSvgs(
  loadPlan: LoadPlan
): Promise<{
  loads: Array<{
    topViewSvg: string
    sideViewSvg: string
    topViewPng: string | null
    sideViewPng: string | null
  }>
}> {
  const renderedLoads = await Promise.all(
    loadPlan.loads.map(async (load) => {
      const topSvg = renderTopViewSvg(load.recommendedTruck, load.items, load.placements, { width: 400 })
      const sideSvg = renderSideViewSvg(load.recommendedTruck, load.items, load.placements, { width: 400 })

      const [topPng, sidePng] = await Promise.all([
        svgToPng(topSvg, 400, 100),
        svgToPng(sideSvg, 400, 100)
      ])

      return {
        topViewSvg: topSvg,
        sideViewSvg: sideSvg,
        topViewPng: topPng,
        sideViewPng: sidePng
      }
    })
  )

  return { loads: renderedLoads }
}

// Re-export types for convenience
export type { LoadPlanSectionOptions, PermitSummaryData, PermitSummaryOptions }
