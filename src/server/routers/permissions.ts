import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/trpc'
import { checkSupabaseError, assertDataExists } from '@/lib/errors'
import { TRPCError } from '@trpc/server'

const ROLES = ['admin', 'manager', 'member', 'viewer'] as const
const ENTITIES = ['quotes', 'inland_quotes', 'companies', 'contacts', 'equipment', 'templates', 'team', 'settings', 'reports', 'analytics'] as const

export const permissionsRouter = router({
  // === Role Management ===

  // Get current user's role
  getMyRole: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('user_roles')
      .select('role, granted_at')
      .eq('user_id', ctx.user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      checkSupabaseError(error, 'Role')
    }

    return data || { role: 'member', granted_at: null }
  }),

  // Get all permissions for current user's role
  getMyPermissions: protectedProcedure.query(async ({ ctx }) => {
    // Get user's role
    const { data: roleData } = await ctx.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', ctx.user.id)
      .single()

    const role = roleData?.role || 'member'

    // Get permissions for that role
    const { data, error } = await ctx.supabase
      .from('role_permissions')
      .select('*')
      .eq('role', role)

    checkSupabaseError(error, 'Permissions')

    // Convert to a map for easy access
    const permissionsMap: Record<string, {
      can_view: boolean
      can_create: boolean
      can_edit: boolean
      can_delete: boolean
      can_assign: boolean
      can_export: boolean
      can_send: boolean
    }> = {}

    ;(data || []).forEach(p => {
      permissionsMap[p.entity] = {
        can_view: p.can_view,
        can_create: p.can_create,
        can_edit: p.can_edit,
        can_delete: p.can_delete,
        can_assign: p.can_assign,
        can_export: p.can_export,
        can_send: p.can_send,
      }
    })

    return { role, permissions: permissionsMap }
  }),

  // Check specific permission
  checkPermission: protectedProcedure
    .input(z.object({
      entity: z.enum(ENTITIES),
      action: z.enum(['view', 'create', 'edit', 'delete', 'assign', 'export', 'send']),
    }))
    .query(async ({ ctx, input }) => {
      const { data: roleData } = await ctx.supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', ctx.user.id)
        .single()

      const role = roleData?.role || 'member'

      const { data, error } = await ctx.supabase
        .from('role_permissions')
        .select('*')
        .eq('role', role)
        .eq('entity', input.entity)
        .single()

      if (error && error.code !== 'PGRST116') {
        checkSupabaseError(error, 'Permission')
      }

      if (!data) return { allowed: false }

      const actionMap: Record<string, keyof typeof data> = {
        view: 'can_view',
        create: 'can_create',
        edit: 'can_edit',
        delete: 'can_delete',
        assign: 'can_assign',
        export: 'can_export',
        send: 'can_send',
      }

      return { allowed: Boolean(data[actionMap[input.action]]) }
    }),

  // Get all role permissions (admin only)
  getAllPermissions: protectedProcedure.query(async ({ ctx }) => {
    // Verify admin
    const { data: roleData } = await ctx.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', ctx.user.id)
      .single()

    if (roleData?.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
    }

    const { data, error } = await ctx.supabase
      .from('role_permissions')
      .select('*')
      .order('role')
      .order('entity')

    checkSupabaseError(error, 'Permissions')
    return data || []
  }),

  // Update a permission (admin only)
  updatePermission: protectedProcedure
    .input(z.object({
      role: z.enum(ROLES),
      entity: z.enum(ENTITIES),
      can_view: z.boolean().optional(),
      can_create: z.boolean().optional(),
      can_edit: z.boolean().optional(),
      can_delete: z.boolean().optional(),
      can_assign: z.boolean().optional(),
      can_export: z.boolean().optional(),
      can_send: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify admin
      const { data: roleData } = await ctx.supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', ctx.user.id)
        .single()

      if (roleData?.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
      }

      const { role, entity, ...updates } = input

      const { data, error } = await ctx.supabase
        .from('role_permissions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('role', role)
        .eq('entity', entity)
        .select()
        .single()

      checkSupabaseError(error, 'Permission')
      return data
    }),

  // === User Role Assignment ===

  // Get all user roles (admin/manager only)
  getAllUserRoles: protectedProcedure.query(async ({ ctx }) => {
    const { data: roleData } = await ctx.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', ctx.user.id)
      .single()

    if (!['admin', 'manager'].includes(roleData?.role || '')) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Manager access required' })
    }

    const { data, error } = await ctx.supabase
      .from('user_roles')
      .select(`
        *,
        user:auth.users!user_id(id, email, raw_user_meta_data)
      `)
      .order('granted_at', { ascending: false })

    checkSupabaseError(error, 'User roles')
    return data || []
  }),

  // Assign role to user (admin only)
  assignRole: protectedProcedure
    .input(z.object({
      userId: z.string().uuid(),
      role: z.enum(ROLES),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify admin
      const { data: roleData } = await ctx.supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', ctx.user.id)
        .single()

      if (roleData?.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
      }

      // Can't change own role (safety)
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot change your own role' })
      }

      const { data, error } = await ctx.supabase
        .from('user_roles')
        .upsert({
          user_id: input.userId,
          role: input.role,
          granted_by: ctx.user.id,
          granted_at: new Date().toISOString(),
        })
        .select()
        .single()

      checkSupabaseError(error, 'Role assignment')

      // Log audit event
      await ctx.supabase.rpc('log_audit_event', {
        p_user_id: ctx.user.id,
        p_action: 'role_assigned',
        p_entity_type: 'user',
        p_entity_id: input.userId,
        p_new_data: { role: input.role },
        p_metadata: {},
      })

      return data
    }),

  // === Quote Assignment ===

  // Assign quote to user
  assignQuote: protectedProcedure
    .input(z.object({
      quoteId: z.string().uuid(),
      assigneeId: z.string().uuid(),
      quoteType: z.enum(['dismantle', 'inland']),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check permission
      const { data: roleData } = await ctx.supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', ctx.user.id)
        .single()

      const role = roleData?.role || 'member'

      const { data: permData } = await ctx.supabase
        .from('role_permissions')
        .select('can_assign')
        .eq('role', role)
        .eq('entity', input.quoteType === 'dismantle' ? 'quotes' : 'inland_quotes')
        .single()

      if (!permData?.can_assign) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'No permission to assign quotes' })
      }

      const table = input.quoteType === 'dismantle' ? 'quote_history' : 'inland_quotes'

      const { data, error } = await ctx.supabase
        .from(table)
        .update({
          assigned_to: input.assigneeId,
          assigned_at: new Date().toISOString(),
          assigned_by: ctx.user.id,
        })
        .eq('id', input.quoteId)
        .select()
        .single()

      checkSupabaseError(error, 'Quote')

      // Log audit event
      await ctx.supabase.rpc('log_audit_event', {
        p_user_id: ctx.user.id,
        p_action: 'quote_assigned',
        p_entity_type: input.quoteType === 'dismantle' ? 'quote' : 'inland_quote',
        p_entity_id: input.quoteId,
        p_new_data: { assigned_to: input.assigneeId },
        p_metadata: {},
      })

      return data
    }),

  // Unassign quote
  unassignQuote: protectedProcedure
    .input(z.object({
      quoteId: z.string().uuid(),
      quoteType: z.enum(['dismantle', 'inland']),
    }))
    .mutation(async ({ ctx, input }) => {
      const table = input.quoteType === 'dismantle' ? 'quote_history' : 'inland_quotes'

      const { data, error } = await ctx.supabase
        .from(table)
        .update({
          assigned_to: null,
          assigned_at: null,
          assigned_by: null,
        })
        .eq('id', input.quoteId)
        .select()
        .single()

      checkSupabaseError(error, 'Quote')
      return data
    }),

  // Get quotes assigned to user
  getAssignedQuotes: protectedProcedure
    .input(z.object({
      userId: z.string().uuid().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const targetUserId = input?.userId || ctx.user.id

      // Get dismantle quotes
      const { data: dismantleQuotes } = await ctx.supabase
        .from('quote_history')
        .select(`
          id, quote_number, customer_name, status, total, created_at,
          assigned_at, assigned_by
        `)
        .eq('assigned_to', targetUserId)
        .order('assigned_at', { ascending: false })

      // Get inland quotes
      const { data: inlandQuotes } = await ctx.supabase
        .from('inland_quotes')
        .select(`
          id, quote_number, customer_name, status, total, created_at,
          assigned_at, assigned_by
        `)
        .eq('assigned_to', targetUserId)
        .order('assigned_at', { ascending: false })

      return {
        dismantle: dismantleQuotes || [],
        inland: inlandQuotes || [],
        total: (dismantleQuotes?.length || 0) + (inlandQuotes?.length || 0),
      }
    }),

  // Get workload distribution
  getWorkloadDistribution: protectedProcedure.query(async ({ ctx }) => {
    // Get all team members
    const { data: teamMembers } = await ctx.supabase
      .from('team_members')
      .select('user_id, email, first_name, last_name, role')
      .eq('status', 'active')

    if (!teamMembers || teamMembers.length === 0) {
      return []
    }

    const distribution = await Promise.all(
      teamMembers.map(async (member) => {
        // Count assigned dismantle quotes
        const { count: dismantleCount } = await ctx.supabase
          .from('quote_history')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', member.user_id)
          .in('status', ['draft', 'sent', 'viewed'])

        // Count assigned inland quotes
        const { count: inlandCount } = await ctx.supabase
          .from('inland_quotes')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', member.user_id)
          .in('status', ['draft', 'sent', 'viewed'])

        return {
          user_id: member.user_id,
          email: member.email,
          name: `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email,
          role: member.role,
          assigned_quotes: (dismantleCount || 0) + (inlandCount || 0),
          dismantle_quotes: dismantleCount || 0,
          inland_quotes: inlandCount || 0,
        }
      })
    )

    return distribution.sort((a, b) => b.assigned_quotes - a.assigned_quotes)
  }),

  // === Audit Log ===

  // Get audit logs
  getAuditLogs: protectedProcedure
    .input(z.object({
      entityType: z.string().optional(),
      entityId: z.string().uuid().optional(),
      action: z.string().optional(),
      userId: z.string().uuid().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      // Check if admin or manager
      const { data: roleData } = await ctx.supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', ctx.user.id)
        .single()

      const isAdmin = ['admin', 'manager'].includes(roleData?.role || '')

      let query = ctx.supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(input?.limit || 50)
        .range(input?.offset || 0, (input?.offset || 0) + (input?.limit || 50) - 1)

      // Non-admins can only see their own logs
      if (!isAdmin) {
        query = query.eq('user_id', ctx.user.id)
      } else if (input?.userId) {
        query = query.eq('user_id', input.userId)
      }

      if (input?.entityType) {
        query = query.eq('entity_type', input.entityType)
      }
      if (input?.entityId) {
        query = query.eq('entity_id', input.entityId)
      }
      if (input?.action) {
        query = query.eq('action', input.action)
      }
      if (input?.startDate) {
        query = query.gte('created_at', input.startDate)
      }
      if (input?.endDate) {
        query = query.lte('created_at', input.endDate)
      }

      const { data, error, count } = await query

      checkSupabaseError(error, 'Audit logs')
      return { logs: data || [], total: count || 0 }
    }),

  // Log an audit event
  logAudit: protectedProcedure
    .input(z.object({
      action: z.string().min(1),
      entityType: z.string().min(1),
      entityId: z.string().uuid().optional(),
      oldData: z.record(z.string(), z.unknown()).optional(),
      newData: z.record(z.string(), z.unknown()).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.rpc('log_audit_event', {
        p_user_id: ctx.user.id,
        p_action: input.action,
        p_entity_type: input.entityType,
        p_entity_id: input.entityId || null,
        p_old_data: input.oldData || null,
        p_new_data: input.newData || null,
        p_metadata: input.metadata || {},
      })

      if (error) {
        console.error('Audit log error:', error)
      }

      return { success: !error }
    }),
})
