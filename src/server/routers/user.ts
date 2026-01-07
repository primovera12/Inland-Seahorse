import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        first_name: z.string().min(1).optional(),
        last_name: z.string().min(1).optional(),
        avatar_url: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('users')
        .update(input)
        .eq('id', ctx.user.id)
        .select()
        .single()

      if (error) throw error
      return data
    }),
})
