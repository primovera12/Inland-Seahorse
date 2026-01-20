'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
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
    title: 'Dismantle Quote',
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
    title: 'Dismantle Settings',
    url: '/settings/dismantle',
    icon: Wrench,
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
  {
    title: 'Inland Settings',
    url: '/settings/inland',
    icon: Settings,
  },
]

const crmItems = [
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

const adminItems = [
  {
    title: 'Team',
    url: '/team',
    icon: UsersRound,
  },
  {
    title: 'Feedback',
    url: '/settings/tickets',
    icon: MessageSquare,
  },
  {
    title: 'Company Settings',
    url: '/settings',
    icon: Settings,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <p className="text-xs text-muted-foreground text-center">
          Seahorse Express v2.0
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
