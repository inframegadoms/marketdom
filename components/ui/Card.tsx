import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
}

export default function Card({ children, className, hover = false, glow = false }: CardProps) {
  return (
    <div
      className={cn(
        'card bg-white rounded-xl shadow-soft p-6 transition-all duration-300',
        hover && 'hover:shadow-xl hover:-translate-y-1',
        glow && 'hover:shadow-glow',
        className
      )}
    >
      {children}
    </div>
  )
}

