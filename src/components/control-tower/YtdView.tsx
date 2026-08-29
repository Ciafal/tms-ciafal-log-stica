import React from 'react'
import {
  TrendingUp,
  Calendar,
  CheckCircle2,
  DollarSign,
  Truck,
  Scale,
  Award,
  BarChart2,
  Percent,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExecutiveCardsData } from '@/domain/controlTowerConsolidatedEngine'

interface YtdViewProps {
  metrics: ExecutiveCardsData
}

export const YtdView: React.FC<YtdViewProps> = ({ metrics }) => {
  return (
    <div className="space-y-6">
      {/* Banner YTD */}
      <div className="bg-[#005596] text-white p-5 rounded-xl border border-[#004275] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-200" />
            <h2 className="text-xl font-black tracking-tight">
              Desempenho Logístico Acumulado — YTD 2026
            </h2>
          </div>
          <p className="text-xs text-sky-100 mt-1 max-w-2xl">
            Indicadores consolidados desde o início do ano fiscal na operação logística CIAFAL:
            pontualidade de descarga, lead times de pátio e eficiência de custos.
          </p>
        </div>
        <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20 text-right">
          <span className="text-[10px] text-sky-200 uppercase font-bold block">
            Índice de Pontualidade (OTIF)
          </span>
          <span className="text-2xl font-black text-emerald-300">
            {metrics.delivered.ytd.onTimePct}%
          </span>
        </div>
      </div>

      {/* Grid de Cards YTD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">
              Total Viagens YTD
            </span>
            <CardTitle className="text-2xl font-black text-slate-900 flex items-center justify-between">
              <span>{metrics.delivered.ytd.count} viagens</span>
              <Truck className="w-5 h-5 text-[#005596]" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-slate-500">
            Transportes concluídos e auditados pela Torre.
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">
              Tonelagem Movimentada
            </span>
            <CardTitle className="text-2xl font-black text-slate-900 flex items-center justify-between">
              <span>{metrics.delivered.ytd.ton.toLocaleString('pt-BR')} t</span>
              <Scale className="w-5 h-5 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-slate-500">
            Volume de aço faturado e entregue.
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">
              Descargas Realizadas
            </span>
            <CardTitle className="text-2xl font-black text-slate-900 flex items-center justify-between">
              <span>{metrics.delivered.ytd.deliveries} descargas</span>
              <CheckCircle2 className="w-5 h-5 text-sky-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-slate-500">
            Entregas validadas com canhoto digital.
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">
              Lead Time Médio Pátio
            </span>
            <CardTitle className="text-2xl font-black text-[#005596] flex items-center justify-between">
              <span>{metrics.queue.avgWaitMinutes + 95} min</span>
              <Award className="w-5 h-5 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-slate-500">
            Meta operacional: 145 min (Check-in até Portaria).
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Comparativo Mensal */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-4 pb-2 border-b border-slate-100">
          <CardTitle className="text-sm font-black text-slate-900">
            Evolução Histórica Mensal (YTD)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-2">Mês de Referência</th>
                  <th className="pb-2">Viagens</th>
                  <th className="pb-2">Toneladas</th>
                  <th className="pb-2">OTIF (% no Prazo)</th>
                  <th className="pb-2">Lead Time Pátio</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                <tr>
                  <td className="py-2.5 font-bold text-slate-900">Agosto / 2026 (Mês Atual)</td>
                  <td className="py-2.5">{metrics.delivered.currentMonth.count}</td>
                  <td className="py-2.5">
                    {metrics.delivered.currentMonth.ton.toLocaleString('pt-BR')} t
                  </td>
                  <td className="py-2.5 font-bold text-emerald-700">
                    {metrics.delivered.currentMonth.onTimePct}%
                  </td>
                  <td className="py-2.5 font-mono">110 min</td>
                  <td className="py-2.5">
                    <Badge className="bg-emerald-600 text-white text-[10px]">Meta Atingida</Badge>
                  </td>
                </tr>
                <tr className="text-slate-400">
                  <td className="py-2.5 font-semibold text-slate-500">Julho / 2026</td>
                  <td className="py-2.5">142</td>
                  <td className="py-2.5">3.820 t</td>
                  <td className="py-2.5 text-emerald-600 font-bold">96.4%</td>
                  <td className="py-2.5 font-mono">124 min</td>
                  <td className="py-2.5">
                    <Badge variant="outline" className="text-[10px]">
                      Fechado
                    </Badge>
                  </td>
                </tr>
                <tr className="text-slate-400">
                  <td className="py-2.5 font-semibold text-slate-500">Junho / 2026</td>
                  <td className="py-2.5">138</td>
                  <td className="py-2.5">3.690 t</td>
                  <td className="py-2.5 text-emerald-600 font-bold">95.8%</td>
                  <td className="py-2.5 font-mono">132 min</td>
                  <td className="py-2.5">
                    <Badge variant="outline" className="text-[10px]">
                      Fechado
                    </Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
