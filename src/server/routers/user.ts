import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '../trpc/trpc'
import { checkSupabaseError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { TRPCError } from '@trpc/server'

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

  // Invite new team member (creates with 'invited' status) - Admin only
  inviteTeamMember: adminProcedure
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

  // Create new team member directly (with 'active' status, no email invite) - Admin only
  createTeamMember: adminProcedure
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
      // Include role in metadata so the database trigger can read it
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
          first_name: input.first_name,
          last_name: input.last_name,
          role: input.role,
        },
      })

      if (authError) {
        throw new Error(`Failed to create user: ${authError.message}`)
      }

      // Use upsert to handle race condition with database trigger
      // The trigger may or may not have created the user record yet
      const { data, error } = await adminClient
        .from('users')
        .upsert({
          id: authData.user.id,
          email: input.email,
          first_name: input.first_name,
          last_name: input.last_name,
          role: input.role,
          is_active: true,
        }, {
          onConflict: 'id',
        })
        .select()
        .single()

      checkSupabaseError(error, 'User')

      // Log user creation activity
      if (data) {
        await ctx.supabase.from('activity_logs').insert({
          user_id: ctx.user.id,
          activity_type: 'user_created',
          subject: `Team member "${input.first_name} ${input.last_name}" created`,
          description: `Added new team member: ${input.first_name} ${input.last_name} (${input.role})`,
          metadata: { new_user_id: data.id, email: input.email, role: input.role },
        })
      }

      return data
    }),

  // Update team member details - Admin only
  updateTeamMember: adminProcedure
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

      // Use admin client to bypass RLS for team management operations
      const adminClient = createAdminClient()
      const { data, error } = await adminClient
        .from('users')
        .update(filteredData)
        .eq('id', userId)
        .select()
        .single()

      checkSupabaseError(error, 'User')
      return data
    }),

  // Update team member role - Admin only
  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        role: roleSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent admins from changing their own role
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot change your own role',
        })
      }

      // Get current user info for logging
      const adminClient = createAdminClient()
      const { data: currentUserData } = await adminClient
        .from('users')
        .select('first_name, last_name, role')
        .eq('id', input.userId)
        .single()

      // Use admin client to bypass RLS for team management operations
      const { data, error } = await adminClient
        .from('users')
        .update({ role: input.role })
        .eq('id', input.userId)
        .select()
        .single()

      checkSupabaseError(error, 'User')

      // Log role update activity
      if (data && currentUserData) {
        await ctx.supabase.from('activity_logs').insert({
          user_id: ctx.user.id,
          activity_type: 'user_updated',
          subject: `Role changed for "${data.first_name} ${data.last_name}"`,
          description: `Changed role from ${currentUserData.role} to ${input.role}`,
          metadata: { target_user_id: data.id, old_role: currentUserData.role, new_role: input.role },
        })
      }

      return data
    }),

  // Update team member status - Admin only
  updateStatus: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        status: z.enum(['active', 'inactive', 'invited']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent admins from deactivating themselves
      if (input.userId === ctx.user.id && input.status === 'inactive') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot deactivate your own account',
        })
      }

      // Use admin client to bypass RLS for team management operations
      const adminClient = createAdminClient()

      // Get current user info for logging
      const { data: currentUserData } = await adminClient
        .from('users')
        .select('first_name, last_name, status, email')
        .eq('id', input.userId)
        .single()

      const { data, error } = await adminClient
        .from('users')
        .update({ status: input.status })
        .eq('id', input.userId)
        .select()
        .single()

      checkSupabaseError(error, 'User')

      // Log the status change activity
      if (data && currentUserData && currentUserData.status !== input.status) {
        const activityType = input.status === 'inactive' ? 'user_deactivated' : 'user_reactivated'
        await ctx.supabase.from('activity_logs').insert({
          user_id: ctx.user.id,
          activity_type: activityType,
          subject: `User "${data.first_name} ${data.last_name}" ${input.status === 'inactive' ? 'deactivated' : 'reactivated'}`,
          description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} ${input.status === 'inactive' ? 'deactivated' : 'reactivated'} user ${data.first_name} ${data.last_name}`.trim(),
          metadata: {
            target_user_id: data.id,
            target_email: data.email,
            previous_status: currentUserData.status,
            new_status: input.status,
          },
        })
      }

      return data
    }),

  // Remove team member - Admin only
  removeTeamMember: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Prevent admins from deleting themselves
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete your own account',
        })
      }

      // Use admin client to bypass RLS for team management operations
      const adminClient = createAdminClient()

      // Get user info before deleting for logging
      const { data: userData } = await adminClient
        .from('users')
        .select('first_name, last_name, email, role')
        .eq('id', input.userId)
        .single()

      const { error } = await adminClient
        .from('users')
        .delete()
        .eq('id', input.userId)

      checkSupabaseError(error, 'User')

      // Log the user deletion activity
      if (userData) {
        await ctx.supabase.from('activity_logs').insert({
          user_id: ctx.user.id,
          activity_type: 'user_deleted',
          subject: `User "${userData.first_name} ${userData.last_name}" deleted`,
          description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} deleted team member ${userData.first_name} ${userData.last_name} (${userData.role})`.trim(),
          metadata: {
            deleted_user_email: userData.email,
            deleted_user_role: userData.role,
          },
        })
      }

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

      // Log password change activity
      await ctx.supabase.from('activity_logs').insert({
        user_id: ctx.user.id,
        activity_type: 'password_changed',
        subject: 'Password changed',
        description: `${ctx.user.first_name || ''} ${ctx.user.last_name || ''} changed their password`.trim(),
        metadata: { email: ctx.user.email },
      })

      return { success: true }
    }),
})
