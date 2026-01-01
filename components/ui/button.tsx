'use client'

import { forwardRef } from 'react'
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components'
import { tv, type VariantProps } from 'tailwind-variants'

import { cn } from '@/lib/utils'

export const buttonVariants = tv({
  base: [
    'inline-flex items-center justify-center gap-2 rounded-md font-medium',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  variants: {
    variant: {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90 pressed:bg-primary/80',
      secondary:
        'bg-secondary text-secondary-foreground hover:bg-secondary/80 pressed:bg-secondary/70',
      ghost: 'hover:bg-accent hover:text-accent-foreground pressed:bg-accent/70',
      destructive: 'bg-error text-white hover:bg-error/90 pressed:bg-error/80',
      outline:
        'border border-border bg-transparent hover:bg-accent hover:text-accent-foreground pressed:bg-accent/70',
    },
    size: {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
      icon: 'h-10 w-10',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
})

export interface ButtonProps extends AriaButtonProps, VariantProps<typeof buttonVariants> {
  className?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, className, ...props }, ref) => (
    <AriaButton ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
)

Button.displayName = 'Button'
