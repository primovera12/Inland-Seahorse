import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@/types/auth'
import { checkRateLimit, RATE_LIMITS, type RateLimitConfig } from '@/lib/rate-limiter'

export type Context = {
  user: User | null
  supabase: Awaited<ReturnType<typeof createClient>>
}

export async function createContext(): Promise<Context> {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  let user: User | null = null

  if (authUser) {
    // Fetch full user profile from users table
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (profile) {
      user = profile as User
    }
  }

  return {
    user,
    supabase,
  }
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure
export const middleware = t.middleware

// Middleware to require authentication
const isAuthed = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  })
})

export const protectedProcedure = t.procedure.use(isAuthed)

// Middleware to require admin role (admin, super_admin, or owner)
const isAdmin = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  const adminRoles = ['admin', 'super_admin', 'owner']
  if (!adminRoles.includes(ctx.user.role)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    })
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  })
})

export const adminProcedure = t.procedure.use(isAdmin)

// Middleware to require manager role or higher (manager, admin, super_admin, owner)
const isManager = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  const managerRoles = ['manager', 'admin', 'super_admin', 'owner']
  if (!managerRoles.includes(ctx.user.role)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Manager access required',
    })
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  })
})

export const managerProcedure = t.procedure.use(isManager)

// Rate limiting middleware factory for public procedures
const createPublicRateLimiter = (config: RateLimitConfig) =>
  middleware(async ({ ctx, next }) => {
    const identifier = ctx.user?.id || 'anonymous'
    const result = checkRateLimit(identifier, config)

    if (!result.success) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Rate limit exceeded. Try again in ${Math.ceil((result.resetAt - Date.now()) / 1000)} seconds.`,
      })
    }

    return next({ ctx })
  })

// Combined auth + rate limit middleware for protected procedures
const createAuthedRateLimiter = (config: RateLimitConfig) =>
  middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    const result = checkRateLimit(ctx.user.id, config)

    if (!result.success) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Rate limit exceeded. Try again in ${Math.ceil((result.resetAt - Date.now()) / 1000)} seconds.`,
      })
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    })
  })

// Pre-configured rate-limited procedures
export const rateLimitedProcedure = {
  // For sensitive auth-related operations (public, but rate limited)
  auth: t.procedure.use(createPublicRateLimiter(RATE_LIMITS.auth)),

  // For creating resources (protected + rate limited)
  create: t.procedure.use(createAuthedRateLimiter(RATE_LIMITS.create)),

  // For email sending operations (protected + rate limited)
  email: t.procedure.use(createAuthedRateLimiter(RATE_LIMITS.email)),

  // For feedback/ticket submissions (protected + rate limited)
  feedback: t.procedure.use(createAuthedRateLimiter(RATE_LIMITS.feedback)),

  // For public quote read operations (no auth, rate limited)
  publicQuoteRead: t.procedure.use(createPublicRateLimiter(RATE_LIMITS.publicQuoteRead)),

  // For public quote actions (accept/reject - no auth, strictly rate limited)
  publicQuoteAction: t.procedure.use(createPublicRateLimiter(RATE_LIMITS.publicQuoteAction)),
}

// Export rate limit configs for custom usage
export { RATE_LIMITS }
