'use client'

import { useState, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import {
  Bug,
  Lightbulb,
  Sparkles,
  HelpCircle,
  Camera,
  X,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import type { TicketType, TicketPriority } from '@/types/feedback'
import {
  TICKET_TYPE_LABELS,
  TICKET_PRIORITY_LABELS,
} from '@/types/feedback'

interface FeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TYPE_ICONS: Record<TicketType, React.ReactNode> = {
  bug: <Bug className="h-4 w-4" />,
  feature: <Lightbulb className="h-4 w-4" />,
  enhancement: <Sparkles className="h-4 w-4" />,
  question: <HelpCircle className="h-4 w-4" />,
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const pathname = usePathname()
  const [type, setType] = useState<TicketType>('bug')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const submitMutation = trpc.feedback.submit.useMutation({
    onSuccess: (data) => {
      setSubmitted(true)
      toast.success(`Ticket ${data.ticket_number} submitted successfully!`)
      // Reset form after delay
      setTimeout(() => {
        resetForm()
        onOpenChange(false)
      }, 2000)
    },
    onError: (error) => {
      toast.error(`Failed to submit feedback: ${error.message}`)
    },
  })

  const resetForm = useCallback(() => {
    setType('bug')
    setPriority('medium')
    setTitle('')
    setDescription('')
    setScreenshot(null)
    setSubmitted(false)
  }, [])

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) {
      toast.error('Please fill in the title and description')
      return
    }

    submitMutation.mutate({
      type,
      priority,
      title: title.trim(),
      description: description.trim(),
      page_url: typeof window !== 'undefined' ? window.location.href : pathname,
      screenshot_base64: screenshot || undefined,
    })
  }

  const captureScreenshot = async () => {
    setIsCapturing(true)
    try {
      // Temporarily close dialog to capture screenshot
      onOpenChange(false)

      // Wait for dialog to close
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Use html2canvas for screenshot capture
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(document.body, {
        logging: false,
        useCORS: true,
        scale: 0.5, // Reduce size for faster upload
      })

      const dataUrl = canvas.toDataURL('image/png')
      setScreenshot(dataUrl)

      // Re-open dialog
      onOpenChange(true)
      toast.success('Screenshot captured')
    } catch (error) {
      console.error('Screenshot capture failed:', error)
      toast.error('Failed to capture screenshot')
      onOpenChange(true)
    } finally {
      setIsCapturing(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setScreenshot(event.target?.result as string)
      toast.success('Image attached')
    }
    reader.readAsDataURL(file)
  }

  const removeScreenshot = () => {
    setScreenshot(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Thank you!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your feedback has been submitted. We&apos;ll review it shortly.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit Feedback</DialogTitle>
          <DialogDescription>
            Help us improve by reporting bugs, suggesting features, or asking questions.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Type and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as TicketType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TICKET_TYPE_LABELS) as TicketType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      <span className="flex items-center gap-2">
                        {TYPE_ICONS[t]}
                        {TICKET_TYPE_LABELS[t]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TicketPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {TICKET_PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Brief summary of your feedback"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Please provide details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/5000 characters
            </p>
          </div>

          {/* Page URL (auto-filled) */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Page Reference</Label>
            <p className="text-xs truncate bg-muted px-2 py-1 rounded">
              {typeof window !== 'undefined' ? window.location.pathname : pathname}
            </p>
          </div>

          {/* Screenshot */}
          <div className="space-y-2">
            <Label>Screenshot (optional)</Label>
            {screenshot ? (
              <div className="relative">
                <img
                  src={screenshot}
                  alt="Screenshot preview"
                  className="w-full h-32 object-cover rounded-md border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={removeScreenshot}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={captureScreenshot}
                  disabled={isCapturing}
                >
                  {isCapturing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4 mr-2" />
                  )}
                  Capture Screen
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="screenshot-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload Image
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending || !title.trim() || !description.trim()}
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
