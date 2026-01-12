'use client'

import { Check, Copy, FileCode, GitBranch, MousePointerClick, PlusCircle } from 'lucide-react'
import { useState } from 'react'
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'

import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'fractals-init-acknowledged'
const COMMAND = 'opencode serve --port 5577 --cors https://www.fractals.sh'

export function readInitAcknowledged(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function writeInitAcknowledged(value: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
  } catch {}
}

interface InitModalProps {
  isOpen: boolean
  onConfirm: () => void
}

export function InitModal({ isOpen, onConfirm }: InitModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(COMMAND)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleConfirm = () => {
    writeInitAcknowledged(true)
    onConfirm()
  }

  return (
    <ModalOverlay
      isOpen={isOpen}
      isDismissable={false}
      isKeyboardDismissDisabled={true}
      className="fixed inset-0 z-50 bg-black/80 data-[entering]:animate-in data-[entering]:fade-in-0 data-[exiting]:animate-out data-[exiting]:fade-out-0"
    >
      <Modal className="fixed left-1/2 top-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-xl data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95">
        <Dialog className="relative flex max-h-[85vh] flex-col outline-none">
          {/* Header */}
          <div className="flex flex-col gap-1">
            <Heading slot="title" className="text-xl font-semibold tracking-tight text-foreground">
              Fractals
            </Heading>
            <p className="text-base text-muted-foreground">See the tree. Control the swarm.</p>
          </div>

          {/* Body */}
          <div className="mt-4 space-y-6 text-foreground">
            {/* Intro */}
            <p className="text-sm leading-relaxed text-muted-foreground">
              Graph-native interface for OpenCode. Visualize sessions, track subagents, and control
              parallel workflows—all in one view.
            </p>

            {/* Connection Instructions */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">
                Start OpenCode with CORS enabled
              </h3>
              <div className="group relative">
                <pre className="overflow-x-auto rounded-md border border-border bg-background-stronger p-3 font-mono text-sm text-foreground">
                  <code>{COMMAND}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
                  onPress={handleCopy}
                  aria-label={copied ? 'Copied' : 'Copy command'}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Usage Hints */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">How it works</h3>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Sessions appear as nodes in a graph</span>
                </li>
                <li className="flex items-start gap-3">
                  <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Click nodes to see session details</span>
                </li>
                <li className="flex items-start gap-3">
                  <PlusCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Click + icons to expand and see subagents</span>
                </li>
                <li className="flex items-start gap-3">
                  <FileCode className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Diff markers show which sessions have file changes</span>
                </li>
              </ul>
            </div>

            {/* Privacy Disclaimer */}
            <div className="rounded-md border border-border-weak bg-background-stronger/50 p-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Privacy note:</span> Fractals is a
                local client-side app. No data leaves your machine. Session data stays between you
                and your local OpenCode server.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-end">
            <Button
              variant="primary"
              size="md"
              onPress={handleConfirm}
              className="w-full sm:w-auto"
            >
              Get Started
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
