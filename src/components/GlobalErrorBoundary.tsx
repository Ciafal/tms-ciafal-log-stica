import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RotateCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error?: Error
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GlobalErrorBoundary] Erro capturado na aplicação:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/tms'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {this.props.fallbackTitle || 'Ops! Algo inesperado aconteceu'}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                O módulo identificou uma exceção operacional na exibição. Os dados e transações
                permanecem íntegros no TMS e no SAP.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-slate-900 text-slate-100 p-3.5 rounded-lg text-xs font-mono overflow-auto max-h-36">
                <span className="text-rose-400 font-bold block mb-1">Diagnóstico técnico:</span>
                {this.state.error.message || 'Erro sem mensagem explícita'}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                onClick={this.handleReload}
                className="w-full sm:w-auto bg-[#005596] hover:bg-[#004275] text-white font-semibold text-xs gap-2 px-5 py-2"
              >
                <RotateCw className="w-4 h-4" />
                Recarregar página
              </Button>
              <Button
                variant="outline"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto text-xs font-semibold gap-2 border-slate-300 px-5 py-2"
              >
                <Home className="w-4 h-4" />
                Início do TMS
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default GlobalErrorBoundary
