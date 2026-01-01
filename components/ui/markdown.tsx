'use client'

import { type CSSProperties, memo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'

import { cn } from '@/lib/utils'

interface MarkdownProps {
  content: string
  className?: string
}

const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className ?? '')
    const { style: _style, ref: _ref, ...rest } = props
    return match ? (
      <SyntaxHighlighter
        style={oneDark as Record<string, CSSProperties>}
        language={match[1]}
        PreTag="div"
        {...rest}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
}

export const Markdown = memo(function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={cn('prose prose-invert prose-sm max-w-none', className)}>
      <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
    </div>
  )
})
