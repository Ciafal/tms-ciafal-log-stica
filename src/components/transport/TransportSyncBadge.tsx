import React from 'react'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, AlertTriangle, CloudOff, ShieldAlert } from 'lucide-react'
import { TransportSyncStatus } from '@/domain/transportEditEngine'

interface TransportSyncBadgeProps {
  status: TransportSyncStatus | string
  className?: string
  showText?: boolean
}

export const TransportSyncBadge: React.FC<TransportSyncBadgeProps> = ({
  status,
  className = '',
  showText = true,
}) => {
  const norm = String(status || 'ALTERADO_SOMENTE_HUB').toUpperCase()

  switch (norm) {
    case 'SINCRONIZADO':
      return (
        <Badge
          variant="outline"
          className={`bg-emerald-50 text-emerald-700 border-emerald-300 font-medium inline-flex items-center gap-1.5 px-2.5 py-1 ${className}`}
          title="Registro sincronizado oficialmente com SAP (VT02N / BAPI_SHIPMENT_CHANGE)"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          {showText && <span>Sincronizado</span>}
        </Badge>
      )

    case 'AGUARDANDO_SINCRONIZACAO':
      return (
        <Badge
          variant="outline"
          className={`bg-amber-50 text-amber-700 border-amber-300 font-medium inline-flex items-center gap-1.5 px-2.5 py-1 ${className}`}
          title="Na fila de integração com o SAP ECC"
        >
          <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0 animate-pulse" />
          {showText && <span>Aguardando sincronização</span>}
        </Badge>
      )

    case 'ERRO_SINCRONIZACAO':
      return (
        <Badge
          variant="outline"
          className={`bg-rose-50 text-rose-700 border-rose-300 font-medium inline-flex items-center gap-1.5 px-2.5 py-1 ${className}`}
          title="Erro de comunicação ou validação de RFC no SAP"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
          {showText && <span>Erro de sincronização</span>}
        </Badge>
      )

    case 'ALTERADO_SOMENTE_HUB':
      return (
        <Badge
          variant="outline"
          className={`bg-blue-50 text-blue-700 border-blue-300 font-medium inline-flex items-center gap-1.5 px-2.5 py-1 ${className}`}
          title="Alteração registrada localmente no HUB CIAFAL (sem writeback SAP)"
        >
          <CloudOff className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          {showText && <span>Alterado somente no HUB</span>}
        </Badge>
      )

    case 'PENDENTE_APROVACAO':
      return (
        <Badge
          variant="outline"
          className={`bg-purple-50 text-purple-700 border-purple-300 font-medium inline-flex items-center gap-1.5 px-2.5 py-1 ${className}`}
          title="Alteração crítica aguardando aprovação de supervisor/gestor"
        >
          <ShieldAlert className="h-3.5 w-3.5 text-purple-600 shrink-0" />
          {showText && <span>Pendente de aprovação</span>}
        </Badge>
      )

    default:
      return (
        <Badge
          variant="outline"
          className={`bg-gray-100 text-gray-700 border-gray-300 font-medium ${className}`}
        >
          {status}
        </Badge>
      )
  }
}
