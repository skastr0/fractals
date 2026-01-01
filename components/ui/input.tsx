'use client'

import { forwardRef } from 'react'
import { Input as AriaInput, TextField, type TextFieldProps } from 'react-aria-components'
import { tv } from 'tailwind-variants'

import { Label } from './label'

const inputStyles = tv({
  slots: {
    root: 'flex flex-col gap-1.5',
    label: 'text-sm font-medium text-foreground',
    input: [
      'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2',
      'text-sm text-foreground placeholder:text-muted-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'disabled:cursor-not-allowed disabled:opacity-50',
    ],
  },
})

export interface InputProps extends Omit<TextFieldProps, 'children'> {
  label?: string
  placeholder?: string
  className?: string
  inputClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, placeholder, className, inputClassName, ...props }, ref) => {
    const styles = inputStyles()

    return (
      <TextField className={styles.root({ className })} {...props}>
        {label ? <Label className={styles.label()}>{label}</Label> : null}
        <AriaInput
          ref={ref}
          placeholder={placeholder}
          className={styles.input({ className: inputClassName })}
        />
      </TextField>
    )
  },
)

Input.displayName = 'Input'
