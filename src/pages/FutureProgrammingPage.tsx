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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import { SapItineraryEntity, SapSalesOrderEntity, QueueEntryEntity } from '@/domain/rules'

export const FutureProgrammingPage: React.FC = () => {
  const { toast } = useToast()
  const [itineraries, setItineraries] = useState<SapItineraryEntity[]>([])
  const [orders, setOrders] = useState<SapSalesOrderEntity[]>([])
  const [queueEntries, setQueueEntries] = useState<QueueEntryEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedItinerary, setSelectedItinerary] = useState('ALL')

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [itins, ords, q] = await Promise.all([
        TmsService.getSapItineraries(),
        TmsService.getSapSalesOrders(),
        TmsService.getOperationalQueue(),
      ])
      setItineraries(itins)
      setOrders(ords)
      setQueueEntries(q)
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

  // Programação Futura Cruzando Demanda SAP, Produção PCP e Logística por Data e Itinerário
  const futureSchedule = useMemo(() => {
    const dates = [
      new Date().toISOString().split('T')[0], // Hoje
      new Date(Date.now() + 86400000).toISOString().split('T')[0], // D+1
      new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // D+2
      new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], // D+3
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

        // Count vehicles for this date & itinerary
        const matchingVehicles = queueEntries.filter((q) => {
          if (['removido', 'bloqueado'].includes(q.status)) return false
          const qDate =
            q.calculated_logistics_date || q.scheduled_arrival_date || q.entry_time?.split('T')[0]
          return qDate === d && (q.preferred_itinerary === it.sap_code || !q.preferred_itinerary)
        })

        const totalCapacityKg = matchingVehicles.reduce(
          (acc, v) => acc + (v.vehicle_capacity_kg_cached || 0),
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

        // Only add rows if there is demand or vehicle availability
        if (demandTons > 0 || capacityTons > 0) {
          items.push({
            date: d,
            itineraryCode: it.sap_code,
            itineraryDesc: it.description,
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            Programação Futura (TMS x PCP x SAP)
          </h1>
          <p className="text-xs text-slate-500">
            Cruzamento determinístico de demanda SAP, programação PCP, itinerários e disponibilidade
            de transporte.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={selectedItinerary} onValueChange={setSelectedItinerary}>
            <SelectTrigger className="w-56 text-xs h-9">
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

      {/* Main Table */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold flex items-center space-x-2 text-slate-800">
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
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
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
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {futureSchedule.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-slate-900">
                        {new Date(row.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-2.5">
                        <strong className="text-[#005596] font-mono">{row.itineraryCode}</strong>
                        <div className="text-[10px] text-slate-400">{row.itineraryDesc}</div>
                      </td>
                      <td className="p-2.5 text-center font-bold text-slate-800">
                        {row.demandOrdersCount}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        {row.demandWeightTons} t
                      </td>
                      <td className="p-2.5 text-right font-mono text-emerald-700 font-bold">
                        {row.productionReadyTons} t
                      </td>
                      <td className="p-2.5 text-center font-bold text-sky-800">
                        {row.vehiclesAvailable}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
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
    </div>
  )
}
