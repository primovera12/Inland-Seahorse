'use client'

import { useState, useRef, useEffect } from 'react'
import html2canvas from 'html2canvas'
import { supabase, Ticket, TicketType, TicketPriority, TICKET_TYPES, TICKET_PRIORITIES, TICKET_PAGES } from '@/lib/supabase'

interface FloatingTicketButtonProps {
  currentPage?: string
  onSuccess?: () => void
}

// Generate ticket number
function generateTicketNumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `TKT-${year}${month}${day}-${random}`
}

export default function FloatingTicketButton({ currentPage = 'general', onSuccess }: FloatingTicketButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ticketType, setTicketType] = useState<TicketType>('feature')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [page, setPage] = useState(currentPage)
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [submitterName, setSubmitterName] = useState('')
  const [submitterEmail, setSubmitterEmail] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Update page when currentPage prop changes
  useEffect(() => {
    setPage(currentPage)
  }, [currentPage])

  // Close modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        if (isOpen && !isSubmitting) {
          // Don't close if form has content
          if (title || description || screenshot) {
            return // Let user explicitly close
          }
          setIsOpen(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, isSubmitting, title, description, screenshot])

  // Capture screenshot of the current page
  const captureScreenshot = async () => {
    setIsCapturing(true)
    setIsOpen(false) // Temporarily close modal for clean screenshot

    try {
      // Wait a bit for modal to close
      await new Promise(resolve => setTimeout(resolve, 300))

      const canvas = await html2canvas(document.body, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const dataUrl = canvas.toDataURL('image/png')
      setScreenshot(dataUrl)
      setIsOpen(true)
    } catch (err) {
      console.error('Error capturing screenshot:', err)
      setError('Failed to capture screenshot')
      setIsOpen(true)
    } finally {
      setIsCapturing(false)
    }
  }

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setScreenshot(event.target?.result as string)
    }
    reader.onerror = () => {
      setError('Failed to read image file')
    }
    reader.readAsDataURL(file)
  }

  // Reset form
  const resetForm = () => {
    setTitle('')
    setDescription('')
    setTicketType('feature')
    setPriority('medium')
    setPage(currentPage)
    setScreenshot(null)
    setSubmitterName('')
    setSubmitterEmail('')
    setError(null)
  }

  // Submit ticket
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (!description.trim()) {
      setError('Description is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const ticketNumber = generateTicketNumber()
      const now = new Date().toISOString()

      const ticketData = {
        ticket_number: ticketNumber,
        title: title.trim(),
        description: description.trim(),
        type: ticketType,
        status: 'new' as const,
        priority: priority,
        page: page,
        screenshot_base64: screenshot,
        submitted_by: submitterName.trim() || null,
        submitted_email: submitterEmail.trim() || null,
        admin_notes: null,
        resolved_at: null,
        created_at: now,
        updated_at: now,
      }

      const { data, error: insertError } = await supabase
        .from('tickets')
        .insert(ticketData)
        .select()
        .single()

      if (insertError) throw insertError

      // Send email notification
      try {
        await fetch('/api/tickets/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketNumber,
            title: title.trim(),
            description: description.trim(),
            type: ticketType,
            priority,
            page,
            submitterName: submitterName.trim() || 'Anonymous',
            submitterEmail: submitterEmail.trim() || 'Not provided',
          }),
        })
      } catch (emailErr) {
        console.error('Failed to send email notification:', emailErr)
        // Don't fail the ticket submission if email fails
      }

      setSuccessMessage(`Ticket ${ticketNumber} submitted successfully!`)
      resetForm()

      setTimeout(() => {
        setSuccessMessage(null)
        setIsOpen(false)
      }, 2000)

      onSuccess?.()
    } catch (err) {
      console.error('Error submitting ticket:', err)
      setError('Failed to submit ticket. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        disabled={isCapturing}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
        title="Report Issue / Request Feature"
      >
        {isCapturing ? (
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        )}
        <span className="absolute right-full mr-3 bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Report Issue / Request Feature
        </span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            ref={modalRef}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Submit a Ticket</h2>
                  <p className="text-sm text-purple-200">Report an issue or request a feature</p>
                </div>
                <button
                  onClick={() => {
                    if (!isSubmitting) {
                      setIsOpen(false)
                      resetForm()
                    }
                  }}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {successMessage}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {TICKET_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setTicketType(type.value)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                        ticketType === type.value
                          ? type.value === 'feature'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : type.value === 'update'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {TICKET_PRIORITIES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Page/Service */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Related Page/Service</label>
                <select
                  value={page}
                  onChange={(e) => setPage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {TICKET_PAGES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief summary of the issue or request"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isSubmitting}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue in detail, or explain what feature you'd like..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  disabled={isSubmitting}
                />
              </div>

              {/* Screenshot Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Screenshot</label>
                <div className="space-y-2">
                  {screenshot ? (
                    <div className="relative">
                      <img
                        src={screenshot}
                        alt="Screenshot"
                        className="w-full h-40 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => setScreenshot(null)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        title="Remove screenshot"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={captureScreenshot}
                        disabled={isCapturing}
                        className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Capture Screen
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Upload Image
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Submitter Info (Optional) */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-500 mb-3">Optional: Your contact info for follow-up</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Your Name</label>
                    <input
                      type="text"
                      value={submitterName}
                      onChange={(e) => setSubmitterName(e.target.value)}
                      placeholder="Name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Your Email</label>
                    <input
                      type="email"
                      value={submitterEmail}
                      onChange={(e) => setSubmitterEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !description.trim()}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Submit Ticket
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
