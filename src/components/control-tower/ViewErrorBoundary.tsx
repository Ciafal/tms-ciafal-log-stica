import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ViewErrorBoundaryProps {
  viewName: string
  children: ReactNode
  onRetry?: () => void
}

interface ViewErrorBoundaryState {
  hasError: boolean
  technicalReason: string
}

export class ViewErrorBoundary extends Component<ViewErrorBoundaryProps, ViewErrorBoundaryState> {
  constructor(props: ViewErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      technicalReason: '',
    }
  }

  static getDerivedStateFromError(error: Error): ViewErrorBoundaryState {
    const rawMsg = error?.message || 'Falha na renderização do componente da visão.'
    return {
      hasError: true,
      technicalReason: rawMsg,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log tratado sem vazar stack trace ao usuário
    console.error(`[TorreDeControle] Erro na visão "${this.props.viewName}":`, error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, technicalReason: '' })
    if (this.props.onRetry) {
      this.props.onRetry()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-rose-50/70 border border-rose-200 rounded-xl text-center space-y-3.5 my-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-rose-950">
              Não foi possível carregar esta visão.
            </h3>
            <p className="text-xs text-rose-700 max-w-md mx-auto">
              Motivo técnico:{' '}
              <span className="font-mono bg-rose-100/80 px-1.5 py-0.5 rounded text-rose-900">
                {this.state.technicalReason || 'Falha ao processar os dados desta visão.'}
              </span>
            </p>
          </div>
          <div className="pt-2">
            <Button
              onClick={this.handleRetry}
              size="sm"
              className="bg-[#005596] hover:bg-[#004275] text-white text-xs font-semibold gap-1.5 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Tentar novamente
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
