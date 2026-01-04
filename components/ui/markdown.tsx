'use client'

import { memo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'

import { cn } from '@/lib/utils'

interface MarkdownProps {
  content: string
  className?: string
}

// Simple, fast markdown components - NO syntax highlighting
// Syntax highlighting is extremely slow (100-500ms per code block)
const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const isBlock = className?.includes('language-')
    const { ref: _ref, ...rest } = props

    if (isBlock) {
      // Block code - simple styled pre
      return (
        <pre className="max-w-full overflow-x-auto rounded-md bg-zinc-900 p-3 text-sm">
          <code className={cn(className, 'text-zinc-100')} {...rest}>
            {children}
          </code>
        </pre>
      )
    }

    // Inline code
    return (
      <code
        className={cn(className, 'break-words rounded bg-zinc-800 px-1 py-0.5 text-zinc-100')}
        {...rest}
      >
        {children}
      </code>
    )
  },
  pre({ children }) {
    // Let code handle the styling
    return <>{children}</>
  },
}

export const Markdown = memo(function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={cn('prose prose-invert prose-sm max-w-none', className)}>
      <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
    </div>
  )
})
