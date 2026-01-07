'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calculator,
  FileText,
  History,
  Home,
  Settings,
  Truck,
  Users,
  Wrench,
  Package,
  Building2,
  Activity,
  Bell,
  BarChart3,
  LayoutTemplate,
  Upload,
  UsersRound,
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

const equipmentItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: Home,
  },
  {
    title: 'Reports',
    url: '/reports',
    icon: BarChart3,
  },
  {
    title: 'Generate Quote',
    url: '/quotes/new',
    icon: Calculator,
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
  },
  {
    title: 'Rates',
    url: '/rates',
    icon: FileText,
  },
]

const inlandItems = [
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
]

const crmItems = [
  {
    title: 'Companies',
    url: '/customers',
    icon: Building2,
  },
  {
    title: 'Contacts',
    url: '/contacts',
    icon: Users,
  },
  {
    title: 'Activity Log',
    url: '/activity',
    icon: Activity,
  },
  {
    title: 'Reminders',
    url: '/reminders',
    icon: Bell,
  },
]

const adminItems = [
  {
    title: 'Team',
    url: '/team',
    icon: UsersRound,
  },
  {
    title: 'Templates',
    url: '/templates',
    icon: LayoutTemplate,
  },
  {
    title: 'Import Data',
    url: '/import',
    icon: Upload,
  },
]

const settingsItems = [
  {
    title: 'Company Settings',
    url: '/settings',
    icon: Settings,
  },
  {
    title: 'Dismantle Settings',
    url: '/settings/dismantle',
    icon: Wrench,
  },
  {
    title: 'Inland Settings',
    url: '/settings/inland',
    icon: Truck,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wrench className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold">Dismantle Pro</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Equipment</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {equipmentItems.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel>Inland Transportation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {inlandItems.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel>CRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {crmItems.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                    <Link
                      href={item.url}
                      className={cn(
                        pathname.startsWith(item.url) && 'bg-sidebar-accent'
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
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <p className="text-xs text-muted-foreground text-center">
          Dismantle Pro v2.0
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
