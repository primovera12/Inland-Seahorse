// Feedback/Ticket System Types

export const TICKET_TYPES = ['bug', 'feature', 'enhancement', 'question'] as const
export type TicketType = (typeof TICKET_TYPES)[number]

export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const
export type TicketPriority = (typeof TICKET_PRIORITIES)[number]

export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]

export interface Ticket {
  id: string
  ticket_number: string
  type: TicketType
  priority: TicketPriority
  status: TicketStatus
  title: string
  description: string
  page_url: string
  screenshot_url?: string
  submitted_by: string
  submitted_by_email: string
  submitted_by_name?: string
  admin_notes?: string
  resolved_at?: string
  created_at: string
  updated_at: string
}

export interface TicketSubmission {
  type: TicketType
  priority: TicketPriority
  title: string
  description: string
  page_url: string
  screenshot_base64?: string
}

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  bug: 'Bug Report',
  feature: 'Feature Request',
  enhancement: 'Enhancement',
  question: 'Question',
}

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

export const TICKET_TYPE_COLORS: Record<TicketType, string> = {
  bug: 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400',
  feature: 'text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400',
  enhancement: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400',
  question: 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400',
}

export const TICKET_PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: 'text-gray-600 bg-gray-50 dark:bg-gray-900 dark:text-gray-400',
  medium: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400',
  high: 'text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400',
  critical: 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400',
}

export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400',
  in_progress: 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400',
  resolved: 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400',
  closed: 'text-gray-600 bg-gray-50 dark:bg-gray-900 dark:text-gray-400',
}
