import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'
import { checkSupabaseError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'

const roleSchema = z.enum(['admin', 'manager', 'member', 'viewer'])

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        first_name: z.string().min(1).optional(),
        last_name: z.string().min(1).optional(),
        avatar_url: z.string().url().or(z.literal('')).transform(val => val === '' ? undefined : val).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('users')
        .update(input)
        .eq('id', ctx.user.id)
        .select()
        .single()

      checkSupabaseError(error, 'User')
      return data
    }),

  // Get all team members
  getTeamMembers: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1)

      if (input.search) {
        query = query.or(
          `first_name.ilike.%${input.search}%,last_name.ilike.%${input.search}%,email.ilike.%${input.search}%`
        )
      }

      const { data, error, count } = await query
      checkSupabaseError(error, 'User')
      return { users: data, total: count }
    }),

  // Invite new team member (creates with 'invited' status)
  inviteTeamMember: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        first_name: z.string().min(1),
        last_name: z.string().min(1),
        role: roleSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create user record (they'll need to set password via email)
      const { data, error } = await ctx.supabase
        .from('users')
        .insert({
          email: input.email,
          first_name: input.first_name,
          last_name: input.last_name,
          role: input.role,
          status: 'invited',
        })
        .select()
        .single()

      checkSupabaseError(error, 'User')
      return data
    }),

  // Create new team member directly (with 'active' status, no email invite)
  createTeamMember: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        first_name: z.string().min(1),
        last_name: z.string().min(1),
        role: roleSchema,
        password: z.string().min(8, 'Password must be at least 8 characters'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create admin client with service role key for user creation
      const adminClient = createAdminClient()

      // Create auth user with password using admin API
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
          first_name: input.first_name,
          last_name: input.last_name,
        },
      })

      if (authError) {
        throw new Error(`Failed to create user: ${authError.message}`)
      }

      // Update the user record with additional fields using admin client to bypass RLS
      const { data, error } = await adminClient
        .from('users')
        .update({
          first_name: input.first_name,
          last_name: input.last_name,
          role: input.role,
          is_active: true,
        })
        .eq('id', authData.user.id)
        .select()
        .single()

      checkSupabaseError(error, 'User')
      return data
    }),

  // Update team member details
  updateTeamMember: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        email: z.string().email().optional(),
        first_name: z.string().min(1).optional(),
        last_name: z.string().min(1).optional(),
        role: roleSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, ...updateData } = input
      // Filter out undefined values
      const filteredData = Object.fromEntries(
        Object.entries(updateData).filter(([, v]) => v !== undefined)
      )

      const { data, error } = await ctx.supabase
        .from('users')
        .update(filteredData)
        .eq('id', userId)
        .select()
        .single()

      checkSupabaseError(error, 'User')
      return data
    }),

  // Update team member role
  updateRole: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        role: roleSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('users')
        .update({ role: input.role })
        .eq('id', input.userId)
        .select()
        .single()

      checkSupabaseError(error, 'User')
      return data
    }),

  // Update team member status
  updateStatus: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        status: z.enum(['active', 'inactive', 'invited']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('users')
        .update({ status: input.status })
        .eq('id', input.userId)
        .select()
        .single()

      checkSupabaseError(error, 'User')
      return data
    }),

  // Remove team member
  removeTeamMember: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('users')
        .delete()
        .eq('id', input.userId)

      checkSupabaseError(error, 'User')
      return { success: true }
    }),

  // Change password
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z.string().min(8, 'Password must be at least 8 characters'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // First verify the current password by attempting to sign in
      const { error: signInError } = await ctx.supabase.auth.signInWithPassword({
        email: ctx.user.email,
        password: input.currentPassword,
      })

      if (signInError) {
        throw new Error('Current password is incorrect')
      }

      // Update to the new password
      const { error: updateError } = await ctx.supabase.auth.updateUser({
        password: input.newPassword,
      })

      if (updateError) {
        throw new Error(`Failed to update password: ${updateError.message}`)
      }

      return { success: true }
    }),
})
