import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'

export const notificationsRouter = router({
  // Get user notifications
  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        unreadOnly: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1)

      if (input.unreadOnly) {
        query = query.eq('read', false)
      }

      const { data, error, count } = await query
      if (error) throw error
      return { notifications: data, total: count }
    }),

  // Get unread count
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const { count, error } = await ctx.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', ctx.user.id)
      .eq('read', false)

    if (error) throw error
    return { count: count || 0 }
  }),

  // Mark as read
  markAsRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)

      if (error) throw error
      return { success: true }
    }),

  // Mark all as read
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const { error } = await ctx.supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', ctx.user.id)
      .eq('read', false)

    if (error) throw error
    return { success: true }
  }),

  // Delete notification
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('notifications')
        .delete()
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)

      if (error) throw error
      return { success: true }
    }),

  // Clear all notifications
  clearAll: protectedProcedure.mutation(async ({ ctx }) => {
    const { error } = await ctx.supabase
      .from('notifications')
      .delete()
      .eq('user_id', ctx.user.id)

    if (error) throw error
    return { success: true }
  }),

  // Create notification (internal use)
  create: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        type: z.enum(['quote_accepted', 'quote_rejected', 'reminder', 'system', 'mention']),
        title: z.string(),
        message: z.string(),
        link: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('notifications')
        .insert({
          user_id: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          link: input.link,
          metadata: input.metadata,
          read: false,
        })
        .select()
        .single()

      if (error) throw error
      return data
    }),
})
