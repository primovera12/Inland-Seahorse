'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { InlandDestinationBlock, InlandLoadBlock } from '@/types/inland'
import type { LoadPlan } from '@/lib/load-planner/types'
import { formatCurrency } from '@/lib/utils'
import { formatDimension, formatWeight } from '@/lib/dimensions'
import { addLoadPlanSection, addPermitSummary, type PermitSummaryData } from './load-plan-pdf'

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
  // Load plan integration (Phase 6)
  loadPlan?: LoadPlan | null
  permitInfo?: PermitSummaryData | null
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

// Convert SVG to PNG using canvas (for PDF compatibility)
async function convertSvgToPng(svgData: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = 2 // Higher quality
        canvas.width = img.width * scale || 400
        canvas.height = img.height * scale || 300
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
      img.src = svgData
    } catch {
      resolve(null)
    }
  })
}

// Helper to load image as base64 (with SVG conversion support)
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    const base64 = await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })

    if (!base64) return null

    // Check if it's an SVG and convert to PNG for PDF compatibility
    if (base64.includes('data:image/svg+xml') || url.endsWith('.svg')) {
      return await convertSvgToPng(base64)
    }

    return base64
  } catch {
    return null
  }
}

export async function generateInlandQuotePDFAsync(data: InlandQuotePDFData): Promise<jsPDF> {
  let logoBase64: string | null = null
  if (data.companyLogoUrl) {
    logoBase64 = await loadImageAsBase64(data.companyLogoUrl)
  }

  // If load plan is provided, use the enhanced generator
  if (data.loadPlan && data.loadPlan.loads.length > 0) {
    return generateInlandQuotePDFWithLoadPlan(data, logoBase64)
  }

  return generateInlandQuotePDFWithLogo(data, logoBase64)
}

/**
 * Enhanced PDF generator with load plan diagrams (Phase 6)
 */
async function generateInlandQuotePDFWithLoadPlan(
  data: InlandQuotePDFData,
  logoBase64: string | null
): Promise<jsPDF> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20

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

  if (data.expiresAt) {
    doc.setFontSize(10)
    doc.text(`Valid until: ${data.expiresAt}`, pageWidth - margin, 31, { align: 'right' })
  }

  let y = 55
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

  // Transportation Details (destinations)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Transportation Details', margin, y)
  y += 10

  for (const block of data.destinationBlocks) {
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
    doc.setTextColor(34, 139, 34)
    doc.text('Pickup:', margin + 5, y + 16)
    doc.setTextColor(0, 0, 0)
    const pickupAddr = [block.pickup_address, block.pickup_city, block.pickup_state, block.pickup_zip]
      .filter(Boolean)
      .join(', ')
    doc.text(pickupAddr || '-', margin + 30, y + 16)

    // Dropoff
    doc.setTextColor(220, 20, 60)
    doc.text('Dropoff:', margin + 5, y + 22)
    doc.setTextColor(0, 0, 0)
    const dropoffAddr = [block.dropoff_address, block.dropoff_city, block.dropoff_state, block.dropoff_zip]
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

    // Load blocks (cargo items and service items)
    for (const loadBlock of block.load_blocks) {
      if (y > 250) {
        doc.addPage()
        y = 20
      }

      // Load block header with truck type
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b)
      doc.text(`Load - ${loadBlock.truck_type_name}`, margin, y)
      y += 8

      // Cargo Details Section
      if (loadBlock.cargo_items && loadBlock.cargo_items.length > 0) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 100, 100)
        doc.text('Cargo Details:', margin, y)
        y += 6

        for (const cargo of loadBlock.cargo_items) {
          if (y > 260) {
            doc.addPage()
            y = 20
          }

          // Determine cargo name/description
          let cargoName = cargo.description
          if (cargo.is_equipment) {
            const makeName = cargo.equipment_make_name || cargo.custom_make_name || ''
            const modelName = cargo.equipment_model_name || cargo.custom_model_name || ''
            if (makeName || modelName) {
              cargoName = `${makeName} ${modelName}`.trim()
            }
          }

          // Draw cargo item box
          doc.setFillColor(248, 250, 252)
          doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'F')

          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          doc.text(cargoName, margin + 4, y + 6)

          // Quantity badge if > 1
          if (cargo.quantity > 1) {
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(100, 100, 100)
            doc.text(`(Qty: ${cargo.quantity})`, margin + 4 + doc.getTextWidth(cargoName) + 3, y + 6)
          }

          // Cargo type badge (Equipment vs Standard Cargo)
          const cargoTypeLabel = cargo.is_equipment ? 'Equipment' : 'Cargo'
          const cargoTypeBadgeX = pageWidth - margin - 45
          doc.setFillColor(cargo.is_equipment ? 59 : 99, cargo.is_equipment ? 130 : 102, cargo.is_equipment ? 246 : 241)
          doc.roundedRect(cargoTypeBadgeX, y + 2, 40, 6, 1, 1, 'F')
          doc.setFontSize(7)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(255, 255, 255)
          doc.text(cargoTypeLabel, cargoTypeBadgeX + 20, y + 6, { align: 'center' })

          // Dimensions and Weight row
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(100, 100, 100)
          const dimensionsText = `L: ${formatDimension(cargo.length_inches)} × W: ${formatDimension(cargo.width_inches)} × H: ${formatDimension(cargo.height_inches)}`
          const weightText = `Weight: ${formatWeight(cargo.weight_lbs)}`
          doc.text(dimensionsText, margin + 4, y + 14)
          doc.text(weightText, margin + 4, y + 19)

          // Oversize/Overweight badges
          let badgeX = margin + 4 + doc.getTextWidth(weightText) + 5
          if (cargo.is_oversize) {
            doc.setFillColor(255, 237, 213)
            doc.roundedRect(badgeX, y + 15, 22, 5, 1, 1, 'F')
            doc.setFontSize(6)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(194, 65, 12)
            doc.text('OVERSIZE', badgeX + 11, y + 18.5, { align: 'center' })
            badgeX += 25
          }
          if (cargo.is_overweight) {
            doc.setFillColor(254, 226, 226)
            doc.roundedRect(badgeX, y + 15, 28, 5, 1, 1, 'F')
            doc.setFontSize(6)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(185, 28, 28)
            doc.text('OVERWEIGHT', badgeX + 14, y + 18.5, { align: 'center' })
          }

          y += 26
        }
        y += 4
      }

      const serviceData: string[][] = []

      loadBlock.service_items.forEach((service) => {
        serviceData.push([
          `${loadBlock.truck_type_name} - ${service.name}`,
          service.quantity.toString(),
          formatCurrency(service.rate),
          formatCurrency(service.total),
        ])
      })

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
    }

    y += 5
  }

  // === LOAD PLAN SECTION (Phase 6) ===
  if (data.loadPlan && data.loadPlan.loads.length > 0) {
    // Check if we need a new page for load plan
    if (y > pageHeight - 150) {
      doc.addPage()
      y = 20
    }

    y = await addLoadPlanSection(doc, data.loadPlan, y, {
      pageWidth,
      margin,
      primaryColor,
      showDiagrams: true,
      showWarnings: true
    })
    y += 10
  }

  // === PERMIT SUMMARY SECTION ===
  if (data.permitInfo && data.permitInfo.totalCost > 0) {
    if (y > pageHeight - 60) {
      doc.addPage()
      y = 20
    }

    y = addPermitSummary(doc, data.permitInfo, y, { margin, pageWidth })
    y += 10
  }

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

  // Terms & Conditions
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

  // Footer
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

    // Load blocks (cargo items and service items)
    block.load_blocks.forEach((loadBlock) => {
      if (y > 250) {
        doc.addPage()
        y = 20
      }

      // Load block header with truck type
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b)
      doc.text(`Load - ${loadBlock.truck_type_name}`, margin, y)
      y += 8

      // Cargo Details Section
      if (loadBlock.cargo_items && loadBlock.cargo_items.length > 0) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 100, 100)
        doc.text('Cargo Details:', margin, y)
        y += 6

        for (const cargo of loadBlock.cargo_items) {
          if (y > 260) {
            doc.addPage()
            y = 20
          }

          // Determine cargo name/description
          let cargoName = cargo.description
          if (cargo.is_equipment) {
            const makeName = cargo.equipment_make_name || cargo.custom_make_name || ''
            const modelName = cargo.equipment_model_name || cargo.custom_model_name || ''
            if (makeName || modelName) {
              cargoName = `${makeName} ${modelName}`.trim()
            }
          }

          // Draw cargo item box
          doc.setFillColor(248, 250, 252)
          doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'F')

          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          doc.text(cargoName, margin + 4, y + 6)

          // Quantity badge if > 1
          if (cargo.quantity > 1) {
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(100, 100, 100)
            doc.text(`(Qty: ${cargo.quantity})`, margin + 4 + doc.getTextWidth(cargoName) + 3, y + 6)
          }

          // Cargo type badge (Equipment vs Standard Cargo)
          const cargoTypeLabel = cargo.is_equipment ? 'Equipment' : 'Cargo'
          const cargoTypeBadgeX = pageWidth - margin - 45
          doc.setFillColor(cargo.is_equipment ? 59 : 99, cargo.is_equipment ? 130 : 102, cargo.is_equipment ? 246 : 241)
          doc.roundedRect(cargoTypeBadgeX, y + 2, 40, 6, 1, 1, 'F')
          doc.setFontSize(7)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(255, 255, 255)
          doc.text(cargoTypeLabel, cargoTypeBadgeX + 20, y + 6, { align: 'center' })

          // Dimensions and Weight row
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(100, 100, 100)
          const dimensionsText = `L: ${formatDimension(cargo.length_inches)} × W: ${formatDimension(cargo.width_inches)} × H: ${formatDimension(cargo.height_inches)}`
          const weightText = `Weight: ${formatWeight(cargo.weight_lbs)}`
          doc.text(dimensionsText, margin + 4, y + 14)
          doc.text(weightText, margin + 4, y + 19)

          // Oversize/Overweight badges
          let badgeX = margin + 4 + doc.getTextWidth(weightText) + 5
          if (cargo.is_oversize) {
            doc.setFillColor(255, 237, 213)
            doc.roundedRect(badgeX, y + 15, 22, 5, 1, 1, 'F')
            doc.setFontSize(6)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(194, 65, 12)
            doc.text('OVERSIZE', badgeX + 11, y + 18.5, { align: 'center' })
            badgeX += 25
          }
          if (cargo.is_overweight) {
            doc.setFillColor(254, 226, 226)
            doc.roundedRect(badgeX, y + 15, 28, 5, 1, 1, 'F')
            doc.setFontSize(6)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(185, 28, 28)
            doc.text('OVERWEIGHT', badgeX + 14, y + 18.5, { align: 'center' })
          }

          y += 26
        }
        y += 4
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
