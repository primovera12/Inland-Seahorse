import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '../trpc/trpc'
import { checkSupabaseError } from '@/lib/errors'

const activityTypes = [
  // CRM activities
  'call',
  'email',
  'meeting',
  'note',
  'task',
  'quote_sent',
  'quote_accepted',
  'quote_rejected',
  'follow_up',
  // System events
  'login',
  'logout',
  'quote_created',
  'quote_updated',
  'quote_deleted',
  'inland_quote_created',
  'inland_quote_updated',
  'inland_quote_deleted',
  'company_created',
  'company_updated',
  'contact_created',
  'contact_updated',
  'user_created',
  'user_updated',
  'settings_updated',
  'password_changed',
] as const

export const activityRouter = router({
  // Get recent activities
  getRecent: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20
      const offset = input?.offset ?? 0

      const { data, error, count } = await ctx.supabase
        .from('activity_logs')
        .select(
          `
          *,
          company:companies(id, name),
          contact:contacts(id, first_name, last_name),
          user:users(id, first_name, last_name, email)
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      checkSupabaseError(error, 'Activity')
      return { activities: data || [], total: count || 0 }
    }),

  // Get activities for a company
  getByCompany: protectedProcedure
    .input(
      z.object({
        companyId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data, error, count } = await ctx.supabase
        .from('activity_logs')
        .select(
          `
          *,
          contact:contacts(id, first_name, last_name),
          user:users(id, first_name, last_name, email)
        `,
          { count: 'exact' }
        )
        .eq('company_id', input.companyId)
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1)

      checkSupabaseError(error, 'Activity')
      return { activities: data || [], total: count || 0 }
    }),

  // Create activity
  create: protectedProcedure
    .input(
      z.object({
        company_id: z.string().uuid(),
        contact_id: z.string().uuid().optional(),
        activity_type: z.enum(activityTypes),
        subject: z.string().min(1),
        description: z.string().optional(),
        related_quote_id: z.string().uuid().optional(),
        related_inland_quote_id: z.string().uuid().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('activity_logs')
        .insert({
          ...input,
          user_id: ctx.user.id,
        })
        .select()
        .single()

      checkSupabaseError(error, 'Activity')

      // Update company's last_activity_at
      await ctx.supabase
        .from('companies')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', input.company_id)

      return data
    }),

  // Delete activity
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('activity_logs')
        .delete()
        .eq('id', input.id)

      checkSupabaseError(error, 'Activity')
      return { success: true }
    }),

  // Get comprehensive timeline for a company (combines activities, quotes, and status changes)
  getCompanyTimeline: protectedProcedure
    .input(
      z.object({
        companyId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      type TimelineEvent = {
        id: string
        type: 'activity' | 'dismantle_quote' | 'inland_quote' | 'status_change'
        title: string
        description?: string
        status?: string
        amount?: number
        created_at: string
        metadata?: Record<string, unknown>
      }

      const timeline: TimelineEvent[] = []

      // Get activities
      const { data: activities } = await ctx.supabase
        .from('activity_logs')
        .select('*')
        .eq('company_id', input.companyId)
        .order('created_at', { ascending: false })
        .limit(input.limit)

      activities?.forEach((activity) => {
        timeline.push({
          id: activity.id,
          type: 'activity',
          title: activity.subject,
          description: activity.description,
          created_at: activity.created_at,
          metadata: {
            activity_type: activity.activity_type,
          },
        })
      })

      // Get dismantle quotes
      const { data: dismantleQuotes } = await ctx.supabase
        .from('quote_history')
        .select('id, quote_number, status, customer_name, make_name, model_name, total, created_at')
        .eq('company_id', input.companyId)
        .order('created_at', { ascending: false })
        .limit(input.limit)

      dismantleQuotes?.forEach((quote) => {
        timeline.push({
          id: quote.id,
          type: 'dismantle_quote',
          title: `Quote ${quote.quote_number}`,
          description: `${quote.make_name} ${quote.model_name}`,
          status: quote.status,
          amount: quote.total,
          created_at: quote.created_at,
        })
      })

      // Get inland quotes
      const { data: inlandQuotes } = await ctx.supabase
        .from('inland_quotes')
        .select('id, quote_number, status, customer_name, origin_city, origin_state, destination_city, destination_state, total, created_at')
        .eq('company_id', input.companyId)
        .order('created_at', { ascending: false })
        .limit(input.limit)

      inlandQuotes?.forEach((quote) => {
        timeline.push({
          id: quote.id,
          type: 'inland_quote',
          title: `Inland Quote ${quote.quote_number}`,
          description: `${quote.origin_city}, ${quote.origin_state} → ${quote.destination_city}, ${quote.destination_state}`,
          status: quote.status,
          amount: quote.total,
          created_at: quote.created_at,
        })
      })

      // Sort by date descending and limit
      timeline.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      return timeline.slice(0, input.limit)
    }),

  // Get activity stats
  getStats: protectedProcedure.query(async ({ ctx }) => {
    // Get activity counts by type for this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: monthlyActivities } = await ctx.supabase
      .from('activity_logs')
      .select('activity_type')
      .gte('created_at', startOfMonth.toISOString())

    const byType: Record<string, number> = {}
    monthlyActivities?.forEach((a) => {
      byType[a.activity_type] = (byType[a.activity_type] || 0) + 1
    })

    // Get total activities
    const { count: totalActivities } = await ctx.supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })

    return {
      totalActivities: totalActivities || 0,
      monthlyByType: byType,
      monthlyTotal: monthlyActivities?.length || 0,
    }
  }),

  // Admin-only: Get all activities with filtering
  getAllActivities: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        activityType: z.enum(activityTypes).optional(),
        userId: z.string().uuid().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('activity_logs')
        .select(
          `
          *,
          company:companies(id, name),
          contact:contacts(id, first_name, last_name),
          user:users(id, first_name, last_name, email)
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })

      // Apply filters
      if (input.activityType) {
        query = query.eq('activity_type', input.activityType)
      }

      if (input.userId) {
        query = query.eq('user_id', input.userId)
      }

      if (input.startDate) {
        query = query.gte('created_at', input.startDate)
      }

      if (input.endDate) {
        query = query.lte('created_at', input.endDate)
      }

      if (input.search) {
        query = query.or(`subject.ilike.%${input.search}%,description.ilike.%${input.search}%`)
      }

      // Apply pagination
      query = query.range(input.offset, input.offset + input.limit - 1)

      const { data, error, count } = await query

      checkSupabaseError(error, 'Activity')
      return { activities: data || [], total: count || 0 }
    }),

  // Log a system event (for tracking user actions)
  logSystemEvent: protectedProcedure
    .input(
      z.object({
        activity_type: z.enum(activityTypes),
        subject: z.string().min(1),
        description: z.string().optional(),
        company_id: z.string().uuid().optional(),
        contact_id: z.string().uuid().optional(),
        related_quote_id: z.string().uuid().optional(),
        related_inland_quote_id: z.string().uuid().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('activity_logs')
        .insert({
          ...input,
          user_id: ctx.user.id,
        })
        .select()
        .single()

      checkSupabaseError(error, 'Activity')
      return data
    }),

  // Record user login - updates last_login_at and logs activity
  recordLogin: protectedProcedure.mutation(async ({ ctx }) => {
    // Update last_login_at timestamp
    await ctx.supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', ctx.user.id)

    // Log the login event
    const { data, error } = await ctx.supabase
      .from('activity_logs')
      .insert({
        user_id: ctx.user.id,
        activity_type: 'login',
        subject: 'User logged in',
        description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} logged in`.trim(),
        metadata: {
          email: ctx.user.email,
          ip_address: null, // Could be added via headers if needed
          user_agent: null,
        },
      })
      .select()
      .single()

    checkSupabaseError(error, 'Activity')
    return { success: true, activity: data }
  }),
})
