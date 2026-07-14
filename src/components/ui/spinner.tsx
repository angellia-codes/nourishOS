import { cn } from '@/lib/utils'

interface SpinnerProps {
  className?: string
  label?: string
}

export function Spinner({ className, label = 'Loading' }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn('h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent', className)}
    />
  )
}
