'use client'

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { UnifiedPDFData } from './types'
import { preloadPDFImages } from './pdf-utils'

export interface GeneratePDFOptions {
  filename?: string
  scale?: number
  quality?: number
  onProgress?: (progress: number) => void
}

// Generate PDF from HTML element
export async function generatePDFFromElement(
  element: HTMLElement,
  options: GeneratePDFOptions = {}
): Promise<jsPDF> {
  const { scale = 2, quality = 0.95, onProgress } = options

  onProgress?.(10)

  // Use html2canvas to capture the element
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    imageTimeout: 15000,
    onclone: (clonedDoc) => {
      // Ensure all styles are applied in cloned document
      const clonedElement = clonedDoc.getElementById('quote-pdf-content')
      if (clonedElement) {
        clonedElement.style.width = '210mm' // A4 width
        clonedElement.style.minHeight = 'auto'
      }
    },
  })

  onProgress?.(60)

  // Calculate PDF dimensions (A4 size)
  const imgWidth = 210 // A4 width in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  const pageHeight = 297 // A4 height in mm

  // Create PDF
  const pdf = new jsPDF({
    orientation: imgHeight > pageHeight ? 'portrait' : 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // If content fits on one page
  if (imgHeight <= pageHeight) {
    const imgData = canvas.toDataURL('image/jpeg', quality)
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight)
  } else {
    // Multi-page handling
    let heightLeft = imgHeight
    let position = 0
    let pageNum = 1

    while (heightLeft > 0) {
      if (pageNum > 1) {
        pdf.addPage()
      }

      const imgData = canvas.toDataURL('image/jpeg', quality)
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)

      heightLeft -= pageHeight
      position -= pageHeight
      pageNum++

      onProgress?.(60 + Math.min(30, (pageNum / Math.ceil(imgHeight / pageHeight)) * 30))
    }
  }

  onProgress?.(100)

  return pdf
}

// Download PDF with the unified template
export async function downloadUnifiedPDF(
  element: HTMLElement,
  data: UnifiedPDFData,
  options: GeneratePDFOptions = {}
): Promise<void> {
  const pdf = await generatePDFFromElement(element, options)
  const filename = options.filename || `quote-${data.quoteNumber}.pdf`
  pdf.save(filename)
}

// Get PDF as Blob
export async function getUnifiedPDFBlob(
  element: HTMLElement,
  options: GeneratePDFOptions = {}
): Promise<Blob> {
  const pdf = await generatePDFFromElement(element, options)
  return pdf.output('blob')
}

// Get PDF as Data URL
export async function getUnifiedPDFDataUrl(
  element: HTMLElement,
  options: GeneratePDFOptions = {}
): Promise<string> {
  const pdf = await generatePDFFromElement(element, options)
  return pdf.output('dataurlstring')
}

// Helper to render template and generate PDF (for use without React rendering)
export async function generateUnifiedPDFDirect(
  data: UnifiedPDFData,
  options: GeneratePDFOptions = {}
): Promise<jsPDF> {
  // Create a hidden container for rendering
  const container = document.createElement('div')
  container.id = 'pdf-render-container'
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '210mm'
  container.style.backgroundColor = '#ffffff'
  document.body.appendChild(container)

  try {
    // Preload images
    await preloadPDFImages({
      companyLogoUrl: data.company.logoUrl,
      equipment: data.equipment,
    })

    // Import and render the template
    const { createRoot } = await import('react-dom/client')
    const { createElement } = await import('react')
    const { QuotePDFTemplate } = await import('./components/QuotePDFTemplate')

    // Create React root and render
    const root = createRoot(container)

    await new Promise<void>((resolve) => {
      root.render(createElement(QuotePDFTemplate, { data }))
      // Wait for render to complete
      setTimeout(resolve, 500)
    })

    // Find the rendered content
    const element = container.querySelector('#quote-pdf-content') as HTMLElement
    if (!element) {
      throw new Error('Failed to render PDF template')
    }

    // Generate PDF
    const pdf = await generatePDFFromElement(element, options)

    // Cleanup
    root.unmount()

    return pdf
  } finally {
    document.body.removeChild(container)
  }
}

// Print using browser's print dialog (preserves exact styling)
export function printQuote(): void {
  window.print()
}

// Open PDF in new tab for preview
export async function previewUnifiedPDF(
  element: HTMLElement,
  options: GeneratePDFOptions = {}
): Promise<void> {
  const dataUrl = await getUnifiedPDFDataUrl(element, options)
  const newWindow = window.open()
  if (newWindow) {
    newWindow.document.write(`
      <html>
        <head><title>Quote Preview</title></head>
        <body style="margin:0;padding:0;">
          <iframe src="${dataUrl}" style="width:100%;height:100vh;border:none;"></iframe>
        </body>
      </html>
    `)
  }
}

export default {
  generatePDFFromElement,
  downloadUnifiedPDF,
  getUnifiedPDFBlob,
  getUnifiedPDFDataUrl,
  generateUnifiedPDFDirect,
  printQuote,
  previewUnifiedPDF,
}
