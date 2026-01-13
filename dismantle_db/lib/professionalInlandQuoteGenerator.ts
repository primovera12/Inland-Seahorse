import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { InlandQuoteFormData, InlandEquipmentType, RouteResult, supabase, CompanySettings } from './supabase'

// =============================================
// PROFESSIONAL INLAND TRANSPORTATION QUOTE PDF
// Based on Dismantle Quote Structure
// =============================================

// Billing unit labels for display
const BILLING_UNIT_LABELS: Record<string, string> = {
  flat: '',
  hour: '/hour',
  day: '/day',
  way: '/way',
  week: '/week',
  month: '/month',
  stop: '/stop',
}

interface InlandQuotePdfData {
  quoteNumber: string
  formData: InlandQuoteFormData
  totals: {
    lineHaul: number
    fuelSurcharge: number
    accessorialTotal: number
    serviceItemsTotal?: number
    subtotal: number
    marginAmount: number
    total: number
  }
  route: RouteResult | null
  equipmentType?: InlandEquipmentType
  accessorialCharges: {
    type_id: string
    type_name: string
    amount: number
    is_percentage: boolean
    billing_unit?: string
    condition_text?: string | null
    quantity?: number
  }[]
}

// Professional Color Palette
const COLORS = {
  primary: [88, 28, 135] as [number, number, number],      // Purple
  secondary: [55, 65, 81] as [number, number, number],
  accent: [147, 51, 234] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  light: [249, 250, 251] as [number, number, number],
  border: [229, 231, 235] as [number, number, number],
  text: [17, 24, 39] as [number, number, number],
  muted: [107, 114, 128] as [number, number, number]
}

// Parse hex color to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : COLORS.primary
}

// Format currency
function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

// Format date
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

// Get image format from base64 data
function getImageFormat(imageData: string): 'PNG' | 'JPEG' | 'GIF' | 'WEBP' {
  if (imageData.includes('data:image/jpeg') || imageData.includes('data:image/jpg')) {
    return 'JPEG'
  }
  if (imageData.includes('data:image/gif')) {
    return 'GIF'
  }
  if (imageData.includes('data:image/webp')) {
    return 'WEBP'
  }
  return 'PNG'
}

// Convert SVG to PNG using canvas
async function convertSvgToPng(svgData: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        // Use a reasonable size for the PDF
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
      img.onerror = () => {
        console.error('Failed to load SVG image')
        resolve(null)
      }
      img.src = svgData
    } catch (e) {
      console.error('SVG conversion error:', e)
      resolve(null)
    }
  })
}

// Prepare image data for PDF - sync version (returns null for SVG)
function prepareImageForPdf(imageData: string | null | undefined): string | null {
  if (!imageData || typeof imageData !== 'string') {
    return null
  }

  const trimmed = imageData.trim()

  // If already has data URI prefix
  if (trimmed.startsWith('data:image/')) {
    if (trimmed.includes('data:image/svg+xml')) {
      return null // SVG needs async conversion
    }
    return trimmed
  }

  // If it's a URL, can't use directly
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return null
  }

  // Raw base64 - add appropriate prefix
  const cleanBase64 = trimmed.replace(/[\s\n\r]/g, '')
  if (!/^[A-Za-z0-9+/]+=*$/.test(cleanBase64)) {
    return null
  }

  if (cleanBase64.startsWith('iVBOR')) return `data:image/png;base64,${cleanBase64}`
  if (cleanBase64.startsWith('/9j/')) return `data:image/jpeg;base64,${cleanBase64}`
  if (cleanBase64.startsWith('R0lGOD')) return `data:image/gif;base64,${cleanBase64}`
  if (cleanBase64.startsWith('UklGR')) return `data:image/webp;base64,${cleanBase64}`

  if (cleanBase64.length > 100) {
    return `data:image/png;base64,${cleanBase64}`
  }

  return null
}

// Async version that handles SVG conversion
async function prepareImageForPdfAsync(imageData: string | null | undefined): Promise<string | null> {
  if (!imageData || typeof imageData !== 'string') {
    return null
  }

  const trimmed = imageData.trim()

  // Check for SVG and convert
  if (trimmed.includes('data:image/svg+xml') || trimmed.includes('<svg')) {
    return await convertSvgToPng(trimmed)
  }

  // Use sync version for other formats
  return prepareImageForPdf(imageData)
}

// Draw section header
function drawSectionHeader(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  color: [number, number, number] = COLORS.secondary
) {
  doc.setFillColor(...color)
  doc.roundedRect(x, y, width, 8, 1, 1, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(text.toUpperCase(), x + 4, y + 5.5)
  return y + 10
}

// Draw info row
function drawInfoRow(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  labelWidth: number = 30
) {
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.muted)
  doc.text(label, x, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.text)
  doc.text(value, x + labelWidth, y)
  return y + 5
}

// Load company settings
async function loadCompanySettings(): Promise<CompanySettings | null> {
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .single()

  if (error) {
    console.error('Error loading company settings:', error)
    return null
  }
  return data
}

// Format dimensions to ft-in
function formatDimension(inches: number | null): string {
  if (!inches) return '-'
  const feet = Math.floor(inches / 12)
  const remainingInches = inches % 12
  return `${feet}' ${remainingInches}"`
}

// Main PDF Generation Function
export async function generateInlandQuotePdf(data: InlandQuotePdfData): Promise<Blob> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 12
  const contentWidth = pageWidth - (margin * 2)

  const settings = await loadCompanySettings()
  const primaryColor = hexToRgb(settings?.primary_color || '#581c87')

  let currentY = margin

  // ============================================
  // TOP SECTION: Company Info Left, Quote Info Right
  // ============================================
  const companyName = settings?.company_name || 'Transportation Services'

  const topSectionHeight = 42
  const leftBoxWidth = contentWidth * 0.48
  const rightBoxWidth = contentWidth * 0.48
  const rightBoxX = margin + leftBoxWidth + (contentWidth * 0.04)

  // LEFT BOX: Logo + Company Information
  doc.setFillColor(...COLORS.light)
  doc.roundedRect(margin, currentY, leftBoxWidth, topSectionHeight, 2, 2, 'F')

  let leftY = currentY + 4

  // Logo handling - EXACTLY MATCHING DISMANTLE QUOTE DESIGN (with SVG support)
  const logoData = settings?.logo_base64 ? await prepareImageForPdfAsync(settings.logo_base64) : null

  if (logoData) {
    try {
      // Use logo_width_percent setting (default 50% if not set) - matches dismantle quote
      const logoWidthPercent = settings?.logo_width_percent || 50
      const maxLogoWidth = (leftBoxWidth - 8) * (logoWidthPercent / 100) // Account for padding
      const maxLogoHeight = 18
      const originalWidth = settings?.logo_width || 100
      const originalHeight = settings?.logo_height || 100
      const aspectRatio = originalWidth / originalHeight

      let logoWidth: number
      let logoHeight: number

      // Calculate size maintaining aspect ratio
      if (aspectRatio > (maxLogoWidth / maxLogoHeight)) {
        logoWidth = maxLogoWidth
        logoHeight = logoWidth / aspectRatio
      } else {
        logoHeight = maxLogoHeight
        logoWidth = logoHeight * aspectRatio
      }

      doc.addImage(logoData, getImageFormat(logoData), margin + 4, leftY, logoWidth, logoHeight)
      leftY += logoHeight + 5
    } catch (e) {
      console.error('Logo error:', e)
      // Fallback to company name
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.text)
      doc.text(companyName, margin + 4, leftY + 4)
      leftY += 10
    }
  } else {
    // No logo - show company name
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.text)
    doc.text(companyName, margin + 4, leftY + 4)
    leftY += 10
  }

  // Company contact info
  if (settings?.company_address) {
    leftY = drawInfoRow(doc, 'Address:', settings.company_address, margin + 4, leftY, 22)
  }
  if (settings?.company_phone) {
    leftY = drawInfoRow(doc, 'Phone:', settings.company_phone, margin + 4, leftY, 22)
  }
  if (settings?.company_email) {
    drawInfoRow(doc, 'Email:', settings.company_email, margin + 4, leftY, 22)
  }

  // RIGHT BOX: Quote Details
  doc.setFillColor(...COLORS.light)
  doc.roundedRect(rightBoxX, currentY, rightBoxWidth, topSectionHeight, 2, 2, 'F')

  // Quote type badge
  doc.setFillColor(...primaryColor)
  doc.roundedRect(rightBoxX + 5, currentY + 3, rightBoxWidth - 10, 10, 1, 1, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('INLAND TRANSPORT QUOTE', rightBoxX + rightBoxWidth / 2, currentY + 9.5, { align: 'center' })

  let infoY = currentY + 18
  infoY = drawInfoRow(doc, 'Quote #:', data.quoteNumber, rightBoxX + 5, infoY)
  if (data.formData.work_order_number) {
    infoY = drawInfoRow(doc, 'Work Order:', data.formData.work_order_number, rightBoxX + 5, infoY)
  }
  infoY = drawInfoRow(doc, 'Date:', formatDate(new Date()), rightBoxX + 5, infoY)
  drawInfoRow(doc, 'Valid:', `${settings?.quote_validity_days || 7} Days`, rightBoxX + 5, infoY)

  currentY += topSectionHeight + 5

  // ============================================
  // ROUTE INFORMATION
  // ============================================
  currentY = drawSectionHeader(doc, 'Route', margin, currentY, contentWidth, primaryColor)

  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.3)
  doc.roundedRect(margin, currentY, contentWidth, 25, 1, 1, 'S')

  // Pickup
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.muted)
  doc.text('PICKUP', margin + 4, currentY + 5)
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.text)
  const pickupText = data.formData.pickup?.formatted_address || data.formData.pickup?.address || 'Not specified'
  const pickupLines = doc.splitTextToSize(pickupText, contentWidth / 2 - 15)
  doc.text(pickupLines, margin + 4, currentY + 10)

  // Delivery
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.muted)
  doc.text('DELIVERY', margin + contentWidth / 2 + 4, currentY + 5)
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.text)
  const dropoffText = data.formData.dropoff?.formatted_address || data.formData.dropoff?.address || 'Not specified'
  const dropoffLines = doc.splitTextToSize(dropoffText, contentWidth / 2 - 15)
  doc.text(dropoffLines, margin + contentWidth / 2 + 4, currentY + 10)

  // Distance badge
  if (data.route?.distance_miles) {
    doc.setFillColor(...COLORS.success)
    doc.roundedRect(margin + contentWidth - 45, currentY + 2, 40, 10, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(`${Math.round(data.route.distance_miles)} MILES`, margin + contentWidth - 25, currentY + 8.5, { align: 'center' })
  }

  currentY += 30

  // ============================================
  // CLIENT & BILLING INFORMATION
  // ============================================
  const boxWidth = (contentWidth - 5) / 2

  currentY = drawSectionHeader(doc, 'Client', margin, currentY, boxWidth, COLORS.secondary)
  const clientStartY = currentY

  doc.setDrawColor(...COLORS.border)
  doc.roundedRect(margin, currentY, boxWidth, 28, 1, 1, 'S')

  let cy = currentY + 6
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.text)
  doc.text(data.formData.client_name || 'N/A', margin + 4, cy)
  cy += 5

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.muted)
  if (data.formData.client_company) {
    doc.text(data.formData.client_company, margin + 4, cy)
    cy += 4
  }
  if (data.formData.client_email) {
    doc.text(data.formData.client_email, margin + 4, cy)
    cy += 4
  }
  if (data.formData.client_phone) {
    doc.text(data.formData.client_phone, margin + 4, cy)
  }

  // Billing section
  const billingX = margin + boxWidth + 5
  drawSectionHeader(doc, 'Billing', billingX, clientStartY - 10, boxWidth, COLORS.secondary)

  doc.setDrawColor(...COLORS.border)
  doc.roundedRect(billingX, currentY, boxWidth, 28, 1, 1, 'S')

  let by = currentY + 6
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.text)
  if (data.formData.billing_address) {
    doc.text(data.formData.billing_address, billingX + 4, by)
    by += 4
  }
  const cityStateZip = [data.formData.billing_city, data.formData.billing_state, data.formData.billing_zip].filter(Boolean).join(', ')
  if (cityStateZip) {
    doc.text(cityStateZip, billingX + 4, by)
    by += 4
  }
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.muted)
  doc.text(`Terms: ${data.formData.payment_terms || 'Net 30'}`, billingX + 4, by + 4)

  currentY += 33

  // ============================================
  // CARGO DETAILS (if any)
  // ============================================
  if (data.formData.cargo_items && data.formData.cargo_items.length > 0) {
    currentY = drawSectionHeader(doc, 'Cargo Details', margin, currentY, contentWidth, COLORS.secondary)

    const cargoData = data.formData.cargo_items.map((item, idx) => [
      `Load ${idx + 1}`,
      item.description || '-',
      item.cargo_type || '-',
      item.weight_lbs ? `${item.weight_lbs.toLocaleString()} lbs` : '-',
      formatDimension(item.length_inches),
      formatDimension(item.width_inches),
      formatDimension(item.height_inches),
    ])

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Description', 'Type', 'Weight', 'Length', 'Width', 'Height']],
      body: cargoData,
      theme: 'plain',
      headStyles: {
        fillColor: [...COLORS.light],
        textColor: [...COLORS.text],
        fontStyle: 'bold',
        fontSize: 7,
        cellPadding: 2
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [...COLORS.text]
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 50 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 },
      },
      margin: { left: margin, right: margin }
    })

    currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5
  }

  // ============================================
  // PRICING TABLE
  // ============================================
  currentY = drawSectionHeader(doc, 'Transportation Charges', margin, currentY, contentWidth, primaryColor)

  const tableData: string[][] = []

  // Rates (service items)
  if (data.formData.service_items && data.formData.service_items.length > 0) {
    data.formData.service_items.forEach(item => {
      if (item.price > 0) {
        const qty = item.quantity > 1 ? ` x${item.quantity}` : ''
        tableData.push([
          item.name || 'Rate',
          item.description || qty,
          formatCurrency(item.price * item.quantity)
        ])
      }
    })
  }

  // Total row
  const total = data.totals.serviceItemsTotal || data.totals.total || 0

  autoTable(doc, {
    startY: currentY,
    head: [['Description', 'Details', 'Amount']],
    body: tableData,
    foot: [[
      { content: 'TOTAL', styles: { fontStyle: 'bold' } },
      '',
      { content: formatCurrency(total), styles: { fontStyle: 'bold', fontSize: 11 } }
    ]],
    theme: 'plain',
    headStyles: {
      fillColor: [...COLORS.light],
      textColor: [...COLORS.text],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: [...COLORS.text]
    },
    footStyles: {
      fillColor: [...primaryColor],
      textColor: [255, 255, 255],
      fontSize: 10,
      cellPadding: 5
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 70 },
      2: { cellWidth: 40, halign: 'right' }
    },
    margin: { left: margin, right: margin }
  })

  currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5

  // ============================================
  // ACCESSORIAL CHARGES (if any)
  // ============================================
  if (data.accessorialCharges && data.accessorialCharges.length > 0) {
    currentY = drawSectionHeader(doc, 'Conditional Charges (If Applicable)', margin, currentY, contentWidth, COLORS.accent)

    const accData = data.accessorialCharges.map(charge => {
      const unitLabel = BILLING_UNIT_LABELS[charge.billing_unit || 'flat'] || ''
      const qty = (charge.quantity && charge.quantity > 1) ? ` x${charge.quantity}` : ''
      return [
        charge.type_name,
        charge.condition_text || `${charge.is_percentage ? charge.amount + '%' : formatCurrency(charge.amount)}${unitLabel}${qty}`,
        charge.is_percentage ? `${charge.amount}%` : formatCurrency(charge.amount)
      ]
    })

    autoTable(doc, {
      startY: currentY,
      head: [['Charge', 'Condition', 'Rate']],
      body: accData,
      theme: 'plain',
      headStyles: {
        fillColor: [...COLORS.light],
        textColor: [...COLORS.text],
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 3
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: [...COLORS.muted]
      },
      margin: { left: margin, right: margin }
    })

    currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5
  }

  // ============================================
  // NOTES
  // ============================================
  if (data.formData.customer_notes) {
    currentY = drawSectionHeader(doc, 'Notes', margin, currentY, contentWidth, COLORS.muted)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.text)
    const noteLines = doc.splitTextToSize(data.formData.customer_notes, contentWidth - 8)
    doc.text(noteLines, margin + 4, currentY + 4)
    currentY += noteLines.length * 4 + 10
  }

  // ============================================
  // FOOTER
  // ============================================
  const pageHeight = doc.internal.pageSize.getHeight()
  const footerY = pageHeight - 15

  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.3)
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.muted)

  if (settings?.footer_text) {
    const footerLines = doc.splitTextToSize(settings.footer_text, contentWidth)
    doc.text(footerLines, pageWidth / 2, footerY, { align: 'center' })
  } else {
    doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' })
  }

  return doc.output('blob')
}
