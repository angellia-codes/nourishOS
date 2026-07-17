import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// DESIGN.md §27 / COMPONENT_LIBRARY.md §9 — supports image with initials fallback.
const avatarVariants = cva(
  'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-medium text-primary',
  {
    variants: {
      size: {
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
)

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof avatarVariants> {
  src?: string | null
  name: string
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  const initials = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]
  return initials.toUpperCase()
}

export function Avatar({ className, size, src, name, ...props }: AvatarProps) {
  const [errored, setErrored] = React.useState(false)

  return (
    <span className={cn(avatarVariants({ size, className }))} {...props}>
      {src && !errored ? (
        <img src={src} alt={name} className="h-full w-full object-cover" onError={() => setErrored(true)} />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}
    </span>
  )
}
