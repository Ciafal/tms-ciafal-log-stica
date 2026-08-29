import React from 'react'
import {
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  Clock,
  ArrowRight,
  User,
  MapPin,
  CheckCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UnifiedTransportItem } from '@/domain/controlTowerConsolidatedEngine'

interface AlertsViewProps {
  transports: UnifiedTransportItem[]
  onSelectTransport?: (item: UnifiedTransportItem) => void
}

export const AlertsView: React.FC<AlertsViewProps> = ({ transports, onSelectTransport }) => {
  const alertedTransports = transports.filter(
    (t) =>
      t.hasIntercurrence ||
      t.slaStatus === 'CRITICO' ||
      t.slaStatus === 'ATRASADO' ||
      t.slaStatus === 'ATENCAO',
  )

  return (
    <div className="space-y-4">
      {/* Resumo de Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-rose-700 block">
              Críticos & Atrasados
            </span>
            <span className="text-2xl font-black text-rose-900">
              {
                transports.filter((t) => t.slaStatus === 'CRITICO' || t.slaStatus === 'ATRASADO')
                  .length
              }
            </span>
          </div>
          <AlertOctagon className="w-8 h-8 text-rose-600" />
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-700 block">
              Em Risco / Atenção
            </span>
            <span className="text-2xl font-black text-amber-900">
              {transports.filter((t) => t.slaStatus === 'ATENCAO').length}
            </span>
          </div>
          <AlertTriangle className="w-8 h-8 text-amber-600" />
        </div>

        <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-sky-700 block">
              Intercorrências no Fred IA
            </span>
            <span className="text-2xl font-black text-sky-900">
              {transports.filter((t) => t.hasIntercurrence).length}
            </span>
          </div>
          <ShieldAlert className="w-8 h-8 text-[#005596]" />
        </div>
      </div>

      {/* Lista de Alertas Ativos */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-4 pb-2 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-black text-slate-900">
              Fila de Alertas & Desvios Operacionais
            </CardTitle>
            <Badge variant="outline" className="text-xs font-bold">
              {alertedTransports.length} pendências ativas
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3 text-xs">
          {alertedTransports.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="font-bold text-slate-700">Operação sem alertas críticos!</p>
              <p className="text-slate-400 text-xs">
                Todos os transportes estão dentro dos parâmetros de SLA.
              </p>
            </div>
          ) : (
            alertedTransports.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectTransport && onSelectTransport(item)}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-[#005596] bg-slate-50/50 hover:bg-white transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-sm">
                      {item.transportNumber}
                    </span>
                    <Badge
                      className={
                        item.slaStatus === 'CRITICO' || item.slaStatus === 'ATRASADO'
                          ? 'bg-rose-600 text-white text-[10px]'
                          : 'bg-amber-600 text-white text-[10px]'
                      }
                    >
                      {item.slaStatus}
                    </Badge>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {item.routeCode} • {item.vehiclePlate}
                    </span>
                  </div>

                  <p className="font-semibold text-rose-900 bg-rose-50 border border-rose-200 p-2 rounded-lg text-xs">
                    ⚠️{' '}
                    {item.intercurrenceDescription ||
                      item.slaReason ||
                      'Desvio identificado no SLA da etapa.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-[11px] pt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {item.driverName} ({item.carrierName})
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {item.customerName} — {item.destinationCity}/{item.destinationUf}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      Setor: {item.responsibleSector}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    className="bg-[#005596] hover:bg-[#004275] text-white text-xs font-bold gap-1"
                  >
                    Ver Detalhes
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
