'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ClipboardPaste, Check, X } from 'lucide-react'
import { parseEmailSignature, type ParsedSignature } from '@/lib/email-signature-parser'

interface EmailSignatureDialogProps {
  onApply: (parsed: ParsedSignature) => void
  trigger?: React.ReactNode
}

export function EmailSignatureDialog({ onApply, trigger }: EmailSignatureDialogProps) {
  const [open, setOpen] = useState(false)
  const [signatureText, setSignatureText] = useState('')
  const [parsed, setParsed] = useState<ParsedSignature | null>(null)

  const handleParse = () => {
    if (signatureText.trim()) {
      const result = parseEmailSignature(signatureText)
      setParsed(result)
    }
  }

  const handleApply = () => {
    if (parsed) {
      onApply(parsed)
      setOpen(false)
      setSignatureText('')
      setParsed(null)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setSignatureText('')
    setParsed(null)
  }

  const hasResults = parsed && Object.values(parsed).some(v => v)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="button" variant="outline" size="sm">
            <ClipboardPaste className="h-4 w-4 mr-2" />
            Paste Email Signature
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Parse Email Signature</DialogTitle>
          <DialogDescription>
            Paste an email signature to automatically extract contact information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input area */}
          <div className="space-y-2">
            <Label htmlFor="signature">Email Signature</Label>
            <textarea
              id="signature"
              className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
              placeholder={`Paste email signature here...\n\nExample:\nJohn Smith\nSales Manager\nAcme Equipment Inc.\nPhone: (555) 123-4567\njohn@acme.com`}
              value={signatureText}
              onChange={(e) => {
                setSignatureText(e.target.value)
                setParsed(null)
              }}
            />
          </div>

          {/* Parse button */}
          {signatureText && !parsed && (
            <Button type="button" onClick={handleParse} className="w-full">
              Parse Signature
            </Button>
          )}

          {/* Results preview */}
          {parsed && (
            <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Extracted Information</Label>
                {hasResults ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <Check className="h-3 w-3 mr-1" />
                    Found
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-600">
                    <X className="h-3 w-3 mr-1" />
                    No data found
                  </Badge>
                )}
              </div>

              {hasResults && (
                <div className="grid gap-2 text-sm">
                  {parsed.fullName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{parsed.fullName}</span>
                    </div>
                  )}
                  {parsed.title && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Title:</span>
                      <span className="font-medium">{parsed.title}</span>
                    </div>
                  )}
                  {parsed.company && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Company:</span>
                      <span className="font-medium">{parsed.company}</span>
                    </div>
                  )}
                  {parsed.email && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{parsed.email}</span>
                    </div>
                  )}
                  {parsed.phone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">{parsed.phone}</span>
                    </div>
                  )}
                  {parsed.mobile && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mobile:</span>
                      <span className="font-medium">{parsed.mobile}</span>
                    </div>
                  )}
                  {parsed.address && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address:</span>
                      <span className="font-medium text-right max-w-[200px]">{parsed.address}</span>
                    </div>
                  )}
                  {(parsed.city || parsed.state || parsed.zip) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">City/State/Zip:</span>
                      <span className="font-medium">
                        {[parsed.city, parsed.state, parsed.zip].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {parsed && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setParsed(null)
              }}
            >
              Re-parse
            </Button>
          )}
          <Button
            type="button"
            onClick={handleApply}
            disabled={!hasResults}
          >
            Apply to Form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
