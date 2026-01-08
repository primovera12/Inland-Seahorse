'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { InlandDestinationBlock, InlandLoadBlock } from '@/types/inland'
import { formatCurrency } from '@/lib/utils'
import { formatDimension, formatWeight } from '@/lib/dimensions'

export interface InlandQuotePDFData {
  quoteNumber: string
  date: string
  expiresAt?: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  customerCompany?: string
  destinationBlocks: InlandDestinationBlock[]
  subtotal: number
  total: number
  quoteNotes?: string
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

export async function generateInlandQuotePDFAsync(data: InlandQuotePDFData): Promise<jsPDF> {
  let logoBase64: string | null = null
  if (data.companyLogoUrl) {
    logoBase64 = await loadImageAsBase64(data.companyLogoUrl)
  }
  return generateInlandQuotePDFWithLogo(data, logoBase64)
}

function generateInlandQuotePDFWithLogo(data: InlandQuotePDFData, logoBase64: string | null): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  let y = 20

  const primaryColor = hexToRgb(data.primaryColor || '#6366F1')

  // Header
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b)
  doc.rect(0, 0, pageWidth, 40, 'F')

  // Logo or Company name
  if (logoBase64) {
    const logoSize = ((data.logoSizePercentage || 100) / 100) * 30
    try {
      doc.addImage(logoBase64, 'PNG', margin, 5, logoSize, logoSize)
    } catch {
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
  doc.text(`Inland Quote #${data.quoteNumber}`, pageWidth - margin, 15, { align: 'right' })
  doc.text(data.date, pageWidth - margin, 23, { align: 'right' })

  // Expiration date if set
  if (data.expiresAt) {
    doc.setFontSize(10)
    doc.text(`Valid until: ${data.expiresAt}`, pageWidth - margin, 31, { align: 'right' })
  }

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

  // Destinations
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Transportation Details', margin, y)
  y += 10

  data.destinationBlocks.forEach((block) => {
    // Check if we need a new page
    if (y > 240) {
      doc.addPage()
      y = 20
    }

    // Destination header
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(margin, y, pageWidth - margin * 2, 25, 3, 3, 'F')

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b)
    doc.text(`Destination ${block.label}`, margin + 5, y + 8)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)

    // Pickup
    doc.setTextColor(34, 139, 34) // Green
    doc.text('Pickup:', margin + 5, y + 16)
    doc.setTextColor(0, 0, 0)
    const pickupAddr = [
      block.pickup_address,
      block.pickup_city,
      block.pickup_state,
      block.pickup_zip,
    ]
      .filter(Boolean)
      .join(', ')
    doc.text(pickupAddr || '-', margin + 30, y + 16)

    // Dropoff
    doc.setTextColor(220, 20, 60) // Red
    doc.text('Dropoff:', margin + 5, y + 22)
    doc.setTextColor(0, 0, 0)
    const dropoffAddr = [
      block.dropoff_address,
      block.dropoff_city,
      block.dropoff_state,
      block.dropoff_zip,
    ]
      .filter(Boolean)
      .join(', ')
    doc.text(dropoffAddr || '-', margin + 30, y + 22)

    // Route info
    if (block.distance_miles || block.duration_minutes) {
      const routeInfo = []
      if (block.distance_miles) routeInfo.push(`${block.distance_miles} miles`)
      if (block.duration_minutes) {
        const hours = Math.floor(block.duration_minutes / 60)
        const mins = block.duration_minutes % 60
        routeInfo.push(`${hours}h ${mins}m`)
      }
      doc.text(routeInfo.join(' | '), pageWidth - margin - 5, y + 16, { align: 'right' })
    }

    // Subtotal
    doc.setFont('helvetica', 'bold')
    doc.text(formatCurrency(block.subtotal), pageWidth - margin - 5, y + 22, { align: 'right' })

    y += 30

    // Load blocks
    block.load_blocks.forEach((loadBlock) => {
      if (y > 250) {
        doc.addPage()
        y = 20
      }

      // Service items table
      const serviceData: string[][] = []

      // Add services
      loadBlock.service_items.forEach((service) => {
        serviceData.push([
          `${loadBlock.truck_type_name} - ${service.name}`,
          service.quantity.toString(),
          formatCurrency(service.rate),
          formatCurrency(service.total),
        ])
      })

      // Add accessorials
      loadBlock.accessorial_charges.forEach((charge) => {
        serviceData.push([
          charge.name,
          charge.quantity.toString(),
          formatCurrency(charge.rate),
          formatCurrency(charge.total),
        ])
      })

      if (serviceData.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Description', 'Qty', 'Rate', 'Total']],
          body: serviceData,
          theme: 'striped',
          headStyles: {
            fillColor: [primaryColor.r, primaryColor.g, primaryColor.b],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
          },
          columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' },
          },
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 9,
            cellPadding: 3,
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
        })

        y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
      }
    })

    y += 5
  })

  // Check if we need a new page for totals
  if (y > 230) {
    doc.addPage()
    y = 20
  }

  // Totals Section
  y += 10
  const totalsX = pageWidth - margin - 80

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
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
  if (data.quoteNotes) {
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Notes', margin, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)

    const splitNotes = doc.splitTextToSize(data.quoteNotes, pageWidth - margin * 2)
    doc.text(splitNotes, margin, y)
    y += splitNotes.length * 5 + 10
  }

  // Terms & Conditions Section
  if (data.termsAndConditions) {
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
export function generateInlandQuotePDF(data: InlandQuotePDFData): jsPDF {
  return generateInlandQuotePDFWithLogo(data, null)
}

export function downloadInlandQuotePDF(data: InlandQuotePDFData, filename?: string): void {
  const doc = generateInlandQuotePDF(data)
  doc.save(filename || `inland-quote-${data.quoteNumber}.pdf`)
}

export function getInlandQuotePDFBlob(data: InlandQuotePDFData): Blob {
  const doc = generateInlandQuotePDF(data)
  return doc.output('blob')
}

export function getInlandQuotePDFDataUrl(data: InlandQuotePDFData): string {
  const doc = generateInlandQuotePDF(data)
  return doc.output('dataurlstring')
}

// Async versions with logo support
export async function downloadInlandQuotePDFAsync(data: InlandQuotePDFData, filename?: string): Promise<void> {
  const doc = await generateInlandQuotePDFAsync(data)
  doc.save(filename || `inland-quote-${data.quoteNumber}.pdf`)
}

export async function getInlandQuotePDFBlobAsync(data: InlandQuotePDFData): Promise<Blob> {
  const doc = await generateInlandQuotePDFAsync(data)
  return doc.output('blob')
}

export async function getInlandQuotePDFDataUrlAsync(data: InlandQuotePDFData): Promise<string> {
  const doc = await generateInlandQuotePDFAsync(data)
  return doc.output('dataurlstring')
}
