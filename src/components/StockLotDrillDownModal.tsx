import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SapStockCurrentEntity } from '@/domain/rules'
import { formatWeight, formatDate, formatDateTime } from '@/lib/utils'
import { getStockItemWeightTons } from '@/domain/stockIndicatorsEngine'
import { Layers, Warehouse, Info, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

export interface StockLotDrillDownModalProps {
  isOpen: boolean
  onClose: () => void
  indicatorTitle: string
  indicatorSubtitle?: string
  lots: SapStockCurrentEntity[]
  modeDetails?: Array<{ weightTons: number; count: number }>
  materialCode?: string
  materialDescription?: string
}

export const StockLotDrillDownModal: React.FC<StockLotDrillDownModalProps> = ({
  isOpen,
  onClose,
  indicatorTitle,
  indicatorSubtitle,
  lots,
  modeDetails,
  materialCode,
  materialDescription,
}) => {
  const totalWeight = lots.reduce((acc, curr) => acc + getStockItemWeightTons(curr), 0)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 bg-gradient-to-r from-sky-50 via-white to-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#005596] text-white">
                  <Layers className="w-4 h-4" />
                </div>
                <DialogTitle className="text-base sm:text-lg font-black text-slate-900">
                  Drill-Down: {indicatorTitle}
                </DialogTitle>
                <Badge className="bg-[#005596] text-white font-mono text-[10px]">
                  {lots.length} {lots.length === 1 ? 'lote' : 'lotes'}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-500">
                {indicatorSubtitle || 'Detalhamento dos lotes SAP que compõem este indicador.'}
                {materialCode && (
                  <span className="block mt-0.5 text-slate-700 font-medium">
                    Material: <strong className="font-mono text-[#005596]">{materialCode}</strong>
                    {materialDescription ? ` • ${materialDescription}` : ''}
                  </span>
                )}
              </DialogDescription>
            </div>{' '}
            <div className="text-right hidden sm:block shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Peso Consolidado
              </span>
              <span className="text-sm font-mono font-black text-slate-900">
                {formatWeight(totalWeight, { unit: 't' })}
              </span>
            </div>
          </div>

          {modeDetails && modeDetails.length > 1 && (
            <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-wrap items-center gap-2">
              <span className="font-bold flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-amber-600" />
                Empate Multimodal detectado:
              </span>
              {modeDetails.map((m, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="bg-white border-amber-300 text-amber-900 font-mono text-[11px]"
                >
                  {formatWeight(m.weightTons, { unit: 't' })} ({m.count}{' '}
                  {m.count === 1 ? 'ocorrência' : 'ocorrências'})
                </Badge>
              ))}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {lots.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Warehouse className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              Nenhum lote encontrado para este indicador.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                      <th className="p-2.5">Lote SAP (CHARG)</th>
                      <th className="p-2.5 text-right">Peso (t)</th>
                      <th className="p-2.5">Centro (WERKS)</th>
                      <th className="p-2.5">Depósito (LGORT)</th>
                      <th className="p-2.5">Localização (LGPBE)</th>
                      <th className="p-2.5 text-right">Disponível (t)</th>
                      <th className="p-2.5 text-right">Reservado (t)</th>
                      <th className="p-2.5 text-right">Bloqueado (t)</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {lots.map((lot, idx) => {
                      const weightTons = getStockItemWeightTons(lot)
                      const isAvailable = (lot.available_qty ?? 0) > 0
                      const hasBlocked = (lot.blocked_qty ?? 0) > 0
                      const hasReserved = (lot.reserved_qty ?? 0) > 0

                      return (
                        <tr key={lot.id || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {lot.batch || 'LOTE-PADRÃO'}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatWeight(weightTons, { unit: 't' })}
                          </td>
                          <td className="p-2.5 font-mono text-slate-700">{lot.plant || '---'}</td>
                          <td className="p-2.5 font-mono text-slate-700">
                            {lot.storage_location || '---'}
                          </td>
                          <td className="p-2.5 font-mono text-slate-600">
                            {lot.storage_bin ? (
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {lot.storage_bin}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 italic">Não inf.</span>
                            )}
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                            {formatWeight(lot.available_qty ?? 0, { unit: 't' })}
                          </td>
                          <td className="p-2.5 text-right font-mono text-amber-700 whitespace-nowrap">
                            {formatWeight(lot.reserved_qty ?? 0, { unit: 't' })}
                          </td>
                          <td className="p-2.5 text-right font-mono text-rose-700 whitespace-nowrap">
                            {formatWeight(lot.blocked_qty ?? 0, { unit: 't' })}
                          </td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            {hasBlocked ? (
                              <Badge className="bg-rose-600 text-white text-[9px] font-bold">
                                Bloqueado
                              </Badge>
                            ) : hasReserved ? (
                              <Badge className="bg-amber-500 text-white text-[9px] font-bold">
                                Reservado
                              </Badge>
                            ) : isAvailable ? (
                              <Badge className="bg-emerald-600 text-white text-[9px] font-bold">
                                Disponível
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-400 text-white text-[9px] font-bold">
                                Sem Saldo
                              </Badge>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-3 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between sm:justify-between">
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Fonte: <strong>sap_stock_current</strong> • RFC_READ_TABLE SAP ECC 6.0
          </span>
          <Button size="sm" variant="outline" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
