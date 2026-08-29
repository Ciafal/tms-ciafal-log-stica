import React from 'react'
import {
  PieChart,
  BarChart3,
  TrendingUp,
  Clock,
  Warehouse,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  Scale,
  DollarSign,
  Activity,
  Layers,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UnifiedTransportItem, KANBAN_COLUMNS } from '@/domain/controlTowerConsolidatedEngine'

interface ChartsViewProps {
  transports: UnifiedTransportItem[]
}

export const ChartsView: React.FC<ChartsViewProps> = ({ transports }) => {
  // Distribuição por Etapa
  const stageDistribution = KANBAN_COLUMNS.map((col) => {
    const count = transports.filter((t) => t.stage === col.id).length
    const ton = transports
      .filter((t) => t.stage === col.id)
      .reduce((acc, curr) => acc + curr.weightTon, 0)
    return {
      id: col.id,
      label: col.label,
      count,
      ton: Math.round(ton * 10) / 10,
    }
  }).filter((s) => s.count > 0 || transports.length === 0)

  // Distribuição por SLA
  const slaCounts = {
    NORMAL: transports.filter((t) => t.slaStatus === 'NORMAL').length,
    ATENCAO: transports.filter((t) => t.slaStatus === 'ATENCAO').length,
    CRITICO: transports.filter((t) => t.slaStatus === 'CRITICO').length,
    ATRASADO: transports.filter((t) => t.slaStatus === 'ATRASADO').length,
  }

  // Distribuição por UF
  const ufMap: Record<string, { count: number; ton: number }> = {}
  transports.forEach((t) => {
    const uf = t.destinationUf || 'SP'
    if (!ufMap[uf]) ufMap[uf] = { count: 0, ton: 0 }
    ufMap[uf].count += 1
    ufMap[uf].ton += t.weightTon
  })
  const ufList = Object.entries(ufMap).sort((a, b) => b[1].ton - a[1].ton)

  const totalTon = transports.reduce((acc, curr) => acc + curr.weightTon, 0)

  return (
    <div className="space-y-5">
      {/* Grid de 3 Gráficos / Painéis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Gráfico 1: Distribuição por Etapa do Fluxo */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-4 pb-2 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#005596]" />
                <CardTitle className="text-sm font-black text-slate-900">
                  Volume & Cargas por Etapa
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold">
                {transports.length} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            {stageDistribution.length === 0 ? (
              <div className="py-8 text-center text-slate-400">Dados aguardando integração.</div>
            ) : (
              stageDistribution.map((stage) => {
                const pct = transports.length > 0 ? (stage.count / transports.length) * 100 : 0
                return (
                  <div key={stage.id} className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-semibold text-slate-700">{stage.label}</span>
                      <span className="text-slate-500 font-mono">
                        {stage.count} unid. ({stage.ton.toLocaleString('pt-BR')} t)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#005596] rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Gráfico 2: Saúde do SLA Operacional */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-4 pb-2 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <CardTitle className="text-sm font-black text-slate-900">
                  Aderência ao SLA (Saúde 360º)
                </CardTitle>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                {transports.length > 0
                  ? `${Math.round((slaCounts.NORMAL / transports.length) * 100)}% No Prazo`
                  : '100%'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                  Normal / No Prazo
                </span>
                <span className="text-xl font-black text-emerald-900">{slaCounts.NORMAL}</span>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-center">
                <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <span className="text-[10px] uppercase font-bold text-amber-700 block">
                  Atenção / Risco
                </span>
                <span className="text-xl font-black text-amber-900">{slaCounts.ATENCAO}</span>
              </div>

              <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-center">
                <AlertOctagon className="w-5 h-5 text-rose-600 mx-auto mb-1" />
                <span className="text-[10px] uppercase font-bold text-rose-700 block">
                  Crítico Operacional
                </span>
                <span className="text-xl font-black text-rose-900">{slaCounts.CRITICO}</span>
              </div>

              <div className="bg-red-100 border border-red-300 p-3 rounded-lg text-center">
                <Clock className="w-5 h-5 text-red-700 mx-auto mb-1" />
                <span className="text-[10px] uppercase font-bold text-red-800 block">Atrasado</span>
                <span className="text-xl font-black text-red-950">{slaCounts.ATRASADO}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-800">Diretriz de Escalonamento:</div>
              <p>
                Ocorrências com severidade alta/crítica no Fred IA ou gargalos de liberação DP34 no
                WMS acionam priorização automática na Torre de Controle.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico 3: Concentração por UF de Destino */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-4 pb-2 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#005596]" />
                <CardTitle className="text-sm font-black text-slate-900">
                  Concentração por UF
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold">
                {Math.round(totalTon * 10) / 10} t total
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            {ufList.length === 0 ? (
              <div className="py-8 text-center text-slate-400">Dados aguardando integração.</div>
            ) : (
              ufList.map(([uf, data]) => {
                const pct = totalTon > 0 ? (data.ton / totalTon) * 100 : 0
                return (
                  <div key={uf} className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-800">
                        Estado de{' '}
                        {uf === 'SP'
                          ? 'São Paulo'
                          : uf === 'MG'
                            ? 'Minas Gerais'
                            : uf === 'RJ'
                              ? 'Rio de Janeiro'
                              : uf}{' '}
                        ({uf})
                      </span>
                      <span className="text-slate-600 font-mono">
                        {data.count} viagens ({Math.round(data.ton * 10) / 10} t)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-600 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
