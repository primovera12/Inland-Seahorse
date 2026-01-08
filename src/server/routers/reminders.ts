import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'
import { checkSupabaseError, assertDataExists } from '@/lib/errors'

const reminderPriorities = ['low', 'medium', 'high', 'urgent'] as const

export const remindersRouter = router({
  // Get all reminders for current user
  getAll: protectedProcedure
    .input(
      z
        .object({
          completed: z.boolean().optional(),
          priority: z.enum(reminderPriorities).optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50
      const offset = input?.offset ?? 0

      let query = ctx.supabase
        .from('follow_up_reminders')
        .select(
          `
          *,
          company:companies(id, name),
          contact:contacts(id, first_name, last_name)
        `,
          { count: 'exact' }
        )
        .eq('user_id', ctx.user.id)
        .order('due_date', { ascending: true })

      if (input?.completed !== undefined) {
        query = query.eq('is_completed', input.completed)
      }

      if (input?.priority) {
        query = query.eq('priority', input.priority)
      }

      const { data, error, count } = await query.range(offset, offset + limit - 1)

      checkSupabaseError(error, 'Reminder')
      return { reminders: data || [], total: count || 0 }
    }),

  // Get upcoming reminders (next 7 days, not completed)
  getUpcoming: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date()
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)

    const { data, error } = await ctx.supabase
      .from('follow_up_reminders')
      .select(
        `
        *,
        company:companies(id, name),
        contact:contacts(id, first_name, last_name)
      `
      )
      .eq('user_id', ctx.user.id)
      .eq('is_completed', false)
      .lte('due_date', nextWeek.toISOString())
      .order('due_date', { ascending: true })
      .limit(10)

    checkSupabaseError(error, 'Reminder')
    return data || []
  }),

  // Get overdue reminders
  getOverdue: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const now = new Date().toISOString()
      const limit = input?.limit ?? 50
      const offset = input?.offset ?? 0

      const { data, error, count } = await ctx.supabase
        .from('follow_up_reminders')
        .select(
          `
          *,
          company:companies(id, name),
          contact:contacts(id, first_name, last_name)
        `,
          { count: 'exact' }
        )
        .eq('user_id', ctx.user.id)
        .eq('is_completed', false)
        .lt('due_date', now)
        .order('due_date', { ascending: true })
        .range(offset, offset + limit - 1)

      checkSupabaseError(error, 'Reminder')
      return { reminders: data || [], total: count || 0 }
    }),

  // Create reminder
  create: protectedProcedure
    .input(
      z.object({
        company_id: z.string().uuid(),
        contact_id: z.string().uuid().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        due_date: z.string(), // ISO date string
        priority: z.enum(reminderPriorities).default('medium'),
        related_quote_id: z.string().uuid().optional(),
        related_activity_id: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('follow_up_reminders')
        .insert({
          ...input,
          user_id: ctx.user.id,
          is_completed: false,
        })
        .select()
        .single()

      checkSupabaseError(error, 'Reminder')
      return data
    }),

  // Update reminder
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        due_date: z.string().optional(),
        priority: z.enum(reminderPriorities).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input

      const { data, error } = await ctx.supabase
        .from('follow_up_reminders')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', ctx.user.id)
        .select()
        .single()

      checkSupabaseError(error, 'Reminder')
      return data
    }),

  // Mark complete/incomplete
  toggleComplete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // First get current state
      const { data: current, error: fetchError } = await ctx.supabase
        .from('follow_up_reminders')
        .select('is_completed')
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .single()

      checkSupabaseError(fetchError, 'Reminder')
      assertDataExists(current, 'Reminder')

      const newState = !current.is_completed
      const { data, error } = await ctx.supabase
        .from('follow_up_reminders')
        .update({
          is_completed: newState,
          completed_at: newState ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .select()
        .single()

      checkSupabaseError(error, 'Reminder')
      return data
    }),

  // Delete reminder
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('follow_up_reminders')
        .delete()
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)

      checkSupabaseError(error, 'Reminder')
      return { success: true }
    }),

  // Get reminder stats
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date().toISOString()

    // Get counts
    const [
      { count: totalCount },
      { count: pendingCount },
      { count: overdueCount },
      { count: completedCount },
    ] = await Promise.all([
      ctx.supabase
        .from('follow_up_reminders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ctx.user.id),
      ctx.supabase
        .from('follow_up_reminders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ctx.user.id)
        .eq('is_completed', false),
      ctx.supabase
        .from('follow_up_reminders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ctx.user.id)
        .eq('is_completed', false)
        .lt('due_date', now),
      ctx.supabase
        .from('follow_up_reminders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ctx.user.id)
        .eq('is_completed', true),
    ])

    return {
      total: totalCount || 0,
      pending: pendingCount || 0,
      overdue: overdueCount || 0,
      completed: completedCount || 0,
    }
  }),

  // === Reminder Rules ===

  // Get all rules
  getRules: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('reminder_rules')
      .select('*')
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })

    checkSupabaseError(error, 'Rule')
    return data || []
  }),

  // Get single rule
  getRuleById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('reminder_rules')
        .select('*')
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .single()

      checkSupabaseError(error, 'Rule')
      assertDataExists(data, 'Rule')
      return data
    }),

  // Create rule
  createRule: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        trigger_event: z.enum([
          'quote_sent',
          'quote_viewed',
          'quote_accepted',
          'quote_rejected',
          'quote_created',
          'quote_expiring',
          'company_created',
          'contact_created',
        ]),
        delay_days: z.number().min(0).max(365).default(3),
        delay_hours: z.number().min(0).max(23).default(0),
        reminder_title: z.string().min(1),
        reminder_description: z.string().optional(),
        reminder_priority: z.enum(reminderPriorities).default('medium'),
        applies_to: z.enum(['all', 'dismantle', 'inland']).default('all'),
        is_active: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('reminder_rules')
        .insert({
          ...input,
          user_id: ctx.user.id,
        })
        .select()
        .single()

      checkSupabaseError(error, 'Rule')
      return data
    }),

  // Update rule
  updateRule: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        trigger_event: z.enum([
          'quote_sent',
          'quote_viewed',
          'quote_accepted',
          'quote_rejected',
          'quote_created',
          'quote_expiring',
          'company_created',
          'contact_created',
        ]).optional(),
        delay_days: z.number().min(0).max(365).optional(),
        delay_hours: z.number().min(0).max(23).optional(),
        reminder_title: z.string().min(1).optional(),
        reminder_description: z.string().optional(),
        reminder_priority: z.enum(reminderPriorities).optional(),
        applies_to: z.enum(['all', 'dismantle', 'inland']).optional(),
        is_active: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input

      const { data, error } = await ctx.supabase
        .from('reminder_rules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', ctx.user.id)
        .select()
        .single()

      checkSupabaseError(error, 'Rule')
      return data
    }),

  // Toggle rule active status
  toggleRuleActive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get current state
      const { data: current, error: fetchError } = await ctx.supabase
        .from('reminder_rules')
        .select('is_active')
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .single()

      checkSupabaseError(fetchError, 'Rule')
      assertDataExists(current, 'Rule')

      const { data, error } = await ctx.supabase
        .from('reminder_rules')
        .update({
          is_active: !current.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .select()
        .single()

      checkSupabaseError(error, 'Rule')
      return data
    }),

  // Delete rule
  deleteRule: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('reminder_rules')
        .delete()
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)

      checkSupabaseError(error, 'Rule')
      return { success: true }
    }),

  // Get rule execution history
  getRuleExecutions: protectedProcedure
    .input(
      z.object({
        ruleId: z.string().uuid().optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('reminder_rule_executions')
        .select(`
          *,
          rule:reminder_rules(id, name, trigger_event)
        `)
        .order('executed_at', { ascending: false })
        .limit(input.limit)

      if (input.ruleId) {
        query = query.eq('rule_id', input.ruleId)
      }

      // Filter to only user's rules
      const { data: userRules } = await ctx.supabase
        .from('reminder_rules')
        .select('id')
        .eq('user_id', ctx.user.id)

      const ruleIds = userRules?.map(r => r.id) || []
      if (ruleIds.length > 0) {
        query = query.in('rule_id', ruleIds)
      }

      const { data, error } = await query

      checkSupabaseError(error, 'Execution')
      return data || []
    }),
})
