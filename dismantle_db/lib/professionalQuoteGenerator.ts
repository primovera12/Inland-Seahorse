import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { QuoteData, COST_FIELDS, LocationCost, CompanySettings, supabase } from './supabase'

// =============================================
// PROFESSIONAL QUOTE PDF GENERATOR
// Designed for OW/OS Heavy Haul Operations
// =============================================

// Color Palette - Original Grey Theme
const COLORS = {
  primary: [26, 86, 219] as [number, number, number],      // Blue for accents
  secondary: [55, 65, 81] as [number, number, number],     // Dark Gray
  accent: [234, 88, 12] as [number, number, number],       // Orange
  success: [22, 163, 74] as [number, number, number],      // Green
  light: [249, 250, 251] as [number, number, number],      // Light Gray
  border: [229, 231, 235] as [number, number, number],     // Border Gray
  text: [17, 24, 39] as [number, number, number],          // Near Black
  muted: [107, 114, 128] as [number, number, number]       // Muted Gray
}

// Parse hex color to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : COLORS.primary
}

// Format currency
function formatCurrency(value: number | null): string {
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

// Detect image format from base64 string or data URI
function getImageFormat(imageData: string): 'PNG' | 'JPEG' | 'GIF' | 'WEBP' {
  // Check data URI mime type
  if (imageData.includes('data:image/jpeg') || imageData.includes('data:image/jpg')) {
    return 'JPEG'
  }
  if (imageData.includes('data:image/gif')) {
    return 'GIF'
  }
  if (imageData.includes('data:image/webp')) {
    return 'WEBP'
  }
  if (imageData.includes('data:image/png')) {
    return 'PNG'
  }

  // Check raw base64 signatures
  const base64Part = imageData.includes(',') ? imageData.split(',')[1] : imageData
  if (base64Part) {
    if (base64Part.startsWith('/9j/')) return 'JPEG'
    if (base64Part.startsWith('iVBOR')) return 'PNG'
    if (base64Part.startsWith('R0lGOD')) return 'GIF'
    if (base64Part.startsWith('UklGR')) return 'WEBP'
    if (base64Part.startsWith('Qk')) return 'PNG'
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

// Validate and prepare image data for jsPDF - handles base64, data URIs, and various formats
function prepareImageForPdf(imageData: string | null | undefined): string | null {
  if (!imageData || typeof imageData !== 'string') {
    return null
  }

  const trimmed = imageData.trim()

  // If already has data URI prefix, validate and return
  if (trimmed.startsWith('data:image/')) {
    // SVG images - return null (need async conversion)
    if (trimmed.includes('data:image/svg+xml')) {
      return null // Will be handled by async version
    }
    // Supported formats
    if (trimmed.match(/^data:image\/(png|jpe?g|gif|webp|bmp)/i)) {
      return trimmed
    }
    return trimmed
  }

  // URL images not supported directly
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return null
  }

  // Raw base64 without prefix
  const cleanBase64 = trimmed.replace(/[\s\n\r]/g, '')
  if (!/^[A-Za-z0-9+/]+=*$/.test(cleanBase64)) {
    return null
  }

  // Detect format from base64 signatures
  if (cleanBase64.startsWith('iVBOR')) return `data:image/png;base64,${cleanBase64}`
  if (cleanBase64.startsWith('/9j/')) return `data:image/jpeg;base64,${cleanBase64}`
  if (cleanBase64.startsWith('R0lGOD')) return `data:image/gif;base64,${cleanBase64}`
  if (cleanBase64.startsWith('UklGR')) return `data:image/webp;base64,${cleanBase64}`
  if (cleanBase64.startsWith('Qk')) return `data:image/bmp;base64,${cleanBase64}`

  // Unknown format - try PNG
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

// Billing unit labels for display (matching inland quote generator)
const BILLING_UNIT_LABELS: Record<string, string> = {
  flat: '',
  hour: '/hour',
  day: '/day',
  way: '/way',
  week: '/week',
  month: '/month',
  stop: '/stop',
}

// Helper function to format dimensions from inches to ft.in
function formatDimension(inches: number | null): string {
  if (!inches) return '-'
  const feet = Math.floor(inches / 12)
  const remainingInches = inches % 12
  return remainingInches > 0 ? `${feet}'${remainingInches}"` : `${feet}'`
}

// Draw section header - matching inland quote style
function drawInlandSectionHeader(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  color: [number, number, number] = COLORS.secondary
): number {
  doc.setFillColor(...color)
  doc.roundedRect(x, y, width, 8, 1, 1, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(text.toUpperCase(), x + 4, y + 5.5)
  return y + 10
}

// Load truck/equipment types for name lookup (matching inland quote generator)
async function loadTruckTypes(): Promise<Map<string, string>> {
  try {
    const { data } = await supabase.from('inland_equipment_types').select('id, name')
    const map = new Map<string, string>()
    if (data) {
      data.forEach((truck: { id: string; name: string }) => {
        map.set(truck.id, truck.name)
      })
    }
    return map
  } catch {
    return new Map()
  }
}

// Draw watermark
function drawWatermark(doc: jsPDF, text: string) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  doc.setFontSize(60)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(200, 200, 200)

  doc.saveGraphicsState()
  doc.text(text, pageWidth / 2, pageHeight / 2, {
    align: 'center',
    angle: 45
  })
  doc.restoreGraphicsState()
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

// ============================================
// SHARED PDF BUILDER FUNCTION
// Used by all three export functions
// ============================================
interface ProcessedImages {
  logo?: string | null
  frontImage?: string | null
  sideImage?: string | null
  // Pre-processed block images keyed by block index
  blockImages?: Map<number, { front: string | null, side: string | null }>
}

function buildProfessionalQuoteDocument(
  quoteData: QuoteData,
  isDraft: boolean = false,
  processedImages: ProcessedImages = {},
  truckTypes: Map<string, string> = new Map()
): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const settings = quoteData.companySettings
  const margin = 12
  const contentWidth = pageWidth - (margin * 2)

  // Get theme color
  const primaryColor = settings?.primary_color
    ? hexToRgb(settings.primary_color)
    : COLORS.primary

  let currentY = margin

  // Draw watermark if draft
  if (isDraft) {
    drawWatermark(doc, 'DRAFT')
  }

  // ============================================
  // TOP SECTION: Company Info Box Left, Quote Info Right
  // ============================================
  const companyName = settings?.company_name || 'Equipment Dismantling Services'
  const logoData = processedImages.logo ?? (settings?.logo_base64 ? prepareImageForPdf(settings.logo_base64) : null)

  const topSectionHeight = 42
  const leftBoxWidth = contentWidth * 0.48
  const rightBoxWidth = contentWidth * 0.48
  const rightBoxX = margin + leftBoxWidth + (contentWidth * 0.04)

  // LEFT BOX: Logo + Company Information
  doc.setFillColor(...COLORS.light)
  doc.roundedRect(margin, currentY, leftBoxWidth, topSectionHeight, 2, 2, 'F')

  let leftY = currentY + 4

  // Logo at top of left box
  if (logoData) {
    try {
      const logoWidthPercent = settings?.logo_width_percent || 50
      const maxLogoWidth = (leftBoxWidth - 8) * (logoWidthPercent / 100)
      const maxLogoHeight = 18
      const originalWidth = settings?.logo_width || 100
      const originalHeight = settings?.logo_height || 100
      const aspectRatio = originalWidth / originalHeight

      let logoWidth: number
      let logoHeight: number

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
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.text)
      doc.text(companyName, margin + 4, leftY + 4)
      leftY += 10
    }
  } else {
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
    leftY = drawInfoRow(doc, 'Email:', settings.company_email, margin + 4, leftY, 22)
  }
  if (settings?.company_website) {
    drawInfoRow(doc, 'Website:', settings.company_website, margin + 4, leftY, 22)
  }

  // RIGHT BOX: Quote Details
  doc.setFillColor(...COLORS.light)
  doc.roundedRect(rightBoxX, currentY, rightBoxWidth, topSectionHeight, 2, 2, 'F')

  let infoY = currentY + 6
  infoY = drawInfoRow(doc, 'Quote #:', quoteData.quoteNumber, rightBoxX + 5, infoY)
  infoY = drawInfoRow(doc, 'Date:', quoteData.quoteDate, rightBoxX + 5, infoY)
  infoY = drawInfoRow(doc, 'Location:', quoteData.location, rightBoxX + 5, infoY)
  infoY = drawInfoRow(doc, 'Equipment:', `${quoteData.equipment.make} ${quoteData.equipment.model}`, rightBoxX + 5, infoY)

  currentY += topSectionHeight + 5

  // ============================================
  // CLIENT INFORMATION (Full Width - No Billing)
  // ============================================
  currentY = drawSectionHeader(doc, 'Client Information', margin, currentY, contentWidth, primaryColor)

  // Calculate height based on whether we have billing address
  const hasBillingAddress = quoteData.billingAddress || quoteData.billingCity || quoteData.billingState || quoteData.billingZip
  const clientBoxHeight = hasBillingAddress ? 32 : 22

  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.3)
  doc.roundedRect(margin, currentY, contentWidth, clientBoxHeight, 1, 1, 'S')

  let clientY = currentY + 5
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.text)

  // Client info in a row layout
  const clientColWidth = contentWidth / 4

  if (quoteData.customerName) {
    doc.text(quoteData.customerName, margin + 4, clientY)
  }

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.muted)

  if (quoteData.customerCompany) {
    doc.text(quoteData.customerCompany, margin + 4, clientY + 4)
  }
  if (quoteData.customerEmail) {
    doc.text(quoteData.customerEmail, margin + clientColWidth + 10, clientY)
  }
  if (quoteData.customerPhone) {
    doc.text(quoteData.customerPhone, margin + clientColWidth + 10, clientY + 4)
  }

  // Billing/Office Address
  if (hasBillingAddress) {
    const addressParts = []
    if (quoteData.billingAddress) addressParts.push(quoteData.billingAddress)
    const cityStateZip = [quoteData.billingCity, quoteData.billingState, quoteData.billingZip].filter(Boolean).join(', ')
    if (cityStateZip) addressParts.push(cityStateZip)

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.muted)
    doc.text('Address:', margin + clientColWidth * 2 + 10, clientY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.text)
    addressParts.forEach((part, idx) => {
      doc.text(part, margin + clientColWidth * 2 + 10, clientY + 4 + (idx * 4))
    })
  }

  currentY += clientBoxHeight + 6

  // ============================================
  // EQUIPMENT SPECIFICATIONS (dimensions + images)
  // ============================================
  const frontImageData = processedImages.frontImage ?? (quoteData.dimensions?.frontImageBase64 ? prepareImageForPdf(quoteData.dimensions.frontImageBase64) : null)
  const sideImageData = processedImages.sideImage ?? (quoteData.dimensions?.sideImageBase64 ? prepareImageForPdf(quoteData.dimensions.sideImageBase64) : null)
  const hasDimensions = quoteData.dimensions?.transportLength || quoteData.dimensions?.transportWidth ||
                        quoteData.dimensions?.transportHeight || quoteData.dimensions?.operatingWeight

  if (frontImageData || sideImageData || hasDimensions) {
    currentY = drawSectionHeader(doc, 'Equipment Specifications', margin, currentY, contentWidth, COLORS.secondary)

    const hasImages = frontImageData || sideImageData
    const sectionHeight = hasImages ? 45 : 18

    doc.setFillColor(...COLORS.light)
    doc.roundedRect(margin, currentY, contentWidth, sectionHeight, 1, 1, 'F')

    // Draw images if available
    if (hasImages) {
      const imageAreaX = margin + 4
      const imageAreaY = currentY + 3
      const imageAreaHeight = 32

      if (frontImageData && sideImageData) {
        const singleImageWidth = 50
        try {
          doc.addImage(frontImageData, getImageFormat(frontImageData), imageAreaX, imageAreaY, singleImageWidth, imageAreaHeight)
          doc.setFontSize(6)
          doc.setTextColor(...COLORS.muted)
          doc.text('Front View', imageAreaX + singleImageWidth / 2, imageAreaY + imageAreaHeight + 3, { align: 'center' })
        } catch (e) {
          console.error('Error adding front image:', e)
        }
        try {
          doc.addImage(sideImageData, getImageFormat(sideImageData), imageAreaX + singleImageWidth + 5, imageAreaY, singleImageWidth, imageAreaHeight)
          doc.text('Side View', imageAreaX + singleImageWidth + 5 + singleImageWidth / 2, imageAreaY + imageAreaHeight + 3, { align: 'center' })
        } catch (e) {
          console.error('Error adding side image:', e)
        }
      } else if (frontImageData) {
        try {
          doc.addImage(frontImageData, getImageFormat(frontImageData), imageAreaX, imageAreaY, 60, imageAreaHeight)
          doc.setFontSize(6)
          doc.setTextColor(...COLORS.muted)
          doc.text('Front View', imageAreaX + 30, imageAreaY + imageAreaHeight + 3, { align: 'center' })
        } catch (e) {
          console.error('Error adding front image:', e)
        }
      } else if (sideImageData) {
        try {
          doc.addImage(sideImageData, getImageFormat(sideImageData), imageAreaX, imageAreaY, 60, imageAreaHeight)
          doc.setFontSize(6)
          doc.setTextColor(...COLORS.muted)
          doc.text('Side View', imageAreaX + 30, imageAreaY + imageAreaHeight + 3, { align: 'center' })
        } catch (e) {
          console.error('Error adding side image:', e)
        }
      }

      // Draw dimensions on the right side
      if (hasDimensions) {
        const dimX = margin + 120
        const dimY = currentY + 8

        const specs = [
          { label: 'Length', value: quoteData.dimensions?.transportLength ? `${quoteData.dimensions.transportLength}"` : '-' },
          { label: 'Width', value: quoteData.dimensions?.transportWidth ? `${quoteData.dimensions.transportWidth}"` : '-' },
          { label: 'Height', value: quoteData.dimensions?.transportHeight ? `${quoteData.dimensions.transportHeight}"` : '-' },
          { label: 'Weight', value: quoteData.dimensions?.operatingWeight
            ? `${new Intl.NumberFormat().format(quoteData.dimensions.operatingWeight)} lbs` : '-' }
        ]

        specs.forEach((spec, i) => {
          const specY = dimY + (i * 10)
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...COLORS.muted)
          doc.text(spec.label + ':', dimX, specY)

          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...COLORS.text)
          doc.text(spec.value, dimX + 25, specY)
        })
      }
    } else {
      // No images - just show dimensions in a row
      const dimY = currentY + 8
      const dimSpacing = contentWidth / 4

      const specs = [
        { label: 'Length', value: quoteData.dimensions?.transportLength ? `${quoteData.dimensions.transportLength}"` : '-' },
        { label: 'Width', value: quoteData.dimensions?.transportWidth ? `${quoteData.dimensions.transportWidth}"` : '-' },
        { label: 'Height', value: quoteData.dimensions?.transportHeight ? `${quoteData.dimensions.transportHeight}"` : '-' },
        { label: 'Weight', value: quoteData.dimensions?.operatingWeight
          ? `${new Intl.NumberFormat().format(quoteData.dimensions.operatingWeight)} lbs` : '-' }
      ]

      specs.forEach((spec, i) => {
        const specX = margin + (i * dimSpacing) + 10
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...COLORS.muted)
        doc.text(spec.label, specX, dimY)

        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COLORS.text)
        doc.text(spec.value, specX, dimY + 6)
      })
    }

    currentY += sectionHeight + 4
  }

  // ============================================
  // MULTI-EQUIPMENT BLOCKS (if applicable)
  // ============================================
  const hasEquipmentBlocks = quoteData.equipmentBlocks && quoteData.equipmentBlocks.length > 0

  if (hasEquipmentBlocks) {
    // Render each equipment block
    quoteData.equipmentBlocks!.forEach((block, blockIndex) => {
      // Check if we need a new page (more space needed for images/dimensions)
      if (currentY + 100 > pageHeight - 30) {
        doc.addPage()
        currentY = margin
        if (isDraft) drawWatermark(doc, 'DRAFT')
      }

      // Equipment block header
      const blockTitle = `${block.make} ${block.model}${block.quantity > 1 ? ` (×${block.quantity})` : ''}`
      currentY = drawSectionHeader(doc, blockTitle, margin, currentY, contentWidth, COLORS.secondary)

      // Location
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...COLORS.muted)
      doc.text(`Location: ${block.location || 'N/A'}`, margin + 4, currentY + 3)
      currentY += 8

      // Equipment specifications (dimensions + images) for this block
      // Use pre-processed images if available (from async function), otherwise process sync
      const preProcessedBlockImages = processedImages.blockImages?.get(blockIndex)
      const blockFrontImage = preProcessedBlockImages?.front ??
        (block.frontImageBase64 ? prepareImageForPdf(block.frontImageBase64) : null) ??
        (block.dimensions?.frontImageBase64 ? prepareImageForPdf(block.dimensions.frontImageBase64) : null)
      const blockSideImage = preProcessedBlockImages?.side ??
        (block.sideImageBase64 ? prepareImageForPdf(block.sideImageBase64) : null) ??
        (block.dimensions?.sideImageBase64 ? prepareImageForPdf(block.dimensions.sideImageBase64) : null)
      const blockHasDimensions = block.dimensions?.transportLength || block.dimensions?.transportWidth ||
                                  block.dimensions?.transportHeight || block.dimensions?.operatingWeight

      if (blockFrontImage || blockSideImage || blockHasDimensions) {
        const hasBlockImages = blockFrontImage || blockSideImage
        const specSectionHeight = hasBlockImages ? 38 : 16

        doc.setFillColor(...COLORS.light)
        doc.roundedRect(margin, currentY, contentWidth, specSectionHeight, 1, 1, 'F')

        // Draw images if available
        if (hasBlockImages) {
          const imageAreaX = margin + 4
          const imageAreaY = currentY + 2
          const imageAreaHeight = 26

          if (blockFrontImage && blockSideImage) {
            const singleImageWidth = 40
            try {
              doc.addImage(blockFrontImage, getImageFormat(blockFrontImage), imageAreaX, imageAreaY, singleImageWidth, imageAreaHeight)
              doc.setFontSize(5)
              doc.setTextColor(...COLORS.muted)
              doc.text('Front', imageAreaX + singleImageWidth / 2, imageAreaY + imageAreaHeight + 2, { align: 'center' })
            } catch (e) {
              console.error('Error adding front image for block:', e)
            }
            try {
              doc.addImage(blockSideImage, getImageFormat(blockSideImage), imageAreaX + singleImageWidth + 4, imageAreaY, singleImageWidth, imageAreaHeight)
              doc.text('Side', imageAreaX + singleImageWidth + 4 + singleImageWidth / 2, imageAreaY + imageAreaHeight + 2, { align: 'center' })
            } catch (e) {
              console.error('Error adding side image for block:', e)
            }
          } else if (blockFrontImage) {
            try {
              doc.addImage(blockFrontImage, getImageFormat(blockFrontImage), imageAreaX, imageAreaY, 50, imageAreaHeight)
              doc.setFontSize(5)
              doc.setTextColor(...COLORS.muted)
              doc.text('Front', imageAreaX + 25, imageAreaY + imageAreaHeight + 2, { align: 'center' })
            } catch (e) {
              console.error('Error adding front image for block:', e)
            }
          } else if (blockSideImage) {
            try {
              doc.addImage(blockSideImage, getImageFormat(blockSideImage), imageAreaX, imageAreaY, 50, imageAreaHeight)
              doc.setFontSize(5)
              doc.setTextColor(...COLORS.muted)
              doc.text('Side', imageAreaX + 25, imageAreaY + imageAreaHeight + 2, { align: 'center' })
            } catch (e) {
              console.error('Error adding side image for block:', e)
            }
          }

          // Draw dimensions on the right side of images
          if (blockHasDimensions) {
            const dimX = margin + 100
            const dimY = currentY + 6

            const specs = [
              { label: 'L', value: block.dimensions?.transportLength ? `${block.dimensions.transportLength}"` : '-' },
              { label: 'W', value: block.dimensions?.transportWidth ? `${block.dimensions.transportWidth}"` : '-' },
              { label: 'H', value: block.dimensions?.transportHeight ? `${block.dimensions.transportHeight}"` : '-' },
              { label: 'Wt', value: block.dimensions?.operatingWeight
                ? `${new Intl.NumberFormat().format(block.dimensions.operatingWeight)} lbs` : '-' }
            ]

            specs.forEach((spec, i) => {
              const specY = dimY + (i * 7)
              doc.setFontSize(6)
              doc.setFont('helvetica', 'normal')
              doc.setTextColor(...COLORS.muted)
              doc.text(spec.label + ':', dimX, specY)

              doc.setFontSize(7)
              doc.setFont('helvetica', 'bold')
              doc.setTextColor(...COLORS.text)
              doc.text(spec.value, dimX + 12, specY)
            })
          }
        } else {
          // No images - just show dimensions in a row
          const dimY = currentY + 6
          const dimSpacing = contentWidth / 4

          const specs = [
            { label: 'Length', value: block.dimensions?.transportLength ? `${block.dimensions.transportLength}"` : '-' },
            { label: 'Width', value: block.dimensions?.transportWidth ? `${block.dimensions.transportWidth}"` : '-' },
            { label: 'Height', value: block.dimensions?.transportHeight ? `${block.dimensions.transportHeight}"` : '-' },
            { label: 'Weight', value: block.dimensions?.operatingWeight
              ? `${new Intl.NumberFormat().format(block.dimensions.operatingWeight)} lbs` : '-' }
          ]

          specs.forEach((spec, i) => {
            const specX = margin + (i * dimSpacing) + 8
            doc.setFontSize(6)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(...COLORS.muted)
            doc.text(spec.label, specX, dimY)

            doc.setFontSize(8)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(...COLORS.text)
            doc.text(spec.value, specX, dimY + 5)
          })
        }

        currentY += specSectionHeight + 4
      }

      // Build block table data
      const blockTableData: (string | number)[][] = []

      const getBlockEffectiveCost = (fieldKey: string): number | null => {
        if (block.costOverrides && block.costOverrides[fieldKey] !== undefined) {
          return block.costOverrides[fieldKey]
        }
        if (block.costs) {
          return block.costs[fieldKey as keyof LocationCost] as number | null
        }
        return null
      }

      // Add location costs for this block
      COST_FIELDS.forEach(field => {
        if (block.enabledCosts && block.enabledCosts[field.key] === false) return
        const value = getBlockEffectiveCost(field.key)
        if (value !== null && value > 0) {
          const description = block.costDescriptions?.[field.key] || ''
          blockTableData.push([field.label, description, formatCurrency(value)])
        }
      })

      // Add miscellaneous fees for this block
      if (block.miscellaneousFees?.length) {
        block.miscellaneousFees.forEach(fee => {
          if (fee.title && fee.cost > 0) {
            blockTableData.push([fee.title, fee.description || '', formatCurrency(fee.cost)])
          }
        })
      }

      // Calculate block subtotal
      let blockSubtotal = COST_FIELDS.reduce((sum, field) => {
        if (block.enabledCosts && block.enabledCosts[field.key] === false) return sum
        return sum + (getBlockEffectiveCost(field.key) || 0)
      }, 0)
      if (block.miscellaneousFees?.length) {
        block.miscellaneousFees.forEach(fee => {
          if (fee.title && fee.cost > 0) blockSubtotal += fee.cost
        })
      }
      // Multiply by quantity
      blockSubtotal *= block.quantity

      // Render block table
      if (blockTableData.length > 0) {
        autoTable(doc, {
          startY: currentY,
          head: [['Service', 'Details', 'Amount']],
          body: blockTableData,
          theme: 'plain',
          headStyles: {
            fillColor: [...COLORS.light],
            textColor: [...COLORS.text],
            fontStyle: 'bold',
            fontSize: 7,
            cellPadding: 2
          },
          bodyStyles: {
            fontSize: 7,
            cellPadding: 2,
            textColor: [...COLORS.text]
          },
          columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold' },
            1: { cellWidth: 'auto', textColor: [...COLORS.muted] },
            2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
          },
          margin: { left: margin, right: margin },
        })
        currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2
      }

      // Block subtotal row
      doc.setFillColor(245, 245, 245)
      doc.roundedRect(margin, currentY, contentWidth, 8, 1, 1, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.text)
      doc.text(`Subtotal${block.quantity > 1 ? ` (×${block.quantity})` : ''}:`, margin + 4, currentY + 5.5)
      doc.text(formatCurrency(blockSubtotal), margin + contentWidth - 4, currentY + 5.5, { align: 'right' })
      currentY += 12
    })

    // Multi-equipment summary
    currentY += 4
    currentY = drawSectionHeader(doc, 'Quote Summary', margin, currentY, contentWidth, primaryColor)
  }

  // ============================================
  // PRICING TABLE (for single equipment or summary)
  // ============================================
  if (!hasEquipmentBlocks) {
    currentY = drawSectionHeader(doc, 'Pricing Breakdown', margin, currentY, contentWidth, primaryColor)
  }

  // Build table data
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

  // For multi-equipment, show equipment block totals in summary
  if (hasEquipmentBlocks) {
    quoteData.equipmentBlocks!.forEach(block => {
      const getBlockCost = (key: string): number | null => {
        if (block.costOverrides?.[key] !== undefined) return block.costOverrides[key]
        if (block.costs) return block.costs[key as keyof LocationCost] as number | null
        return null
      }
      let blockTotal = COST_FIELDS.reduce((sum, field) => {
        if (block.enabledCosts?.[field.key] === false) return sum
        return sum + (getBlockCost(field.key) || 0)
      }, 0)
      if (block.miscellaneousFees?.length) {
        block.miscellaneousFees.forEach(fee => {
          if (fee.title && fee.cost > 0) blockTotal += fee.cost
        })
      }
      blockTotal *= block.quantity
      tableData.push([
        `${block.make} ${block.model}${block.quantity > 1 ? ` (×${block.quantity})` : ''}`,
        block.location || '',
        formatCurrency(blockTotal)
      ])
    })
  } else {
    // Single equipment - show individual costs
    // Add location costs
    COST_FIELDS.forEach(field => {
      if (quoteData.enabledCosts && quoteData.enabledCosts[field.key] === false) return
      const value = getEffectiveCost(field.key)
      if (value !== null && value > 0) {
        const description = quoteData.costDescriptions?.[field.key] || ''
        tableData.push([field.label, description, formatCurrency(value)])
      }
    })

    // Add miscellaneous fees
    if (quoteData.miscellaneousFees?.length) {
      quoteData.miscellaneousFees.forEach(fee => {
        if (fee.title && fee.cost > 0) {
          tableData.push([fee.title, fee.description || '', formatCurrency(fee.cost)])
        }
      })
    }
  }

  // Inland transportation data - will be rendered as separate styled section after main table
  const inland = quoteData.inlandTransportation
  const hasDestinationBlocks = inland?.destination_blocks && inland.destination_blocks.length > 0
  const hasLoadBlocks = inland?.load_blocks && inland.load_blocks.length > 0
  const hasInlandData = inland && (
    (inland.totals && inland.totals.total > 0) ||
    hasDestinationBlocks ||
    hasLoadBlocks ||
    inland.route ||
    (inland.cargoItems && inland.cargoItems.length > 0) ||
    (inland.serviceItems && inland.serviceItems.length > 0) ||
    (inland.accessorialCharges && inland.accessorialCharges.length > 0) ||
    inland.pickup ||
    inland.dropoff
  )
  // Note: Inland transportation is rendered as a separate styled section below, not in this table

  // Calculate totals
  let dismantlingSubtotal = 0

  if (hasEquipmentBlocks) {
    // Sum all equipment block totals
    quoteData.equipmentBlocks!.forEach(block => {
      const getBlockCost = (key: string): number | null => {
        if (block.costOverrides?.[key] !== undefined) return block.costOverrides[key]
        if (block.costs) return block.costs[key as keyof LocationCost] as number | null
        return null
      }
      let blockTotal = COST_FIELDS.reduce((sum, field) => {
        if (block.enabledCosts?.[field.key] === false) return sum
        return sum + (getBlockCost(field.key) || 0)
      }, 0)
      if (block.miscellaneousFees?.length) {
        block.miscellaneousFees.forEach(fee => {
          if (fee.title && fee.cost > 0) blockTotal += fee.cost
        })
      }
      dismantlingSubtotal += blockTotal * block.quantity
    })
  } else {
    // Single equipment calculation
    dismantlingSubtotal = COST_FIELDS.reduce((sum, field) => {
      if (quoteData.enabledCosts && quoteData.enabledCosts[field.key] === false) return sum
      return sum + (getEffectiveCost(field.key) || 0)
    }, 0)

    if (quoteData.miscellaneousFees?.length) {
      quoteData.miscellaneousFees.forEach(fee => {
        if (fee.title && fee.cost > 0) dismantlingSubtotal += fee.cost
      })
    }
  }

  // Calculate inland total - include destination blocks or load blocks
  // NOTE: Accessorials are NOT included in totals - they are conditional/informational only
  let inlandTotal = 0
  if (hasDestinationBlocks) {
    // Calculate from destination blocks (services only, NOT accessorials)
    inlandTotal = inland.destination_blocks!.reduce((destSum, dest) => {
      const destLoadTotal = dest.load_blocks?.reduce((blockSum, block) => {
        const serviceTotal = block.service_items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0
        // Accessorials are NOT included - they are "if applicable" conditional fees
        return blockSum + serviceTotal
      }, 0) || 0
      return destSum + destLoadTotal
    }, 0)
  } else if (hasLoadBlocks) {
    // Calculate from flat load blocks (services only, NOT accessorials)
    inlandTotal = inland.load_blocks!.reduce((blockSum, block) => {
      const serviceTotal = block.service_items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0
      // Accessorials are NOT included - they are "if applicable" conditional fees
      return blockSum + serviceTotal
    }, 0)
  } else {
    // Legacy flat structure - use service items total
    inlandTotal = inland?.serviceItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0
  }
  const subtotal = dismantlingSubtotal + inlandTotal

  const marginPercent = quoteData.marginPercentage || 0
  const marginAmount = subtotal * (marginPercent / 100)
  const total = subtotal + marginAmount

  // Generate table
  autoTable(doc, {
    startY: currentY,
    head: [['Service', 'Details', 'Amount']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [...COLORS.light],
      textColor: [...COLORS.text],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [...COLORS.text]
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 'auto', textColor: [...COLORS.muted] },
      2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [252, 252, 253]
    },
    margin: { left: margin, right: margin },
    didDrawCell: (data) => {
      if (data.section === 'body') {
        doc.setDrawColor(...COLORS.border)
        doc.setLineWidth(0.2)
        doc.line(data.cell.x, data.cell.y + data.cell.height,
                 data.cell.x + data.cell.width, data.cell.y + data.cell.height)
      }
    }
  })

  currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3

  // ============================================
  // INLAND TRANSPORTATION SECTION (Styled like main inland quote PDF)
  // ============================================
  if (hasInlandData) {
    // Add some spacing before inland section
    currentY += 8

    // Check if we need a new page for inland section
    if (currentY + 80 > pageHeight - 30) {
      doc.addPage()
      currentY = margin
    }

    // Main inland transportation header
    doc.setFillColor(...primaryColor)
    doc.roundedRect(margin, currentY, contentWidth, 10, 1, 1, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('INLAND TRANSPORTATION', margin + 4, currentY + 7)
    currentY += 14

    // Helper function to draw route section with colored dots
    const drawRouteSection = (
      pickup: typeof inland.pickup,
      dropoff: typeof inland.dropoff,
      route: typeof inland.route,
      mapImageBase64?: string | null
    ) => {
      const hasMap = mapImageBase64 && mapImageBase64.length > 100
      const hasRoute = route && route.distance_miles > 0
      const routeSectionHeight = hasMap ? 65 : (hasRoute ? 45 : 30)

      doc.setFillColor(...COLORS.light)
      doc.roundedRect(margin, currentY, contentWidth, routeSectionHeight, 1, 1, 'F')

      // If we have a map image, show it on the right side
      if (hasMap) {
        try {
          const maxMapWidth = 75
          const maxMapHeight = 50
          const mapAspectRatio = 1.6
          let mapWidth = maxMapWidth
          let mapHeight = maxMapWidth / mapAspectRatio

          if (mapHeight > maxMapHeight) {
            mapHeight = maxMapHeight
            mapWidth = maxMapHeight * mapAspectRatio
          }

          const mapX = pageWidth - margin - mapWidth - 3
          const mapY = currentY + 5

          doc.addImage(mapImageBase64!, 'PNG', mapX, mapY, mapWidth, mapHeight, undefined, 'FAST')
        } catch (e) {
          console.error('Failed to add map image:', e)
        }
      }

      const addressWidth = hasMap ? contentWidth - 80 : contentWidth - 10

      // Pickup with green dot
      doc.setFillColor(34, 197, 94)
      doc.circle(margin + 6, currentY + 8, 2.5, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.text)
      doc.text('PICKUP', margin + 12, currentY + 9)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...COLORS.muted)
      if (pickup && pickup.formatted_address) {
        const pickupLines = doc.splitTextToSize(pickup.formatted_address, addressWidth)
        doc.text(pickupLines, margin + 12, currentY + 14)
      }

      // Dropoff with red dot
      const dropoffStartY = hasMap ? currentY + 26 : currentY + 18
      doc.setFillColor(239, 68, 68)
      doc.circle(margin + 6, dropoffStartY, 2.5, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.text)
      doc.text('DELIVERY', margin + 12, dropoffStartY + 1)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...COLORS.muted)
      if (dropoff && dropoff.formatted_address) {
        const dropoffLines = doc.splitTextToSize(dropoff.formatted_address, addressWidth)
        doc.text(dropoffLines, margin + 12, dropoffStartY + 6)
      }

      // Distance with blue dot
      if (route) {
        const distanceStartY = hasMap ? dropoffStartY + 18 : dropoffStartY + 12
        doc.setFillColor(59, 130, 246)
        doc.circle(margin + 6, distanceStartY, 2.5, 'F')
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COLORS.text)
        doc.text('DISTANCE', margin + 12, distanceStartY + 1)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(...COLORS.muted)
        const durationText = route.duration_minutes
          ? ` (${Math.floor(route.duration_minutes / 60)}h ${route.duration_minutes % 60}m)`
          : ''
        doc.text(`${route.distance_miles.toFixed(0)} miles${durationText}`, margin + 12, distanceStartY + 6)
      }

      currentY += routeSectionHeight + 5
    }

    // Helper function to draw load blocks with cargo tables
    const drawLoadBlocks = (loadBlocks: typeof inland.load_blocks) => {
      if (!loadBlocks || loadBlocks.length === 0) return

      for (let blockIndex = 0; blockIndex < loadBlocks.length; blockIndex++) {
        const block = loadBlocks[blockIndex]
        const blockNumber = blockIndex + 1
        const isMultipleBlocks = loadBlocks.length > 1

        if (currentY + 25 > pageHeight - 20) {
          doc.addPage()
          currentY = margin
        }

        const blockTitle = isMultipleBlocks ? `Load ${blockNumber}` : 'Load Details'
        currentY = drawInlandSectionHeader(doc, blockTitle, margin, currentY, contentWidth, primaryColor)

        // Truck type if specified (matching inland quote generator)
        if (block.truck_type_id) {
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...COLORS.text)
          const truckTypeName = truckTypes.get(block.truck_type_id) || 'Unknown Truck Type'
          doc.text(`Truck Type: ${truckTypeName}`, margin + 4, currentY + 2)
          currentY += 6
        }

        // Cargo Items table for this block
        if (block.cargo_items && block.cargo_items.length > 0) {
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...COLORS.muted)
          doc.text('Cargo:', margin + 4, currentY + 2)
          currentY += 5

          const cargoTableData = block.cargo_items.map((item, index) => {
            const dimensions = [
              item.length_inches ? `L: ${formatDimension(item.length_inches)}` : '',
              item.width_inches ? `W: ${formatDimension(item.width_inches)}` : '',
              item.height_inches ? `H: ${formatDimension(item.height_inches)}` : '',
            ].filter(Boolean).join(' ')

            return [
              `${index + 1}`,
              item.description || 'N/A',
              item.cargo_type || 'General Freight',
              item.quantity.toString(),
              item.weight_lbs ? `${item.weight_lbs.toLocaleString()} lbs` : '-',
              dimensions || '-',
            ]
          })

          autoTable(doc, {
            startY: currentY,
            head: [['#', 'Description', 'Type', 'Qty', 'Weight', 'Dimensions']],
            body: cargoTableData,
            margin: { left: margin, right: margin },
            theme: 'plain',
            headStyles: {
              fillColor: [...COLORS.light],
              textColor: [...COLORS.text],
              fontStyle: 'bold',
              fontSize: 7,
              cellPadding: 2
            },
            bodyStyles: {
              fontSize: 7,
              cellPadding: 2,
              textColor: [...COLORS.text]
            },
            columnStyles: {
              0: { cellWidth: 8 },
              1: { cellWidth: 'auto' },
              2: { cellWidth: 25 },
              3: { cellWidth: 10 },
              4: { cellWidth: 22 },
              5: { cellWidth: 35 },
            },
            alternateRowStyles: {
              fillColor: [252, 252, 253]
            },
          })

          currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3

          // Cargo images (if any)
          const cargoWithImages = block.cargo_items.filter(item => item.image_base64)
          if (cargoWithImages.length > 0) {
            doc.setFontSize(7)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(...COLORS.muted)
            doc.text('Cargo Images:', margin + 4, currentY + 2)
            currentY += 5

            const imgMaxWidth = (contentWidth - 20) / 3
            const imgMaxHeight = 35
            let imgX = margin + 4
            let imagesInRow = 0

            for (const cargo of cargoWithImages) {
              if (imagesInRow >= 3) {
                imgX = margin + 4
                currentY += imgMaxHeight + 8
                imagesInRow = 0
              }

              if (currentY + imgMaxHeight + 10 > pageHeight - 20) {
                doc.addPage()
                currentY = margin
                imgX = margin + 4
                imagesInRow = 0
              }

              try {
                const preparedImage = prepareImageForPdf(cargo.image_base64)
                if (preparedImage) {
                  doc.addImage(preparedImage, getImageFormat(preparedImage), imgX, currentY, imgMaxWidth - 5, imgMaxHeight, undefined, 'FAST')
                  doc.setFontSize(6)
                  doc.setFont('helvetica', 'normal')
                  doc.setTextColor(...COLORS.muted)
                  const label = cargo.description ? cargo.description.substring(0, 20) : 'Cargo'
                  doc.text(label, imgX + (imgMaxWidth - 5) / 2, currentY + imgMaxHeight + 3, { align: 'center' })
                }
              } catch (err) {
                console.error('Failed to add cargo image:', err)
              }

              imgX += imgMaxWidth
              imagesInRow++
            }

            currentY += imgMaxHeight + 8
          }
        }

        // Load Image for this block
        if (block.load_image_base64) {
          if (currentY + 50 > pageHeight - 20) {
            doc.addPage()
            currentY = margin
          }

          doc.setFontSize(7)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...COLORS.muted)
          doc.text('Load Image:', margin + 4, currentY + 2)
          currentY += 5

          try {
            const preparedImage = prepareImageForPdf(block.load_image_base64)
            if (preparedImage) {
              const maxImgWidth = contentWidth * 0.6
              const maxImgHeight = 45
              doc.addImage(preparedImage, getImageFormat(preparedImage), margin + 4, currentY, maxImgWidth, maxImgHeight, undefined, 'FAST')
              currentY += maxImgHeight + 5
            }
          } catch (err) {
            console.error('Failed to add load image:', err)
          }
        }

        // Block notes (matching inland quote generator)
        if (block.notes) {
          doc.setFontSize(7)
          doc.setFont('helvetica', 'italic')
          doc.setTextColor(...COLORS.muted)
          const noteLines = doc.splitTextToSize(`Notes: ${block.notes}`, contentWidth - 8)
          doc.text(noteLines.slice(0, 2), margin + 4, currentY)
          currentY += Math.min(noteLines.length, 2) * 3 + 2
        }

        currentY += 3
      }
    }

    // Helper function to draw destination notes (matching inland quote generator)
    const drawDestinationNotes = (customerNotes: string | undefined, specialInstructions: string | undefined) => {
      if (!customerNotes && !specialInstructions) return

      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.muted)
      doc.text('NOTES & INSTRUCTIONS', margin, currentY)
      currentY += 4

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)

      if (customerNotes) {
        const noteLines = doc.splitTextToSize(customerNotes, contentWidth)
        doc.text(noteLines.slice(0, 3), margin, currentY)
        currentY += Math.min(noteLines.length, 3) * 3 + 2
      }

      if (specialInstructions) {
        doc.setFont('helvetica', 'italic')
        const instrLines = doc.splitTextToSize(`Special: ${specialInstructions}`, contentWidth)
        doc.text(instrLines.slice(0, 2), margin, currentY)
        currentY += Math.min(instrLines.length, 2) * 3
      }

      currentY += 5
    }

    // Helper function to draw pricing section for a destination block
    const drawDestinationPricing = (destBlock: NonNullable<typeof inland.destination_blocks>[0], destName: string) => {
      const destServices: { name: string; description: string; quantity: number; price: number; blockNum?: number }[] = []
      const destAccessorials: { type_name: string; amount: number; is_percentage: boolean; billing_unit?: string; quantity: number; blockNum?: number }[] = []

      destBlock.load_blocks.forEach((block, idx) => {
        const blockNum = destBlock.load_blocks.length > 1 ? idx + 1 : undefined
        if (block.service_items) {
          block.service_items.forEach(item => {
            destServices.push({ ...item, blockNum })
          })
        }
        if (block.accessorial_charges) {
          block.accessorial_charges.forEach(charge => {
            destAccessorials.push({
              type_name: charge.type_name,
              amount: charge.amount,
              is_percentage: charge.is_percentage,
              billing_unit: charge.billing_unit,
              quantity: charge.quantity || 1,
              blockNum
            })
          })
        }
      })

      if (destServices.length === 0 && destAccessorials.length === 0) return

      if (currentY + 40 > pageHeight - 30) {
        doc.addPage()
        currentY = margin
      }

      currentY = drawInlandSectionHeader(doc, `Pricing - ${destName}`, margin, currentY, contentWidth, primaryColor)

      // Services table
      if (destServices.length > 0) {
        const serviceTableData = destServices.map((item) => {
          const qtyDesc = item.quantity > 1 ? `${item.quantity} x ${formatCurrency(item.price)}` : ''
          const itemTotal = item.price * item.quantity
          const itemName = item.description ? `${item.name} - ${item.description}` : item.name
          const displayName = item.blockNum ? `${itemName} (Load ${item.blockNum})` : (itemName || 'Service')
          return [displayName, qtyDesc, formatCurrency(itemTotal)]
        })

        autoTable(doc, {
          startY: currentY,
          head: [['Service', 'Details', 'Amount']],
          body: serviceTableData,
          margin: { left: margin, right: margin },
          theme: 'plain',
          headStyles: {
            fillColor: [...COLORS.light],
            textColor: [...COLORS.text],
            fontStyle: 'bold',
            fontSize: 8,
            cellPadding: 2.5
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: 2.5,
            textColor: [...COLORS.text]
          },
          columnStyles: {
            0: { cellWidth: 'auto', fontStyle: 'bold' },
            1: { cellWidth: 45, textColor: [...COLORS.muted] },
            2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
          },
          alternateRowStyles: {
            fillColor: [252, 252, 253]
          },
        })

        currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3

        // Services subtotal
        const servicesTotal = destServices.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COLORS.success)
        doc.text(`Services Total: ${formatCurrency(servicesTotal)}`, pageWidth - margin - 4, currentY, { align: 'right' })
        currentY += 8
      }

      // Accessorials table (orange styled, "If Applicable")
      if (destAccessorials.length > 0) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COLORS.accent)
        doc.text('Accessorial Charges (If Applicable)', margin + 4, currentY + 2)
        currentY += 7

        const servicesTotal = destServices.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        const accessorialData = destAccessorials.map((charge) => {
          const qty = charge.quantity || 1
          const billingUnit = charge.billing_unit ? BILLING_UNIT_LABELS[charge.billing_unit] || '' : ''
          const rateStr = charge.is_percentage
            ? `${charge.amount}%`
            : `${formatCurrency(charge.amount)}${billingUnit}`
          const qtyStr = qty > 1 ? ` x ${qty}` : ''
          const amount = charge.is_percentage
            ? (servicesTotal * charge.amount / 100 * qty)
            : (charge.amount * qty)
          const displayName = charge.blockNum ? `${charge.type_name} (Load ${charge.blockNum})` : charge.type_name

          return [displayName, `${rateStr}${qtyStr}`, formatCurrency(amount)]
        })

        autoTable(doc, {
          startY: currentY,
          head: [['Charge', 'Rate', 'Amount']],
          body: accessorialData,
          margin: { left: margin, right: margin },
          theme: 'plain',
          headStyles: {
            fillColor: [255, 237, 213],
            textColor: [180, 83, 9],
            fontSize: 8,
            fontStyle: 'bold',
            cellPadding: 2.5
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: 2.5,
            textColor: [...COLORS.text]
          },
          columnStyles: {
            0: { cellWidth: 'auto', fontStyle: 'bold' },
            1: { cellWidth: 40 },
            2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
          },
          alternateRowStyles: {
            fillColor: [255, 251, 235]
          },
        })

        currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3
      }

      // Destination total (services only - accessorials are conditional)
      const destServicesTotal = destServices.reduce((sum, item) => sum + (item.price * item.quantity), 0)

      if (currentY + 20 > pageHeight - 20) {
        doc.addPage()
        currentY = margin
      }

      doc.setFillColor(...primaryColor)
      doc.roundedRect(pageWidth - margin - 70, currentY, 70, 10, 1, 1, 'F')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(`${destName} Total:`, pageWidth - margin - 68, currentY + 6.5)
      doc.text(formatCurrency(destServicesTotal), pageWidth - margin - 3, currentY + 6.5, { align: 'right' })
      currentY += 15
    }

    // ============================================
    // RENDER DESTINATION BLOCKS OR LEGACY STRUCTURE
    // ============================================
    if (hasDestinationBlocks) {
      // Loop through each destination block
      for (let destIndex = 0; destIndex < inland.destination_blocks!.length; destIndex++) {
        const destBlock = inland.destination_blocks![destIndex]
        const isMultipleDestinations = inland.destination_blocks!.length > 1

        if (currentY + 40 > pageHeight - 20) {
          doc.addPage()
          currentY = margin
        }

        // Destination header (only if multiple destinations)
        if (isMultipleDestinations) {
          doc.setFillColor(...primaryColor)
          doc.roundedRect(margin, currentY, contentWidth, 8, 1, 1, 'F')
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(255, 255, 255)
          doc.text(destBlock.name.toUpperCase(), margin + 4, currentY + 5.5)
          currentY += 12
        }

        // Route section header
        currentY = drawInlandSectionHeader(doc, 'Route Information', margin, currentY, contentWidth, COLORS.secondary)

        // Draw route for this destination with its own map
        drawRouteSection(destBlock.pickup, destBlock.dropoff, destBlock.route, destBlock.map_image_base64)

        // Draw load blocks for this destination
        drawLoadBlocks(destBlock.load_blocks)

        // Draw pricing for this destination
        drawDestinationPricing(destBlock, destBlock.name)

        // Draw notes for this destination (matching inland quote generator)
        if (destBlock.customer_notes || destBlock.special_instructions) {
          if (currentY + 25 > pageHeight - 30) {
            doc.addPage()
            currentY = margin
          }
          drawDestinationNotes(destBlock.customer_notes, destBlock.special_instructions)
        }

        currentY += 5
      }
    } else if (hasLoadBlocks) {
      // Legacy structure with flat load blocks
      currentY = drawInlandSectionHeader(doc, 'Route Information', margin, currentY, contentWidth, COLORS.secondary)
      drawRouteSection(inland.pickup, inland.dropoff, inland.route, inland.mapImage)
      drawLoadBlocks(inland.load_blocks)

      // Draw pricing for legacy structure
      const allServices: { name: string; description: string; quantity: number; price: number; blockNum?: number }[] = []
      const allAccessorials: { type_name: string; amount: number; is_percentage: boolean; billing_unit?: string; quantity: number; blockNum?: number }[] = []

      inland.load_blocks!.forEach((block, idx) => {
        const blockNum = inland.load_blocks!.length > 1 ? idx + 1 : undefined
        if (block.service_items) {
          block.service_items.forEach(item => {
            allServices.push({ ...item, blockNum })
          })
        }
        if (block.accessorial_charges) {
          block.accessorial_charges.forEach(charge => {
            allAccessorials.push({
              type_name: charge.type_name,
              amount: charge.amount,
              is_percentage: charge.is_percentage,
              billing_unit: charge.billing_unit,
              quantity: charge.quantity || 1,
              blockNum
            })
          })
        }
      })

      if (allServices.length > 0 || allAccessorials.length > 0) {
        if (currentY + 40 > pageHeight - 30) {
          doc.addPage()
          currentY = margin
        }

        currentY = drawInlandSectionHeader(doc, 'Pricing', margin, currentY, contentWidth, primaryColor)

        // Services table
        if (allServices.length > 0) {
          const serviceTableData = allServices.map((item) => {
            const qtyDesc = item.quantity > 1 ? `${item.quantity} x ${formatCurrency(item.price)}` : ''
            const itemTotal = item.price * item.quantity
            const itemName = item.description ? `${item.name} - ${item.description}` : item.name
            const displayName = item.blockNum ? `${itemName} (Load ${item.blockNum})` : (itemName || 'Service')
            return [displayName, qtyDesc, formatCurrency(itemTotal)]
          })

          autoTable(doc, {
            startY: currentY,
            head: [['Service', 'Details', 'Amount']],
            body: serviceTableData,
            margin: { left: margin, right: margin },
            theme: 'plain',
            headStyles: {
              fillColor: [...COLORS.light],
              textColor: [...COLORS.text],
              fontStyle: 'bold',
              fontSize: 8,
              cellPadding: 2.5
            },
            bodyStyles: {
              fontSize: 8,
              cellPadding: 2.5,
              textColor: [...COLORS.text]
            },
            columnStyles: {
              0: { cellWidth: 'auto', fontStyle: 'bold' },
              1: { cellWidth: 45, textColor: [...COLORS.muted] },
              2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
            },
            alternateRowStyles: {
              fillColor: [252, 252, 253]
            },
          })

          currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3

          const servicesTotal = allServices.reduce((sum, item) => sum + (item.price * item.quantity), 0)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...COLORS.success)
          doc.text(`Services Total: ${formatCurrency(servicesTotal)}`, pageWidth - margin - 4, currentY, { align: 'right' })
          currentY += 8
        }

        // Accessorials table
        if (allAccessorials.length > 0) {
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...COLORS.accent)
          doc.text('Accessorial Charges (If Applicable)', margin + 4, currentY + 2)
          currentY += 7

          const servicesTotal = allServices.reduce((sum, item) => sum + (item.price * item.quantity), 0)
          const accessorialData = allAccessorials.map((charge) => {
            const qty = charge.quantity || 1
            const billingUnit = charge.billing_unit ? BILLING_UNIT_LABELS[charge.billing_unit] || '' : ''
            const rateStr = charge.is_percentage
              ? `${charge.amount}%`
              : `${formatCurrency(charge.amount)}${billingUnit}`
            const qtyStr = qty > 1 ? ` x ${qty}` : ''
            const amount = charge.is_percentage
              ? (servicesTotal * charge.amount / 100 * qty)
              : (charge.amount * qty)
            const displayName = charge.blockNum ? `${charge.type_name} (Load ${charge.blockNum})` : charge.type_name

            return [displayName, `${rateStr}${qtyStr}`, formatCurrency(amount)]
          })

          autoTable(doc, {
            startY: currentY,
            head: [['Charge', 'Rate', 'Amount']],
            body: accessorialData,
            margin: { left: margin, right: margin },
            theme: 'plain',
            headStyles: {
              fillColor: [255, 237, 213],
              textColor: [180, 83, 9],
              fontSize: 8,
              fontStyle: 'bold',
              cellPadding: 2.5
            },
            bodyStyles: {
              fontSize: 8,
              cellPadding: 2.5,
              textColor: [...COLORS.text]
            },
            columnStyles: {
              0: { cellWidth: 'auto', fontStyle: 'bold' },
              1: { cellWidth: 40 },
              2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
            },
            alternateRowStyles: {
              fillColor: [255, 251, 235]
            },
          })

          currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5
        }
      }
    } else {
      // Legacy flat structure - simple rendering
      currentY = drawInlandSectionHeader(doc, 'Route Information', margin, currentY, contentWidth, COLORS.secondary)
      drawRouteSection(inland.pickup, inland.dropoff, inland.route, inland.mapImage)

      // Legacy service items
      if (inland.serviceItems && inland.serviceItems.length > 0) {
        currentY = drawInlandSectionHeader(doc, 'Pricing', margin, currentY, contentWidth, primaryColor)

        const serviceTableData = inland.serviceItems.map((item) => {
          const qtyDesc = item.quantity > 1 ? `${item.quantity} x ${formatCurrency(item.price)}` : ''
          const itemTotal = item.price * item.quantity
          return [item.name || 'Service', qtyDesc, formatCurrency(itemTotal)]
        })

        autoTable(doc, {
          startY: currentY,
          head: [['Service', 'Details', 'Amount']],
          body: serviceTableData,
          margin: { left: margin, right: margin },
          theme: 'plain',
          headStyles: {
            fillColor: [...COLORS.light],
            textColor: [...COLORS.text],
            fontStyle: 'bold',
            fontSize: 8,
            cellPadding: 2.5
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: 2.5,
            textColor: [...COLORS.text]
          },
          columnStyles: {
            0: { cellWidth: 'auto', fontStyle: 'bold' },
            1: { cellWidth: 45, textColor: [...COLORS.muted] },
            2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
          },
          alternateRowStyles: {
            fillColor: [252, 252, 253]
          },
        })

        currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3

        // Services total
        const legacyServicesTotal = inland.serviceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COLORS.success)
        doc.text(`Services Total: ${formatCurrency(legacyServicesTotal)}`, pageWidth - margin - 4, currentY, { align: 'right' })
        currentY += 8
      }

      // Legacy accessorial charges
      if (inland.accessorialCharges && inland.accessorialCharges.length > 0) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COLORS.accent)
        doc.text('Accessorial Charges (If Applicable)', margin + 4, currentY + 2)
        currentY += 7

        const servicesTotal = inland.serviceItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0
        const accessorialData = inland.accessorialCharges.map((charge) => {
          const qty = charge.quantity || 1
          const billingUnit = charge.billing_unit ? BILLING_UNIT_LABELS[charge.billing_unit] || '' : ''
          const rateStr = charge.is_percentage
            ? `${charge.amount}%`
            : `${formatCurrency(charge.amount)}${billingUnit}`
          const qtyStr = qty > 1 ? ` x ${qty}` : ''
          const amount = charge.is_percentage
            ? (servicesTotal * charge.amount / 100 * qty)
            : (charge.amount * qty)

          return [charge.type_name, `${rateStr}${qtyStr}`, formatCurrency(amount)]
        })

        autoTable(doc, {
          startY: currentY,
          head: [['Charge', 'Rate', 'Amount']],
          body: accessorialData,
          margin: { left: margin, right: margin },
          theme: 'plain',
          headStyles: {
            fillColor: [255, 237, 213],
            textColor: [180, 83, 9],
            fontSize: 8,
            fontStyle: 'bold',
            cellPadding: 2.5
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: 2.5,
            textColor: [...COLORS.text]
          },
          columnStyles: {
            0: { cellWidth: 'auto', fontStyle: 'bold' },
            1: { cellWidth: 40 },
            2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
          },
          alternateRowStyles: {
            fillColor: [255, 251, 235]
          },
        })

        currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5
      }
    }

    // Add inland transportation total box
    if (currentY + 20 > pageHeight - 20) {
      doc.addPage()
      currentY = margin
    }

    doc.setFillColor(...COLORS.success)
    doc.roundedRect(pageWidth - margin - 90, currentY, 90, 12, 1, 1, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('Transportation Total:', pageWidth - margin - 88, currentY + 8)
    doc.text(formatCurrency(inlandTotal), pageWidth - margin - 3, currentY + 8, { align: 'right' })
    currentY += 18
  }

  // ============================================
  // TOTALS SECTION
  // ============================================
  // Check if we need a new page for totals
  if (currentY + 50 > pageHeight - 20) {
    doc.addPage()
    currentY = margin
  }

  const totalsWidth = 90
  const totalsX = pageWidth - margin - totalsWidth

  doc.setFillColor(...COLORS.light)
  doc.roundedRect(totalsX, currentY, totalsWidth, 35, 2, 2, 'F')

  let totalsY = currentY + 8

  // Subtotal
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.muted)
  doc.text('Subtotal:', totalsX + 5, totalsY)
  doc.setTextColor(...COLORS.text)
  doc.text(formatCurrency(subtotal), totalsX + totalsWidth - 5, totalsY, { align: 'right' })
  totalsY += 7

  // Margin
  if (marginPercent > 0) {
    doc.setTextColor(...COLORS.muted)
    doc.text(`Margin (${marginPercent}%):`, totalsX + 5, totalsY)
    doc.setTextColor(...COLORS.text)
    doc.text(formatCurrency(marginAmount), totalsX + totalsWidth - 5, totalsY, { align: 'right' })
    totalsY += 7
  }

  // Total
  doc.setFillColor(...primaryColor)
  doc.roundedRect(totalsX, totalsY - 2, totalsWidth, 12, 0, 0, 'F')

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL:', totalsX + 5, totalsY + 6)
  doc.text(formatCurrency(total), totalsX + totalsWidth - 5, totalsY + 6, { align: 'right' })

  currentY += 45

  // ============================================
  // TERMS & CONDITIONS
  // ============================================
  if (currentY < pageHeight - 60) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.muted)
    doc.text('TERMS & CONDITIONS', margin, currentY)
    currentY += 4

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)

    const defaultTerms = `This quote is valid for ${settings?.quote_validity_days || 30} days from the date of issue. ` +
      `All rates are subject to change based on equipment condition and site requirements. ` +
      `Insurance is not included unless explicitly stated. ` +
      `This quote is for dismantling and loading services as specified. Additional services may incur extra charges.`

    const terms = settings?.terms_and_conditions || defaultTerms
    const splitTerms = doc.splitTextToSize(terms, contentWidth)
    doc.text(splitTerms.slice(0, 4), margin, currentY)
  }

  // ============================================
  // FOOTER - Add to all pages
  // ============================================
  const totalPages = doc.getNumberOfPages()
  const footerText = settings?.footer_text ||
    `${companyName} | Thank you for your business`

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)

    doc.setFillColor(...COLORS.light)
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F')

    doc.setFontSize(7)
    doc.setTextColor(...COLORS.muted)
    doc.text(footerText, pageWidth / 2, pageHeight - 7, { align: 'center' })
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' })
  }

  return doc
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

// Main PDF Generation Function - Downloads the PDF
export function generateProfessionalQuotePDF(quoteData: QuoteData, isDraft: boolean = false): void {
  const doc = buildProfessionalQuoteDocument(quoteData, isDraft)
  const filename = `Quote_${quoteData.quoteNumber}_${quoteData.equipment.make}_${quoteData.equipment.model}.pdf`
  doc.save(filename.replace(/\s+/g, '_'))
}

// Generate preview (returns data URL)
export function generateProfessionalQuotePDFPreview(quoteData: QuoteData, isDraft: boolean = false): string {
  const doc = buildProfessionalQuoteDocument(quoteData, isDraft)
  return doc.output('dataurlstring')
}

// Generate PDF as Blob for live preview
export function generateProfessionalQuotePDFBlob(quoteData: QuoteData, isDraft: boolean = false): Blob {
  const doc = buildProfessionalQuoteDocument(quoteData, isDraft)
  return doc.output('blob')
}

// Async version with SVG support - for live preview with SVG images
export async function generateProfessionalQuotePDFBlobAsync(quoteData: QuoteData, isDraft: boolean = false): Promise<Blob> {
  // Pre-process images (convert SVG to PNG if needed)
  const processedImages: ProcessedImages = {}

  if (quoteData.companySettings?.logo_base64) {
    processedImages.logo = await prepareImageForPdfAsync(quoteData.companySettings.logo_base64)
  }

  if (quoteData.dimensions?.frontImageBase64) {
    processedImages.frontImage = await prepareImageForPdfAsync(quoteData.dimensions.frontImageBase64)
  }

  if (quoteData.dimensions?.sideImageBase64) {
    processedImages.sideImage = await prepareImageForPdfAsync(quoteData.dimensions.sideImageBase64)
  }

  // Pre-process equipment block images for multi-equipment mode
  if (quoteData.equipmentBlocks && quoteData.equipmentBlocks.length > 0) {
    processedImages.blockImages = new Map()
    for (let i = 0; i < quoteData.equipmentBlocks.length; i++) {
      const block = quoteData.equipmentBlocks[i]
      // Check block-level images first, then dimensions images
      const frontImageData = block.frontImageBase64 || block.dimensions?.frontImageBase64
      const sideImageData = block.sideImageBase64 || block.dimensions?.sideImageBase64

      const frontProcessed = frontImageData ? await prepareImageForPdfAsync(frontImageData) : null
      const sideProcessed = sideImageData ? await prepareImageForPdfAsync(sideImageData) : null

      processedImages.blockImages.set(i, { front: frontProcessed, side: sideProcessed })
    }
  }

  // Load truck types for inland transportation display
  const truckTypes = await loadTruckTypes()

  const doc = buildProfessionalQuoteDocument(quoteData, isDraft, processedImages, truckTypes)
  return doc.output('blob')
}

// Async version for PDF download - handles SVG and equipment block images
export async function generateProfessionalQuotePDFAsync(quoteData: QuoteData, isDraft: boolean = false): Promise<void> {
  // Pre-process images (convert SVG to PNG if needed)
  const processedImages: ProcessedImages = {}

  if (quoteData.companySettings?.logo_base64) {
    processedImages.logo = await prepareImageForPdfAsync(quoteData.companySettings.logo_base64)
  }

  if (quoteData.dimensions?.frontImageBase64) {
    processedImages.frontImage = await prepareImageForPdfAsync(quoteData.dimensions.frontImageBase64)
  }

  if (quoteData.dimensions?.sideImageBase64) {
    processedImages.sideImage = await prepareImageForPdfAsync(quoteData.dimensions.sideImageBase64)
  }

  // Pre-process equipment block images for multi-equipment mode
  if (quoteData.equipmentBlocks && quoteData.equipmentBlocks.length > 0) {
    processedImages.blockImages = new Map()
    for (let i = 0; i < quoteData.equipmentBlocks.length; i++) {
      const block = quoteData.equipmentBlocks[i]
      const frontImageData = block.frontImageBase64 || block.dimensions?.frontImageBase64
      const sideImageData = block.sideImageBase64 || block.dimensions?.sideImageBase64

      const frontProcessed = frontImageData ? await prepareImageForPdfAsync(frontImageData) : null
      const sideProcessed = sideImageData ? await prepareImageForPdfAsync(sideImageData) : null

      processedImages.blockImages.set(i, { front: frontProcessed, side: sideProcessed })
    }
  }

  const truckTypes = await loadTruckTypes()
  const doc = buildProfessionalQuoteDocument(quoteData, isDraft, processedImages, truckTypes)
  const filename = `Quote_${quoteData.quoteNumber}_${quoteData.equipment.make}_${quoteData.equipment.model}.pdf`
  doc.save(filename.replace(/\s+/g, '_'))
}

// Async version for PDF preview - handles SVG and equipment block images
export async function generateProfessionalQuotePDFPreviewAsync(quoteData: QuoteData, isDraft: boolean = false): Promise<string> {
  // Pre-process images (convert SVG to PNG if needed)
  const processedImages: ProcessedImages = {}

  if (quoteData.companySettings?.logo_base64) {
    processedImages.logo = await prepareImageForPdfAsync(quoteData.companySettings.logo_base64)
  }

  if (quoteData.dimensions?.frontImageBase64) {
    processedImages.frontImage = await prepareImageForPdfAsync(quoteData.dimensions.frontImageBase64)
  }

  if (quoteData.dimensions?.sideImageBase64) {
    processedImages.sideImage = await prepareImageForPdfAsync(quoteData.dimensions.sideImageBase64)
  }

  // Pre-process equipment block images for multi-equipment mode
  if (quoteData.equipmentBlocks && quoteData.equipmentBlocks.length > 0) {
    processedImages.blockImages = new Map()
    for (let i = 0; i < quoteData.equipmentBlocks.length; i++) {
      const block = quoteData.equipmentBlocks[i]
      const frontImageData = block.frontImageBase64 || block.dimensions?.frontImageBase64
      const sideImageData = block.sideImageBase64 || block.dimensions?.sideImageBase64

      const frontProcessed = frontImageData ? await prepareImageForPdfAsync(frontImageData) : null
      const sideProcessed = sideImageData ? await prepareImageForPdfAsync(sideImageData) : null

      processedImages.blockImages.set(i, { front: frontProcessed, side: sideProcessed })
    }
  }

  const truckTypes = await loadTruckTypes()
  const doc = buildProfessionalQuoteDocument(quoteData, isDraft, processedImages, truckTypes)
  return doc.output('dataurlstring')
}
