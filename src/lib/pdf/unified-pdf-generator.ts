'use client'

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { UnifiedPDFData } from './types'
import { preloadPDFImages, PRINT_STYLES } from './pdf-utils'

export interface GeneratePDFOptions {
  filename?: string
  scale?: number
  quality?: number
  onProgress?: (progress: number) => void
}

// Generate PDF from HTML element using html2canvas
// Falls back to print dialog if html2canvas fails
export async function generatePDFFromElement(
  element: HTMLElement,
  options: GeneratePDFOptions = {}
): Promise<jsPDF> {
  const { scale = 2, quality = 0.95, onProgress } = options

  onProgress?.(10)

  try {
    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true) as HTMLElement

    // Create a container for rendering
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.top = '0'
    container.style.width = '210mm' // A4 width
    container.style.backgroundColor = '#ffffff'
    container.appendChild(clone)
    document.body.appendChild(container)

    // Use html2canvas to capture the element
    const canvas = await html2canvas(clone, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: true, // Enable logging for debugging
      imageTimeout: 15000,
      foreignObjectRendering: false, // Disable foreign object rendering for better compatibility
      removeContainer: true,
      width: clone.scrollWidth,
      height: clone.scrollHeight,
    })

    // Clean up
    document.body.removeChild(container)

    onProgress?.(60)

    // Calculate PDF dimensions (A4 size)
    const imgWidth = 210 // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const pageHeight = 297 // A4 height in mm

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
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
  } catch (error) {
    // If html2canvas fails (e.g., due to unsupported CSS colors),
    // throw the error to be handled by the caller
    console.error('PDF generation error:', error)
    throw error
  }
}

// Download PDF - uses browser print as primary method for reliability
export async function downloadUnifiedPDF(
  element: HTMLElement,
  data: UnifiedPDFData,
  options: GeneratePDFOptions = {}
): Promise<void> {
  // Try html2canvas first, fall back to print dialog
  try {
    const pdf = await generatePDFFromElement(element, options)
    const filename = options.filename || `quote-${data.quoteNumber}.pdf`
    pdf.save(filename)
  } catch (error) {
    console.error('html2canvas failed, opening print dialog:', error)
    // Fall back to print dialog
    openPrintWindow(element, data.quoteNumber)
  }
}

// Open content in a new window for printing/saving as PDF
function openPrintWindow(element: HTMLElement, quoteNumber: string): void {
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) {
    alert('Please allow popups to download the PDF')
    return
  }

  // Clone the element's HTML
  const content = element.outerHTML

  // Write the print document
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Quote ${quoteNumber}</title>
      <style>
        ${PRINT_STYLES}

        /* Reset and base styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #0a0a0a;
          background: #ffffff;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Tailwind-like utility classes */
        .bg-white { background-color: #ffffff; }
        .bg-slate-50 { background-color: #f8fafc; }
        .bg-slate-100 { background-color: #f1f5f9; }
        .text-slate-400 { color: #94a3b8; }
        .text-slate-500 { color: #64748b; }
        .text-slate-600 { color: #475569; }
        .text-slate-700 { color: #334155; }
        .text-slate-800 { color: #1e293b; }
        .text-slate-900 { color: #0f172a; }
        .text-white { color: #ffffff; }

        .bg-orange-100 { background-color: #ffedd5; }
        .text-orange-700 { color: #c2410c; }
        .bg-blue-100 { background-color: #dbeafe; }
        .text-blue-700 { color: #1d4ed8; }
        .bg-green-100 { background-color: #dcfce7; }
        .text-green-700 { color: #15803d; }
        .bg-purple-100 { background-color: #f3e8ff; }
        .text-purple-700 { color: #7c3aed; }

        .font-bold { font-weight: 700; }
        .font-extrabold { font-weight: 800; }
        .font-black { font-weight: 900; }
        .font-medium { font-weight: 500; }

        .text-xs { font-size: 0.75rem; line-height: 1rem; }
        .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
        .text-base { font-size: 1rem; line-height: 1.5rem; }
        .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
        .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
        .text-2xl { font-size: 1.5rem; line-height: 2rem; }
        .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }

        .uppercase { text-transform: uppercase; }
        .tracking-wide { letter-spacing: 0.025em; }
        .tracking-widest { letter-spacing: 0.1em; }
        .tracking-tighter { letter-spacing: -0.05em; }

        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }

        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .flex-grow { flex-grow: 1; }
        .items-center { align-items: center; }
        .items-start { align-items: flex-start; }
        .justify-between { justify-content: space-between; }
        .gap-1 { gap: 0.25rem; }
        .gap-2 { gap: 0.5rem; }
        .gap-3 { gap: 0.75rem; }
        .gap-4 { gap: 1rem; }
        .gap-8 { gap: 2rem; }
        .gap-10 { gap: 2.5rem; }

        .grid { display: grid; }
        .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
        .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
        .grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }
        .col-span-4 { grid-column: span 4 / span 4; }
        .col-span-8 { grid-column: span 8 / span 8; }

        .p-4 { padding: 1rem; }
        .p-5 { padding: 1.25rem; }
        .p-6 { padding: 1.5rem; }
        .p-8 { padding: 2rem; }
        .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
        .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
        .px-8 { padding-left: 2rem; padding-right: 2rem; }
        .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
        .py-5 { padding-top: 1.25rem; padding-bottom: 1.25rem; }
        .py-10 { padding-top: 2.5rem; padding-bottom: 2.5rem; }
        .py-0\\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
        .pb-2 { padding-bottom: 0.5rem; }
        .pt-3 { padding-top: 0.75rem; }

        .m-0 { margin: 0; }
        .mb-1 { margin-bottom: 0.25rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mt-1 { margin-top: 0.25rem; }
        .mt-4 { margin-top: 1rem; }
        .mt-8 { margin-top: 2rem; }
        .ml-2 { margin-left: 0.5rem; }

        .space-y-1 > * + * { margin-top: 0.25rem; }
        .space-y-2 > * + * { margin-top: 0.5rem; }
        .space-y-3 > * + * { margin-top: 0.75rem; }

        .border { border-width: 1px; }
        .border-b { border-bottom-width: 1px; }
        .border-r { border-right-width: 1px; }
        .border-t { border-top-width: 1px; }
        .border-slate-100 { border-color: #f1f5f9; }
        .border-slate-200 { border-color: #e2e8f0; }
        .border-collapse { border-collapse: collapse; }

        .rounded { border-radius: 0.25rem; }
        .rounded-lg { border-radius: 0.5rem; }
        .rounded-xl { border-radius: 0.75rem; }

        .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); }

        .overflow-hidden { overflow: hidden; }
        .overflow-auto { overflow: auto; }

        .w-full { width: 100%; }
        .w-4 { width: 1rem; }
        .w-auto { width: auto; }
        .h-4 { height: 1rem; }
        .h-12 { height: 3rem; }
        .h-full { height: 100%; }
        .min-h-screen { min-height: 100vh; }
        .max-w-md { max-width: 28rem; }
        .max-w-5xl { max-width: 64rem; }

        .object-contain { object-fit: contain; }
        .object-cover { object-fit: cover; }

        .aspect-video { aspect-ratio: 16 / 9; }

        .leading-tight { line-height: 1.25; }
        .leading-relaxed { line-height: 1.625; }

        .break-words { word-wrap: break-word; }

        .divide-y > * + * { border-top-width: 1px; }
        .divide-slate-100 > * + * { border-color: #f1f5f9; }

        /* Table styles */
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; }

        /* Image styles */
        img { max-width: 100%; height: auto; }

        /* Print-specific adjustments */
        @media print {
          body {
            margin: 0;
            padding: 0;
          }

          .shadow-xl { box-shadow: none; }

          @page {
            size: A4;
            margin: 10mm;
          }
        }

        /* Instructions bar */
        .print-instructions {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #1e40af;
          color: white;
          padding: 12px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 9999;
          font-family: system-ui, sans-serif;
        }

        .print-instructions button {
          background: white;
          color: #1e40af;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          margin-left: 10px;
        }

        .print-instructions button:hover {
          background: #f1f5f9;
        }

        @media print {
          .print-instructions {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-instructions">
        <span>Press <strong>Ctrl+P</strong> (or <strong>⌘+P</strong> on Mac) to save as PDF. Select "Save as PDF" as the destination.</span>
        <div>
          <button onclick="window.print()">Print / Save PDF</button>
          <button onclick="window.close()">Close</button>
        </div>
      </div>
      <div style="padding-top: 60px;">
        ${content}
      </div>
    </body>
    </html>
  `)

  printWindow.document.close()

  // Focus and trigger print after content loads
  printWindow.onload = () => {
    printWindow.focus()
  }
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
  try {
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
  } catch (error) {
    console.error('Preview failed, opening print window:', error)
    // Extract quote number from the element if possible
    const quoteNum = element.querySelector('#quote-pdf-content')?.getAttribute('data-quote-number') || 'Quote'
    openPrintWindow(element, quoteNum)
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
