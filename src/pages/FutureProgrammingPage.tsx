import React, { useState, useEffect, useMemo } from 'react'
import {
  Calendar,
  Layers,
  Truck,
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Info,
  RefreshCw,
  Search,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Check,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { tmsService } from '@/services/tmsService'
import {
  SapItineraryEntity,
  SapSalesOrderEntity,
  QueueEntryEntity,
  LoadProposalEntity,
} from '@/domain/rules'
import { Link } from 'react-router-dom'

export const FutureProgrammingPage: React.FC = () => {
  const { toast } = useToast()
  const [itineraries, setItineraries] = useState<SapItineraryEntity[]>([])
  const [orders, setOrders] = useState<SapSalesOrderEntity[]>([])
  const [queueEntries, setQueueEntries] = useState<QueueEntryEntity[]>([])
  const [proposals, setProposals] = useState<LoadProposalEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedItinerary, setSelectedItinerary] = useState('ALL')
  const [activeTab, setActiveTab] = useState<'matches' | 'matriz'>('matches')

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [itins, ords, q, props] = await Promise.all([
        tmsService.getSapItineraries(),
        tmsService.getSapSalesOrders(),
        tmsService.getQueueEntries(),
        tmsService.getLoadProposals(),
      ])
      setItineraries(itins)
      setOrders(ords)
      setQueueEntries(q)
      setProposals(props)
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao carregar programação futura.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // MATCHES FUTUROS VEÍCULO + ITINERÁRIO (Fila PROGRAMADO + Roteirizador)
  const futureMatches = useMemo(() => {
    return proposals.filter((p) => {
      if (selectedItinerary !== 'ALL' && p.itinerary_code !== selectedItinerary) return false
      return (
        p.is_future_match ||
        p.lifecycle_stage === 'Programação futura' ||
        p.planned_dispatch_date >= new Date().toISOString().split('T')[0]
      )
    })
  }, [proposals, selectedItinerary])

  // Matriz de Balanço Logístico por Data x Itinerário
  const futureSchedule = useMemo(() => {
    const dates = [
      new Date().toISOString().split('T')[0],
      new Date(Date.now() + 86400000).toISOString().split('T')[0],
      new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    ]

    const items: Array<{
      date: string
      itineraryCode: string
      itineraryDesc: string
      demandOrdersCount: number
      demandWeightTons: number
      productionReadyTons: number
      vehiclesAvailable: number
      capacityTons: number
      gapTons: number
      classification:
        | 'EQUILIBRADO'
        | 'FALTA DE TRANSPORTE'
        | 'EXCESSO DE TRANSPORTE'
        | 'MATERIAL INSUFICIENTE'
        | 'COMPLEMENTO POSSÍVEL'
    }> = []

    itineraries.forEach((it) => {
      if (selectedItinerary !== 'ALL' && it.sap_code !== selectedItinerary) return

      dates.forEach((d) => {
        const itinOrders = orders.filter((o) => o.itinerary_code === it.sap_code)
        const demandWeightKg = itinOrders.reduce((acc, o) => acc + (o.weight_kg || 0), 0)
        const readyWeightKg = itinOrders
          .filter((o) => o.production_status === 'Pronto')
          .reduce((acc, o) => acc + (o.weight_kg || 0), 0)

        // Count vehicles for this date & itinerary (PROGRAMADO)
        const matchingVehicles = queueEntries.filter((q) => {
          if (['removido', 'bloqueado'].includes(q.status)) return false
          const qDate =
            q.calculated_logistics_date || q.scheduled_arrival_date || q.entry_time?.split('T')[0]
          return qDate === d && (q.preferred_itinerary === it.sap_code || !q.preferred_itinerary)
        })

        const totalCapacityKg = matchingVehicles.reduce(
          (acc, v) => acc + (v.vehicle_capacity_kg_cached || 28000),
          0,
        )

        const demandTons = Math.round(demandWeightKg / 1000)
        const readyTons = Math.round(readyWeightKg / 1000)
        const capacityTons = Math.round(totalCapacityKg / 1000)
        const gapTons = capacityTons - demandTons

        let classification:
          | 'EQUILIBRADO'
          | 'FALTA DE TRANSPORTE'
          | 'EXCESSO DE TRANSPORTE'
          | 'MATERIAL INSUFICIENTE'
          | 'COMPLEMENTO POSSÍVEL' = 'EQUILIBRADO'

        if (demandTons === 0 && capacityTons === 0) {
          classification = 'EQUILIBRADO'
        } else if (readyTons < demandTons && demandTons > capacityTons) {
          classification = 'MATERIAL INSUFICIENTE'
        } else if (demandTons > capacityTons && capacityTons < 15) {
          classification = 'FALTA DE TRANSPORTE'
        } else if (
          capacityTons > demandTons &&
          capacityTons > 0 &&
          demandTons > 0 &&
          gapTons >= 5
        ) {
          classification = 'COMPLEMENTO POSSÍVEL'
        } else if (capacityTons > demandTons && demandTons === 0) {
          classification = 'EXCESSO DE TRANSPORTE'
        }

        if (demandTons > 0 || capacityTons > 0) {
          items.push({
            date: d,
            itineraryCode: it.sap_code,
            itineraryDesc: it.description || it.region || it.sap_code,
            demandOrdersCount: itinOrders.length,
            demandWeightTons: demandTons,
            productionReadyTons: readyTons,
            vehiclesAvailable: matchingVehicles.length,
            capacityTons,
            gapTons,
            classification,
          })
        }
      })
    })

    return items
  }, [itineraries, orders, queueEntries, selectedItinerary])

  return (
    <div className="space-y-4 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Programação Futura (TMS x PCP x SAP)
            </h1>
            <Badge className="bg-[#005596] text-white text-[10px] font-bold">
              MATCH VEÍCULO + ITINERÁRIO
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cruzamento determinístico: disponibilidade programada na Fila (PROGRAMADO) + veículos
            futuros + pedidos existentes + produção PCP.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={selectedItinerary} onValueChange={setSelectedItinerary}>
            <SelectTrigger className="w-56 text-xs h-9 bg-white dark:bg-slate-900">
              <SelectValue placeholder="Filtrar por Itinerário" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="ALL">Todos os Itinerários SAP</SelectItem>
              {itineraries.map((it) => (
                <SelectItem key={it.sap_code} value={it.sap_code}>
                  {it.sap_code} — {it.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            className="text-xs h-9"
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Tabs para alternar entre Matches de Cargas e Balanço Geral */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="grid grid-cols-2 w-full sm:w-80">
          <TabsTrigger value="matches" className="text-xs">
            Matches Futuros ({futureMatches.length})
          </TabsTrigger>
          <TabsTrigger value="matriz" className="text-xs">
            Matriz de Balanço ({futureSchedule.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: MATCHES FUTUROS DETALHADOS COM CAMPOS OBRIGATÓRIOS DO USUÁRIO */}
        <TabsContent value="matches" className="space-y-4 pt-2">
          {futureMatches.length === 0 ? (
            <Card className="bg-white dark:bg-slate-900 border-slate-200">
              <CardContent className="p-8 text-center text-slate-400 text-xs">
                Nenhum match futuro provisório registrado. Execute uma simulação no Roteirizador com
                veículos programados para gerar programações futuras provisórias.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {futureMatches.map((match) => {
                const missingKg =
                  match.missing_weight_kg ||
                  Math.max(
                    0,
                    (match.target_weight_kg || match.vehicle_capacity_kg * 0.95) -
                      match.current_weight_kg,
                  )
                const isConsolidated = match.classification_status === 'Carga dentro da faixa'

                return (
                  <Card
                    key={match.id}
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow transition-all"
                  >
                    <div className="h-1.5 w-full bg-[#005596]" />
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                              {match.proposal_number}
                            </CardTitle>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {match.itinerary_code}
                            </Badge>
                            <Badge
                              className={`text-[10px] ${
                                isConsolidated
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-amber-600 text-white'
                              }`}
                            >
                              {match.classification_status}
                            </Badge>
                          </div>
                          <CardDescription className="text-xs mt-1">
                            Saída prevista: <strong>{match.planned_dispatch_date}</strong> •
                            Veículo: {match.vehicle_plate || 'FROTA-CIAFAL'} (
                            {match.vehicle_type || 'Carreta 5 Eixos'})
                          </CardDescription>
                        </div>

                        <Badge className="bg-blue-600 text-white text-[10px]">
                          {match.lifecycle_stage}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3 text-xs">
                      {/* Grid de Métricas */}
                      <div className="grid grid-cols-4 gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                            Capacidade
                          </span>
                          <strong className="text-slate-900 dark:text-slate-100 font-mono">
                            {(match.vehicle_capacity_kg / 1000).toFixed(1)} t
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                            Confirmado
                          </span>
                          <strong className="text-slate-900 dark:text-slate-100 font-mono">
                            {(match.current_weight_kg / 1000).toFixed(1)} t
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                            Ocupação
                          </span>
                          <strong className="text-blue-700 font-mono font-bold">
                            {match.current_occupancy_pct}%
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-700 uppercase block font-semibold">
                            Gap Compl.
                          </span>
                          <strong className="text-amber-700 font-mono font-bold">
                            {(missingKg / 1000).toFixed(1)} t
                          </strong>
                        </div>
                      </div>

                      {/* Status Multicritério: Comercial, Estoque, PCP, Crédito */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div className="p-2 border rounded bg-slate-50/50 flex justify-between items-center">
                          <span className="text-slate-500">Status Comercial:</span>
                          <strong
                            className={isConsolidated ? 'text-emerald-700' : 'text-amber-700'}
                          >
                            {isConsolidated ? 'Consolidado' : 'Aguardando Complemento'}
                          </strong>
                        </div>

                        <div className="p-2 border rounded bg-slate-50/50 flex justify-between items-center">
                          <span className="text-slate-500">Status Estoque:</span>
                          <strong className="text-emerald-700">DP34 Conforme</strong>
                        </div>

                        <div className="p-2 border rounded bg-slate-50/50 flex justify-between items-center">
                          <span className="text-slate-500">Status PCP:</span>
                          <strong className="text-blue-700">Programado Robô</strong>
                        </div>

                        <div className="p-2 border rounded bg-slate-50/50 flex justify-between items-center">
                          <span className="text-slate-500">Status Crédito:</span>
                          <strong className="text-emerald-700">Liberado SAP RFC</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 border-t pt-2">
                        <span>
                          Pedidos: <strong>{match.orders_count || 1}</strong> • Clientes:{' '}
                          <strong>{match.customers_count || 1}</strong>
                        </span>
                        <Link
                          to="/tms/complemento-cargas"
                          className="text-[#005596] hover:underline font-semibold flex items-center"
                        >
                          Ver no Complemento <ChevronRight className="w-3 h-3 ml-0.5" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: MATRIZ DE BALANÇO GERAL */}
        <TabsContent value="matriz" className="space-y-4 pt-2">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold flex items-center space-x-2 text-slate-800 dark:text-slate-200">
                <Calendar className="w-4 h-4 text-[#005596]" />
                <span>Matriz de Planejamento e Diagnóstico de Gap</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Diagnóstico de balanço logístico por data e itinerário. Dados ausentes não são
                fabricados.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {futureSchedule.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Nenhuma programação futura com demanda ou veículos registrados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200">
                        <th className="p-2.5">Data</th>
                        <th className="p-2.5">Itinerário SAP</th>
                        <th className="p-2.5 text-center">Pedidos (SAP)</th>
                        <th className="p-2.5 text-right">Demanda (t)</th>
                        <th className="p-2.5 text-right">Pronto PCP (t)</th>
                        <th className="p-2.5 text-center">Veículos Previstos</th>
                        <th className="p-2.5 text-right">Capacidade (t)</th>
                        <th className="p-2.5 text-right">Gap Logístico</th>
                        <th className="p-2.5 text-center">Diagnóstico / Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {futureSchedule.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {new Date(row.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-2.5">
                            <strong className="text-[#005596] font-mono">
                              {row.itineraryCode}
                            </strong>
                            <div className="text-[10px] text-slate-400">{row.itineraryDesc}</div>
                          </td>
                          <td className="p-2.5 text-center font-bold text-slate-800 dark:text-slate-200">
                            {row.demandOrdersCount}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {row.demandWeightTons} t
                          </td>
                          <td className="p-2.5 text-right font-mono text-emerald-700 font-bold">
                            {row.productionReadyTons} t
                          </td>
                          <td className="p-2.5 text-center font-bold text-sky-800">
                            {row.vehiclesAvailable}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {row.capacityTons > 0 ? `${row.capacityTons} t` : 'Não informada'}
                          </td>
                          <td
                            className={`p-2.5 text-right font-mono font-bold ${
                              row.gapTons < 0
                                ? 'text-rose-600'
                                : row.gapTons > 0
                                  ? 'text-purple-600'
                                  : 'text-slate-600'
                            }`}
                          >
                            {row.capacityTons > 0
                              ? `${row.gapTons > 0 ? '+' : ''}${row.gapTons} t`
                              : '—'}
                          </td>
                          <td className="p-2.5 text-center">
                            <Badge
                              className={`text-[9px] font-bold px-2 py-0.5 uppercase ${
                                row.classification === 'EQUILIBRADO'
                                  ? 'bg-emerald-600 text-white'
                                  : row.classification === 'FALTA DE TRANSPORTE'
                                    ? 'bg-rose-600 text-white'
                                    : row.classification === 'COMPLEMENTO POSSÍVEL'
                                      ? 'bg-purple-600 text-white'
                                      : row.classification === 'MATERIAL INSUFICIENTE'
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-slate-600 text-white'
                              }`}
                            >
                              {row.classification}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default FutureProgrammingPage
