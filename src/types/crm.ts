// CRM domain types

export const COMPANY_STATUSES = [
  'active',
  'inactive',
  'prospect',
  'lead',
  'vip',
] as const

export type CompanyStatus = (typeof COMPANY_STATUSES)[number]

export const CONTACT_ROLES = [
  'general',
  'decision_maker',
  'billing',
  'operations',
  'technical',
] as const

export type ContactRole = (typeof CONTACT_ROLES)[number]

export const ACTIVITY_TYPES = [
  'call',
  'email',
  'meeting',
  'note',
  'task',
  'quote_sent',
  'quote_accepted',
  'quote_rejected',
  'follow_up',
] as const

export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export const REMINDER_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const

export type ReminderPriority = (typeof REMINDER_PRIORITIES)[number]

// Unified customer entity (merges old customers + companies tables)
export interface Company {
  id: string
  name: string
  industry?: string
  website?: string
  phone?: string

  // Primary address
  address?: string
  city?: string
  state?: string
  zip?: string

  // Billing address
  billing_address?: string
  billing_city?: string
  billing_state?: string
  billing_zip?: string

  // Business info
  payment_terms?: string
  tax_id?: string
  credit_limit?: number // cents
  account_number?: string

  // Categorization
  tags: string[]
  status: CompanyStatus

  // Stats
  total_quotes: number
  total_revenue: number // cents
  last_quote_at?: string
  last_activity_at?: string

  // Timestamps
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  company_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  mobile?: string
  title?: string
  role: ContactRole
  is_primary: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  company_id: string
  contact_id?: string
  user_id: string
  activity_type: ActivityType
  subject: string
  description?: string
  related_quote_id?: string
  related_inland_quote_id?: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface FollowUpReminder {
  id: string
  company_id: string
  contact_id?: string
  user_id: string
  title: string
  description?: string
  due_date: string
  priority: ReminderPriority
  is_completed: boolean
  completed_at?: string
  related_quote_id?: string
  related_activity_id?: string
  created_at: string
  updated_at: string
}
