import { redirect } from 'next/navigation'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('users')
    .select('first_name, last_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header
          user={{
            email: user.email,
            first_name: profile?.first_name,
            last_name: profile?.last_name,
            avatar_url: profile?.avatar_url,
          }}
        />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
