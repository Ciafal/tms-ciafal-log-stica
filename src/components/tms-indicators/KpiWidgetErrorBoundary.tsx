import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pb } from '@/lib/pocketbase/client'

interface KpiWidgetErrorBoundaryProps {
  widgetName: string
  children: ReactNode
  userEmail?: string
  userName?: string
  onRetry?: () => void
}

interface KpiWidgetErrorBoundaryState {
  hasError: boolean
  userMessage: string
}

/**
 * Error Boundary por widget na tela de Indicadores TMS / Análises.
 * Garante que a falha de um componente secundário ou modal não derrube a página inteira.
 * Registra formalmente a exceção em `audit_logs` sem expor stack trace ao usuário.
 */
export class KpiWidgetErrorBoundary extends Component<
  KpiWidgetErrorBoundaryProps,
  KpiWidgetErrorBoundaryState
> {
  constructor(props: KpiWidgetErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      userMessage: '',
    }
  }

  static getDerivedStateFromError(error: Error): KpiWidgetErrorBoundaryState {
    const rawMsg = error?.message || 'Falha inesperada no processamento do componente.'
    return {
      hasError: true,
      userMessage: rawMsg,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { widgetName, userEmail, userName } = this.props
    const timestamp = new Date().toISOString()

    // 1. Log interno no console
    console.error(
      `[KpiWidgetErrorBoundary] Exceção capturada no widget "${widgetName}":`,
      error,
      errorInfo,
    )

    // 2. Registro formal em audit_logs conforme requisito de governança
    try {
      pb.collection('audit_logs')
        .create({
          user_name: userName || 'Operador TMS CIAFAL',
          user_email: userEmail || 'sistema@ciafal.com.br',
          action: 'KPI_WIDGET_ERROR_CAPTURED',
          collection_name: 'tms_indicators',
          record_id: `ERR-${widgetName.toUpperCase().replace(/\s+/g, '_')}`,
          changes: {
            widget_name: widgetName,
            module: 'TMS_ANALISES_INDICADORES',
            timestamp,
            error_message: error?.message || 'Erro sem mensagem explícita',
            component_stack: errorInfo?.componentStack?.slice(0, 500) || '',
          },
        })
        .catch((err) => {
          console.warn('[KpiWidgetErrorBoundary] Falha ao gravar audit_logs:', err)
        })
    } catch (auditErr) {
      console.warn('[KpiWidgetErrorBoundary] Erro ao instanciar gravação de auditoria:', auditErr)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, userMessage: '' })
    if (this.props.onRetry) {
      this.props.onRetry()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 sm:p-5 bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl space-y-3 my-2 text-left">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              <h4 className="text-xs font-bold text-rose-950 dark:text-rose-200">
                Não foi possível carregar: {this.props.widgetName}
              </h4>
              <p className="text-xs text-rose-800/90 dark:text-rose-300 leading-relaxed">
                Ocorreu uma instabilidade pontual neste componente. Os dados operacionais e os
                demais indicadores continuam disponíveis e seguros no TMS.
              </p>
              <div className="text-[11px] text-rose-700 dark:text-rose-400 font-medium pt-0.5">
                Detalhe:{' '}
                <span className="font-mono bg-rose-100/70 dark:bg-rose-900/40 px-1.5 py-0.5 rounded">
                  {this.state.userMessage || 'Exceção de renderização'}
                </span>
              </div>
            </div>
            <div className="shrink-0">
              <Button
                onClick={this.handleRetry}
                size="sm"
                className="bg-[#005596] hover:bg-[#004275] text-white text-xs font-semibold gap-1.5 shadow-xs h-8"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Tentar novamente
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
