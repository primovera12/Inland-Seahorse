import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, Truck } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <Link href="/quotes/new">
        <Button size="lg" className="text-lg px-8 py-6 h-auto">
          <Plus className="h-5 w-5 mr-3" />
          New Dismantle Quote
        </Button>
      </Link>
      <Link href="/inland/new">
        <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto">
          <Truck className="h-5 w-5 mr-3" />
          Inland Quote
        </Button>
      </Link>
    </div>
  )
}
