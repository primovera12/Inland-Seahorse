import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { QuoteData, COST_FIELDS, ALL_COST_FIELDS, LocationCost, CompanySettings } from './supabase'

// Generate a unique quote number
export function generateQuoteNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `QT-${year}${month}${day}-${random}`
}

// Format currency without symbol for table
function formatCurrencyNumber(value: number | null): string {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

// Format currency with symbol
function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

// Parse hex color to RGB array
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [51, 51, 51] // default dark gray
}

// Calculate total cost from LocationCost (no base price)
export function calculateTotalCost(costs: LocationCost | null, basePrice: number | null): number {
  let total = 0

  if (costs) {
    const costFields: (keyof LocationCost)[] = [
      'loading_cost',
      'blocking_bracing_cost',
      'ncb_survey_cost',
      'local_drayage_cost',
      'chassis_cost',
      'tolls_cost',
      'escorts_cost',
      'power_wash_cost',
      'miscellaneous_costs'
    ]

    costFields.forEach(field => {
      const value = costs[field]
      if (typeof value === 'number') {
        total += value
      }
    })
  }

  return total
}

// Draw a section header with dark background
function drawSectionHeader(doc: jsPDF, text: string, x: number, y: number, width: number, height: number = 8) {
  doc.setFillColor(51, 51, 51)
  doc.rect(x, y, width, height, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(text, x + 3, y + 5.5)
}

// Draw a bordered box
function drawBox(doc: jsPDF, x: number, y: number, width: number, height: number) {
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.rect(x, y, width, height, 'S')
}

// Draw dimension icon (simple line-based icons)
function drawDimensionIcon(doc: jsPDF, type: 'length' | 'width' | 'height' | 'weight', x: number, y: number, size: number = 4) {
  doc.setDrawColor(80, 80, 80)
  doc.setLineWidth(0.3)

  if (type === 'length') {
    // Horizontal double arrow
    doc.line(x, y, x + size, y)
    doc.line(x, y - 1, x, y + 1)
    doc.line(x + size, y - 1, x + size, y + 1)
  } else if (type === 'width') {
    // Diagonal double arrow (perspective width)
    doc.line(x, y, x + size * 0.7, y - size * 0.5)
    doc.line(x - 0.5, y - 0.5, x + 0.5, y + 0.5)
    doc.line(x + size * 0.7 - 0.5, y - size * 0.5 - 0.5, x + size * 0.7 + 0.5, y - size * 0.5 + 0.5)
  } else if (type === 'height') {
    // Vertical double arrow
    doc.line(x, y, x, y - size)
    doc.line(x - 1, y, x + 1, y)
    doc.line(x - 1, y - size, x + 1, y - size)
  } else if (type === 'weight') {
    // Weight/scale icon (simplified)
    doc.setFillColor(80, 80, 80)
    doc.circle(x + size/2, y - size/2, size * 0.4, 'S')
    doc.line(x + size/2 - size * 0.3, y - size/2, x + size/2 + size * 0.3, y - size/2)
  }
}

// Detect image format from base64 string
function getImageFormat(base64: string): 'PNG' | 'JPEG' {
  // jsPDF works best with PNG and JPEG
  // For other formats, we'll treat them as PNG (since we convert SVG to PNG on upload)
  if (base64.includes('data:image/jpeg') || base64.includes('data:image/jpg')) {
    return 'JPEG'
  }
  // Default to PNG for everything else (PNG, GIF, WEBP, converted SVGs)
  return 'PNG'
}

// Validate and clean base64 image data for jsPDF
function prepareImageForPdf(base64: string): string | null {
  if (!base64 || typeof base64 !== 'string') {
    console.error('Invalid image data: not a string')
    return null
  }

  // Check if it's a valid data URL
  if (!base64.startsWith('data:image/')) {
    console.error('Invalid image data: does not start with data:image/')
    return null
  }

  return base64
}

// Draw equipment images section with dimension legend
function drawEquipmentImagesSection(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  dimensions: QuoteData['dimensions'],
  headerColor: [number, number, number]
) {
  const hasFrontImage = dimensions?.frontImageBase64
  const hasSideImage = dimensions?.sideImageBase64
  const hasDimensions = dimensions?.transportLength || dimensions?.transportWidth ||
                        dimensions?.transportHeight || dimensions?.operatingWeight

  if (!hasFrontImage && !hasSideImage && !hasDimensions) {
    return y // No section needed
  }

  // Section header
  drawSectionHeader(doc, 'Equipment Specifications', x, y, width)
  const contentY = y + 10

  // Layout: Images on left (2/3), Legend on right (1/3)
  const legendWidth = 55
  const imagesWidth = width - legendWidth - 5
  const sectionHeight = 50

  drawBox(doc, x, contentY, width, sectionHeight)

  // Draw images
  const imageAreaX = x + 3
  const imageAreaY = contentY + 3
  const imageAreaWidth = imagesWidth - 6
  const imageAreaHeight = sectionHeight - 6

  // Prepare and validate images
  const frontImageData = hasFrontImage ? prepareImageForPdf(dimensions.frontImageBase64!) : null
  const sideImageData = hasSideImage ? prepareImageForPdf(dimensions.sideImageBase64!) : null

  if (frontImageData && sideImageData) {
    // Both images - side by side
    const singleImageWidth = (imageAreaWidth - 5) / 2
    const imageHeight = imageAreaHeight

    try {
      const frontFormat = getImageFormat(frontImageData)
      doc.addImage(frontImageData, frontFormat, imageAreaX, imageAreaY, singleImageWidth, imageHeight)
      doc.setFontSize(6)
      doc.setTextColor(100, 100, 100)
      doc.text('Front View', imageAreaX + singleImageWidth / 2, imageAreaY + imageHeight + 3, { align: 'center' })
    } catch (e) {
      console.error('Error adding front image:', e)
    }

    try {
      const sideFormat = getImageFormat(sideImageData)
      doc.addImage(sideImageData, sideFormat, imageAreaX + singleImageWidth + 5, imageAreaY, singleImageWidth, imageHeight)
      doc.text('Side View', imageAreaX + singleImageWidth + 5 + singleImageWidth / 2, imageAreaY + imageHeight + 3, { align: 'center' })
    } catch (e) {
      console.error('Error adding side image:', e)
    }
  } else if (frontImageData) {
    // Only front image
    try {
      const imageHeight = imageAreaHeight
      const imageWidth = Math.min(imageAreaWidth, imageHeight * 1.5)
      const frontFormat = getImageFormat(frontImageData)
      doc.addImage(frontImageData, frontFormat, imageAreaX, imageAreaY, imageWidth, imageHeight)
      doc.setFontSize(6)
      doc.setTextColor(100, 100, 100)
      doc.text('Front View', imageAreaX + imageWidth / 2, imageAreaY + imageHeight + 3, { align: 'center' })
    } catch (e) {
      console.error('Error adding front image:', e)
    }
  } else if (sideImageData) {
    // Only side image
    try {
      const imageHeight = imageAreaHeight
      const imageWidth = Math.min(imageAreaWidth, imageHeight * 1.5)
      const sideFormat = getImageFormat(sideImageData)
      doc.addImage(sideImageData, sideFormat, imageAreaX, imageAreaY, imageWidth, imageHeight)
      doc.setFontSize(6)
      doc.setTextColor(100, 100, 100)
      doc.text('Side View', imageAreaX + imageWidth / 2, imageAreaY + imageHeight + 3, { align: 'center' })
    } catch (e) {
      console.error('Error adding side image:', e)
    }
  }

  // Draw dimension legend on the right
  const legendX = x + imagesWidth + 5
  const legendY = contentY + 5

  // Legend background
  doc.setFillColor(248, 248, 248)
  doc.rect(legendX, contentY + 2, legendWidth - 5, sectionHeight - 4, 'F')

  // Legend title
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(50, 50, 50)
  doc.text('Dimensions', legendX + 3, legendY + 3)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(60, 60, 60)

  let legendItemY = legendY + 12
  const itemSpacing = 9

  // Length
  if (dimensions?.transportLength) {
    drawDimensionIcon(doc, 'length', legendX + 5, legendItemY)
    doc.text('Length:', legendX + 12, legendItemY)
    doc.setFont('helvetica', 'bold')
    doc.text(`${dimensions.transportLength}"`, legendX + legendWidth - 10, legendItemY, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    legendItemY += itemSpacing
  }

  // Width
  if (dimensions?.transportWidth) {
    drawDimensionIcon(doc, 'width', legendX + 5, legendItemY)
    doc.text('Width:', legendX + 12, legendItemY)
    doc.setFont('helvetica', 'bold')
    doc.text(`${dimensions.transportWidth}"`, legendX + legendWidth - 10, legendItemY, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    legendItemY += itemSpacing
  }

  // Height
  if (dimensions?.transportHeight) {
    drawDimensionIcon(doc, 'height', legendX + 5, legendItemY)
    doc.text('Height:', legendX + 12, legendItemY)
    doc.setFont('helvetica', 'bold')
    doc.text(`${dimensions.transportHeight}"`, legendX + legendWidth - 10, legendItemY, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    legendItemY += itemSpacing
  }

  // Weight
  if (dimensions?.operatingWeight) {
    drawDimensionIcon(doc, 'weight', legendX + 5, legendItemY)
    doc.text('Weight:', legendX + 12, legendItemY)
    doc.setFont('helvetica', 'bold')
    const weightFormatted = new Intl.NumberFormat('en-US').format(dimensions.operatingWeight)
    doc.text(`${weightFormatted} lbs`, legendX + legendWidth - 10, legendItemY, { align: 'right' })
    doc.setFont('helvetica', 'normal')
  }

  return contentY + sectionHeight + 5
}

// Generate PDF quote matching the freight quote style
export function generateQuotePDF(quoteData: QuoteData): void {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const settings = quoteData.companySettings
  const margin = 10
  const contentWidth = pageWidth - (margin * 2)

  // Get primary color for headers
  const headerColor = settings?.primary_color ? hexToRgb(settings.primary_color) : [51, 51, 51] as [number, number, number]

  let currentY = margin

  // ========== HEADER SECTION ==========
  // Left side: Company Logo & Info
  const leftColWidth = contentWidth * 0.45
  const rightColWidth = contentWidth * 0.52
  const rightColX = margin + leftColWidth + 6

  // Company Logo - responsive sizing based on settings
  let logoHeight = 0
  if (settings?.logo_base64) {
    try {
      // Responsive logo: use configured width but cap it for the layout
      const configuredWidth = settings.logo_width || 45
      const maxLogoWidth = leftColWidth * 0.8
      const logoWidth = Math.min(configuredWidth, maxLogoWidth)
      // Calculate height based on aspect ratio (assume ~2.5:1 or use configured ratio)
      logoHeight = logoWidth * 0.4
      doc.addImage(settings.logo_base64, 'PNG', margin, currentY, logoWidth, logoHeight)
    } catch (e) {
      console.error('Error adding logo:', e)
    }
  }

  // Company Name - positioned below logo
  const companyNameY = currentY + (logoHeight > 0 ? logoHeight + 5 : 5)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  const companyName = settings?.company_name || 'Equipment Dismantling Services'
  doc.text(companyName, margin, companyNameY)

  // Company Address
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  let addressY = companyNameY + 5
  if (settings?.company_address) {
    const addressLines = settings.company_address.split(',').map(s => s.trim())
    addressLines.forEach((line, i) => {
      doc.text(line, margin, addressY + (i * 4))
    })
    addressY += addressLines.length * 4
  }

  // Right side: Quote Info Box (now includes Location)
  const quoteBoxY = currentY
  const quoteBoxHeight = 35 // Increased to fit location

  // "Dismantling Quote" title header
  doc.setFillColor(headerColor[0], headerColor[1], headerColor[2])
  doc.rect(rightColX, quoteBoxY, rightColWidth, 10, 'F')
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('Dismantling Quote', rightColX + rightColWidth / 2, quoteBoxY + 7, { align: 'center' })

  // Quote info rows
  drawBox(doc, rightColX, quoteBoxY + 10, rightColWidth, quoteBoxHeight - 10)
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)

  const infoRowHeight = 8
  let infoY = quoteBoxY + 14

  // Quote Number row
  doc.setFont('helvetica', 'bold')
  doc.text('Quote Number', rightColX + 3, infoY)
  doc.setFont('helvetica', 'normal')
  doc.text(quoteData.quoteNumber, rightColX + rightColWidth - 5, infoY, { align: 'right' })
  doc.setDrawColor(200, 200, 200)
  doc.line(rightColX, infoY + 2, rightColX + rightColWidth, infoY + 2)

  infoY += infoRowHeight
  // Date row
  doc.setFont('helvetica', 'bold')
  doc.text('Date', rightColX + 3, infoY)
  doc.setFont('helvetica', 'normal')
  doc.text(quoteData.quoteDate, rightColX + rightColWidth - 5, infoY, { align: 'right' })
  doc.setDrawColor(200, 200, 200)
  doc.line(rightColX, infoY + 2, rightColX + rightColWidth, infoY + 2)

  infoY += infoRowHeight
  // Location row (NEW - in header)
  doc.setFont('helvetica', 'bold')
  doc.text('Location', rightColX + 3, infoY)
  doc.setFont('helvetica', 'normal')
  doc.text(quoteData.location, rightColX + rightColWidth - 5, infoY, { align: 'right' })

  // Calculate position after header - use larger of left/right columns
  const leftColBottom = addressY + 5
  const rightColBottom = quoteBoxY + quoteBoxHeight + 8
  currentY = Math.max(leftColBottom, rightColBottom)

  // ========== CLIENT & BILLING INFORMATION SECTION ==========
  const hasClientInfo = quoteData.customerName || quoteData.customerCompany || quoteData.customerEmail || quoteData.customerPhone
  const hasBillingInfo = quoteData.billingAddress || quoteData.billingCity || quoteData.billingState || quoteData.billingZip || quoteData.paymentTerms

  if (hasClientInfo || hasBillingInfo) {
    // Two-column layout: Client Info (left) | Billing Info (right)
    const halfWidth = (contentWidth - 5) / 2
    const clientBoxX = margin
    const billingBoxX = margin + halfWidth + 5

    // Calculate box height based on content
    let clientLines = 1 // header
    if (quoteData.customerName) clientLines++
    if (quoteData.customerCompany) clientLines++
    if (quoteData.customerEmail) clientLines++
    if (quoteData.customerPhone) clientLines++

    let billingLines = 1 // header
    if (quoteData.billingAddress) billingLines++
    if (quoteData.billingCity || quoteData.billingState || quoteData.billingZip) billingLines++
    if (quoteData.paymentTerms) billingLines++

    const maxLines = Math.max(clientLines, billingLines, 4)
    const boxHeight = 8 + (maxLines * 5)

    // Client Info Box
    drawSectionHeader(doc, 'Client Information', clientBoxX, currentY, halfWidth)
    drawBox(doc, clientBoxX, currentY + 8, halfWidth, boxHeight - 8)

    let clientY = currentY + 14
    doc.setFontSize(9)

    if (quoteData.customerName) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(51, 51, 51)
      doc.text(quoteData.customerName, clientBoxX + 4, clientY)
      clientY += 5
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)

    if (quoteData.customerCompany) {
      doc.setTextColor(100, 100, 100)
      doc.text('Company:', clientBoxX + 4, clientY)
      doc.setTextColor(51, 51, 51)
      doc.text(quoteData.customerCompany, clientBoxX + 24, clientY)
      clientY += 5
    }

    if (quoteData.customerEmail) {
      doc.setTextColor(100, 100, 100)
      doc.text('Email:', clientBoxX + 4, clientY)
      doc.setTextColor(51, 51, 51)
      doc.text(quoteData.customerEmail, clientBoxX + 18, clientY)
      clientY += 5
    }

    if (quoteData.customerPhone) {
      doc.setTextColor(100, 100, 100)
      doc.text('Phone:', clientBoxX + 4, clientY)
      doc.setTextColor(51, 51, 51)
      doc.text(quoteData.customerPhone, clientBoxX + 18, clientY)
    }

    // Billing Info Box
    drawSectionHeader(doc, 'Billing Information', billingBoxX, currentY, halfWidth)
    drawBox(doc, billingBoxX, currentY + 8, halfWidth, boxHeight - 8)

    let billingY = currentY + 14
    doc.setFontSize(8)

    if (quoteData.billingAddress) {
      doc.setTextColor(100, 100, 100)
      doc.text('Address:', billingBoxX + 4, billingY)
      doc.setTextColor(51, 51, 51)
      doc.text(quoteData.billingAddress, billingBoxX + 20, billingY)
      billingY += 5
    }

    if (quoteData.billingCity || quoteData.billingState || quoteData.billingZip) {
      const cityStateZip = [
        quoteData.billingCity,
        quoteData.billingState,
        quoteData.billingZip
      ].filter(Boolean).join(', ')
      doc.setTextColor(51, 51, 51)
      doc.text(cityStateZip, billingBoxX + 20, billingY)
      billingY += 5
    }

    if (quoteData.paymentTerms) {
      doc.setTextColor(100, 100, 100)
      doc.text('Terms:', billingBoxX + 4, billingY)
      doc.setTextColor(51, 51, 51)
      doc.text(quoteData.paymentTerms, billingBoxX + 18, billingY)
    }

    currentY += boxHeight + 5
  }

  // ========== EQUIPMENT SECTION ==========
  drawSectionHeader(doc, 'Equipment Details', margin, currentY, contentWidth)
  const equipBoxY = currentY + 8
  drawBox(doc, margin, equipBoxY, contentWidth, 12)

  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text(`${quoteData.equipment.make} ${quoteData.equipment.model}`, margin + 3, equipBoxY + 7)

  currentY = equipBoxY + 16

  // ========== EQUIPMENT IMAGES & DIMENSIONS (if available) ==========
  if (quoteData.dimensions) {
    currentY = drawEquipmentImagesSection(doc, margin, currentY, contentWidth, quoteData.dimensions, headerColor)
  }

  // ========== QUOTE CHARGES TABLE ==========
  drawSectionHeader(doc, 'Quote Charges', margin, currentY, contentWidth)
  currentY += 8

  // Build table data
  const tableData: (string | number)[][] = []

  // Helper to get effective cost value
  const getEffectiveCost = (fieldKey: string): number | null => {
    if (quoteData.costOverrides && quoteData.costOverrides[fieldKey] !== undefined) {
      return quoteData.costOverrides[fieldKey]
    }
    if (quoteData.costs) {
      return quoteData.costs[fieldKey as keyof LocationCost] as number | null
    }
    return null
  }

  // Add location costs (only enabled ones)
  COST_FIELDS.forEach(field => {
    if (quoteData.enabledCosts && quoteData.enabledCosts[field.key] === false) {
      return
    }
    const value = getEffectiveCost(field.key)
    if (value !== null && value > 0) {
      const description = quoteData.costDescriptions?.[field.key] || ''
      tableData.push([
        field.label,
        formatCurrencyNumber(value),
        'USD',
        description
      ])
    }
  })

  // Add miscellaneous fees
  if (quoteData.miscellaneousFees && quoteData.miscellaneousFees.length > 0) {
    quoteData.miscellaneousFees.forEach(fee => {
      if (fee.title && fee.cost > 0) {
        tableData.push([
          fee.title,
          formatCurrencyNumber(fee.cost),
          'USD',
          fee.description || ''
        ])
      }
    })
  }

  // Calculate subtotal
  let subtotal = COST_FIELDS.reduce((sum, field) => {
    if (quoteData.enabledCosts && quoteData.enabledCosts[field.key] === false) {
      return sum
    }
    const value = getEffectiveCost(field.key)
    return sum + (value || 0)
  }, 0)

  // Add miscellaneous fees to subtotal
  if (quoteData.miscellaneousFees && quoteData.miscellaneousFees.length > 0) {
    quoteData.miscellaneousFees.forEach(fee => {
      if (fee.title && fee.cost > 0) {
        subtotal += fee.cost
      }
    })
  }

  const marginPercent = quoteData.marginPercentage || 0
  const marginAmount = subtotal * (marginPercent / 100)
  const total = subtotal + marginAmount

  // Add margin row if applicable
  if (marginPercent > 0) {
    tableData.push([
      `Margin (${marginPercent}%)`,
      formatCurrencyNumber(marginAmount),
      'USD',
      ''
    ])
  }

  // Generate charges table - simplified without QTY column
  autoTable(doc, {
    startY: currentY,
    head: [['Description', 'Amount', 'Currency', 'Note']],
    body: tableData,
    foot: [['TOTAL', `${formatCurrencyNumber(total)}`, 'USD', '']],
    theme: 'grid',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2
    },
    footStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 60, halign: 'left' },
      1: { cellWidth: 35, halign: 'right' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 70, halign: 'left' }
    },
    margin: { left: margin, right: margin }
  })

  // Get position after table
  let finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

  // ========== TERMS AND CONDITIONS ==========
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)

  const defaultTerms = `Terms and Conditions: This quote is valid for ${settings?.quote_validity_days || 30} days from the date of issue. All rates are subject to change without notice due to factors beyond our control. Insurance is not included unless explicitly stated. Delivery times are estimates and not guaranteed. Payment is due as per agreed terms; late payments may incur additional charges. Claims for loss or damage must be filed within 7 days of delivery. The shipper is responsible for ensuring the shipment does not contain prohibited or restricted items. Charges may be based on dimensional or actual weight, whichever is greater. Any duties, taxes, or other charges imposed by customs or other authorities are the customer's responsibility.`

  const terms = settings?.terms_and_conditions || defaultTerms
  const splitTerms = doc.splitTextToSize(terms, contentWidth)
  doc.text(splitTerms, margin, finalY)

  finalY += splitTerms.length * 3 + 10

  // ========== SIGNATURE LINE ==========
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text('Signature: _________________________________', margin, Math.min(finalY, pageHeight - 20))

  // Save PDF
  const filename = `Quote_${quoteData.quoteNumber}_${quoteData.equipment.make}_${quoteData.equipment.model}.pdf`
  doc.save(filename.replace(/\s+/g, '_'))
}

// Generate PDF as blob URL for preview
export function generateQuotePDFPreview(quoteData: QuoteData): string {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const settings = quoteData.companySettings
  const margin = 10
  const contentWidth = pageWidth - (margin * 2)

  // Get primary color for headers
  const headerColor = settings?.primary_color ? hexToRgb(settings.primary_color) : [51, 51, 51] as [number, number, number]

  let currentY = margin

  // ========== HEADER SECTION ==========
  const leftColWidth = contentWidth * 0.45
  const rightColWidth = contentWidth * 0.52
  const rightColX = margin + leftColWidth + 6

  // Company Logo - responsive sizing
  let logoHeight = 0
  if (settings?.logo_base64) {
    try {
      const configuredWidth = settings.logo_width || 45
      const maxLogoWidth = leftColWidth * 0.8
      const logoWidth = Math.min(configuredWidth, maxLogoWidth)
      logoHeight = logoWidth * 0.4
      doc.addImage(settings.logo_base64, 'PNG', margin, currentY, logoWidth, logoHeight)
    } catch (e) {
      console.error('Error adding logo:', e)
    }
  }

  // Company Name - positioned below logo
  const companyNameY = currentY + (logoHeight > 0 ? logoHeight + 5 : 5)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  const companyName = settings?.company_name || 'Equipment Dismantling Services'
  doc.text(companyName, margin, companyNameY)

  // Company Address
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  let addressY = companyNameY + 5
  if (settings?.company_address) {
    const addressLines = settings.company_address.split(',').map(s => s.trim())
    addressLines.forEach((line, i) => {
      doc.text(line, margin, addressY + (i * 4))
    })
    addressY += addressLines.length * 4
  }

  // Right side: Quote Info Box (includes Location)
  const quoteBoxY = currentY
  const quoteBoxHeight = 35

  // "Dismantling Quote" title header
  doc.setFillColor(headerColor[0], headerColor[1], headerColor[2])
  doc.rect(rightColX, quoteBoxY, rightColWidth, 10, 'F')
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('Dismantling Quote', rightColX + rightColWidth / 2, quoteBoxY + 7, { align: 'center' })

  // Quote info rows
  drawBox(doc, rightColX, quoteBoxY + 10, rightColWidth, quoteBoxHeight - 10)
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)

  const infoRowHeight = 8
  let infoY = quoteBoxY + 14

  doc.setFont('helvetica', 'bold')
  doc.text('Quote Number', rightColX + 3, infoY)
  doc.setFont('helvetica', 'normal')
  doc.text(quoteData.quoteNumber, rightColX + rightColWidth - 5, infoY, { align: 'right' })
  doc.setDrawColor(200, 200, 200)
  doc.line(rightColX, infoY + 2, rightColX + rightColWidth, infoY + 2)

  infoY += infoRowHeight
  doc.setFont('helvetica', 'bold')
  doc.text('Date', rightColX + 3, infoY)
  doc.setFont('helvetica', 'normal')
  doc.text(quoteData.quoteDate, rightColX + rightColWidth - 5, infoY, { align: 'right' })
  doc.setDrawColor(200, 200, 200)
  doc.line(rightColX, infoY + 2, rightColX + rightColWidth, infoY + 2)

  infoY += infoRowHeight
  // Location row (in header)
  doc.setFont('helvetica', 'bold')
  doc.text('Location', rightColX + 3, infoY)
  doc.setFont('helvetica', 'normal')
  doc.text(quoteData.location, rightColX + rightColWidth - 5, infoY, { align: 'right' })

  // Calculate position after header
  const leftColBottom = addressY + 5
  const rightColBottom = quoteBoxY + quoteBoxHeight + 8
  currentY = Math.max(leftColBottom, rightColBottom)

  // ========== CLIENT & BILLING INFORMATION SECTION ==========
  const hasClientInfo = quoteData.customerName || quoteData.customerCompany || quoteData.customerEmail || quoteData.customerPhone
  const hasBillingInfo = quoteData.billingAddress || quoteData.billingCity || quoteData.billingState || quoteData.billingZip || quoteData.paymentTerms

  if (hasClientInfo || hasBillingInfo) {
    // Two-column layout: Client Info (left) | Billing Info (right)
    const halfWidth = (contentWidth - 5) / 2
    const clientBoxX = margin
    const billingBoxX = margin + halfWidth + 5

    // Calculate box height based on content
    let clientLines = 1 // header
    if (quoteData.customerName) clientLines++
    if (quoteData.customerCompany) clientLines++
    if (quoteData.customerEmail) clientLines++
    if (quoteData.customerPhone) clientLines++

    let billingLines = 1 // header
    if (quoteData.billingAddress) billingLines++
    if (quoteData.billingCity || quoteData.billingState || quoteData.billingZip) billingLines++
    if (quoteData.paymentTerms) billingLines++

    const maxLines = Math.max(clientLines, billingLines, 4)
    const boxHeight = 8 + (maxLines * 5)

    // Client Info Box
    drawSectionHeader(doc, 'Client Information', clientBoxX, currentY, halfWidth)
    drawBox(doc, clientBoxX, currentY + 8, halfWidth, boxHeight - 8)

    let clientY = currentY + 14
    doc.setFontSize(9)

    if (quoteData.customerName) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(51, 51, 51)
      doc.text(quoteData.customerName, clientBoxX + 4, clientY)
      clientY += 5
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)

    if (quoteData.customerCompany) {
      doc.setTextColor(100, 100, 100)
      doc.text('Company:', clientBoxX + 4, clientY)
      doc.setTextColor(51, 51, 51)
      doc.text(quoteData.customerCompany, clientBoxX + 24, clientY)
      clientY += 5
    }

    if (quoteData.customerEmail) {
      doc.setTextColor(100, 100, 100)
      doc.text('Email:', clientBoxX + 4, clientY)
      doc.setTextColor(51, 51, 51)
      doc.text(quoteData.customerEmail, clientBoxX + 18, clientY)
      clientY += 5
    }

    if (quoteData.customerPhone) {
      doc.setTextColor(100, 100, 100)
      doc.text('Phone:', clientBoxX + 4, clientY)
      doc.setTextColor(51, 51, 51)
      doc.text(quoteData.customerPhone, clientBoxX + 18, clientY)
    }

    // Billing Info Box
    drawSectionHeader(doc, 'Billing Information', billingBoxX, currentY, halfWidth)
    drawBox(doc, billingBoxX, currentY + 8, halfWidth, boxHeight - 8)

    let billingY = currentY + 14
    doc.setFontSize(8)

    if (quoteData.billingAddress) {
      doc.setTextColor(100, 100, 100)
      doc.text('Address:', billingBoxX + 4, billingY)
      doc.setTextColor(51, 51, 51)
      doc.text(quoteData.billingAddress, billingBoxX + 20, billingY)
      billingY += 5
    }

    if (quoteData.billingCity || quoteData.billingState || quoteData.billingZip) {
      const cityStateZip = [
        quoteData.billingCity,
        quoteData.billingState,
        quoteData.billingZip
      ].filter(Boolean).join(', ')
      doc.setTextColor(51, 51, 51)
      doc.text(cityStateZip, billingBoxX + 20, billingY)
      billingY += 5
    }

    if (quoteData.paymentTerms) {
      doc.setTextColor(100, 100, 100)
      doc.text('Terms:', billingBoxX + 4, billingY)
      doc.setTextColor(51, 51, 51)
      doc.text(quoteData.paymentTerms, billingBoxX + 18, billingY)
    }

    currentY += boxHeight + 5
  }

  // ========== EQUIPMENT SECTION ==========
  drawSectionHeader(doc, 'Equipment Details', margin, currentY, contentWidth)
  const equipBoxY = currentY + 8
  drawBox(doc, margin, equipBoxY, contentWidth, 12)

  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text(`${quoteData.equipment.make} ${quoteData.equipment.model}`, margin + 3, equipBoxY + 7)

  currentY = equipBoxY + 16

  // ========== EQUIPMENT IMAGES & DIMENSIONS (if available) ==========
  if (quoteData.dimensions) {
    currentY = drawEquipmentImagesSection(doc, margin, currentY, contentWidth, quoteData.dimensions, headerColor)
  }

  // ========== QUOTE CHARGES TABLE ==========
  drawSectionHeader(doc, 'Quote Charges', margin, currentY, contentWidth)
  currentY += 8

  const tableData: (string | number)[][] = []

  const getEffectiveCost = (fieldKey: string): number | null => {
    if (quoteData.costOverrides && quoteData.costOverrides[fieldKey] !== undefined) {
      return quoteData.costOverrides[fieldKey]
    }
    if (quoteData.costs) {
      return quoteData.costs[fieldKey as keyof LocationCost] as number | null
    }
    return null
  }

  COST_FIELDS.forEach(field => {
    if (quoteData.enabledCosts && quoteData.enabledCosts[field.key] === false) {
      return
    }
    const value = getEffectiveCost(field.key)
    if (value !== null && value > 0) {
      const description = quoteData.costDescriptions?.[field.key] || ''
      tableData.push([
        field.label,
        formatCurrencyNumber(value),
        'USD',
        description
      ])
    }
  })

  if (quoteData.miscellaneousFees && quoteData.miscellaneousFees.length > 0) {
    quoteData.miscellaneousFees.forEach(fee => {
      if (fee.title && fee.cost > 0) {
        tableData.push([
          fee.title,
          formatCurrencyNumber(fee.cost),
          'USD',
          fee.description || ''
        ])
      }
    })
  }

  let subtotal = COST_FIELDS.reduce((sum, field) => {
    if (quoteData.enabledCosts && quoteData.enabledCosts[field.key] === false) {
      return sum
    }
    const value = getEffectiveCost(field.key)
    return sum + (value || 0)
  }, 0)

  if (quoteData.miscellaneousFees && quoteData.miscellaneousFees.length > 0) {
    quoteData.miscellaneousFees.forEach(fee => {
      if (fee.title && fee.cost > 0) {
        subtotal += fee.cost
      }
    })
  }

  const marginPercent = quoteData.marginPercentage || 0
  const marginAmount = subtotal * (marginPercent / 100)
  const total = subtotal + marginAmount

  if (marginPercent > 0) {
    tableData.push([
      `Margin (${marginPercent}%)`,
      formatCurrencyNumber(marginAmount),
      'USD',
      ''
    ])
  }

  // Generate charges table
  autoTable(doc, {
    startY: currentY,
    head: [['Description', 'Amount', 'Currency', 'Note']],
    body: tableData,
    foot: [['TOTAL', `${formatCurrencyNumber(total)}`, 'USD', '']],
    theme: 'grid',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2
    },
    footStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 60, halign: 'left' },
      1: { cellWidth: 35, halign: 'right' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 70, halign: 'left' }
    },
    margin: { left: margin, right: margin }
  })

  let finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)

  const defaultTerms = `Terms and Conditions: This quote is valid for ${settings?.quote_validity_days || 30} days from the date of issue. All rates are subject to change without notice due to factors beyond our control. Insurance is not included unless explicitly stated. Delivery times are estimates and not guaranteed. Payment is due as per agreed terms; late payments may incur additional charges. Claims for loss or damage must be filed within 7 days of delivery.`

  const terms = settings?.terms_and_conditions || defaultTerms
  const splitTerms = doc.splitTextToSize(terms, contentWidth)
  doc.text(splitTerms, margin, finalY)

  // Return as data URL
  return doc.output('dataurlstring')
}

// Generate multi-location quote PDF
export function generateMultiLocationQuotePDF(
  equipment: QuoteData['equipment'],
  locationCosts: Map<string, LocationCost>,
  customerName?: string,
  customerEmail?: string
): void {
  const doc = new jsPDF('landscape')
  const pageWidth = doc.internal.pageSize.getWidth()
  const quoteNumber = generateQuoteNumber()
  const quoteDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Company Header
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('EQUIPMENT DISMANTLING - MULTI-LOCATION QUOTE', pageWidth / 2, 20, { align: 'center' })

  // Horizontal line
  doc.setDrawColor(200, 200, 200)
  doc.line(20, 25, pageWidth - 20, 25)

  // Quote Info
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`Quote #: ${quoteNumber}`, 20, 35)
  doc.text(`Date: ${quoteDate}`, 20, 42)
  doc.text(`Equipment: ${equipment.make} ${equipment.model}`, 20, 49)

  if (customerName) {
    doc.text(`Customer: ${customerName}`, pageWidth - 100, 35)
  }
  if (customerEmail) {
    doc.text(`Email: ${customerEmail}`, pageWidth - 100, 42)
  }

  // Build comparison table
  const headers = ['Cost Item', ...Array.from(locationCosts.keys())]
  const rows: string[][] = []

  // Cost field rows (no base price)
  ALL_COST_FIELDS.forEach(field => {
    const row: string[] = [field.label]
    locationCosts.forEach(cost => {
      const value = cost[field.key as keyof LocationCost] as number | null
      row.push(formatCurrency(value))
    })
    rows.push(row)
  })

  // Total row
  const totalRow: string[] = ['TOTAL']
  locationCosts.forEach(cost => {
    const total = calculateTotalCost(cost, null)
    totalRow.push(formatCurrency(total))
  })
  rows.push(totalRow)

  // Generate table
  autoTable(doc, {
    startY: 58,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [66, 66, 66],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' }
    },
    didParseCell: function(data) {
      // Bold the total row
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [240, 240, 240]
      }
    },
    margin: { left: 20, right: 20 }
  })

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20
  doc.setFontSize(9)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(100, 100, 100)
  doc.text('This quote is valid for 30 days. Prices subject to equipment condition and site requirements.', pageWidth / 2, footerY, { align: 'center' })

  // Save
  const filename = `Quote_${quoteNumber}_${equipment.make}_${equipment.model}_MultiLocation.pdf`
  doc.save(filename.replace(/\s+/g, '_'))
}
