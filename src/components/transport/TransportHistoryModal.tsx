import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TransportSyncBadge } from './TransportSyncBadge'
import { TransportHistoryLogItem, transportEditService } from '@/services/transportEditService'
import {
  History,
  Search,
  Filter,
  User,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'

interface TransportHistoryModalProps {
  open: boolean
  onClose: () => void
  transportNumber: string
  sapTransportNumber: string
  transportId: string
}

export const TransportHistoryModal: React.FC<TransportHistoryModalProps> = ({
  open,
  onClose,
  transportNumber,
  sapTransportNumber,
  transportId,
}) => {
  const [logs, setLogs] = useState<TransportHistoryLogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [userFilter, setUserFilter] = useState('')
  const [reasonFilter, setReasonFilter] = useState('')
  const [fieldFilter, setFieldFilter] = useState('')
  const [remessaFilter, setRemessaFilter] = useState('')

  const fetchHistory = async () => {
    if (!open) return
    setLoading(true)
    try {
      const data = await transportEditService.getTransportAuditHistory({
        sap_transport_number: sapTransportNumber !== '—' ? sapTransportNumber : undefined,
        transport_id: transportId,
      })
      setLogs(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchHistory()
    }
  }, [open, transportId, sapTransportNumber])

  // Filtragem local complementar
  const filteredLogs = logs.filter((log) => {
    if (userFilter) {
      const q = userFilter.toLowerCase()
      if (!log.user_name.toLowerCase().includes(q) && !log.user_email.toLowerCase().includes(q)) {
        return false
      }
    }
    if (reasonFilter && reasonFilter !== 'TODOS') {
      if (!log.reason_code.includes(reasonFilter)) return false
    }
    if (fieldFilter) {
      const q = fieldFilter.toLowerCase()
      if (!log.field_label.toLowerCase().includes(q) && !log.field_name.toLowerCase().includes(q)) {
        return false
      }
    }
    if (remessaFilter) {
      if (!log.delivery_number.includes(remessaFilter)) return false
    }
    return true
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="border-b pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <DialogTitle className="text-xl">Histórico de Auditoria do Transporte</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-1 rounded">
                TR: {transportNumber}
              </span>
              {sapTransportNumber && sapTransportNumber !== '—' && (
                <span className="text-xs bg-muted text-gray-700 font-mono font-semibold px-2 py-1 rounded">
                  SAP: {sapTransportNumber}
                </span>
              )}
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Trilha cronológica e imutável de todas as modificações realizadas no HUB CIAFAL e
            sincronizadas com o SAP.
          </DialogDescription>
        </DialogHeader>

        {/* BARRA DE FILTROS DO HISTÓRICO */}
        <div className="bg-muted/20 p-3 border-b shrink-0 grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div>
            <Label className="text-[11px] text-muted-foreground font-medium">Usuário</Label>
            <Input
              placeholder="Buscar por operador..."
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="h-8 text-xs bg-white"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground font-medium">Campo alterado</Label>
            <Input
              placeholder="Motorista, placa, rota..."
              value={fieldFilter}
              onChange={(e) => setFieldFilter(e.target.value)}
              className="h-8 text-xs bg-white"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground font-medium">Remessa</Label>
            <Input
              placeholder="Nº da remessa..."
              value={remessaFilter}
              onChange={(e) => setRemessaFilter(e.target.value)}
              className="h-8 text-xs bg-white"
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHistory}
              disabled={loading}
              className="h-8 w-full text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* TIMELINE CRONOLÓGICA */}
        <div className="overflow-y-auto p-4 flex-1 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
              Carregando registros de auditoria imutável...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              Nenhuma alteração registrada para os critérios informados.
            </div>
          ) : (
            <div className="relative border-l-2 border-primary/20 ml-4 space-y-6">
              {filteredLogs.map((log) => (
                <div key={log.id} className="relative pl-6">
                  {/* Ponto indicador na timeline */}
                  <div className="absolute -left-2 top-1.5 h-4 w-4 rounded-full bg-primary border-2 border-white shadow-xs" />

                  <div className="bg-white border rounded-lg p-3.5 shadow-xs space-y-2 hover:border-primary/40 transition-colors">
                    {/* Cabeçalho do evento */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">
                          {log.field_label || log.field_name}
                        </span>
                        {log.delivery_number && log.delivery_number !== '—' && (
                          <span className="text-[11px] bg-blue-50 text-blue-700 font-mono px-1.5 py-0.5 rounded">
                            Remessa: {log.delivery_number}
                          </span>
                        )}
                        <TransportSyncBadge status={log.sap_sync_status} className="scale-90" />
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <strong className="text-gray-700">{log.user_name}</strong> (
                          {log.user_role})
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3" />
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {/* Comparação dos Valores */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-muted/20 p-2.5 rounded-md">
                      <div>
                        <span className="text-[11px] text-rose-700 font-semibold block mb-0.5">
                          Valor Anterior:
                        </span>
                        <div className="p-1.5 bg-rose-50/50 border border-rose-200 rounded font-mono text-[11px] text-gray-800 break-words">
                          {log.previous_state || '—'}
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] text-emerald-700 font-semibold block mb-0.5">
                          Novo Valor:
                        </span>
                        <div className="p-1.5 bg-emerald-50/50 border border-emerald-200 rounded font-mono text-[11px] text-gray-900 font-semibold break-words">
                          {log.new_state || '—'}
                        </div>
                      </div>
                    </div>

                    {/* Motivo e Justificativa */}
                    <div className="space-y-1 text-xs pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground font-medium">Motivo oficial:</span>
                        <span className="font-semibold text-gray-800 bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                          {log.reason_code}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-medium">
                          Justificativa técnica:{' '}
                        </span>
                        <span className="text-gray-700 italic">"{log.justification}"</span>
                      </div>
                    </div>

                    {/* Retorno SAP e ID de Auditoria */}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
                      <span>
                        ID Auditoria: <code className="font-mono">{log.id}</code>
                      </span>
                      {log.sap_response_message && (
                        <span
                          className="text-blue-700 truncate max-w-sm"
                          title={log.sap_response_message}
                        >
                          Retorno SAP: {log.sap_response_message}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
