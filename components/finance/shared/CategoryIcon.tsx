'use client'

import * as Icons from 'lucide-react'
import { Tag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface CategoryIconProps {
  name: string
  color?: string
  size?: number
  className?: string
}

export default function CategoryIcon({ name, color, size = 16, className }: CategoryIconProps) {
  const dict = Icons as unknown as Record<string, LucideIcon>
  const Cmp = dict[name] ?? Tag
  return <Cmp size={size} color={color} className={className} />
}
