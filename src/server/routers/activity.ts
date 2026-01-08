import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'

const activityTypes = [
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

      if (error) throw error
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

      if (error) throw error
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

      if (error) throw error

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

      if (error) throw error
      return { success: true }
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
})
