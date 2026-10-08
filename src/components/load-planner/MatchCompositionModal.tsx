import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatTons, formatKg, formatPercent } from '@/utils/format'
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Building2,
  FileSpreadsheet,
  Layers,
} from 'lucide-react'
import type { VehicleLoadMatch } from '@/domain/vehicleLoadMatchingEngine'

interface MatchCompositionModalProps {
  match: VehicleLoadMatch | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const MatchCompositionModal: React.FC<MatchCompositionModalProps> = ({
  match,
  open,
  onOpenChange,
}) => {
  if (!match) return null

  const { candidateLoad, vehiclePlate, driverName, vehicleCapacityKg, occupancyPct, balanceKg } =
    match
  const orders = candidateLoad.orders || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-3 border-b bg-slate-50/70">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="font-mono bg-blue-50 text-blue-800 border-blue-200"
                >
                  {match.matchId}
                </Badge>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Composição da Carga: {candidateLoad.title}
                </DialogTitle>
              </div>
              <DialogDescription className="text-sm text-slate-500 mt-1">
                Veículo {vehiclePlate} ({driverName}) • Rota {candidateLoad.itineraryCode} •{' '}
                {orders.length} pedido(s)
              </DialogDescription>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold block">
                Score do Match
              </span>
              <span className="text-2xl font-black text-blue-700">{match.score.totalScore}%</span>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            {/* Lista dos Pedidos que compõem o Encontro */}
            <div className="rounded-lg border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px] border-b">
                  <tr>
                    <th className="py-2.5 px-3">Seq / Pedido</th>
                    <th className="py-2.5 px-3">Cliente / Cidade</th>
                    <th className="py-2.5 px-3">Material</th>
                    <th className="py-2.5 px-3 text-right">Peso (kg)</th>
                    <th className="py-2.5 px-3 text-center">Estoque</th>
                    <th className="py-2.5 px-3 text-center">Crédito</th>
                    <th className="py-2.5 px-3 text-center">Descarga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((ord, idx) => (
                    <tr key={ord.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700">
                            {idx + 1}
                          </span>
                          <span>{ord.order_number || 'S/N'}</span>
                        </div>
                        {ord.item_number && (
                          <span className="text-[10px] text-slate-400 block ml-5">
                            Item {ord.item_number}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800 truncate max-w-[200px]">
                          {ord.customer_name || ord.customer_code}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {ord.destination_city || '—'} / {ord.uf || 'SP'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-slate-800 font-medium truncate max-w-[180px]">
                          {ord.material_description || ord.material || 'Laminados de Aço'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {ord.family || ord.line || 'Aço Comercial'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatTons((ord.weight_kg || 0) / 1000, { decimals: 2 })}
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {formatKg(ord.weight_kg || 0)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {ord.production_status === 'Pronto' || ord.stock_available ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Disponível
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                          >
                            <Clock className="h-3 w-3 mr-1" /> PCP
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {ord.credit_status === 'Bloqueado' ? (
                          <Badge
                            variant="outline"
                            className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]"
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" /> Bloqueado
                          </Badge>
                        ) : ord.credit_status === 'Em Análise' ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                          >
                            Análise
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                          >
                            Liberado
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                          {ord.discharge_type || 'Livre'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Explicações do Score Determinístico */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-blue-600" />
                Justificativa Multicritério do Score ({match.score.totalScore}/100)
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
                {match.score.explanations.map((exp, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-1.5 bg-white p-2 rounded border border-slate-200 shadow-2xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{exp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </ScrollArea>

        {/* Rodapé de Balanço de Capacidade */}
        <div className="border-t bg-slate-100 p-4 px-6 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-700">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-500 block text-[11px]">Peso Total da Carga</span>
              <span className="font-bold text-sm text-slate-900 font-mono">
                {formatTons(candidateLoad.totalWeightKg / 1000, { decimals: 2 })}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Capacidade do Veículo</span>
              <span className="font-bold text-sm text-slate-900 font-mono">
                {formatTons(vehicleCapacityKg / 1000, { decimals: 2 })}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Ocupação</span>
              <span className="font-bold text-sm text-blue-700 font-mono">
                {formatPercent(occupancyPct, 0)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Saldo Disponível</span>
              <span className="font-bold text-sm text-slate-800 font-mono">
                {formatTons(balanceKg / 1000, { decimals: 2 })} ({formatKg(balanceKg)})
              </span>
            </div>
          </div>

          <Badge
            variant="outline"
            className={
              occupancyPct >= 95
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : occupancyPct >= 80
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
            }
          >
            {occupancyPct >= 95
              ? 'Aproveitamento Pleno (≥95%)'
              : occupancyPct >= 80
                ? 'Aproveitamento Adequado'
                : 'Carga Parcial / Oportunidade'}
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  )
}
