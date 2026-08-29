import React from 'react'
import {
  Truck,
  User,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ShieldAlert,
  Layers,
  Scale,
  Building,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  UnifiedTransportItem,
  KANBAN_COLUMNS,
  UnifiedTransportStage,
} from '@/domain/controlTowerConsolidatedEngine'

interface KanbanViewProps {
  transports: UnifiedTransportItem[]
  onSelectTransport?: (item: UnifiedTransportItem) => void
}

export const KanbanView: React.FC<KanbanViewProps> = ({ transports, onSelectTransport }) => {
  const getSlaBadge = (item: UnifiedTransportItem) => {
    switch (item.slaStatus) {
      case 'ATRASADO':
        return (
          <Badge className="bg-rose-700 text-white font-bold text-[10px] gap-1 px-1.5 py-0">
            <AlertOctagon className="w-3 h-3 text-white" />
            Atrasado
          </Badge>
        )
      case 'CRITICO':
        return (
          <Badge className="bg-rose-600 text-white font-bold text-[10px] gap-1 px-1.5 py-0 animate-pulse">
            <ShieldAlert className="w-3 h-3 text-white" />
            Crítico
          </Badge>
        )
      case 'ATENCAO':
        return (
          <Badge className="bg-amber-600 text-white font-bold text-[10px] gap-1 px-1.5 py-0">
            <AlertTriangle className="w-3 h-3 text-white" />
            Atenção
          </Badge>
        )
      case 'NORMAL':
      default:
        return (
          <Badge className="bg-emerald-700 text-white font-bold text-[10px] gap-1 px-1.5 py-0">
            <CheckCircle2 className="w-3 h-3 text-white" />
            Normal
          </Badge>
        )
    }
  }

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-[1900px]">
        {KANBAN_COLUMNS.map((col) => {
          const colItems = transports.filter((t) => t.stage === col.id)

          return (
            <div
              key={col.id}
              className="w-[280px] flex-shrink-0 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col max-h-[calc(100vh-280px)] shadow-xs"
            >
              {/* Header da Coluna */}
              <div
                className={`p-3 rounded-t-xl border-b bg-white flex items-center justify-between sticky top-0 z-10 ${col.color}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs uppercase tracking-tight text-slate-800">
                    {col.label}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="font-bold text-[11px] bg-slate-100 text-slate-700"
                >
                  {colItems.length}
                </Badge>
              </div>

              {/* Corpo da Coluna com Cards */}
              <div className="p-2 space-y-2.5 overflow-y-auto flex-1">
                {colItems.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-slate-400 font-medium">
                    Sem transportes
                  </div>
                ) : (
                  colItems.map((item) => {
                    const isAlert = item.slaStatus === 'CRITICO' || item.slaStatus === 'ATRASADO'

                    return (
                      <Card
                        key={item.id}
                        onClick={() => onSelectTransport && onSelectTransport(item)}
                        className={`cursor-pointer transition-all hover:shadow-md bg-white border ${
                          isAlert
                            ? 'border-rose-400 ring-1 ring-rose-200'
                            : 'border-slate-200 hover:border-[#005596]'
                        }`}
                      >
                        <CardContent className="p-3 space-y-2.5 text-xs">
                          {/* Top: Número Transporte + SLA Badge */}
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <span className="font-black text-slate-900 block text-xs">
                                {item.transportNumber}
                              </span>
                              {item.sapTransportNumber && (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  SAP: {item.sapTransportNumber}
                                </span>
                              )}
                            </div>
                            {getSlaBadge(item)}
                          </div>

                          {/* Cliente & Rota */}
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1">
                            <div className="font-bold text-slate-800 text-[11px] line-clamp-1">
                              {item.customerName}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {item.destinationCity} ({item.destinationUf})
                              </span>
                              <span className="font-semibold text-slate-700">
                                {item.deliveriesCount}{' '}
                                {item.deliveriesCount === 1 ? 'descarga' : 'descargas'}
                              </span>
                            </div>
                          </div>

                          {/* Veículo & Motorista */}
                          <div className="text-[11px] space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-[#005596] bg-sky-50 px-1 rounded border border-sky-200 text-[10px]">
                                {item.vehiclePlate}
                              </span>
                              <span className="text-slate-600 text-[10px] truncate max-w-[120px]">
                                {item.vehicleType}
                              </span>
                            </div>
                            <div className="text-slate-700 truncate font-medium text-[11px] flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              {item.driverName}
                            </div>
                            <div className="text-slate-500 text-[10px] truncate flex items-center gap-1">
                              <Building className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              {item.carrierName}
                            </div>
                          </div>

                          {/* Peso & Horário / SLA */}
                          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                            <span className="font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.weightTon > 0
                                ? `${item.weightTon.toLocaleString('pt-BR')} t`
                                : '—'}
                            </span>
                            <span className="text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {item.leadTimeMinutes ? `${item.leadTimeMinutes} min` : 'Em dia'}
                            </span>
                          </div>

                          {/* Intercorrência / Alerta */}
                          {item.hasIntercurrence && (
                            <div className="p-1.5 bg-rose-50 border border-rose-200 rounded text-rose-900 text-[10px] font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                              <span className="line-clamp-2">
                                {item.intercurrenceDescription ||
                                  item.slaReason ||
                                  'Intercorrência operacional'}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
