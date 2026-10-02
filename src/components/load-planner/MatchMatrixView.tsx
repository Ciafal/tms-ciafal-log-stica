import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Check, AlertCircle, Minus, HelpCircle } from 'lucide-react'
import type { EngineExecutionResult, VehicleLoadMatch } from '@/domain/vehicleLoadMatchingEngine'

interface MatchMatrixViewProps {
  matrixVehicles: EngineExecutionResult['matrixVehicles']
  matrixCargas: EngineExecutionResult['matrixCargas']
  matrixCells: EngineExecutionResult['matrixCells']
  matches: VehicleLoadMatch[]
  onSelectMatch: (match: VehicleLoadMatch) => void
}

export const MatchMatrixView: React.FC<MatchMatrixViewProps> = ({
  matrixVehicles,
  matrixCargas,
  matrixCells,
  matches,
  onSelectMatch,
}) => {
  if (matrixVehicles.length === 0 || matrixCargas.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed">
        Sem dados de veículos ou cargas suficientes para renderizar a matriz cruzada.
      </div>
    )
  }

  // Mapa rápido de matches por matchId
  const matchMap = new Map<string, VehicleLoadMatch>()
  matches.forEach((m) => matchMap.set(m.matchId, m))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-md border border-slate-200">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-700">Legenda da Matriz:</span>
          <span className="flex items-center gap-1 font-medium text-emerald-700">
            <span className="w-4 h-4 rounded bg-emerald-100 border border-emerald-300 flex items-center justify-center text-[10px]">
              ✓
            </span>
            Viável (clique para abrir)
          </span>
          <span className="flex items-center gap-1 font-medium text-amber-700">
            <span className="w-4 h-4 rounded bg-amber-100 border border-amber-300 flex items-center justify-center text-[10px]">
              🟡
            </span>
            Condicionado (Crédito/PCP)
          </span>
          <span className="flex items-center gap-1 font-medium text-slate-500">
            <span className="w-4 h-4 rounded bg-slate-200 border border-slate-300 flex items-center justify-center text-[10px]">
              —
            </span>
            Inviável (passe o mouse p/ ver motivo)
          </span>
        </div>
        <span className="text-slate-400">
          Grid: {matrixVehicles.length} veículos × {matrixCargas.length} cargas candidatas
        </span>
      </div>

      <div className="rounded-lg border border-slate-200 overflow-x-auto shadow-sm bg-white">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 border-b">
              <th className="p-3 sticky left-0 bg-slate-100 z-10 font-bold border-r min-w-[200px]">
                Veículo na Fila (Placa / Tipo)
              </th>
              {matrixCargas.map((cargo) => (
                <th
                  key={cargo.id}
                  className="p-3 border-r min-w-[130px] font-semibold text-center hover:bg-slate-200/60 transition-colors"
                >
                  <div className="font-bold text-slate-900 truncate" title={cargo.title}>
                    {cargo.title}
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Rota {cargo.itineraryCode} • {(cargo.weightKg / 1000).toFixed(1)}t
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {matrixVehicles.map((vehicle) => (
              <tr key={vehicle.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 sticky left-0 bg-white z-10 border-r font-medium text-slate-900 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-800">{vehicle.plate}</span>
                    <Badge variant="outline" className="text-[10px] py-0">
                      {vehicle.group}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {vehicle.driverName} • {(vehicle.capacityKg / 1000).toFixed(1)}t cap
                  </div>
                </td>

                {matrixCargas.map((cargo) => {
                  const cellKey = `${vehicle.id}_${cargo.id}`
                  const cell = matrixCells[cellKey] || {
                    status: 'INVIABLE',
                    reason: 'Sem correspondência técnica viável.',
                  }
                  const matchObj = cell.matchId ? matchMap.get(cell.matchId) : null

                  return (
                    <td key={cargo.id} className="p-2 border-r text-center align-middle">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex justify-center">
                              {cell.status === 'VIABLE' ? (
                                <button
                                  type="button"
                                  onClick={() => matchObj && onSelectMatch(matchObj)}
                                  className="w-10 h-9 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 flex flex-col items-center justify-center font-bold transition-all shadow-2xs hover:scale-105"
                                >
                                  <span className="text-xs">✓</span>
                                  <span className="text-[9px] font-mono leading-none">
                                    {cell.score}%
                                  </span>
                                </button>
                              ) : cell.status === 'CONDITIONED' ? (
                                <button
                                  type="button"
                                  onClick={() => matchObj && onSelectMatch(matchObj)}
                                  className="w-10 h-9 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 flex flex-col items-center justify-center font-bold transition-all shadow-2xs hover:scale-105"
                                >
                                  <span className="text-xs">🟡</span>
                                  <span className="text-[9px] font-mono leading-none">
                                    {cell.score}%
                                  </span>
                                </button>
                              ) : (
                                <div className="w-10 h-9 rounded-md bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center font-bold text-xs cursor-not-allowed">
                                  —
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            <p className="font-bold mb-1">
                              {vehicle.plate} × {cargo.title}
                            </p>
                            <p className="text-slate-200">
                              {cell.reason || 'Sem informações adicionais.'}
                            </p>
                            {cell.score !== undefined && (
                              <p className="text-blue-300 font-semibold mt-1">
                                Score Calculado: {cell.score}%
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
