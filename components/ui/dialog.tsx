'use client'

import { X } from 'lucide-react'
import type { ComponentProps, HTMLAttributes, ReactNode } from 'react'
import {
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  type DialogProps,
  Heading,
  Modal,
  ModalOverlay,
} from 'react-aria-components'
import { tv } from 'tailwind-variants'

import { Button } from './button'

const dialogStyles = tv({
  slots: {
    overlay: [
      'fixed inset-0 z-50',
      'data-[entering]:animate-in data-[entering]:fade-in-0',
      'data-[exiting]:animate-out data-[exiting]:fade-out-0',
    ],
    modal: [
      'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
      'rounded-lg border border-border bg-background p-6 shadow-xl',
      'data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95',
      'data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95',
    ],
    dialog: 'relative flex max-h-[85vh] flex-col outline-none',
    header: 'flex flex-col gap-1 pr-8',
    title: 'text-lg font-semibold text-foreground',
    description: 'text-sm text-muted-foreground',
    body: 'mt-4 text-sm text-muted-foreground',
    footer: 'mt-6 flex items-center justify-end gap-3',
    closeButton: 'absolute right-4 top-4',
  },
})

type DialogTriggerProps = ComponentProps<typeof AriaDialogTrigger>

export function Dialog(props: DialogTriggerProps) {
  return <AriaDialogTrigger {...props} />
}

export const DialogTrigger = AriaDialogTrigger

export interface DialogContentProps extends DialogProps {
  title?: string
  description?: string
  children: ReactNode
  isDismissable?: boolean
  showCloseButton?: boolean
  overlayClassName?: string
  modalClassName?: string
}

export function DialogContent({
  title,
  description,
  children,
  isDismissable = true,
  showCloseButton = true,
  overlayClassName,
  modalClassName,
  className,
  ...props
}: DialogContentProps) {
  const styles = dialogStyles()

  return (
    <ModalOverlay
      className={styles.overlay({ className: overlayClassName })}
      isDismissable={isDismissable}
      isKeyboardDismissDisabled={!isDismissable}
    >
      <Modal className={styles.modal({ className: modalClassName })}>
        <AriaDialog {...props} className={styles.dialog({ className })}>
          {({ close }) => (
            <>
              {showCloseButton && isDismissable ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className={styles.closeButton()}
                  onPress={close}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : null}
              {title || description ? (
                <DialogHeader>
                  {title ? <DialogTitle>{title}</DialogTitle> : null}
                  {description ? <DialogDescription>{description}</DialogDescription> : null}
                </DialogHeader>
              ) : null}
              {children}
            </>
          )}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  )
}

export interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  const styles = dialogStyles()
  return <div className={styles.header({ className })} {...props} />
}

export interface DialogTitleProps extends ComponentProps<typeof Heading> {
  className?: string
}

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  const styles = dialogStyles()
  return <Heading slot="title" className={styles.title({ className })} {...props} />
}

export interface DialogDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  className?: string
}

export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  const styles = dialogStyles()
  return <p slot="description" className={styles.description({ className })} {...props} />
}

export interface DialogBodyProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function DialogBody({ className, ...props }: DialogBodyProps) {
  const styles = dialogStyles()
  return <div className={styles.body({ className })} {...props} />
}

export interface DialogFooterProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function DialogFooter({ className, ...props }: DialogFooterProps) {
  const styles = dialogStyles()
  return <div className={styles.footer({ className })} {...props} />
}
