'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useState, useMemo } from 'react'
import {
  Calculator,
  History,
  Settings,
  Truck,
  Wrench,
  Package,
  Building2,
  UsersRound,
  MessageSquare,
  Kanban,
  ScrollText,
  ClipboardList,
  Users,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc/client'
import type { UserRole } from '@/types/auth'

// Define which roles can access each nav item
type NavItem = {
  title: string
  url: string
  icon: LucideIcon
  roles?: UserRole[] // If undefined, all authenticated users can access
}

// Admin roles that can see admin section
const ADMIN_ROLES: UserRole[] = ['admin', 'owner', 'super_admin']

// Manager+ roles
const MANAGER_ROLES: UserRole[] = ['manager', 'admin', 'owner', 'super_admin']

const equipmentItems: NavItem[] = [
  {
    title: 'Dismantle Quote',
    url: '/quotes/new',
    icon: Calculator,
    // All authenticated users can create quotes
  },
  {
    title: 'Quote History',
    url: '/quotes/history',
    icon: History,
  },
  {
    title: 'Equipment',
    url: '/equipment',
    icon: Package,
    roles: MANAGER_ROLES, // Only managers+ can manage equipment
  },
  {
    title: 'Dismantle Settings',
    url: '/settings/dismantle',
    icon: Wrench,
    roles: ADMIN_ROLES, // Only admins can change settings
  },
]

const inlandItems: NavItem[] = [
  {
    title: 'Inland Quote',
    url: '/inland/new',
    icon: Truck,
  },
  {
    title: 'Inland History',
    url: '/inland/history',
    icon: History,
  },
  {
    title: 'Inland Settings',
    url: '/settings/inland',
    icon: Settings,
    roles: ADMIN_ROLES,
  },
]

const operationsItems: NavItem[] = [
  {
    title: 'Load Planner',
    url: '/inland/new-v2',
    icon: ClipboardList,
  },
  {
    title: 'Quote History',
    url: '/load-planner/history',
    icon: History,
  },
  {
    title: 'Carriers',
    url: '/carriers',
    icon: Users,
  },
  {
    title: 'Truck Types',
    url: '/truck-types',
    icon: Truck,
    roles: ADMIN_ROLES,
  },
  {
    title: 'Load History',
    url: '/load-history',
    icon: BarChart3,
  },
]

const crmItems: NavItem[] = [
  {
    title: 'Pipeline',
    url: '/quotes/pipeline',
    icon: Kanban,
  },
  {
    title: 'Companies',
    url: '/customers',
    icon: Building2,
  },
]

const adminItems: NavItem[] = [
  {
    title: 'Team',
    url: '/team',
    icon: UsersRound,
    roles: ADMIN_ROLES,
  },
  {
    title: 'Activity Log',
    url: '/admin/activity-log',
    icon: ScrollText,
    roles: ADMIN_ROLES,
  },
  {
    title: 'Feedback',
    url: '/settings/tickets',
    icon: MessageSquare,
    roles: ADMIN_ROLES,
  },
  {
    title: 'Company Settings',
    url: '/settings',
    icon: Settings,
    roles: ADMIN_ROLES,
  },
]

// Helper to check if user can access an item
function canAccess(item: NavItem, userRole: UserRole | undefined): boolean {
  if (!userRole) return false
  if (!item.roles) return true // No role restriction = all authenticated users
  return item.roles.includes(userRole)
}

export function AppSidebar() {
  const pathname = usePathname()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Fetch current user to check role
  const { data: currentUser } = trpc.user.me.useQuery()
  const userRole = currentUser?.role

  useEffect(() => {
    setMounted(true)
  }, [])

  // Filter navigation items based on user role
  const filteredEquipmentItems = useMemo(
    () => equipmentItems.filter((item) => canAccess(item, userRole)),
    [userRole]
  )

  const filteredInlandItems = useMemo(
    () => inlandItems.filter((item) => canAccess(item, userRole)),
    [userRole]
  )

  const filteredOperationsItems = useMemo(
    () => operationsItems.filter((item) => canAccess(item, userRole)),
    [userRole]
  )

  const filteredCrmItems = useMemo(
    () => crmItems.filter((item) => canAccess(item, userRole)),
    [userRole]
  )

  const filteredAdminItems = useMemo(
    () => adminItems.filter((item) => canAccess(item, userRole)),
    [userRole]
  )

  // Check if user has any admin items to show
  const showAdminSection = filteredAdminItems.length > 0

  // Use black logo by default, white logo for dark mode
  const logoSrc = mounted && resolvedTheme === 'dark' ? '/logo-white.png' : '/logo.png'

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <Link href="/quotes/new" className="flex items-center">
          <Image
            src={logoSrc}
            alt="Seahorse Express"
            width={220}
            height={55}
            className="h-14 w-auto"
            priority
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {filteredEquipmentItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Equipment</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredEquipmentItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link
                        href={item.url}
                        className={cn(
                          pathname === item.url && 'bg-sidebar-accent'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filteredInlandItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Inland Transportation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredInlandItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link
                        href={item.url}
                        className={cn(
                          pathname === item.url && 'bg-sidebar-accent'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filteredOperationsItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Operations</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredOperationsItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url || pathname.startsWith(item.url + '/')}>
                      <Link
                        href={item.url}
                        className={cn(
                          (pathname === item.url || pathname.startsWith(item.url + '/')) && 'bg-sidebar-accent'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filteredCrmItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>CRM</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredCrmItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link
                        href={item.url}
                        className={cn(
                          pathname === item.url && 'bg-sidebar-accent'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {showAdminSection && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link
                        href={item.url}
                        className={cn(
                          pathname === item.url && 'bg-sidebar-accent'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <p className="text-xs text-muted-foreground text-center">
          Seahorse Express v2.0
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
