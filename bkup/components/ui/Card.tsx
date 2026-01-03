'use client'

import { HTMLMotionProps, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLMotionProps<"div"> {
  variant?: 'default' | 'glass' | 'flat'
  noHover?: boolean
}

export default function Card({
  className,
  variant = 'default',
  noHover = false,
  children,
  ...props
}: CardProps) {
  const variants = {
    default: "bg-white border border-gray-100 shadow-sm",
    glass: "bg-white/70 backdrop-blur-lg border border-white/20 shadow-glass",
    flat: "bg-gray-50 border border-transparent",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!noHover ? { y: -5, transition: { duration: 0.2 } } : undefined}
      className={cn(
        "rounded-2xl p-6 transition-all duration-300",
        variants[variant],
        !noHover && "hover:shadow-lg hover:shadow-primary/5",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
}
