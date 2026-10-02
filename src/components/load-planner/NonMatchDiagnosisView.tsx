import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { AlertCircle, Clock, Truck, ShieldAlert, Scale, Route } from 'lucide-react'
import type { VehicleNonMatchDiagnosis } from '@/domain/vehicleLoadMatchingEngine'

interface NonMatchDiagnosisViewProps {
  diagnoses: VehicleNonMatchDiagnosis[]
}

export const NonMatchDiagnosisView: React.FC<NonMatchDiagnosisViewProps> = ({ diagnoses }) => {
  if (diagnoses.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center text-emerald-800 text-sm">
        🎉 Excelente! Todos os veículos disponíveis na fila encontraram combinações de carga viáveis
        no momento.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          Diagnóstico de Não-Match ({diagnoses.length} veículo(s) sem carga atribuível)
        </span>
        <span className="text-slate-500">
          Análise determinística das causas de eliminação por veículo
        </span>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {diagnoses.map((diag) => {
          const elim = diag.eliminations

          return (
            <AccordionItem
              key={diag.vehicleId}
              value={diag.vehicleId}
              className="border border-slate-200 rounded-lg px-4 bg-white shadow-2xs"
            >
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex flex-wrap items-center justify-between gap-3 w-full pr-4 text-left">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-slate-500 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {diag.vehiclePlate}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {diag.queueGroup}
                        </Badge>
                        <span className="text-xs text-slate-500">• {diag.driverName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {diag.vehicleType} • {(diag.vehicleCapacityKg / 1000).toFixed(1)}t cap •
                        Espera: {diag.waitingMinutes} min
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right text-xs">
                      <span className="text-rose-600 font-semibold block">
                        Sem match ({diag.totalCargasEvaluated} cargas analisadas)
                      </span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[260px] block">
                        {diag.summaryMessage}
                      </span>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="pb-4 pt-1 border-t border-slate-100 text-xs text-slate-600">
                <div className="space-y-3">
                  {/* Badges de Contadores Reais de Eliminação */}
                  <div>
                    <span className="font-semibold text-slate-700 block mb-1.5 text-[11px] uppercase tracking-wider">
                      Causas de Eliminação Identificadas:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {elim.exceedsCapacity > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-rose-50 text-rose-700 border-rose-200 text-xs"
                        >
                          <Scale className="h-3 w-3 mr-1" />
                          {elim.exceedsCapacity} excede capacidade
                        </Badge>
                      )}
                      {elim.incompatibleBodyType > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-200 text-xs"
                        >
                          <Truck className="h-3 w-3 mr-1" />
                          {elim.incompatibleBodyType} carroceria incompatível
                        </Badge>
                      )}
                      {elim.incompatibleDischarge > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-200 text-xs"
                        >
                          {elim.incompatibleDischarge} método descarga incompatível
                        </Badge>
                      )}
                      {elim.blockedCredit > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-rose-50 text-rose-700 border-rose-200 text-xs"
                        >
                          <ShieldAlert className="h-3 w-3 mr-1" />
                          {elim.blockedCredit} crédito bloqueado
                        </Badge>
                      )}
                      {elim.missingStock > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-slate-100 text-slate-700 border-slate-300 text-xs"
                        >
                          {elim.missingStock} sem estoque/PCP
                        </Badge>
                      )}
                      {elim.incompatibleItinerary > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                        >
                          <Route className="h-3 w-3 mr-1" />
                          {elim.incompatibleItinerary} rota incompatível
                        </Badge>
                      )}
                      {elim.blockedDocumentation > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-red-100 text-red-800 border-red-300 text-xs"
                        >
                          Bloqueio cadastral ativo
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Resumo detalhado dos motivos */}
                  <div className="bg-slate-50 p-3 rounded-md border border-slate-200/80">
                    <span className="font-semibold text-slate-700 block mb-1">
                      Ação Operacional Sugerida:
                    </span>
                    <p className="text-slate-600 text-xs">
                      {elim.exceedsCapacity > 0
                        ? `Veículo de capacidade ${(diag.vehicleCapacityKg / 1000).toFixed(1)}t aguarda lotes fracionados ou agrupamentos menores de carga no roteirizador.`
                        : elim.blockedCredit > 0
                          ? 'Aguardando liberação de crédito dos pedidos pelo departamento financeiro.'
                          : elim.missingStock > 0
                            ? 'Aguardando liberação de estoque pelo PCP / laminação.'
                            : 'Aguardando consolidação de pedidos compatíveis na carteira SAP.'}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
