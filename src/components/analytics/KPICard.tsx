'use client'

import { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: string | number
  description?: string
  icon?: ReactNode
  trend?: {
    value: number
    label?: string
  }
  loading?: boolean
  className?: string
  valueClassName?: string
}

export function KPICard({
  title,
  value,
  description,
  icon,
  trend,
  loading = false,
  className,
  valueClassName,
}: KPICardProps) {
  const getTrendIcon = () => {
    if (!trend) return null
    if (trend.value > 0) return <TrendingUp className="h-4 w-4" />
    if (trend.value < 0) return <TrendingDown className="h-4 w-4" />
    return <Minus className="h-4 w-4" />
  }

  const getTrendColor = () => {
    if (!trend) return ''
    if (trend.value > 0) return 'text-green-600'
    if (trend.value < 0) return 'text-red-600'
    return 'text-muted-foreground'
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-sm font-medium">{title}</CardDescription>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            {description && <div className="h-4 w-32 bg-muted animate-pulse rounded" />}
          </div>
        ) : (
          <>
            <div className={cn('text-2xl font-bold', valueClassName)}>{value}</div>
            <div className="flex items-center gap-2 mt-1">
              {trend && (
                <div className={cn('flex items-center gap-1 text-sm', getTrendColor())}>
                  {getTrendIcon()}
                  <span>{trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)}%</span>
                  {trend.label && <span className="text-muted-foreground">{trend.label}</span>}
                </div>
              )}
              {description && !trend && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

interface KPIGridProps {
  children: ReactNode
  columns?: 2 | 3 | 4
}

export function KPIGrid({ children, columns = 4 }: KPIGridProps) {
  const colsClass = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={cn('grid gap-4', colsClass[columns])}>
      {children}
    </div>
  )
}
