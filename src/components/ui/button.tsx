import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary',
  {
    variants: {
      variant: {
        // STYLE_GUIDE.md § Buttons (v3, Basalt): at most one filled primary per screen.
        // Secondary/ghost are both neutral chrome — no second brand color — differ only by fill.
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'border border-border bg-sunken text-secondary-foreground hover:bg-border/40',
        ghost: 'border border-border bg-transparent text-foreground hover:bg-border/50',
        danger: 'bg-destructive text-white hover:bg-destructive/90',
      },
      size: {
        // STYLE_GUIDE.md § Interaction rules: 48px minimum touch target, everywhere, always
        default: 'h-12 min-w-[120px] px-5',
        sm: 'h-9 px-4 text-[13px]',
        icon: 'h-12 w-12 rounded-full', // circular icon button per STYLE_GUIDE.md
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
