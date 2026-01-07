'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { Mail, Send, Paperclip } from 'lucide-react'

interface EmailQuoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quoteId: string
  quoteType: 'dismantle' | 'inland'
  quoteNumber: string
  customerName?: string
  customerEmail?: string
}

export function EmailQuoteDialog({
  open,
  onOpenChange,
  quoteId,
  quoteType,
  quoteNumber,
  customerName,
  customerEmail,
}: EmailQuoteDialogProps) {
  const [form, setForm] = useState({
    recipientEmail: customerEmail || '',
    recipientName: customerName || '',
    subject: `Quote #${quoteNumber} from Dismantle Pro`,
    message: `Dear ${customerName || 'Customer'},\n\nPlease find attached your quote #${quoteNumber}.\n\nIf you have any questions, please don't hesitate to reach out.\n\nBest regards,\nDismantle Pro Team`,
    includePdf: true,
  })

  const sendEmail = trpc.email.sendQuote.useMutation({
    onSuccess: () => {
      toast.success('Quote sent successfully')
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(`Failed to send email: ${error.message}`)
    },
  })

  const handleSend = () => {
    if (!form.recipientEmail) {
      toast.error('Please enter recipient email')
      return
    }
    if (!form.recipientName) {
      toast.error('Please enter recipient name')
      return
    }

    sendEmail.mutate({
      quoteId,
      quoteType,
      recipientEmail: form.recipientEmail,
      recipientName: form.recipientName,
      subject: form.subject,
      message: form.message,
      includePdf: form.includePdf,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Quote via Email
          </DialogTitle>
          <DialogDescription>
            Send quote #{quoteNumber} to your customer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name *</Label>
              <Input
                id="recipientName"
                value={form.recipientName}
                onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient Email *</Label>
              <Input
                id="recipientEmail"
                type="email"
                value={form.recipientEmail}
                onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })}
                placeholder="john@company.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <textarea
              id="message"
              className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includePdf"
              checked={form.includePdf}
              onCheckedChange={(checked) => setForm({ ...form, includePdf: checked as boolean })}
            />
            <Label htmlFor="includePdf" className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attach PDF quote
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sendEmail.isPending}>
            <Send className="h-4 w-4 mr-2" />
            {sendEmail.isPending ? 'Sending...' : 'Send Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
