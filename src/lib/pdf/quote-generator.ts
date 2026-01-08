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

export interface InlandTransportPDFData {
  enabled: boolean
  pickup_address: string
  pickup_city: string
  pickup_state: string
  pickup_zip: string
  dropoff_address: string
  dropoff_city: string
  dropoff_state: string
  dropoff_zip: string
  transport_cost: number
  notes: string
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
  // Equipment images
  frontImageUrl?: string
  sideImageUrl?: string
  costs: Record<CostField, number>
  enabledCosts: Record<CostField, boolean>
  costOverrides: Record<CostField, number | null>
  miscFees?: MiscellaneousFee[]
  costsSubtotal?: number
  miscFeesTotal?: number
  // Inland transportation
  inlandTransport?: InlandTransportPDFData
  inlandTransportCost?: number
  subtotal: number
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

interface LoadedImages {
  logo: string | null
  frontImage: string | null
  sideImage: string | null
}

export async function generateQuotePDFAsync(data: QuotePDFData): Promise<jsPDF> {
  // Load images in parallel
  const [logoBase64, frontImageBase64, sideImageBase64] = await Promise.all([
    data.companyLogoUrl ? loadImageAsBase64(data.companyLogoUrl) : Promise.resolve(null),
    data.frontImageUrl ? loadImageAsBase64(data.frontImageUrl) : Promise.resolve(null),
    data.sideImageUrl ? loadImageAsBase64(data.sideImageUrl) : Promise.resolve(null),
  ])

  return generateQuotePDFWithImages(data, {
    logo: logoBase64,
    frontImage: frontImageBase64,
    sideImage: sideImageBase64,
  })
}

function generateQuotePDFWithImages(data: QuotePDFData, images: LoadedImages): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  let y = 20

  const primaryColor = hexToRgb(data.primaryColor || '#6366F1')
  const secondaryColor = data.secondaryColor ? hexToRgb(data.secondaryColor) : primaryColor
  const { logo: logoBase64, frontImage, sideImage } = images

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
      doc.text(data.companyName || 'Seahorse Express', margin, 25)
    }
  } else {
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text(data.companyName || 'Seahorse Express', margin, 25)
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

  for (let i = 0; i < customerInfo.length; i++) {
    const [label, value] = customerInfo[i]
    doc.setTextColor(100, 100, 100)
    doc.text(label, margin, y)
    doc.setTextColor(0, 0, 0)
    doc.text(value, margin + 30, y)
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

  // Determine if we have images
  const hasImages = frontImage || sideImage
  const imageHeight = 40
  const boxHeight = hasImages ? 35 + imageHeight + 5 : 35

  // Equipment box
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(margin, y, pageWidth - margin * 2, boxHeight, 3, 3, 'F')
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

  // Equipment images (if available)
  if (hasImages) {
    const imageY = dimY + 12
    const imageWidth = 50
    let imageX = margin + 5

    if (frontImage) {
      try {
        doc.addImage(frontImage, 'JPEG', imageX, imageY, imageWidth, imageHeight)
        // Add label
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text('Front View', imageX + imageWidth / 2, imageY + imageHeight + 4, { align: 'center' })
        imageX += imageWidth + 10
      } catch {
        // Skip if image fails
      }
    }

    if (sideImage) {
      try {
        doc.addImage(sideImage, 'JPEG', imageX, imageY, imageWidth, imageHeight)
        // Add label
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text('Side View', imageX + imageWidth / 2, imageY + imageHeight + 4, { align: 'center' })
      } catch {
        // Skip if image fails
      }
    }
  }

  y += boxHeight + 10

  // Cost Breakdown Table
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Cost Breakdown', margin, y)
  y += 5

  // Build table data - skip $0 values
  const tableData: (string | { content: string; styles?: object })[][] = []
  Object.entries(COST_LABELS).forEach(([field, label]) => {
    const costField = field as CostField
    if (data.enabledCosts[costField]) {
      const cost = data.costOverrides[costField] ?? data.costs[costField]
      // Only add non-zero costs to the PDF
      if (cost > 0) {
        tableData.push([label, formatCurrency(cost)])
      }
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

    // Add each misc fee - skip $0 values
    data.miscFees.forEach((fee) => {
      const feeLabel = fee.description ? `${fee.title} - ${fee.description}` : fee.title
      const feeAmount = fee.is_percentage && data.costsSubtotal
        ? Math.round(data.costsSubtotal * (fee.amount / 10000))
        : fee.amount
      // Only add non-zero fees
      if (feeAmount > 0) {
        tableData.push([
          feeLabel || 'Miscellaneous Fee',
          fee.is_percentage ? `${formatCurrency(feeAmount)} (${(fee.amount / 100).toFixed(1)}%)` : formatCurrency(feeAmount),
        ])
      }
    })

    // Add misc fees subtotal
    if (data.miscFeesTotal !== undefined && data.miscFeesTotal > 0) {
      tableData.push([
        { content: 'Additional Fees Subtotal', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: formatCurrency(data.miscFeesTotal), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      ])
    }
  }

  // Add inland transport if enabled
  if (data.inlandTransport && data.inlandTransportCost && data.inlandTransportCost > 0) {
    const inland = data.inlandTransport
    // Add inland transport section header
    tableData.push([
      { content: 'Inland Transportation', styles: { fontStyle: 'bold', fillColor: [secondaryColor.r, secondaryColor.g, secondaryColor.b], textColor: [255, 255, 255] } },
      { content: '', styles: { fillColor: [secondaryColor.r, secondaryColor.g, secondaryColor.b] } },
    ])

    // Format pickup address
    const pickupParts = [inland.pickup_address, inland.pickup_city, inland.pickup_state, inland.pickup_zip].filter(Boolean)
    if (pickupParts.length > 0) {
      tableData.push([`Pickup: ${pickupParts.join(', ')}`, ''])
    }

    // Format dropoff address
    const dropoffParts = [inland.dropoff_address, inland.dropoff_city, inland.dropoff_state, inland.dropoff_zip].filter(Boolean)
    if (dropoffParts.length > 0) {
      tableData.push([`Dropoff: ${dropoffParts.join(', ')}`, ''])
    }

    // Add transport cost
    tableData.push([
      { content: 'Transport Cost', styles: { fontStyle: 'bold' } },
      { content: formatCurrency(data.inlandTransportCost), styles: { fontStyle: 'bold' } },
    ])
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

// Synchronous version (without image support for backwards compatibility)
export function generateQuotePDF(data: QuotePDFData): jsPDF {
  return generateQuotePDFWithImages(data, { logo: null, frontImage: null, sideImage: null })
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
