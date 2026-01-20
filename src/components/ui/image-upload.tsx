'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Loader2, ImageIcon, AlertCircle, ClipboardPaste } from 'lucide-react'

interface ImageUploadProps {
  value?: string | null
  onChange: (url: string | null) => void
  bucket?: string
  folder?: string
  label?: string
  className?: string
  disabled?: boolean
  maxSizeMB?: number
  accept?: string
}

export function ImageUpload({
  value,
  onChange,
  bucket = 'equipment-images',
  folder = '',
  label = 'Upload Image',
  className = '',
  disabled = false,
  maxSizeMB = 5,
  accept = 'image/*',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Reset imageError when value changes
  useEffect(() => {
    setImageError(false)
  }, [value])

  // Core file upload function - reusable for file input, drag-drop, and paste
  const uploadFile = useCallback(
    async (file: File) => {
      // Validate file size
      const maxSize = maxSizeMB * 1024 * 1024
      if (file.size > maxSize) {
        setError(`File size must be less than ${maxSizeMB}MB`)
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('File must be an image')
        return
      }

      setError(null)
      setUploading(true)

      try {
        const supabase = createClient()

        // Generate unique filename
        const fileExt = file.name.split('.').pop() || 'png'
        const fileName = `${crypto.randomUUID()}.${fileExt}`
        const filePath = folder ? `${folder}/${fileName}` : fileName

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          throw uploadError
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath)

        onChange(urlData.publicUrl)
        setImageError(false) // Reset image error on successful upload
      } catch (err) {
        console.error('Upload error:', err)
        setError('Failed to upload image. Please try again.')
      } finally {
        setUploading(false)
      }
    },
    [bucket, folder, maxSizeMB, onChange]
  )

  const handleUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      await uploadFile(file)
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    },
    [uploadFile]
  )

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && !uploading) {
      setIsDragging(true)
    }
  }, [disabled, uploading])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set dragging to false if we're leaving the drop zone entirely
    const rect = dropZoneRef.current?.getBoundingClientRect()
    if (rect) {
      const { clientX, clientY } = e
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        setIsDragging(false)
      }
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled || uploading) return

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        await uploadFile(file)
      } else {
        setError('Please drop an image file')
      }
    }
  }, [disabled, uploading, uploadFile])

  // Paste handler
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (disabled || uploading) return

    const items = e.clipboardData?.items
    if (!items) return

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          await uploadFile(file)
        }
        return
      }
    }
  }, [disabled, uploading, uploadFile])

  // Add paste event listener when dropzone is focused/hovered
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Only handle paste if this component's drop zone is focused or document has no other focus
      const activeElement = document.activeElement
      const isInputFocused = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA'

      if (!isInputFocused && !value) {
        handlePaste(e)
      }
    }

    // We don't add global paste listener by default - only when hovering over drop zone
    return () => {}
  }, [handlePaste, value])

  const handleRemove = useCallback(async () => {
    if (!value) return

    // Check if it's a data URL (base64 image) - just remove without storage deletion
    if (value.startsWith('data:')) {
      onChange(null)
      return
    }

    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Extract file path from URL
      const url = new URL(value)
      const pathParts = url.pathname.split('/')
      const bucketIndex = pathParts.findIndex((p) => p === bucket)
      if (bucketIndex >= 0) {
        const filePath = pathParts.slice(bucketIndex + 1).join('/')

        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove([filePath])

        if (deleteError) {
          console.warn('Failed to delete file:', deleteError)
        }
      }

      onChange(null)
    } catch (err) {
      console.error('Delete error:', err)
      setError('Failed to remove image')
    } finally {
      setUploading(false)
    }
  }, [value, bucket, onChange])

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleUpload}
        disabled={disabled || uploading}
        className="hidden"
      />

      {value ? (
        <div className="relative group">
          <div className="relative aspect-video w-full rounded-lg overflow-hidden border bg-muted">
            {imageError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <AlertCircle className="h-6 w-6" />
                <span className="text-xs">Image not found</span>
                {!disabled && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemove}
                    disabled={uploading}
                    className="mt-1"
                  >
                    {uploading ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <X className="h-3 w-3 mr-1" />
                    )}
                    Remove & Re-upload
                  </Button>
                )}
              </div>
            ) : (
              <img
                src={value}
                alt={label}
                className="absolute inset-0 w-full h-full object-contain"
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
              />
            )}
          </div>
          {!disabled && !imageError && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleRemove}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      ) : (
        <div
          ref={dropZoneRef}
          onClick={() => inputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onPaste={(e) => handlePaste(e.nativeEvent)}
          tabIndex={0}
          role="button"
          className={`flex flex-col items-center justify-center w-full aspect-video rounded-lg border-2 border-dashed transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
            isDragging
              ? 'border-primary bg-primary/10'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50 bg-muted/30'
          } ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          ) : isDragging ? (
            <>
              <Upload className="h-8 w-8 text-primary mb-2" />
              <span className="text-sm text-primary font-medium">Drop image here</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Upload className="h-3 w-3" />
                {label}
              </span>
              <span className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                <ClipboardPaste className="h-3 w-3" />
                Drop, paste, or click
              </span>
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
