# Rebuild Plan Addendum: User Management, Permissions & Missing Features

This addendum extends the main REBUILD_PLAN.md with comprehensive user management, permissions system, and additional features that were missing from the initial plan.

---

## Part 11: Authentication & User Management

### 11.1 Authentication System

#### Authentication Methods
| Method | Priority | Implementation |
|--------|----------|----------------|
| Email/Password | P0 | Supabase Auth |
| Magic Link (Passwordless) | P1 | Supabase Auth |
| Google OAuth | P2 | Supabase Auth |
| Microsoft OAuth | P2 | Supabase Auth (for enterprise) |
| SSO/SAML | P3 | Supabase Auth (enterprise tier) |

#### Auth Features
- [ ] Sign up with email verification
- [ ] Login with email/password
- [ ] Password reset flow
- [ ] Remember me / persistent sessions
- [ ] Session management (view active sessions)
- [ ] Logout from all devices
- [ ] Two-factor authentication (2FA)
- [ ] Account lockout after failed attempts
- [ ] Password strength requirements
- [ ] Login audit log

#### Auth Screens
| Screen | Route | Description |
|--------|-------|-------------|
| Login | `/login` | Email/password + OAuth buttons |
| Register | `/register` | New account + organization setup |
| Forgot Password | `/forgot-password` | Password reset request |
| Reset Password | `/reset-password` | Set new password |
| Verify Email | `/verify-email` | Email verification |
| 2FA Setup | `/settings/security/2fa` | Enable/disable 2FA |
| Sessions | `/settings/security/sessions` | View/revoke sessions |

### 11.2 User Types & Roles

#### Role Hierarchy
```
┌─────────────────────────────────────────────────────────────┐
│                        SUPER ADMIN                          │
│   (System-wide access, can access all organizations)        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     ORGANIZATION OWNER                       │
│   (Full access to their organization, billing, delete org)  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                          ADMIN                               │
│   (Full access except billing & org deletion)               │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                         MANAGER                              │
│   (Can manage team members, full operational access)        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                          MEMBER                              │
│   (Standard user, can create/edit own content)              │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                          VIEWER                              │
│   (Read-only access to assigned resources)                  │
└─────────────────────────────────────────────────────────────┘
```

#### Role Definitions

```typescript
// types/roles.ts
export type Role = 'super_admin' | 'owner' | 'admin' | 'manager' | 'member' | 'viewer';

export interface RoleDefinition {
  name: string;
  description: string;
  level: number;  // Higher = more permissions
  permissions: Permission[];
}

export const ROLES: Record<Role, RoleDefinition> = {
  super_admin: {
    name: 'Super Admin',
    description: 'System administrator with access to all organizations',
    level: 100,
    permissions: ['*'],  // All permissions
  },
  owner: {
    name: 'Owner',
    description: 'Organization owner with full access',
    level: 90,
    permissions: [
      'org:manage', 'org:billing', 'org:delete',
      'users:*', 'customers:*', 'quotes:*', 'equipment:*',
      'inland:*', 'settings:*', 'reports:*'
    ],
  },
  admin: {
    name: 'Admin',
    description: 'Administrator with full operational access',
    level: 80,
    permissions: [
      'org:manage',
      'users:read', 'users:create', 'users:update',
      'customers:*', 'quotes:*', 'equipment:*',
      'inland:*', 'settings:*', 'reports:*'
    ],
  },
  manager: {
    name: 'Manager',
    description: 'Team manager with elevated permissions',
    level: 60,
    permissions: [
      'users:read',
      'customers:*', 'quotes:*', 'equipment:read', 'equipment:update',
      'inland:*', 'settings:read', 'reports:read'
    ],
  },
  member: {
    name: 'Member',
    description: 'Standard team member',
    level: 40,
    permissions: [
      'customers:read', 'customers:create', 'customers:update',
      'quotes:read', 'quotes:create', 'quotes:update',
      'equipment:read',
      'inland:read', 'inland:create', 'inland:update',
      'settings:read'
    ],
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access',
    level: 20,
    permissions: [
      'customers:read', 'quotes:read', 'equipment:read',
      'inland:read', 'settings:read'
    ],
  },
};
```

### 11.3 Permissions System

#### Permission Structure
```
resource:action
resource:action:scope

Examples:
- customers:read           → Can read all customers
- customers:create         → Can create customers
- customers:update         → Can update customers
- customers:delete         → Can delete customers
- customers:*              → All customer permissions
- quotes:update:own        → Can only update own quotes
- quotes:update:team       → Can update team's quotes
- quotes:update:all        → Can update all quotes
```

#### Permission Matrix

| Resource | Actions | Scopes |
|----------|---------|--------|
| `org` | manage, billing, delete | - |
| `users` | read, create, update, delete, invite | - |
| `customers` | read, create, update, delete, import, export | own, team, all |
| `contacts` | read, create, update, delete | own, team, all |
| `quotes` | read, create, update, delete, send, approve | own, team, all |
| `inland` | read, create, update, delete, send | own, team, all |
| `equipment` | read, create, update, delete | - |
| `rates` | read, update | - |
| `activities` | read, create, update, delete | own, team, all |
| `reminders` | read, create, update, delete | own, team, all |
| `settings` | read, update | general, branding, templates, locations |
| `reports` | read, export | - |
| `tickets` | read, create, update | own, all |

#### Database Schema for Permissions

```sql
-- User roles (simple role-based)
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'member'
  CHECK (role IN ('super_admin', 'owner', 'admin', 'manager', 'member', 'viewer'));

-- Custom permissions (for fine-grained control)
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  permission TEXT NOT NULL,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- Optional expiration
  UNIQUE(user_id, permission)
);

-- Permission groups (for reusable permission sets)
CREATE TABLE permission_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- User-group assignments
CREATE TABLE user_permission_groups (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES permission_groups(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, group_id)
);

-- Team structure (for scope-based permissions)
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_members (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('manager', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);
```

#### Permission Check Implementation

```typescript
// lib/auth/permissions.ts
import { ROLES, Role, Permission } from '@/types/roles';

export function hasPermission(
  user: { role: Role; permissions?: string[] },
  requiredPermission: string
): boolean {
  // Super admin has all permissions
  if (user.role === 'super_admin') return true;

  // Check role-based permissions
  const rolePermissions = ROLES[user.role]?.permissions || [];

  // Check for wildcard permission
  if (rolePermissions.includes('*')) return true;

  // Check for resource wildcard (e.g., 'customers:*')
  const [resource, action] = requiredPermission.split(':');
  if (rolePermissions.includes(`${resource}:*`)) return true;

  // Check exact permission
  if (rolePermissions.includes(requiredPermission)) return true;

  // Check custom permissions
  if (user.permissions?.includes(requiredPermission)) return true;

  return false;
}

// React hook for permission checks
export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  return useMemo(() => hasPermission(user, permission), [user, permission]);
}

// Component for conditional rendering
export function Can({
  permission,
  children,
  fallback = null
}: {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const allowed = usePermission(permission);
  return allowed ? children : fallback;
}

// Usage example
<Can permission="quotes:delete">
  <Button variant="destructive" onClick={handleDelete}>Delete Quote</Button>
</Can>
```

### 11.4 User Management Screens

| Screen | Route | Description |
|--------|-------|-------------|
| User List | `/settings/users` | All organization users |
| Invite User | `/settings/users/invite` | Send invitation |
| User Detail | `/settings/users/[id]` | User profile & permissions |
| Edit Permissions | `/settings/users/[id]/permissions` | Customize permissions |
| Teams | `/settings/teams` | Team management |
| Team Detail | `/settings/teams/[id]` | Team members |
| Permission Groups | `/settings/permissions` | Create/manage groups |
| Audit Log | `/settings/audit` | User activity audit |

### 11.5 User Management Features

- [ ] Invite users by email
- [ ] Accept invitation flow
- [ ] User profile management
- [ ] Change user role
- [ ] Custom permission assignment
- [ ] Permission group management
- [ ] Team creation & management
- [ ] Deactivate user (soft delete)
- [ ] Delete user (hard delete)
- [ ] Transfer ownership
- [ ] User activity history
- [ ] Last login tracking
- [ ] Export user list

---

## Part 12: Additional Missing Features

### 12.1 Audit Logging

Track all important actions in the system.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),

  -- What happened
  action TEXT NOT NULL,  -- 'create', 'update', 'delete', 'login', 'export', etc.
  resource_type TEXT NOT NULL,  -- 'quote', 'customer', 'user', etc.
  resource_id UUID,

  -- Details
  changes JSONB,  -- { field: { old: x, new: y } }
  metadata JSONB,  -- Additional context

  -- Request info
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
```

**Audit Events:**
- User login/logout
- User created/updated/deleted
- Customer created/updated/deleted
- Quote created/updated/deleted/sent/accepted
- Settings changed
- Data exported
- Bulk operations

### 12.2 Email Notifications

```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,  -- 'quote_sent', 'quote_accepted', 'reminder', etc.
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables TEXT[],  -- Available merge fields
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  template_id UUID REFERENCES email_templates(id),

  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),

  -- Tracking
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  -- Reference
  related_type TEXT,  -- 'quote', 'inland_quote', 'reminder'
  related_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Notification Types:**
| Trigger | Email | In-App | Push (future) |
|---------|-------|--------|---------------|
| Quote sent | ✅ | ✅ | ❌ |
| Quote viewed | ❌ | ✅ | ❌ |
| Quote accepted | ✅ | ✅ | ✅ |
| Quote rejected | ✅ | ✅ | ✅ |
| Quote expiring (3 days) | ✅ | ✅ | ❌ |
| Reminder due | ✅ | ✅ | ✅ |
| User invited | ✅ | ❌ | ❌ |
| Password reset | ✅ | ❌ | ❌ |
| Weekly summary | ✅ | ❌ | ❌ |

### 12.3 Reports & Analytics

#### Dashboard Analytics
```typescript
interface DashboardMetrics {
  // Quote metrics
  quotesThisMonth: number;
  quotesLastMonth: number;
  quotesTrend: number;  // Percentage change

  // Revenue metrics
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueTrend: number;

  // Conversion metrics
  conversionRate: number;
  averageQuoteValue: number;

  // Pipeline
  pipelineByStatus: { status: string; count: number; value: number }[];

  // Activity
  activitiesThisWeek: number;
  followUpsDue: number;
}
```

#### Report Types
| Report | Description | Export |
|--------|-------------|--------|
| Quote Summary | All quotes with status, value | CSV, PDF |
| Revenue Report | Revenue by period, customer, location | CSV, PDF |
| Customer Report | Customer list with quote history | CSV |
| Activity Report | Activities by user, type, outcome | CSV |
| Rate Utilization | Which rates are used most | CSV |
| Pipeline Report | Quotes by stage, conversion rates | CSV, PDF |
| User Activity | Actions per user | CSV |

### 12.4 Notifications Center (In-App)

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,

  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'info', 'success', 'warning', 'error'
  category TEXT,  -- 'quote', 'customer', 'system', 'reminder'

  -- Link
  action_url TEXT,
  action_label TEXT,

  -- Status
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,

  -- Reference
  related_type TEXT,
  related_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 12.5 File Attachments

```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,

  -- File info
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,

  -- Storage
  storage_path TEXT NOT NULL,  -- Supabase Storage path
  storage_bucket TEXT DEFAULT 'attachments',

  -- Reference
  attachable_type TEXT NOT NULL,  -- 'quote', 'customer', 'inland_quote'
  attachable_id UUID NOT NULL,

  -- Metadata
  description TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attachments_ref ON attachments(attachable_type, attachable_id);
```

**Attachment Support:**
- Quotes: Attach supporting documents, photos
- Customers: Contracts, agreements, certificates
- Equipment: Photos, spec sheets
- Inland Quotes: Cargo photos, route documents

### 12.6 Customer Portal (Future Phase)

Allow customers to:
- View their quotes online (via secure link)
- Accept/reject quotes digitally
- Download PDFs
- Request revisions
- View quote history
- Digital signature

```sql
CREATE TABLE customer_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id),
  inland_quote_id UUID REFERENCES inland_quotes(id),

  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  -- Tracking
  first_viewed_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 12.7 Quote Templates & Presets

```sql
CREATE TABLE quote_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,

  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('dismantling', 'inland')),

  -- Preset data
  preset_data JSONB NOT NULL,
  /*
  {
    "default_margin": 15,
    "default_costs_enabled": {...},
    "default_terms": "...",
    "default_validity_days": 30
  }
  */

  is_default BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 12.8 Rate History & Versioning

```sql
CREATE TABLE rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_id UUID REFERENCES rates(id) ON DELETE CASCADE NOT NULL,

  -- Snapshot of all rate fields
  dismantling_loading_cost INTEGER,
  loading_cost INTEGER,
  blocking_bracing_cost INTEGER,
  -- ... all other cost fields

  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_reason TEXT
);

-- Trigger to automatically log changes
CREATE OR REPLACE FUNCTION log_rate_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO rate_history (
    rate_id,
    dismantling_loading_cost,
    -- ... all fields from OLD
    changed_by,
    changed_at
  ) VALUES (
    OLD.id,
    OLD.dismantling_loading_cost,
    -- ...
    current_setting('app.current_user_id')::UUID,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rate_history_trigger
BEFORE UPDATE ON rates
FOR EACH ROW EXECUTE FUNCTION log_rate_changes();
```

### 12.9 Bulk Operations

```typescript
// API endpoints for bulk operations
export const bulkRouter = router({
  // Bulk status update
  updateQuoteStatuses: protectedProcedure
    .input(z.object({
      quoteIds: z.array(z.string().uuid()),
      status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']),
    }))
    .mutation(async ({ ctx, input }) => { ... }),

  // Bulk delete
  deleteQuotes: protectedProcedure
    .input(z.object({
      quoteIds: z.array(z.string().uuid()),
    }))
    .mutation(async ({ ctx, input }) => { ... }),

  // Bulk export
  exportQuotes: protectedProcedure
    .input(z.object({
      quoteIds: z.array(z.string().uuid()),
      format: z.enum(['csv', 'pdf', 'xlsx']),
    }))
    .mutation(async ({ ctx, input }) => { ... }),

  // Bulk customer update
  updateCustomers: protectedProcedure
    .input(z.object({
      customerIds: z.array(z.string().uuid()),
      updates: z.object({
        status: z.enum(['active', 'inactive', 'prospect']).optional(),
        tags: z.array(z.string()).optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => { ... }),
});
```

### 12.10 Search & Filters

#### Global Search
```typescript
// Full-text search across all entities
interface GlobalSearchResult {
  type: 'customer' | 'quote' | 'inland_quote' | 'equipment';
  id: string;
  title: string;
  subtitle: string;
  matchedField: string;
  score: number;
}

// API
globalSearch: protectedProcedure
  .input(z.object({
    query: z.string().min(2),
    types: z.array(z.enum(['customer', 'quote', 'inland_quote', 'equipment'])).optional(),
    limit: z.number().default(20),
  }))
  .query(async ({ ctx, input }) => { ... }),
```

#### Saved Filters
```sql
CREATE TABLE saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  entity_type TEXT NOT NULL,  -- 'quotes', 'customers', 'inland_quotes'
  filters JSONB NOT NULL,

  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 12.11 Import/Export

#### Import Formats
| Entity | CSV | Excel | JSON |
|--------|-----|-------|------|
| Customers | ✅ | ✅ | ✅ |
| Contacts | ✅ | ✅ | ✅ |
| Equipment | ✅ | ✅ | ❌ |
| Rates | ✅ | ✅ | ❌ |
| Dimensions | ✅ | ✅ | ❌ |

#### Export Formats
| Entity | CSV | Excel | PDF |
|--------|-----|-------|-----|
| Customers | ✅ | ✅ | ✅ |
| Quotes | ✅ | ✅ | ✅ |
| Rate Matrix | ✅ | ✅ | ✅ |
| Reports | ✅ | ✅ | ✅ |

### 12.12 API Keys for Integrations

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,

  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,  -- Hashed API key
  key_prefix TEXT NOT NULL,  -- First 8 chars for identification

  -- Permissions
  scopes TEXT[] DEFAULT '{}',  -- ['quotes:read', 'customers:read']

  -- Limits
  rate_limit_per_hour INTEGER DEFAULT 1000,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 12.13 Webhooks

```sql
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,

  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,  -- For signature verification

  -- Events
  events TEXT[] NOT NULL,  -- ['quote.created', 'quote.accepted', 'customer.created']

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,

  event TEXT NOT NULL,
  payload JSONB NOT NULL,

  -- Response
  status_code INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Webhook Events:**
- `quote.created`
- `quote.updated`
- `quote.sent`
- `quote.accepted`
- `quote.rejected`
- `inland_quote.created`
- `inland_quote.accepted`
- `customer.created`
- `customer.updated`

---

## Part 13: Updated Screens Catalog

### 13.1 New Authentication Screens (7)
| # | Screen | Route |
|---|--------|-------|
| 1 | Login | `/login` |
| 2 | Register | `/register` |
| 3 | Forgot Password | `/forgot-password` |
| 4 | Reset Password | `/reset-password` |
| 5 | Verify Email | `/verify-email` |
| 6 | Accept Invitation | `/invite/[token]` |
| 7 | 2FA Verification | `/2fa` |

### 13.2 New User Management Screens (8)
| # | Screen | Route |
|---|--------|-------|
| 8 | User List | `/settings/users` |
| 9 | Invite User | `/settings/users/invite` |
| 10 | User Detail | `/settings/users/[id]` |
| 11 | Edit User Permissions | `/settings/users/[id]/permissions` |
| 12 | Teams | `/settings/teams` |
| 13 | Team Detail | `/settings/teams/[id]` |
| 14 | Permission Groups | `/settings/permissions` |
| 15 | Audit Log | `/settings/audit` |

### 13.3 New Feature Screens (12)
| # | Screen | Route |
|---|--------|-------|
| 16 | Notifications Center | `/notifications` |
| 17 | Reports Dashboard | `/reports` |
| 18 | Quote Summary Report | `/reports/quotes` |
| 19 | Revenue Report | `/reports/revenue` |
| 20 | Activity Report | `/reports/activity` |
| 21 | API Keys | `/settings/api-keys` |
| 22 | Webhooks | `/settings/webhooks` |
| 23 | Email Templates | `/settings/email-templates` |
| 24 | Global Search | `/search` |
| 25 | Customer Portal Preview | `/portal/preview` |
| 26 | Security Settings | `/settings/security` |
| 27 | Notification Preferences | `/settings/notifications` |

### 13.4 Total Screen Count
- **Previous Plan**: 40 screens
- **New Additions**: 27 screens
- **Total**: **67 screens**

---

## Part 14: Updated API Endpoints

### 14.1 Auth Router
```typescript
export const authRouter = router({
  register: publicProcedure.input(registerSchema).mutation(...),
  login: publicProcedure.input(loginSchema).mutation(...),
  logout: protectedProcedure.mutation(...),
  forgotPassword: publicProcedure.input(emailSchema).mutation(...),
  resetPassword: publicProcedure.input(resetPasswordSchema).mutation(...),
  verifyEmail: publicProcedure.input(tokenSchema).mutation(...),
  refreshToken: protectedProcedure.mutation(...),
  changePassword: protectedProcedure.input(changePasswordSchema).mutation(...),
  enable2FA: protectedProcedure.mutation(...),
  verify2FA: protectedProcedure.input(otpSchema).mutation(...),
  disable2FA: protectedProcedure.input(passwordSchema).mutation(...),
  getSessions: protectedProcedure.query(...),
  revokeSession: protectedProcedure.input(sessionIdSchema).mutation(...),
  revokeAllSessions: protectedProcedure.mutation(...),
});
```

### 14.2 Users Router
```typescript
export const usersRouter = router({
  list: protectedProcedure.input(listSchema).query(...),
  getById: protectedProcedure.input(idSchema).query(...),
  invite: protectedProcedure.input(inviteSchema).mutation(...),
  update: protectedProcedure.input(updateSchema).mutation(...),
  updateRole: protectedProcedure.input(roleSchema).mutation(...),
  updatePermissions: protectedProcedure.input(permissionsSchema).mutation(...),
  deactivate: protectedProcedure.input(idSchema).mutation(...),
  reactivate: protectedProcedure.input(idSchema).mutation(...),
  delete: protectedProcedure.input(idSchema).mutation(...),
  transferOwnership: protectedProcedure.input(transferSchema).mutation(...),
});
```

### 14.3 Teams Router
```typescript
export const teamsRouter = router({
  list: protectedProcedure.query(...),
  create: protectedProcedure.input(createSchema).mutation(...),
  update: protectedProcedure.input(updateSchema).mutation(...),
  delete: protectedProcedure.input(idSchema).mutation(...),
  addMember: protectedProcedure.input(memberSchema).mutation(...),
  removeMember: protectedProcedure.input(memberSchema).mutation(...),
  setManager: protectedProcedure.input(managerSchema).mutation(...),
});
```

### 14.4 Notifications Router
```typescript
export const notificationsRouter = router({
  list: protectedProcedure.input(listSchema).query(...),
  markAsRead: protectedProcedure.input(idSchema).mutation(...),
  markAllAsRead: protectedProcedure.mutation(...),
  dismiss: protectedProcedure.input(idSchema).mutation(...),
  getPreferences: protectedProcedure.query(...),
  updatePreferences: protectedProcedure.input(prefsSchema).mutation(...),
});
```

### 14.5 Reports Router
```typescript
export const reportsRouter = router({
  getDashboardMetrics: protectedProcedure.input(dateRangeSchema).query(...),
  getQuoteSummary: protectedProcedure.input(reportParamsSchema).query(...),
  getRevenueReport: protectedProcedure.input(reportParamsSchema).query(...),
  getActivityReport: protectedProcedure.input(reportParamsSchema).query(...),
  getPipelineReport: protectedProcedure.input(reportParamsSchema).query(...),
  exportReport: protectedProcedure.input(exportSchema).mutation(...),
});
```

### 14.6 Audit Router
```typescript
export const auditRouter = router({
  list: protectedProcedure.input(listSchema).query(...),
  getByResource: protectedProcedure.input(resourceSchema).query(...),
  getByUser: protectedProcedure.input(userIdSchema).query(...),
  export: protectedProcedure.input(exportSchema).mutation(...),
});
```

---

## Part 15: Updated Implementation Roadmap

### Revised Phase Structure

| Phase | Duration | Focus |
|-------|----------|-------|
| 1 | Week 1-2 | Foundation + Auth |
| 2 | Week 3-4 | User Management + Permissions |
| 3 | Week 5-6 | Customer Module |
| 4 | Week 7-8 | Equipment Module |
| 5 | Week 9-11 | Dismantling Quotes |
| 6 | Week 12-14 | Inland Transportation |
| 7 | Week 15-16 | Activity, Reminders, Notifications |
| 8 | Week 17-18 | Reports & Analytics |
| 9 | Week 19 | Settings, Webhooks, API Keys |
| 10 | Week 20-21 | Testing & Polish |
| 11 | Week 22 | Migration & Launch |

### New Total: 22 weeks (5.5 months)

---

## Part 16: Security Checklist

### Authentication Security
- [ ] Password hashing (bcrypt/argon2)
- [ ] Rate limiting on auth endpoints
- [ ] Account lockout after 5 failed attempts
- [ ] Secure session management
- [ ] JWT token rotation
- [ ] Secure cookie settings (HttpOnly, Secure, SameSite)
- [ ] CSRF protection
- [ ] 2FA implementation

### Authorization Security
- [ ] Role-based access control (RBAC)
- [ ] Row-level security in database
- [ ] API endpoint protection
- [ ] Permission checks on all mutations
- [ ] Scope validation for API keys

### Data Security
- [ ] Input validation (Zod schemas)
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitization)
- [ ] Sensitive data encryption at rest
- [ ] Secure file upload validation
- [ ] PII handling compliance

### Infrastructure Security
- [ ] HTTPS only
- [ ] Security headers (CSP, HSTS, etc.)
- [ ] API rate limiting
- [ ] DDoS protection
- [ ] Regular security audits
- [ ] Dependency vulnerability scanning

---

## Summary of Additions

| Category | Items Added |
|----------|-------------|
| User Roles | 6 role types defined |
| Permissions | 50+ granular permissions |
| Auth Features | 15+ authentication features |
| New Screens | 27 additional screens |
| Database Tables | 15+ new tables |
| API Routers | 6 new routers |
| Timeline | Extended to 22 weeks |

This addendum should be reviewed alongside the main REBUILD_PLAN.md for a complete picture of the system.

---

*Addendum Version: 1.0*
*Created: January 2026*
