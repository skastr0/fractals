'use client'

import { Check, Copy } from 'lucide-react'
import {
  type ComponentPropsWithoutRef,
  Fragment,
  isValidElement,
  memo,
  useEffect,
  useMemo,
  useState,
} from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Highlighter } from 'shiki/bundle/web'

import { cn } from '@/lib/utils'

interface MarkdownProps {
  content: string
  className?: string
}

type ShikiTokens = ReturnType<Highlighter['codeToTokensBase']>

type ShikiLanguage = Parameters<Highlighter['codeToTokensBase']>[1]['lang']

interface MarkdownComponentOptions {
  enableHighlight?: boolean
}

interface MarkdownCodeProps extends ComponentPropsWithoutRef<'code'> {
  inline?: boolean
  node?: unknown
}

interface CodeBlockProps extends MarkdownCodeProps {
  enableHighlight?: boolean
}

const SHIKI_THEME = 'github-dark'
const SHIKI_LANGUAGES = [
  'bash',
  'javascript',
  'jsx',
  'typescript',
  'tsx',
  'json',
  'markdown',
  'yaml',
  'html',
  'css',
  'python',
  'sql',
]
const SHIKI_LANGUAGE_SET = new Set(SHIKI_LANGUAGES)
const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  md: 'markdown',
  yml: 'yaml',
  shell: 'bash',
  sh: 'bash',
  zsh: 'bash',
  plaintext: 'text',
}

let highlighterPromise: Promise<Highlighter> | null = null

async function loadHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki/bundle/web').then(async (shiki) => {
      const highlighter = await shiki.createHighlighter({
        themes: [SHIKI_THEME],
        langs: SHIKI_LANGUAGES,
      })
      return highlighter
    })
  }

  return highlighterPromise
}

function getCodeText(children: MarkdownCodeProps['children']): string {
  if (typeof children === 'string') {
    return children
  }

  if (Array.isArray(children)) {
    return children.map((child) => (typeof child === 'string' ? child : '')).join('')
  }

  if (children == null) {
    return ''
  }

  return String(children)
}

function resolveLanguage(className?: string): ShikiLanguage {
  if (!className) {
    return 'text' as ShikiLanguage
  }

  const match = className.match(/language-([\w-]+)/)
  const raw = match?.[1]?.toLowerCase()
  if (!raw) {
    return 'text' as ShikiLanguage
  }

  const normalized = LANGUAGE_ALIASES[raw] ?? raw
  return (SHIKI_LANGUAGE_SET.has(normalized) ? normalized : 'text') as ShikiLanguage
}

function fontStyleClass(fontStyle?: number): string {
  if (!fontStyle) {
    return ''
  }

  return cn(
    fontStyle & 1 && 'italic',
    fontStyle & 2 && 'font-semibold',
    fontStyle & 4 && 'underline',
  )
}

function CodeBlock({ className, children, enableHighlight = true, ...rest }: CodeBlockProps) {
  const code = useMemo(() => getCodeText(children), [children])
  const language = useMemo(() => resolveLanguage(className), [className])
  const [tokens, setTokens] = useState<ShikiTokens | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const shouldHighlight = enableHighlight && language !== 'text'
  const languageLabel = language === 'text' ? 'text' : language

  useEffect(() => {
    let cancelled = false

    if (!shouldHighlight || !code) {
      setTokens(null)
      return
    }

    setTokens(null)

    loadHighlighter()
      .then((highlighter) => {
        if (cancelled) {
          return
        }
        const themedTokens = highlighter.codeToTokensBase(code, {
          lang: language,
          theme: SHIKI_THEME,
        })
        setTokens(themedTokens)
      })
      .catch(() => {
        if (!cancelled) {
          setTokens(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [code, language, shouldHighlight])

  const handleCopy = async () => {
    if (!code) {
      return
    }

    try {
      await navigator.clipboard.writeText(code)
      setIsCopied(true)
      window.setTimeout(() => setIsCopied(false), 2000)
    } catch {
      // Ignore copy errors
    }
  }

  return (
    <div className="group overflow-hidden rounded-lg border border-border/60 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-border/60 bg-zinc-900/70 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span className="font-mono uppercase tracking-wide">{languageLabel}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition hover:bg-muted/20 hover:text-foreground"
          aria-label="Copy code"
        >
          {isCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          <span>{isCopied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="max-w-full overflow-x-auto p-3 text-sm leading-relaxed">
        <code className={cn(className, 'text-zinc-100')} {...rest}>
          {tokens
            ? (() => {
                let lineOffset = 0

                return tokens.map((line, lineIndex) => {
                  const lineSignature = line
                    .map((token) => `${token.content}:${token.color ?? ''}:${token.fontStyle ?? 0}`)
                    .join('|')
                  const lineLength = line.reduce((total, token) => total + token.content.length, 0)
                  const lineKey = `${lineOffset}-${lineSignature}`

                  let tokenOffset = 0

                  const rendered = (
                    <Fragment key={lineKey}>
                      {line.map((token) => {
                        const tokenKey = `${lineOffset + tokenOffset}-${token.content}-${
                          token.color ?? ''
                        }-${token.fontStyle ?? 0}`
                        tokenOffset += token.content.length

                        return (
                          <span
                            key={tokenKey}
                            className={fontStyleClass(token.fontStyle)}
                            style={{ color: token.color ?? undefined }}
                          >
                            {token.content}
                          </span>
                        )
                      })}
                      {lineIndex < tokens.length - 1 ? '\n' : null}
                    </Fragment>
                  )

                  lineOffset += lineLength + 1

                  return rendered
                })
              })()
            : code}
        </code>
      </pre>
    </div>
  )
}

export function createMarkdownComponents({
  enableHighlight = true,
}: MarkdownComponentOptions = {}): Components {
  return {
    code({ className, children, ...props }) {
      const { inline, ...rest } = props as MarkdownCodeProps

      if (!inline) {
        return (
          <code className={className} {...rest}>
            {children}
          </code>
        )
      }

      return (
        <code
          className={cn(
            className,
            'break-words rounded bg-muted/60 px-1 py-0.5 font-mono text-[0.85em] text-foreground',
          )}
          {...rest}
        >
          {children}
        </code>
      )
    },
    pre({ children }) {
      if (isValidElement(children)) {
        const {
          className,
          children: codeChildren,
          inline: _inline,
          ...rest
        } = children.props as MarkdownCodeProps

        return (
          <CodeBlock className={className} enableHighlight={enableHighlight} {...rest}>
            {codeChildren}
          </CodeBlock>
        )
      }

      return (
        <pre className="max-w-full overflow-x-auto rounded-lg bg-zinc-950 p-3 text-sm">
          {children}
        </pre>
      )
    },
    a({ href, children, ...props }) {
      return (
        <a
          href={href}
          target={href?.startsWith('#') ? undefined : '_blank'}
          rel={href?.startsWith('#') ? undefined : 'noreferrer'}
          className="text-primary underline-offset-4 hover:underline"
          {...props}
        >
          {children}
        </a>
      )
    },
    ul({ children }) {
      return <ul className="my-2 list-disc space-y-1 pl-5 text-sm">{children}</ul>
    },
    ol({ children }) {
      return <ol className="my-2 list-decimal space-y-1 pl-5 text-sm">{children}</ol>
    },
    li({ children }) {
      return <li className="leading-relaxed text-foreground/90">{children}</li>
    },
    blockquote({ children }) {
      return (
        <blockquote className="my-3 border-l-2 border-border/70 pl-3 text-sm italic text-muted-foreground">
          {children}
        </blockquote>
      )
    },
    table({ children }) {
      return (
        <div className="my-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">{children}</table>
        </div>
      )
    },
    th({ children }) {
      return (
        <th className="border border-border/60 bg-muted/40 px-2 py-1 text-left text-xs font-semibold text-foreground">
          {children}
        </th>
      )
    },
    td({ children }) {
      return <td className="border border-border/40 px-2 py-1 text-sm">{children}</td>
    },
    hr() {
      return <hr className="my-4 border-border/60" />
    },
  }
}

const markdownComponents = createMarkdownComponents({ enableHighlight: true })

export const Markdown = memo(function Markdown({ content, className }: MarkdownProps) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none text-foreground/90',
        'prose-zinc dark:prose-invert',
        'prose-headings:scroll-mt-20 prose-headings:text-foreground',
        'prose-pre:p-0 prose-pre:bg-transparent',
        'prose-code:before:content-none prose-code:after:content-none',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
})
