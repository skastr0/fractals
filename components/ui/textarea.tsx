'use client'

import { forwardRef } from 'react'
import { TextArea as AriaTextArea, TextField, type TextFieldProps } from 'react-aria-components'
import { tv } from 'tailwind-variants'

import { Label } from './label'

const textAreaStyles = tv({
  slots: {
    root: 'flex flex-col gap-1.5',
    label: 'text-sm font-medium text-foreground',
    textarea: [
      'min-h-[96px] w-full rounded-md border border-border bg-background px-3 py-2',
      'text-sm text-foreground placeholder:text-muted-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'resize-y',
    ],
  },
})

export interface TextAreaProps extends Omit<TextFieldProps, 'children'> {
  label?: string
  placeholder?: string
  className?: string
  textAreaClassName?: string
  rows?: number
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, placeholder, className, textAreaClassName, rows, ...props }, ref) => {
    const styles = textAreaStyles()

    return (
      <TextField className={styles.root({ className })} {...props}>
        {label ? <Label className={styles.label()}>{label}</Label> : null}
        <AriaTextArea
          ref={ref}
          rows={rows}
          placeholder={placeholder}
          className={styles.textarea({ className: textAreaClassName })}
        />
      </TextField>
    )
  },
)

TextArea.displayName = 'TextArea'
