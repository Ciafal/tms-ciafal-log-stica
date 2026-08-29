import React from 'react'
import {
  X,
  Truck,
  User,
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
  Phone,
  Shield,
  ExternalLink,
  Layers,
  Building,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UnifiedTransportItem } from '@/domain/controlTowerConsolidatedEngine'
import { Link } from 'react-router-dom'

interface TransportDetailModalProps {
  item: UnifiedTransportItem | null
  onClose: () => void
}

export const TransportDetailModal: React.FC<TransportDetailModalProps> = ({ item, onClose }) => {
  if (!item) return null

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white text-slate-900 border-slate-200">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-sky-50 rounded-lg text-[#005596]">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>{item.transportNumber}</span>
                  <Badge className="bg-[#005596] text-white text-xs">{item.stageLabel}</Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Origem do Registro: Coleção PocketBase{' '}
                  <code className="text-[#005596]">{item.sourceCollection}</code>
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Informações Principais da Carga */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Nº SAP / Pedido
              </span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                {item.sapTransportNumber || '—'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Peso Total
              </span>
              <span className="font-black text-slate-900 text-sm">
                {item.weightTon > 0
                  ? `${item.weightTon.toLocaleString('pt-BR')} t (${item.weightKg.toLocaleString('pt-BR')} kg)`
                  : '—'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Descargas
              </span>
              <span className="font-black text-slate-800 text-sm">{item.deliveriesCount}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Rota / Itinerário
              </span>
              <span className="font-mono font-bold text-[#005596]">{item.routeCode}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Empresa & Centro
              </span>
              <span className="font-medium text-slate-700">{item.company}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Situação do SLA
              </span>
              <Badge
                className={
                  item.slaStatus === 'NORMAL'
                    ? 'bg-emerald-600 text-white text-[10px]'
                    : item.slaStatus === 'ATENCAO'
                      ? 'bg-amber-600 text-white text-[10px]'
                      : 'bg-rose-600 text-white text-[10px]'
                }
              >
                {item.slaStatus}
              </Badge>
            </div>
          </div>

          {/* Motorista & Veículo */}
          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-500" />
              Dados do Motorista & Veículo
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Nome do Motorista:</span>
                <strong className="text-slate-900">{item.driverName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Placa do Veículo:</span>
                <strong className="text-[#005596] font-mono">{item.vehiclePlate}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Tipo de Veículo:</span>
                <span className="text-slate-700 font-medium">{item.vehicleType}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Transportadora:</span>
                <span className="text-slate-700 font-medium">{item.carrierName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Telefone / WhatsApp:</span>
                <span className="text-slate-700 font-mono">{item.driverPhone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">CPF Motorista:</span>
                <span className="text-slate-700 font-mono">{item.driverDocument || '—'}</span>
              </div>
            </div>
          </div>

          {/* Cliente e Destino */}
          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-500" />
              Destinatário & Local de Entrega
            </h4>
            <div className="text-[11px] space-y-1">
              <div>
                <span className="text-slate-400 text-[10px] block">Cliente Principal:</span>
                <strong className="text-slate-900">{item.customerName}</strong>
              </div>
              <div className="flex justify-between text-slate-600 pt-1">
                <span>
                  Cidade de Destino: <strong>{item.destinationCity}</strong>
                </span>
                <span>
                  UF: <strong>{item.destinationUf}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Intercorrências e Alertas */}
          {item.hasIntercurrence && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-rose-900">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Intercorrência Registrada na Operação
              </div>
              <p className="text-[11px] font-medium">
                {item.intercurrenceDescription || item.slaReason || 'Desvio identificado pela IA.'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between">
          <div className="text-[10px] text-slate-400">
            Última atualização: {new Date(item.updatedAt).toLocaleString('pt-BR')}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Fechar
            </Button>
            {item.sourceCollection === 'expedition_tracking' && (
              <Link to="/tms/expedicao">
                <Button size="sm" className="bg-[#005596] text-white text-xs font-bold gap-1">
                  Abrir na Expedição
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </Link>
            )}
            {item.sourceCollection === 'fred_transports' && (
              <Link to="/tms/torre-controle-fred">
                <Button size="sm" className="bg-[#005596] text-white text-xs font-bold gap-1">
                  Abrir no Fred IA
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </Link>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
