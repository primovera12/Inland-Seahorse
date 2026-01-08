'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { trpc } from '@/lib/trpc/client'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Paperclip,
  Upload,
  Download,
  Trash2,
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  Loader2,
  X,
} from 'lucide-react'

interface QuoteAttachmentsProps {
  quoteId: string
  quoteType: 'dismantle' | 'inland'
}

type Attachment = {
  id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  uploaded_at: string
  description?: string
}

const FILE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'application/pdf': FileText,
  'image/jpeg': FileImage,
  'image/png': FileImage,
  'image/gif': FileImage,
  'image/webp': FileImage,
  'application/vnd.ms-excel': FileSpreadsheet,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileSpreadsheet,
  'text/csv': FileSpreadsheet,
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(fileType: string) {
  return FILE_ICONS[fileType] || File
}

export function QuoteAttachments({ quoteId, quoteType }: QuoteAttachmentsProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')

  const utils = trpc.useUtils()

  // Fetch attachments based on quote type
  const { data: attachments, isLoading } = quoteType === 'dismantle'
    ? trpc.quotes.getAttachments.useQuery({ quoteId })
    : trpc.inland.getAttachments.useQuery({ quoteId })

  // Mutations
  const addAttachment = quoteType === 'dismantle'
    ? trpc.quotes.addAttachment.useMutation({
        onSuccess: () => {
          utils.quotes.getAttachments.invalidate({ quoteId })
          toast.success('File uploaded successfully')
          setSelectedFile(null)
          setDescription('')
        },
        onError: (error) => toast.error('Failed to save attachment', { description: error.message }),
      })
    : trpc.inland.addAttachment.useMutation({
        onSuccess: () => {
          utils.inland.getAttachments.invalidate({ quoteId })
          toast.success('File uploaded successfully')
          setSelectedFile(null)
          setDescription('')
        },
        onError: (error) => toast.error('Failed to save attachment', { description: error.message }),
      })

  const deleteAttachment = quoteType === 'dismantle'
    ? trpc.quotes.deleteAttachment.useMutation({
        onSuccess: () => {
          utils.quotes.getAttachments.invalidate({ quoteId })
          toast.success('Attachment deleted')
        },
        onError: (error) => toast.error('Failed to delete', { description: error.message }),
      })
    : trpc.inland.deleteAttachment.useMutation({
        onSuccess: () => {
          utils.inland.getAttachments.invalidate({ quoteId })
          toast.success('Attachment deleted')
        },
        onError: (error) => toast.error('Failed to delete', { description: error.message }),
      })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large', { description: 'Maximum file size is 10MB' })
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    try {
      const supabase = createClient()

      // Generate unique file path
      const fileExt = selectedFile.name.split('.').pop()
      const filePath = `${quoteType}/${quoteId}/${Date.now()}-${selectedFile.name}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('quote-attachments')
        .upload(filePath, selectedFile)

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      // Save metadata to database
      await addAttachment.mutateAsync({
        quoteId,
        fileName: selectedFile.name,
        filePath,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        description: description || undefined,
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async (attachment: Attachment) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from('quote-attachments')
        .createSignedUrl(attachment.file_path, 3600)

      if (error) throw error

      // Open in new tab
      window.open(data.signedUrl, '_blank')
    } catch (error) {
      toast.error('Failed to download', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this attachment?')) {
      deleteAttachment.mutate({ id })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">Attachments</CardTitle>
            <CardDescription>
              Upload scope documents, drawings, photos, etc.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="border-2 border-dashed rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Input
              type="file"
              onChange={handleFileSelect}
              className="flex-1"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
            />
          </div>
          {selectedFile && (
            <div className="flex items-center justify-between bg-muted/50 rounded p-2">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = getFileIcon(selectedFile.type)
                  return <Icon className="h-4 w-4" />
                })()}
                <span className="text-sm font-medium">{selectedFile.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({formatFileSize(selectedFile.size)})
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          {selectedFile && (
            <>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="Brief description of the file..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Attachments List */}
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            Loading attachments...
          </div>
        ) : attachments && attachments.length > 0 ? (
          <div className="space-y-2">
            {attachments.map((attachment: Attachment) => {
              const Icon = getFileIcon(attachment.file_type)
              return (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded bg-muted">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {attachment.file_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.file_size)}
                        {attachment.description && ` - ${attachment.description}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(attachment)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(attachment.id)}
                      title="Delete"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No attachments yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
