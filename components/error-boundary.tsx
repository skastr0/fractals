'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Component, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error.', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    if (this.props.fallback) {
      return this.props.fallback
    }

    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center"
        role="alert"
      >
        <AlertTriangle className="h-10 w-10 text-error" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
        </div>
        <Button onPress={this.handleRetry} variant="secondary">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    )
  }
}
