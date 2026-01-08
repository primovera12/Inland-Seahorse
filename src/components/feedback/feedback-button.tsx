'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MessageSquarePlus } from 'lucide-react'
import { FeedbackDialog } from './feedback-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function FeedbackButton() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setDialogOpen(true)}
              className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-50 hover:scale-105 transition-transform"
              size="icon"
            >
              <MessageSquarePlus className="h-5 w-5" />
              <span className="sr-only">Submit Feedback</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Submit Feedback</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <FeedbackDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
