'use client'

import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

import { Button, type ButtonProps } from './button'

export interface IconButtonProps extends Omit<ButtonProps, 'size'> {
  size?: ButtonProps['size']
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = 'icon', className, ...props }, ref) => (
    <Button ref={ref} size={size} className={cn('shrink-0', className)} {...props} />
  ),
)

IconButton.displayName = 'IconButton'
