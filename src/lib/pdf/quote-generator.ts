'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { CostField } from '@/types/equipment'
import { formatCurrency } from '@/lib/utils'
import { formatDimension, formatWeight } from '@/lib/dimensions'

// Cost field labels
const COST_LABELS: Record<CostField, string> = {
  dismantling_loading_cost: 'Dismantling & Loading',
  loading_cost: 'Loading Only',
  blocking_bracing_cost: 'Blocking & Bracing',
  rigging_cost: 'Rigging',
  storage_cost: 'Storage',
  transport_cost: 'Transport',
  equipment_cost: 'Equipment',
  labor_cost: 'Labor',
  permit_cost: 'Permits',
  escort_cost: 'Escort',
  miscellaneous_cost: 'Miscellaneous',
}

export interface QuotePDFData {
  quoteNumber: string
  date: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  customerCompany?: string
  makeName: string
  modelName: string
  location: string
  dimensions: {
    length_inches: number
    width_inches: number
    height_inches: number
    weight_lbs: number
  }
  costs: Record<CostField, number>
  enabledCosts: Record<CostField, boolean>
  costOverrides: Record<CostField, number | null>
  subtotal: number
  marginPercentage: number
  marginAmount: number
  total: number
  notes?: string
  companyName?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  primaryColor?: string
}

// Convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 99, g: 102, b: 241 } // Default indigo
}

export function generateQuotePDF(data: QuotePDFData): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = 20

  const primaryColor = hexToRgb(data.primaryColor || '#6366F1')

  // Header
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b)
  doc.rect(0, 0, pageWidth, 40, 'F')

  // Company name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text(data.companyName || 'Dismantle Pro', margin, 25)

  // Quote number
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Quote #${data.quoteNumber}`, pageWidth - margin, 20, { align: 'right' })
  doc.text(data.date, pageWidth - margin, 28, { align: 'right' })

  y = 55

  // Reset text color
  doc.setTextColor(0, 0, 0)

  // Customer Info Section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Customer Information', margin, y)
  y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)

  const customerInfo = [
    ['Name:', data.customerName],
    ['Company:', data.customerCompany || '-'],
    ['Email:', data.customerEmail || '-'],
    ['Phone:', data.customerPhone || '-'],
  ]

  customerInfo.forEach(([label, value]) => {
    doc.text(label, margin, y)
    doc.setTextColor(0, 0, 0)
    doc.text(value, margin + 30, y)
    doc.setTextColor(100, 100, 100)
    y += 6
  })

  y += 10

  // Equipment Section
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Equipment Details', margin, y)
  y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  // Equipment box
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(margin, y, pageWidth - margin * 2, 35, 3, 3, 'F')
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.text(`${data.makeName} ${data.modelName}`, margin + 5, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Location: ${data.location}`, margin + 5, y + 6)

  // Dimensions
  const dimY = y + 15
  const dimSpacing = 40
  doc.text('Length:', margin + 5, dimY)
  doc.text('Width:', margin + 5 + dimSpacing, dimY)
  doc.text('Height:', margin + 5 + dimSpacing * 2, dimY)
  doc.text('Weight:', margin + 5 + dimSpacing * 3, dimY)

  doc.setTextColor(0, 0, 0)
  doc.text(formatDimension(data.dimensions.length_inches), margin + 5, dimY + 5)
  doc.text(formatDimension(data.dimensions.width_inches), margin + 5 + dimSpacing, dimY + 5)
  doc.text(formatDimension(data.dimensions.height_inches), margin + 5 + dimSpacing * 2, dimY + 5)
  doc.text(formatWeight(data.dimensions.weight_lbs), margin + 5 + dimSpacing * 3, dimY + 5)

  y += 45

  // Cost Breakdown Table
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Cost Breakdown', margin, y)
  y += 5

  // Build table data
  const tableData: string[][] = []
  Object.entries(COST_LABELS).forEach(([field, label]) => {
    const costField = field as CostField
    if (data.enabledCosts[costField]) {
      const cost = data.costOverrides[costField] ?? data.costs[costField]
      tableData.push([label, formatCurrency(cost)])
    }
  })

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [primaryColor.r, primaryColor.g, primaryColor.b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 50, halign: 'right' },
    },
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  })

  // Get final Y position after table
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

  // Totals Section
  const totalsX = pageWidth - margin - 80

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', totalsX, y)
  doc.text(formatCurrency(data.subtotal), pageWidth - margin, y, { align: 'right' })
  y += 6

  doc.text(`Margin (${data.marginPercentage}%):`, totalsX, y)
  doc.text(formatCurrency(data.marginAmount), pageWidth - margin, y, { align: 'right' })
  y += 8

  // Total with background
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b)
  doc.roundedRect(totalsX - 5, y - 5, pageWidth - margin - totalsX + 10, 12, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Total:', totalsX, y + 3)
  doc.text(formatCurrency(data.total), pageWidth - margin, y + 3, { align: 'right' })

  y += 20

  // Notes Section
  if (data.notes) {
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Notes', margin, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)

    const splitNotes = doc.splitTextToSize(data.notes, pageWidth - margin * 2)
    doc.text(splitNotes, margin, y)
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(
    `Generated on ${new Date().toLocaleDateString()} | ${data.companyName || 'Dismantle Pro'}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  )

  return doc
}

export function downloadQuotePDF(data: QuotePDFData, filename?: string): void {
  const doc = generateQuotePDF(data)
  doc.save(filename || `quote-${data.quoteNumber}.pdf`)
}

export function getQuotePDFBlob(data: QuotePDFData): Blob {
  const doc = generateQuotePDF(data)
  return doc.output('blob')
}

export function getQuotePDFDataUrl(data: QuotePDFData): string {
  const doc = generateQuotePDF(data)
  return doc.output('dataurlstring')
}
