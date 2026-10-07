// TMS CIAFAL — Modal de Detalhamento de Rotas Adicionadas ao Itinerário (Requisito 11)
// Exibe a tabela canônica com Itinerário Original (MS001A, motivo "-") e linhas de cada Rota Adicionada.

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
import { Route, Trash2, Calendar, User, ShieldAlert, Sparkles, Scale, Info } from 'lucide-react'
import { RouteAdditionEntity } from '@/domain/routeAdditionEngine'

export interface AddedRoutesDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  originalItineraryCode: string
  originalItineraryDesc?: string
  originalCity?: string
  originalUf?: string
  originalWeightTon?: number
  originalCustomersCount?: number
  routeAdditions: RouteAdditionEntity[]
  onRemoveRoute?: (addition: RouteAdditionEntity) => void
  canRemove?: boolean
}

export const AddedRoutesDetailModal: React.FC<AddedRoutesDetailModalProps> = ({
  open,
  onOpenChange,
  originalItineraryCode,
  originalItineraryDesc = '',
  originalCity = 'Contagem / Regional',
  originalUf = 'MG',
  originalWeightTon = 18.4,
  originalCustomersCount = 2,
  routeAdditions = [],
  onRemoveRoute,
  canRemove = true,
}) => {
  const activeAdditions = routeAdditions.filter((r) => r.status !== 'REMOVIDA')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <DialogHeader className="p-4 bg-[#005596] text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                <Route className="w-4 h-4 text-sky-200" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white leading-tight">
                  Rotas Adicionadas ao Itinerário {originalItineraryCode}
                </DialogTitle>
                <DialogDescription className="text-xs text-sky-100 font-medium">
                  Composição da carga: Itinerário Original + Rotas Complementares ativas
                </DialogDescription>
              </div>
            </div>

            <Badge className="bg-amber-400 text-slate-900 text-xs font-black uppercase px-2.5 py-0.5 border-none">
              +{activeAdditions.length} Rota{activeAdditions.length > 1 ? 's' : ''} Adicional
              {activeAdditions.length > 1 ? 'is' : ''}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Requisito 11: Tabela canônica Tipo | Rota | Cidade/UF | Clientes | Peso | Motivo */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold border-b border-slate-200">
                  <th className="p-2.5">Tipo</th>
                  <th className="p-2.5">Rota</th>
                  <th className="p-2.5">Cidade/UF</th>
                  <th className="p-2.5 text-center">Clientes</th>
                  <th className="p-2.5 text-right">Peso</th>
                  <th className="p-2.5">Motivo da Adição</th>
                  {canRemove && <th className="p-2.5 text-center">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Linha Original: MS001A, motivo "-" */}
                <tr className="bg-slate-50/70 font-semibold">
                  <td className="p-2.5">
                    <Badge className="bg-blue-100 text-[#005596] border border-blue-300 text-[9px] font-bold">
                      Original
                    </Badge>
                  </td>
                  <td className="p-2.5 font-mono text-slate-900">{originalItineraryCode}</td>
                  <td className="p-2.5 text-slate-700">
                    {originalCity}/{originalUf}
                  </td>
                  <td className="p-2.5 text-center font-mono">{originalCustomersCount}</td>
                  <td className="p-2.5 text-right font-mono text-slate-900">
                    {originalWeightTon.toFixed(1)} t
                  </td>
                  <td className="p-2.5 text-slate-400 italic font-mono">-</td>
                  {canRemove && (
                    <td className="p-2.5 text-center text-slate-400 text-[10px] italic">
                      Protegido (SAP)
                    </td>
                  )}
                </tr>

                {/* Linhas de Rotas Adicionadas */}
                {activeAdditions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canRemove ? 7 : 6}
                      className="p-6 text-center text-slate-400 italic text-xs"
                    >
                      Nenhuma rota adicional vinculada a este itinerário.
                    </td>
                  </tr>
                ) : (
                  activeAdditions.map((addition, idx) => {
                    const weightTon = addition.weight_after
                      ? ((addition.weight_after - (addition.weight_before || 0)) / 1000).toFixed(1)
                      : '5.3'
                    const clientsCount = addition.clients_after
                      ? Math.max(1, (addition.clients_after || 1) - (addition.clients_before || 0))
                      : 1

                    return (
                      <tr key={addition.id || idx} className="hover:bg-amber-50/40">
                        <td className="p-2.5">
                          <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold">
                            Adicionada
                          </Badge>
                        </td>
                        <td className="p-2.5 font-mono font-bold text-slate-900">
                          {addition.added_route_id ||
                            addition.complementary_itinerary_code ||
                            addition.added_itinerary_id ||
                            `ROTA-${idx + 1}`}
                        </td>
                        <td className="p-2.5 text-slate-700">
                          {addition.destination_city || 'Destino Complementar'}/
                          {addition.destination_uf || 'MG'}
                        </td>
                        <td className="p-2.5 text-center font-mono">{clientsCount}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {weightTon} t
                        </td>
                        <td className="p-2.5 text-slate-800">
                          <span className="font-semibold block text-[11px]">
                            {addition.reason_description ||
                              addition.reason_code ||
                              'Complementação de carga'}
                          </span>
                          {addition.user_observation && (
                            <span className="text-[10px] text-slate-500 italic truncate max-w-xs block">
                              Obs: {addition.user_observation}
                            </span>
                          )}
                        </td>
                        {canRemove && (
                          <td className="p-2.5 text-center">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => onRemoveRoute && onRemoveRoute(addition)}
                              className="h-7 text-xs px-2 text-rose-700 border-rose-300 hover:bg-rose-50"
                              title="Remover apenas esta rota adicional (Requisito 13)"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-600" />
                              Remover
                            </Button>
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Destaque das análises de IA salvas nas adições */}
          {activeAdditions.some((a) => a.ai_analysis) && (
            <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-200 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-purple-900">
                <Sparkles className="w-4 h-4 text-purple-700" />
                <span>Parecer Registrado da IA para as Adições:</span>
              </div>
              <div className="space-y-1.5">
                {activeAdditions.map(
                  (a, i) =>
                    a.ai_analysis && (
                      <div
                        key={i}
                        className="bg-white p-2.5 rounded-lg border border-purple-100 text-slate-800"
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold text-purple-800 mb-1">
                          <span>
                            Rota:{' '}
                            {a.added_route_id ||
                              a.complementary_itinerary_code ||
                              a.added_itinerary_id}
                          </span>
                          <Badge variant="outline" className="text-[9px] bg-purple-50">
                            {a.ai_user_alignment || a.ai_alignment || 'Coerente'}
                          </Badge>
                        </div>
                        <p className="text-[11px] leading-relaxed italic">{a.ai_analysis}</p>
                      </div>
                    ),
                )}
              </div>
            </div>
          )}

          <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-[11px] text-[#005596] flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-[#005596]" />
            <span>
              <strong>Regra de Governança:</strong> O itinerário SAP original nunca é alterado nesta
              operação. As rotas adicionadas aplicam-se exclusivamente à programação desta carga.
            </span>
          </div>
        </div>

        <DialogFooter className="p-3 bg-slate-100 border-t border-slate-200 shrink-0">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs h-8 px-4 font-semibold ml-auto"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddedRoutesDetailModal
