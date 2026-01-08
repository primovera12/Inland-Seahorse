'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SortableDestinationProps {
  id: string
  children: React.ReactNode
}

export function SortableDestination({ id, children }: SortableDestinationProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        isDragging && 'z-50 opacity-90'
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center',
          'cursor-grab active:cursor-grabbing',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'hover:bg-muted/50 rounded-l-lg',
          isDragging && 'opacity-100'
        )}
        title="Drag to reorder"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="pl-6">
        {children}
      </div>
    </div>
  )
}
