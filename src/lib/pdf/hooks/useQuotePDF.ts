'use client'

import { useRef, useState, useCallback } from 'react'
import type { UnifiedPDFData } from '../types'
import {
  downloadUnifiedPDF,
  getUnifiedPDFBlob,
  getUnifiedPDFDataUrl,
  previewUnifiedPDF,
  printQuote,
  type GeneratePDFOptions,
} from '../unified-pdf-generator'

export interface UseQuotePDFReturn {
  // Ref to attach to the PDF template container
  containerRef: React.RefObject<HTMLDivElement | null>

  // Loading states
  isGenerating: boolean
  progress: number
  error: string | null

  // Actions
  downloadPDF: (data: UnifiedPDFData, options?: GeneratePDFOptions) => Promise<void>
  getPDFBlob: (options?: GeneratePDFOptions) => Promise<Blob | null>
  getPDFDataUrl: (options?: GeneratePDFOptions) => Promise<string | null>
  previewPDF: (options?: GeneratePDFOptions) => Promise<void>
  print: () => void
}

export function useQuotePDF(): UseQuotePDFReturn {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const getElement = useCallback((): HTMLElement | null => {
    if (!containerRef.current) {
      setError('PDF container not found')
      return null
    }

    const element = containerRef.current.querySelector('#quote-pdf-content') as HTMLElement
    if (!element) {
      // Try the container itself
      if (containerRef.current.id === 'quote-pdf-content') {
        return containerRef.current
      }
      setError('PDF content element not found')
      return null
    }

    return element
  }, [])

  const downloadPDF = useCallback(
    async (data: UnifiedPDFData, options?: GeneratePDFOptions) => {
      const element = getElement()
      if (!element) return

      setIsGenerating(true)
      setProgress(0)
      setError(null)

      try {
        await downloadUnifiedPDF(element, data, {
          ...options,
          onProgress: setProgress,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate PDF')
        console.error('PDF generation error:', err)
      } finally {
        setIsGenerating(false)
      }
    },
    [getElement]
  )

  const getPDFBlob = useCallback(
    async (options?: GeneratePDFOptions): Promise<Blob | null> => {
      const element = getElement()
      if (!element) return null

      setIsGenerating(true)
      setProgress(0)
      setError(null)

      try {
        const blob = await getUnifiedPDFBlob(element, {
          ...options,
          onProgress: setProgress,
        })
        return blob
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate PDF')
        console.error('PDF generation error:', err)
        return null
      } finally {
        setIsGenerating(false)
      }
    },
    [getElement]
  )

  const getPDFDataUrl = useCallback(
    async (options?: GeneratePDFOptions): Promise<string | null> => {
      const element = getElement()
      if (!element) return null

      setIsGenerating(true)
      setProgress(0)
      setError(null)

      try {
        const dataUrl = await getUnifiedPDFDataUrl(element, {
          ...options,
          onProgress: setProgress,
        })
        return dataUrl
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate PDF')
        console.error('PDF generation error:', err)
        return null
      } finally {
        setIsGenerating(false)
      }
    },
    [getElement]
  )

  const previewPDF = useCallback(
    async (options?: GeneratePDFOptions) => {
      const element = getElement()
      if (!element) return

      setIsGenerating(true)
      setProgress(0)
      setError(null)

      try {
        await previewUnifiedPDF(element, {
          ...options,
          onProgress: setProgress,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to preview PDF')
        console.error('PDF preview error:', err)
      } finally {
        setIsGenerating(false)
      }
    },
    [getElement]
  )

  const print = useCallback(() => {
    printQuote()
  }, [])

  return {
    containerRef,
    isGenerating,
    progress,
    error,
    downloadPDF,
    getPDFBlob,
    getPDFDataUrl,
    previewPDF,
    print,
  }
}

export default useQuotePDF
