import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'

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

      if (error) throw error
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

    if (error) throw error
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

      if (error) throw error
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

      if (error) throw error
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

      if (error) throw error
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

      if (fetchError) throw fetchError

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

      if (error) throw error
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

      if (error) throw error
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
})
