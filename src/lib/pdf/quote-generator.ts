'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { CostField } from '@/types/equipment'
import type { MiscellaneousFee } from '@/types/quotes'
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
  expiresAt?: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  customerCompany?: string
  customerAddress?: string
  // Billing info
  billingAddress?: string
  billingCity?: string
  billingState?: string
  billingZip?: string
  paymentTerms?: string
  // Equipment
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
  miscFees?: MiscellaneousFee[]
  costsSubtotal?: number
  miscFeesTotal?: number
  subtotal: number
  marginPercentage: number
  marginAmount: number
  total: number
  notes?: string
  termsAndConditions?: string
  companyName?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  companyWebsite?: string
  primaryColor?: string
  secondaryColor?: string
  companyLogoUrl?: string
  logoSizePercentage?: number
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

// Helper to load image as base64
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function generateQuotePDFAsync(data: QuotePDFData): Promise<jsPDF> {
  // Load logo if URL provided
  let logoBase64: string | null = null
  if (data.companyLogoUrl) {
    logoBase64 = await loadImageAsBase64(data.companyLogoUrl)
  }
  return generateQuotePDFWithLogo(data, logoBase64)
}

function generateQuotePDFWithLogo(data: QuotePDFData, logoBase64: string | null): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  let y = 20

  const primaryColor = hexToRgb(data.primaryColor || '#6366F1')
  const secondaryColor = data.secondaryColor ? hexToRgb(data.secondaryColor) : primaryColor

  // Header
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b)
  doc.rect(0, 0, pageWidth, 40, 'F')

  // Logo or Company name
  if (logoBase64) {
    const logoSize = ((data.logoSizePercentage || 100) / 100) * 30
    try {
      doc.addImage(logoBase64, 'PNG', margin, 5, logoSize, logoSize)
    } catch {
      // Fall back to text if image fails
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text(data.companyName || 'Dismantle Pro', margin, 25)
    }
  } else {
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text(data.companyName || 'Dismantle Pro', margin, 25)
  }

  // Quote number and date
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Quote #${data.quoteNumber}`, pageWidth - margin, 15, { align: 'right' })
  doc.text(data.date, pageWidth - margin, 23, { align: 'right' })

  // Expiration date if set
  if (data.expiresAt) {
    doc.setFontSize(10)
    doc.text(`Valid until: ${data.expiresAt}`, pageWidth - margin, 31, { align: 'right' })
  }

  y = 55

  // Reset text color
  doc.setTextColor(0, 0, 0)

  // Customer & Billing Info Section (side by side)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Customer Information', margin, y)

  // Billing header on right side
  const hasBillingInfo = data.billingAddress || data.billingCity || data.billingState || data.billingZip
  if (hasBillingInfo) {
    doc.text('Billing Information', pageWidth / 2 + 10, y)
  }
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

  if (data.customerAddress) {
    customerInfo.push(['Address:', data.customerAddress])
  }

  // Build billing info if present
  const billingInfoLines: [string, string][] = []
  if (hasBillingInfo) {
    if (data.billingAddress) billingInfoLines.push(['Address:', data.billingAddress])
    const cityStateZip = [data.billingCity, data.billingState, data.billingZip].filter(Boolean).join(', ')
    if (cityStateZip) billingInfoLines.push(['', cityStateZip])
    if (data.paymentTerms) {
      const termsLabel = data.paymentTerms.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      billingInfoLines.push(['Terms:', termsLabel])
    }
  }

  const maxLines = Math.max(customerInfo.length, billingInfoLines.length)
  for (let i = 0; i < maxLines; i++) {
    // Customer info (left side)
    if (i < customerInfo.length) {
      const [label, value] = customerInfo[i]
      doc.setTextColor(100, 100, 100)
      doc.text(label, margin, y)
      doc.setTextColor(0, 0, 0)
      doc.text(value, margin + 30, y)
    }

    // Billing info (right side)
    if (i < billingInfoLines.length) {
      const [label, value] = billingInfoLines[i]
      doc.setTextColor(100, 100, 100)
      if (label) doc.text(label, pageWidth / 2 + 10, y)
      doc.setTextColor(0, 0, 0)
      doc.text(value, pageWidth / 2 + (label ? 40 : 10), y)
    }

    y += 6
  }

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
  const tableData: (string | { content: string; styles?: object })[][] = []
  Object.entries(COST_LABELS).forEach(([field, label]) => {
    const costField = field as CostField
    if (data.enabledCosts[costField]) {
      const cost = data.costOverrides[costField] ?? data.costs[costField]
      tableData.push([label, formatCurrency(cost)])
    }
  })

  // Add misc fees if present
  if (data.miscFees && data.miscFees.length > 0) {
    // Add a separator row for costs subtotal if we have misc fees
    if (data.costsSubtotal !== undefined) {
      tableData.push([
        { content: 'Services Subtotal', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: formatCurrency(data.costsSubtotal), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      ])
    }

    // Add misc fees section header
    tableData.push([
      { content: 'Additional Fees', styles: { fontStyle: 'bold', fillColor: [secondaryColor.r, secondaryColor.g, secondaryColor.b], textColor: [255, 255, 255] } },
      { content: '', styles: { fillColor: [secondaryColor.r, secondaryColor.g, secondaryColor.b] } },
    ])

    // Add each misc fee
    data.miscFees.forEach((fee) => {
      const feeLabel = fee.description ? `${fee.title} - ${fee.description}` : fee.title
      const feeAmount = fee.is_percentage && data.costsSubtotal
        ? Math.round(data.costsSubtotal * (fee.amount / 10000))
        : fee.amount
      tableData.push([
        feeLabel || 'Miscellaneous Fee',
        fee.is_percentage ? `${formatCurrency(feeAmount)} (${(fee.amount / 100).toFixed(1)}%)` : formatCurrency(feeAmount),
      ])
    })

    // Add misc fees subtotal
    if (data.miscFeesTotal !== undefined && data.miscFeesTotal > 0) {
      tableData.push([
        { content: 'Additional Fees Subtotal', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: formatCurrency(data.miscFeesTotal), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      ])
    }
  }

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
      1: { cellWidth: 60, halign: 'right' },
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
    y += splitNotes.length * 5 + 10
  }

  // Terms & Conditions Section
  if (data.termsAndConditions) {
    // Check if we need a new page
    if (y > pageHeight - 80) {
      doc.addPage()
      y = 20
    }

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Terms & Conditions', margin, y)
    y += 6

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)

    const splitTerms = doc.splitTextToSize(data.termsAndConditions, pageWidth - margin * 2)
    // Limit terms display to avoid overflow
    const maxTermsLines = Math.min(splitTerms.length, 20)
    doc.text(splitTerms.slice(0, maxTermsLines), margin, y)
    if (splitTerms.length > maxTermsLines) {
      y += maxTermsLines * 3.5 + 3
      doc.text('... (see full terms in attached document)', margin, y)
    }
  }

  // Footer with company info
  const footerY = pageHeight - 20
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)

  const footerLines: string[] = []
  if (data.companyName) footerLines.push(data.companyName)

  const contactParts: string[] = []
  if (data.companyPhone) contactParts.push(data.companyPhone)
  if (data.companyEmail) contactParts.push(data.companyEmail)
  if (data.companyWebsite) contactParts.push(data.companyWebsite)
  if (contactParts.length > 0) footerLines.push(contactParts.join(' | '))

  if (data.companyAddress) footerLines.push(data.companyAddress)

  footerLines.forEach((line, index) => {
    doc.text(line, pageWidth / 2, footerY + (index * 4), { align: 'center' })
  })

  return doc
}

// Synchronous version (without logo support for backwards compatibility)
export function generateQuotePDF(data: QuotePDFData): jsPDF {
  return generateQuotePDFWithLogo(data, null)
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

// Async versions with logo support
export async function downloadQuotePDFAsync(data: QuotePDFData, filename?: string): Promise<void> {
  const doc = await generateQuotePDFAsync(data)
  doc.save(filename || `quote-${data.quoteNumber}.pdf`)
}

export async function getQuotePDFBlobAsync(data: QuotePDFData): Promise<Blob> {
  const doc = await generateQuotePDFAsync(data)
  return doc.output('blob')
}

export async function getQuotePDFDataUrlAsync(data: QuotePDFData): Promise<string> {
  const doc = await generateQuotePDFAsync(data)
  return doc.output('dataurlstring')
}
