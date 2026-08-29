import React from 'react'
import {
  Truck,
  User,
  MapPin,
  Clock,
  AlertTriangle,
  Building,
  CheckCircle2,
  ShieldAlert,
  AlertOctagon,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UnifiedTransportItem } from '@/domain/controlTowerConsolidatedEngine'

interface CardsViewProps {
  transports: UnifiedTransportItem[]
  onSelectTransport?: (item: UnifiedTransportItem) => void
}

export const CardsView: React.FC<CardsViewProps> = ({ transports, onSelectTransport }) => {
  const getSlaBadge = (item: UnifiedTransportItem) => {
    switch (item.slaStatus) {
      case 'ATRASADO':
        return (
          <Badge className="bg-rose-700 text-white font-bold text-[10px] gap-1 px-2 py-0.5">
            <AlertOctagon className="w-3 h-3 text-white" />
            Atrasado
          </Badge>
        )
      case 'CRITICO':
        return (
          <Badge className="bg-rose-600 text-white font-bold text-[10px] gap-1 px-2 py-0.5 animate-pulse">
            <ShieldAlert className="w-3 h-3 text-white" />
            Crítico
          </Badge>
        )
      case 'ATENCAO':
        return (
          <Badge className="bg-amber-600 text-white font-bold text-[10px] gap-1 px-2 py-0.5">
            <AlertTriangle className="w-3 h-3 text-white" />
            Atenção
          </Badge>
        )
      case 'NORMAL':
      default:
        return (
          <Badge className="bg-[#005596] text-white font-bold text-[10px] gap-1 px-2 py-0.5">
            <CheckCircle2 className="w-3 h-3 text-white" />
            Normal
          </Badge>
        )
    }
  }

  if (transports.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        Nenhum transporte encontrado para os filtros selecionados.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {transports.map((item) => {
        const isCritical = item.slaStatus === 'CRITICO' || item.slaStatus === 'ATRASADO'

        return (
          <Card
            key={item.id}
            onClick={() => onSelectTransport && onSelectTransport(item)}
            className={`cursor-pointer transition-all hover:shadow-md bg-white border overflow-hidden ${
              isCritical
                ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-200'
                : 'border-slate-200 hover:border-[#005596]'
            }`}
          >
            <div
              className={`h-2 w-full ${
                isCritical
                  ? 'bg-rose-600 animate-pulse'
                  : item.slaStatus === 'ATENCAO'
                    ? 'bg-amber-500'
                    : 'bg-[#005596]'
              }`}
            />

            <CardContent className="p-4 space-y-3.5 text-xs">
              {/* Header do Card */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-base font-black text-slate-900 block leading-tight">
                    {item.transportNumber}
                  </span>
                  {item.sapTransportNumber && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      SAP: {item.sapTransportNumber}
                    </span>
                  )}
                </div>
                {getSlaBadge(item)}
              </div>

              {/* Status e Etapa */}
              <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-medium">Etapa Atual:</span>
                <Badge
                  variant="outline"
                  className="font-bold text-[#005596] bg-sky-50 border-sky-200 text-[10px]"
                >
                  {item.stageLabel}
                </Badge>
              </div>

              {/* Cliente & Destino */}
              <div className="space-y-1">
                <div className="font-bold text-slate-900 text-xs line-clamp-1">
                  {item.customerName}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {item.destinationCity} ({item.destinationUf})
                  </span>
                  <span className="font-mono text-[#005596] font-semibold">{item.routeCode}</span>
                </div>
              </div>

              {/* Motorista & Placa */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-800 text-xs">
                  <span className="flex items-center gap-1 truncate max-w-[170px]">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {item.driverName}
                  </span>
                  <span className="font-mono text-[#005596] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                    {item.vehiclePlate}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                  <span className="truncate max-w-[140px]">{item.carrierName}</span>
                  <span className="font-medium text-slate-700">{item.vehicleType}</span>
                </div>
              </div>

              {/* Métricas: Peso, Descargas e Lead Time */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Peso Total
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    {item.weightTon > 0 ? `${item.weightTon.toLocaleString('pt-BR')} t` : '—'}
                  </span>
                </div>
                <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Descargas
                  </span>
                  <span className="text-sm font-black text-slate-800">{item.deliveriesCount}</span>
                </div>
                <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Lead Time
                  </span>
                  <span className="text-sm font-black text-[#005596]">
                    {item.leadTimeMinutes ? `${item.leadTimeMinutes}m` : '0m'}
                  </span>
                </div>
              </div>

              {/* Alerta de Intercorrência */}
              {item.hasIntercurrence && (
                <div className="p-2 bg-rose-100 text-rose-900 rounded-lg font-semibold border border-rose-200 text-[10px] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span className="line-clamp-2">
                    {item.intercurrenceDescription ||
                      item.slaReason ||
                      'Atenção: intercorrência ativa.'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
