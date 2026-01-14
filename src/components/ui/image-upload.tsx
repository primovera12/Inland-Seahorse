'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Loader2, ImageIcon, AlertCircle } from 'lucide-react'

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
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset imageError when value changes
  useEffect(() => {
    setImageError(false)
  }, [value])

  const handleUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

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
        const fileExt = file.name.split('.').pop()
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
        // Reset input
        if (inputRef.current) {
          inputRef.current.value = ''
        }
      }
    },
    [bucket, folder, maxSizeMB, onChange]
  )

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
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2" />
                <span className="text-xs">Failed to load image</span>
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
          {!disabled && (
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
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex flex-col items-center justify-center w-full aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors bg-muted/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Upload className="h-3 w-3" />
                {label}
              </span>
            </>
          )}
        </button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
