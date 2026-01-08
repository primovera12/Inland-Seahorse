'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Eraser, Check } from 'lucide-react'

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void
  width?: number
  height?: number
  className?: string
}

export function SignaturePad({
  onSignatureChange,
  width = 400,
  height = 150,
  className = '',
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    // Set up canvas
    context.strokeStyle = '#000000'
    context.lineWidth = 2
    context.lineCap = 'round'
    context.lineJoin = 'round'
    setCtx(context)

    // Clear canvas with white background
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
  }, [width, height])

  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      const touch = e.touches[0]
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      }
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const coords = getCoordinates(e)
    if (!coords || !ctx) return

    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
    setIsDrawing(true)
  }, [ctx, getCoordinates])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing || !ctx) return

    const coords = getCoordinates(e)
    if (!coords) return

    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()
    setHasSignature(true)
  }, [isDrawing, ctx, getCoordinates])

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return
    setIsDrawing(false)

    // Export signature
    const canvas = canvasRef.current
    if (canvas && hasSignature) {
      const dataUrl = canvas.toDataURL('image/png')
      onSignatureChange(dataUrl)
    }
  }, [isDrawing, hasSignature, onSignatureChange])

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    setHasSignature(false)
    onSignatureChange(null)
  }, [ctx, width, height, onSignatureChange])

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative border-2 border-dashed rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="touch-none cursor-crosshair w-full"
          style={{ maxWidth: width }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-muted-foreground text-sm">Sign here</p>
          </div>
        )}
        <div className="absolute bottom-2 left-2 right-2 border-t border-gray-300" />
      </div>
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          {hasSignature ? 'Signature captured' : 'Draw your signature above'}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearSignature}
          disabled={!hasSignature}
        >
          <Eraser className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  )
}

// Display a captured signature
export function SignatureDisplay({
  signatureData,
  signedBy,
  signedAt,
  className = '',
}: {
  signatureData: string
  signedBy?: string
  signedAt?: string | Date
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="border rounded-lg p-2 bg-white">
        <img
          src={signatureData}
          alt="Signature"
          className="max-w-full h-auto"
        />
      </div>
      {(signedBy || signedAt) && (
        <div className="text-xs text-muted-foreground space-y-1">
          {signedBy && <p>Signed by: {signedBy}</p>}
          {signedAt && (
            <p>
              Date: {new Date(signedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
