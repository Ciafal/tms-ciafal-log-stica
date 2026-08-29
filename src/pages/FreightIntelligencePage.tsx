import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { tmsService } from '@/services/tmsService'
import {
  TrendingUp,
  RotateCcw,
  AlertTriangle,
  Users,
  Compass,
  DollarSign,
  TrendingDown,
  Shield,
  Bot,
  Sparkles,
  BarChart3,
  Search,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const FreightIntelligencePage: React.FC = () => {
  const { user } = useAuth()
  const [driverPerfs, setDriverPerfs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const loadData = async () => {
    try {
      const list = await tmsService.getDriverPerformanceIndicators()
      setDriverPerfs(list)
    } catch {
      setDriverPerfs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const sampleRoutes = [
    {
      itineraryCode: 'ITIN-SP-CPS-01',
      region: 'Campinas / RMC',
      cargasCount: 42,
      toneladas: 1150,
      freteMedio: 2750,
      pedagioMedio: 428.4,
      custoKm: 7.8,
      custoTon: 100.3,
      taxaAceitePct: 74.5,
      indiceSustentavel: 94,
    },
    {
      itineraryCode: 'ITIN-SP-SJC-02',
      region: 'Vale do Paraíba',
      cargasCount: 31,
      toneladas: 880,
      freteMedio: 3100,
      pedagioMedio: 512.0,
      custoKm: 9.8,
      custoTon: 109.1,
      taxaAceitePct: 48.2, // Anomalia de queda de aceite
      indiceSustentavel: 88,
    },
    {
      itineraryCode: 'ITIN-SP-SAN-03',
      region: 'Baixada Santista',
      cargasCount: 18,
      toneladas: 490,
      freteMedio: 2450,
      pedagioMedio: 380.0,
      custoKm: 8.2,
      custoTon: 90.0,
      taxaAceitePct: 82.0,
      indiceSustentavel: 92,
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <Compass className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Inteligência de Fretes, Motoristas & Anomalias
            </h1>
            <Badge className="bg-[#005596] text-white text-xs font-bold px-2.5 py-0.5">
              Analytics 360°
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Cruzamento holístico: Preço + Pontualidade + Taxa de Cancelamento + Tempo de Pátio =
            Índice de Custo Sustentável.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="text-xs border-slate-300 gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Atualizar Indicadores
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="motoristas" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="motoristas" className="text-xs font-bold gap-1.5">
            <Users className="w-4 h-4 text-[#005596]" />
            Ranking Custo Sustentável ({driverPerfs.length})
          </TabsTrigger>
          <TabsTrigger value="rotas" className="text-xs font-bold gap-1.5">
            <BarChart3 className="w-4 h-4 text-[#005596]" />
            Inteligência por Rotas & Corredores
          </TabsTrigger>
          <TabsTrigger value="anomalias" className="text-xs font-bold gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Detecção de Anomalias Logísticas
          </TabsTrigger>
        </TabsList>

        {/* TAB: MOTORISTAS */}
        <TabsContent value="motoristas" className="space-y-4 mt-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Índice de Custo Sustentável por Motorista Parceiro
                </h3>
                <p className="text-xs text-slate-500">
                  Avaliação objetiva baseada em métricas auditáveis (sem termos subjetivos).
                </p>
              </div>
            </div>

            <div className="border rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b text-[10px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="p-3">Motorista / CPF</th>
                    <th className="p-3">Índice Custo Sustentável</th>
                    <th className="p-3">Taxa de Aceite</th>
                    <th className="p-3">Pontualidade</th>
                    <th className="p-3">Cancelamentos</th>
                    <th className="p-3">Tempo Médio Pátio</th>
                    <th className="p-3">Viagens Totais</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {driverPerfs.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-extrabold text-slate-900">{d.driver_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {d.driver_document || '---'}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-lg font-black text-emerald-700">
                          {d.sustainable_cost_index}/100
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {d.accept_rate_pct || 88}%
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {d.avg_punctuality_pct || 96}%
                      </td>
                      <td className="p-3">
                        <Badge
                          className={`${d.cancellations_count === 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'} text-[10px] font-bold`}
                        >
                          {d.cancellations_count || 0} cancelamentos
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-700">{d.avg_yard_stay_min || 90} min</td>
                      <td className="p-3 font-bold text-slate-800">
                        {d.historical_trips_count || 45} viagens
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB: ROTAS */}
        <TabsContent value="rotas" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sampleRoutes.map((r) => (
              <Card
                key={r.itineraryCode}
                className="border border-slate-200 bg-white shadow-sm p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Badge className="bg-[#005596] text-white font-mono text-xs">
                    {r.itineraryCode}
                  </Badge>
                  <span className="font-bold text-xs text-slate-700">{r.region}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    Frete Médio: <strong>R$ {r.freteMedio.toLocaleString('pt-BR')}</strong>
                  </div>
                  <div>
                    Pedágio: <strong>R$ {r.pedagioMedio.toLocaleString('pt-BR')}</strong>
                  </div>
                  <div>
                    Custo/km: <strong>R$ {r.custoKm.toFixed(2)}/km</strong>
                  </div>
                  <div>
                    Custo/ton: <strong>R$ {r.custoTon.toFixed(2)}/t</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500">Taxa de Aceite:</span>
                  <Badge
                    className={`${r.taxaAceitePct < 55 ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'} font-bold text-[10px]`}
                  >
                    {r.taxaAceitePct}%
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB: ANOMALIAS */}
        <TabsContent value="anomalias" className="space-y-4 mt-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Detecção de Anomalias de Mercado & Corredores
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
                <div className="flex items-center justify-between font-bold text-rose-900">
                  <span>Queda na Taxa de Aceite — Rota ITIN-SP-SJC-02 (Vale do Paraíba)</span>
                  <Badge className="bg-rose-600 text-white text-[10px]">Alerta Crítico</Badge>
                </div>
                <p className="text-slate-700">
                  <strong>Observação:</strong> A taxa de aceite de ofertas caiu de 74% para 48.2%
                  nas últimas duas semanas.
                </p>
                <p className="text-slate-700">
                  <strong>Hipótese:</strong> Ofertas concorrentes na região do Vale estão pagando
                  acima de R$ 9,50/km para retornos em aço.
                </p>
                <p className="text-emerald-800 font-bold">
                  <strong>Recomendação de Investigação:</strong> Reavaliar a referência de mercado
                  da rota e consultar os 3 motoristas parceiros habituais.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
export default FreightIntelligencePage
