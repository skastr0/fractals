'use client'

import { forwardRef } from 'react'
import { Label as AriaLabel, type LabelProps as AriaLabelProps } from 'react-aria-components'
import { tv } from 'tailwind-variants'

import { cn } from '@/lib/utils'

const labelStyles = tv({
  base: 'text-sm font-medium text-foreground',
})

export interface LabelProps extends AriaLabelProps {
  className?: string
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => (
  <AriaLabel ref={ref} className={cn(labelStyles(), className)} {...props} />
))

Label.displayName = 'Label'
