import React, { useState, useEffect, useMemo } from 'react'
import {
  History,
  Truck,
  User,
  MapPin,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  BarChart2,
  Eye,
  FileText,
  DollarSign,
  ShieldCheck,
  Building2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { formatWeight, formatDate, formatDistance } from '@/lib/utils'
import {
  CarrierOperationalRecord,
  CarrierEvaluationRecord,
  CarrierComplaintRecord,
  CarrierComplimentRecord,
  buildDriver360,
  buildVehicleConsolidated,
  buildItineraryAnalysis,
  buildExpeditionTimesAnalysis,
  Driver360Metrics,
  VehicleConsolidatedMetrics,
  ItineraryHistoricalAnalysis,
} from '@/domain/carrierHistoryEngine'
import { SmartAlertItem } from '@/domain/smartAlertsEngine'
import { SmartAlertsTab } from '@/components/SmartAlertsTab'
import { carrierHistoryService } from '@/services/carrierHistoryService'

export const DriverVehicleHistoryPage: React.FC = () => {
  const { user, permissions } = useAuth()

  // Estados dos Dados Reais
  const [historyList, setHistoryList] = useState<CarrierOperationalRecord[]>([])
  const [evaluations, setEvaluations] = useState<CarrierEvaluationRecord[]>([])
  const [complaints, setComplaints] = useState<CarrierComplaintRecord[]>([])
  const [compliments, setCompliments] = useState<CarrierComplimentRecord[]>([])
  const [smartAlerts, setSmartAlerts] = useState<SmartAlertItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filtros Combináveis
  const [searchGeneral, setSearchGeneral] = useState('')
  const [filterDriver, setFilterDriver] = useState('')
  const [filterPlate, setFilterPlate] = useState('')
  const [filterCarrier, setFilterCarrier] = useState('')
  const [filterItinerary, setFilterItinerary] = useState('')
  const [filterUf, setFilterUf] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('TODOS')
  const [filterPeriod, setFilterPeriod] = useState<string>('TODOS')
  const [filterUnit, setFilterUnit] = useState<string>('TODOS')
  const [filterWithComplaint, setFilterWithComplaint] = useState(false)
  const [filterWithOccurrence, setFilterWithOccurrence] = useState(false)

  // Modais de Drill-Down
  const [selectedRecordForDetail, setSelectedRecordForDetail] =
    useState<CarrierOperationalRecord | null>(null)
  const [selectedDriverFor360, setSelectedDriverFor360] = useState<Driver360Metrics | null>(null)
  const [selectedVehicleFor360, setSelectedVehicleFor360] =
    useState<VehicleConsolidatedMetrics | null>(null)
  const [selectedItineraryForDetail, setSelectedItineraryForDetail] =
    useState<ItineraryHistoricalAnalysis | null>(null)

  // Carregamento de dados
  const loadData = async () => {
    setIsLoading(true)
    try {
      const [histRes, evalsRes, compRes, complRes, alertsRes] = await Promise.all([
        carrierHistoryService.getOperationalHistory(200),
        carrierHistoryService.getEvaluations(200),
        carrierHistoryService.getComplaints(200),
        carrierHistoryService.getCompliments(200),
        carrierHistoryService.getSmartAlerts(),
      ])

      setHistoryList(histRes)
      setEvaluations(evalsRes)
      setComplaints(compRes)
      setCompliments(complRes)
      setSmartAlerts(alertsRes)
    } catch (err) {
      console.error('Erro ao carregar histórico operacional:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtragem combinada em memória sobre o histórico
  const filteredRecords = useMemo(() => {
    return historyList.filter((item) => {
      // Busca geral
      if (searchGeneral) {
        const q = searchGeneral.toLowerCase()
        const matchGen =
          item.transport_order_number?.toLowerCase().includes(q) ||
          item.sap_transport_number?.toLowerCase().includes(q) ||
          item.driver_name?.toLowerCase().includes(q) ||
          item.vehicle_plate?.toLowerCase().includes(q) ||
          item.carrier_name?.toLowerCase().includes(q) ||
          item.itinerary_code?.toLowerCase().includes(q) ||
          item.customers_summary?.toLowerCase().includes(q)
        if (!matchGen) return false
      }

      // Filtros específicos combináveis
      if (filterDriver && item.driver_name?.toLowerCase() !== filterDriver.toLowerCase()) {
        return false
      }
      if (
        filterPlate &&
        item.vehicle_plate?.replace(/[^A-Za-z0-9]/g, '').toUpperCase() !==
          filterPlate.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
      ) {
        return false
      }
      if (filterCarrier && item.carrier_name?.toLowerCase() !== filterCarrier.toLowerCase()) {
        return false
      }
      if (filterItinerary && item.itinerary_code?.toUpperCase() !== filterItinerary.toUpperCase()) {
        return false
      }
      if (filterUf && item.destination_uf?.toUpperCase() !== filterUf.toUpperCase()) {
        return false
      }
      if (filterStatus !== 'TODOS' && item.final_status !== filterStatus) {
        return false
      }
      if (filterUnit === 'CIAFAL' && item.is_sidercentro) {
        return false
      }
      if (filterUnit === 'SIDERCENTRO' && !item.is_sidercentro) {
        return false
      }
      if (filterWithComplaint && (item.complaints_count || 0) === 0) {
        return false
      }
      if (filterWithOccurrence && (item.occurrences_count || 0) === 0) {
        return false
      }

      return true
    })
  }, [
    historyList,
    searchGeneral,
    filterDriver,
    filterPlate,
    filterCarrier,
    filterItinerary,
    filterUf,
    filterStatus,
    filterUnit,
    filterWithComplaint,
    filterWithOccurrence,
  ])

  // Listas de opções para filtros
  const distinctDrivers = useMemo(
    () => Array.from(new Set(historyList.map((h) => h.driver_name).filter(Boolean))).sort(),
    [historyList],
  )
  const distinctPlates = useMemo(
    () => Array.from(new Set(historyList.map((h) => h.vehicle_plate).filter(Boolean))).sort(),
    [historyList],
  )
  const distinctCarriers = useMemo(
    () => Array.from(new Set(historyList.map((h) => h.carrier_name).filter(Boolean))).sort(),
    [historyList],
  )
  const distinctItineraries = useMemo(
    () => Array.from(new Set(historyList.map((h) => h.itinerary_code).filter(Boolean))).sort(),
    [historyList],
  )
  const distinctUfs = useMemo(
    () => Array.from(new Set(historyList.map((h) => h.destination_uf).filter(Boolean))).sort(),
    [historyList],
  )

  // Análise de tempos da expedição
  const expeditionTimes = useMemo(
    () => buildExpeditionTimesAnalysis(filteredRecords),
    [filteredRecords],
  )

  // Abertura da Visão 360 do Motorista
  const handleOpenDriver360 = (driverName: string) => {
    const metrics = buildDriver360(driverName, historyList, evaluations, complaints, compliments)
    if (metrics) {
      setSelectedDriverFor360(metrics)
    }
  }

  // Abertura da Visão Consolidada do Veículo
  const handleOpenVehicle360 = (plate: string) => {
    const metrics = buildVehicleConsolidated(plate, historyList, evaluations, complaints)
    if (metrics) {
      setSelectedVehicleFor360(metrics)
    }
  }

  // Abertura da Análise de Itinerário
  const handleOpenItineraryAnalysis = (itineraryCode: string) => {
    const analysis = buildItineraryAnalysis(itineraryCode, historyList)
    if (analysis) {
      setSelectedItineraryForDetail(analysis)
    }
  }

  // Limpar filtros
  const handleResetFilters = () => {
    setSearchGeneral('')
    setFilterDriver('')
    setFilterPlate('')
    setFilterCarrier('')
    setFilterItinerary('')
    setFilterUf('')
    setFilterStatus('TODOS')
    setFilterUnit('TODOS')
    setFilterPeriod('TODOS')
    setFilterWithComplaint(false)
    setFilterWithOccurrence(false)
  }

  return (
    <div className="space-y-5 pb-12">
      {/* Cabeçalho Oficial HUB CIAFAL */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-[#005596]/10 text-[#005596] rounded-xl border border-[#005596]/20">
            <History className="w-7 h-7 text-[#005596]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Histórico Motoristas / Veículos
              </h1>
              <Badge className="bg-[#005596] text-white text-[10px] uppercase font-bold">
                Análises TMS
              </Badge>
              <Badge variant="outline" className="text-slate-600 text-[10px]">
                v0.0.59
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Relação histórica de transportes, itinerários, veículos e motoristas com segregação
              independente, visões 360°, tempos da expedição e apoio à contratação.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="text-xs gap-1.5"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Alerta de Regra Fundamental */}
      <div className="bg-sky-50 border border-sky-200 text-sky-950 p-4 rounded-xl text-xs space-y-1">
        <div className="flex items-center gap-2 font-bold text-[#005596]">
          <Sparkles className="w-4 h-4 text-[#005596] shrink-0" />
          Regra Fundamental CIAFAL: Segregação Independente de Veículo, Motorista e Combinação
        </div>
        <p className="text-sky-900 leading-relaxed">
          Um mesmo veículo pode ser conduzido por vários motoristas ao longo do tempo. O TMS avalia
          o <strong>veículo independente do motorista</strong>, o{' '}
          <strong>motorista independente do veículo</strong> e a{' '}
          <strong>combinação específica</strong>. Reclamações de comportamento não penalizam o
          veículo, e avarias mecânicas do veículo não penalizam o motorista.
        </p>
      </div>

      {/* Barra de Filtros Combináveis */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-[#005596]" />
              <span>Filtros Combináveis & Multiseleção Histórica</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs text-slate-500 hover:text-slate-800 h-7 px-2"
            >
              Limpar Filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {/* Linha 1: Busca e Seletores Primários */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
                Pesquisa Livre (Ordem, SAP, Cliente, Cidade)
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  value={searchGeneral}
                  onChange={(e) => setSearchGeneral(e.target.value)}
                  placeholder="Ex: 800123, João, ABC1D23..."
                  className="pl-8 text-xs h-8"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
                Motorista
              </label>
              <select
                value={filterDriver}
                onChange={(e) => setFilterDriver(e.target.value)}
                className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-md text-xs text-slate-700"
              >
                <option value="">Todos os Motoristas</option>
                {distinctDrivers.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
                Placa do Veículo
              </label>
              <select
                value={filterPlate}
                onChange={(e) => setFilterPlate(e.target.value)}
                className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-md text-xs text-slate-700"
              >
                <option value="">Todas as Placas</option>
                {distinctPlates.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
                Transportadora
              </label>
              <select
                value={filterCarrier}
                onChange={(e) => setFilterCarrier(e.target.value)}
                className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-md text-xs text-slate-700"
              >
                <option value="">Todas as Transportadoras</option>
                {distinctCarriers.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Linha 2: Itinerário, UF, Unidade e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
                Itinerário SAP
              </label>
              <select
                value={filterItinerary}
                onChange={(e) => setFilterItinerary(e.target.value)}
                className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-md text-xs text-slate-700"
              >
                <option value="">Todos os Itinerários</option>
                {distinctItineraries.map((it) => (
                  <option key={it} value={it}>
                    {it}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
                UF Destino
              </label>
              <select
                value={filterUf}
                onChange={(e) => setFilterUf(e.target.value)}
                className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-md text-xs text-slate-700"
              >
                <option value="">Todas as UFs</option>
                {distinctUfs.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
                Unidade Produtiva
              </label>
              <select
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-md text-xs text-slate-700"
              >
                <option value="TODOS">Todas as Unidades</option>
                <option value="CIAFAL">CIAFAL Matriz (Contagem)</option>
                <option value="SIDERCENTRO">Sidercentro (Laminados)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
                Status Operacional
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-md text-xs text-slate-700"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="CONCLUIDO">Concluído</option>
                <option value="EM_VIAGEM">Em Viagem</option>
                <option value="EM_EXPEDICAO">Em Expedição</option>
                <option value="ENCERRADO_COM_OCORRENCIA">Com Ocorrência</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Linha 3: Checkboxes de Exceções */}
          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-700">
            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={filterWithComplaint}
                onChange={(e) => setFilterWithComplaint(e.target.checked)}
                className="rounded border-slate-300 text-[#005596] focus:ring-[#005596]"
              />
              <span>Apenas com Reclamações</span>
            </label>

            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={filterWithOccurrence}
                onChange={(e) => setFilterWithOccurrence(e.target.checked)}
                className="rounded border-slate-300 text-[#005596] focus:ring-[#005596]"
              />
              <span>Apenas com Ocorrências</span>
            </label>

            <div className="ml-auto text-[11px] text-slate-500">
              Exibindo <strong>{filteredRecords.length}</strong> de{' '}
              <strong>{historyList.length}</strong> registros históricos
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navegação por Abas Principais */}
      <Tabs defaultValue="consultas" className="w-full">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl text-xs flex flex-wrap gap-1 shadow-sm">
          <TabsTrigger
            value="consultas"
            className="text-xs data-[state=active]:bg-[#005596] data-[state=active]:text-white"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Consulta Histórica de Ordens ({filteredRecords.length})
          </TabsTrigger>
          <TabsTrigger
            value="alertas"
            className="text-xs data-[state=active]:bg-[#005596] data-[state=active]:text-white font-bold"
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
            Alertas Inteligentes ({smartAlerts.length})
          </TabsTrigger>
          <TabsTrigger
            value="tempos"
            className="text-xs data-[state=active]:bg-[#005596] data-[state=active]:text-white"
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Tempos da Expedição (Segregação de Causa)
          </TabsTrigger>
          <TabsTrigger
            value="itinerarios"
            className="text-xs data-[state=active]:bg-[#005596] data-[state=active]:text-white"
          >
            <MapPin className="w-3.5 h-3.5 mr-1.5" />
            Análise por Itinerário
          </TabsTrigger>
          <TabsTrigger
            value="veiculos"
            className="text-xs data-[state=active]:bg-[#005596] data-[state=active]:text-white"
          >
            <Truck className="w-3.5 h-3.5 mr-1.5" />
            Veículos & Ranking de Condutores
          </TabsTrigger>
          <TabsTrigger
            value="motoristas"
            className="text-xs data-[state=active]:bg-[#005596] data-[state=active]:text-white"
          >
            <User className="w-3.5 h-3.5 mr-1.5" />
            Motoristas & Score Explicável
          </TabsTrigger>
        </TabsList>

        {/* ABA: ALERTAS INTELIGENTES DETERMINÍSTICOS (PARTE 1 DO ESCOPO) */}
        <TabsContent value="alertas" className="space-y-4 pt-2">
          <SmartAlertsTab
            alerts={smartAlerts}
            onRefresh={loadData}
            userEmail={user?.email || 'admin.master@ciafal.com.br'}
            userName={user?.name || 'Administrador Master'}
            onOpenTransportDetail={(ord) => {
              const rec = historyList.find((r) => r.transport_order_number === ord)
              if (rec) setSelectedRecordForDetail(rec)
            }}
            onOpenDriver360={handleOpenDriver360}
            onOpenVehicle360={handleOpenVehicle360}
          />
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 1: CONSULTA HISTÓRICA DE ORDENS DE TRANSPORTE                         */}
        {/* ========================================================================= */}
        <TabsContent value="consultas" className="space-y-4 pt-2">
          {filteredRecords.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                Nenhum registro histórico encontrado
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Não há ordens de transporte que correspondam aos filtros selecionados. Limpe os
                filtros ou sincronize dados com o SAP.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="mt-4 text-xs"
              >
                Limpar Todos os Filtros
              </Button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Ordem / SAP</th>
                      <th className="py-3 px-3">Data</th>
                      <th className="py-3 px-3">Motorista</th>
                      <th className="py-3 px-3">Veículo / Placa</th>
                      <th className="py-3 px-3">Transportadora</th>
                      <th className="py-3 px-3">Itinerário / Destino</th>
                      <th className="py-3 px-3 text-right">Peso (t)</th>
                      <th className="py-3 px-3 text-center">Descargas</th>
                      <th className="py-3 px-3 text-center">Tempo Interno</th>
                      <th className="py-3 px-3 text-center">Pontualidade</th>
                      <th className="py-3 px-3 text-right">Frete Real</th>
                      <th className="py-3 px-3 text-right">Margem</th>
                      <th className="py-3 px-3 text-center">Avaliações</th>
                      <th className="py-3 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.map((rec) => {
                      const isDelay =
                        rec.is_on_time === false || (rec.delay_minutes && rec.delay_minutes > 0)
                      return (
                        <tr
                          key={rec.id || rec.transport_order_number}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">
                              {rec.transport_order_number}
                            </div>
                            <div className="text-[10px] font-mono text-[#005596]">
                              {rec.sap_transport_number
                                ? `SAP ${rec.sap_transport_number}`
                                : 'Não disponível'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {formatDate(rec.transport_date)}
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() => handleOpenDriver360(rec.driver_name)}
                              className="font-semibold text-slate-900 hover:text-[#005596] hover:underline text-left block"
                              title="Abrir Visão 360º do Motorista"
                            >
                              {rec.driver_name}
                            </button>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {rec.driver_document_masked || 'Não disponível'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() => handleOpenVehicle360(rec.vehicle_plate)}
                              className="font-mono font-bold text-slate-800 hover:text-[#005596] hover:underline"
                              title="Abrir Visão Consolidada do Veículo"
                            >
                              {rec.vehicle_plate}
                            </button>
                            <div className="text-[10px] text-slate-500">
                              {rec.vehicle_type || 'Não disponível'}
                            </div>
                          </td>
                          <td
                            className="py-2.5 px-3 text-slate-700 max-w-[130px] truncate"
                            title={rec.carrier_name}
                          >
                            {rec.carrier_name || 'Não disponível'}
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() =>
                                rec.itinerary_code &&
                                handleOpenItineraryAnalysis(rec.itinerary_code)
                              }
                              className="font-semibold text-[#005596] hover:underline text-left block"
                              title="Analisar Itinerário"
                            >
                              {rec.itinerary_code || 'Não disponível'}
                            </button>
                            <span className="text-[10px] text-slate-500">
                              {rec.destination_city
                                ? `${rec.destination_city} / ${rec.destination_uf}`
                                : 'Não disponível'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {formatWeight(
                              rec.weight_kg ?? (rec.weight_ton ? rec.weight_ton * 1000 : null),
                              { unit: 'kg' },
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 font-normal"
                            >
                              {rec.discharges_count !== undefined
                                ? `${rec.discharges_count} desc.`
                                : 'Não disponível'}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {rec.total_internal_dwell_min ? (
                              <span className="font-mono text-slate-700">
                                {Math.floor(rec.total_internal_dwell_min / 60)}h{' '}
                                {rec.total_internal_dwell_min % 60}m
                              </span>
                            ) : (
                              <span className="text-slate-400">Não disponível</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isDelay ? (
                              <Badge className="bg-rose-600 text-white text-[9px] px-1.5 py-0">
                                Atraso ({rec.delay_minutes || 0}m)
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">
                                No Prazo
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                            {rec.freight_cost_driver
                              ? `R$ ${rec.freight_cost_driver.toLocaleString('pt-BR')}`
                              : 'Não disponível'}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            {rec.margin_pct !== undefined ? (
                              <span
                                className={
                                  rec.margin_pct >= 12
                                    ? 'text-emerald-700 font-bold'
                                    : 'text-amber-700 font-bold'
                                }
                              >
                                {rec.margin_pct.toFixed(1)} %
                              </span>
                            ) : (
                              <span className="text-slate-400">Não disponível</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1 text-[10px]">
                              <span title="Nota Motorista" className="text-sky-700 font-bold">
                                M:{rec.driver_rating ? rec.driver_rating.toFixed(1) : '—'}
                              </span>
                              <span className="text-slate-300">|</span>
                              <span title="Nota Veículo" className="text-indigo-700 font-bold">
                                V:{rec.vehicle_rating ? rec.vehicle_rating.toFixed(1) : '—'}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedRecordForDetail(rec)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-[#005596]"
                              title="Ver Detalhes do Registro Histórico"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 2: ANÁLISE DE TEMPOS DA EXPEDIÇÃO (SEPARAÇÃO DE RESPONSABILIDADE)      */}
        {/* ========================================================================= */}
        <TabsContent value="tempos" className="space-y-4 pt-2">
          {/* Princípio de Segregação de Causa */}
          <div className="bg-amber-50 border border-amber-200 text-amber-950 p-4 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              Diretriz CIAFAL: Separação Clara de Responsabilidade Interna vs. Transportador
            </div>
            <p className="text-amber-900 leading-relaxed">
              A análise da expedição não responsabiliza automaticamente o motorista por atrasos
              ocorridos dentro do pátio ou na liberação fiscal. O tempo total de permanência é
              decomposto em <strong>Espera</strong>, <strong>Carregamento em Doca</strong>,{' '}
              <strong>Liberação / Faturamento</strong> e <strong>Saída</strong>.
            </p>
          </div>

          {/* Cards de Médias de Tempos */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Card className="border-slate-200">
              <CardContent className="p-3 text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Espera Carregamento
                </span>
                <span className="text-lg font-black text-slate-800">
                  {expeditionTimes.avgWaitingToLoadMin} min
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Pátio / Chamada Doca
                </span>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-3 text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Carregamento
                </span>
                <span className="text-lg font-black text-[#005596]">
                  {expeditionTimes.avgLoadingDurationMin} min
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Operação na Doca</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-3 text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Fim Carga → Faturamento
                </span>
                <span className="text-lg font-black text-slate-800">
                  {expeditionTimes.avgPostLoadingToInvoicingMin} min
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Fila de Emissão</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-3 text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Emissão e NF
                </span>
                <span className="text-lg font-black text-slate-800">
                  {expeditionTimes.avgInvoicingDurationMin} min
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Sefaz / Romaneio</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-slate-50">
              <CardContent className="p-3 text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Permanência Total
                </span>
                <span className="text-lg font-black text-slate-900">
                  {Math.floor(expeditionTimes.avgTotalInternalDwellMin / 60)}h{' '}
                  {expeditionTimes.avgTotalInternalDwellMin % 60}m
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Entrada até Saída</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-sky-50">
              <CardContent className="p-3 text-center">
                <span className="text-[10px] font-bold uppercase text-sky-800 block">
                  Divisão de Causa
                </span>
                <div className="text-xs font-black text-sky-950 mt-1">
                  {expeditionTimes.pctInternalResponsibility}% Interno
                </div>
                <div className="text-[10px] text-sky-700">
                  {expeditionTimes.pctCarrierResponsibility}% Prestador
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos e Tabelas de Tempos Comparativos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Por Dia da Semana */}
            <Card className="border-slate-200">
              <CardHeader className="py-3 px-4 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#005596]" />
                  Tempos Médios por Dia da Semana
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {expeditionTimes.byWeekday.map((d) => (
                  <div key={d.day} className="space-y-1 text-xs">
                    <div className="flex justify-between font-semibold text-slate-700">
                      <span>{d.day}</span>
                      <span>
                        Total: {d.avgInternalMin} min (Carga: {d.avgLoadingMin} min)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                      <div
                        className="bg-[#005596] h-full"
                        style={{
                          width: `${Math.min(100, (d.avgLoadingMin / d.avgInternalMin) * 100)}%`,
                        }}
                        title="Carregamento Doca"
                      />
                      <div
                        className="bg-amber-400 h-full"
                        style={{
                          width: `${Math.max(0, 100 - (d.avgLoadingMin / d.avgInternalMin) * 100)}%`,
                        }}
                        title="Espera / Faturamento"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Por Faixa de Horário */}
            <Card className="border-slate-200">
              <CardHeader className="py-3 px-4 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#005596]" />
                  Gargalo por Faixa de Horário
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {expeditionTimes.byHourWindow.map((w) => (
                  <div
                    key={w.window}
                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 space-y-1 text-xs"
                  >
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{w.window}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {w.count} cargas
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Permanência Média: <strong>{w.avgDwellMin} min</strong>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Por Unidade CIAFAL / Sidercentro */}
            <Card className="border-slate-200">
              <CardHeader className="py-3 px-4 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#005596]" />
                  Comparativo por Unidade
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {expeditionTimes.byUnit.map((u) => (
                  <div
                    key={u.unit}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50 space-y-1.5 text-xs"
                  >
                    <div className="font-bold text-slate-900">{u.unit}</div>
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>Carregamento Doca:</span>
                      <strong>{u.avgLoadingMin} min</strong>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>Permanência Total:</span>
                      <strong>{u.avgTotalDwellMin} min</strong>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 3: ANÁLISE POR ITINERÁRIO & COMPARAÇÃO MULTIFATORIAL                   */}
        {/* ========================================================================= */}
        <TabsContent value="itinerarios" className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {distinctItineraries.map((itCode) => {
              const analysis = buildItineraryAnalysis(itCode, historyList)
              if (!analysis) return null

              return (
                <Card
                  key={itCode}
                  className="border-slate-200 hover:border-[#005596] transition-colors shadow-sm"
                >
                  <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900">
                          {analysis.itineraryCode}
                        </CardTitle>
                        <CardDescription className="text-[11px] text-slate-500">
                          {analysis.description} ({analysis.uf})
                        </CardDescription>
                      </div>
                      <Badge className="bg-[#005596] text-white text-[10px]">
                        {analysis.totalTransports} viagens
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2.5 text-xs">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[9px]">
                          Volume Total
                        </span>
                        <strong className="text-slate-800">
                          {formatWeight(analysis.totalTonnage, { unit: 't' })}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[9px]">
                          Média Descargas
                        </span>
                        <strong className="text-slate-800">
                          {analysis.avgDischarges.toFixed(1)} desc.
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[9px]">
                          Tempo Médio Rota
                        </span>
                        <strong className="text-slate-800">
                          {Math.floor(analysis.timeActualAvgMin / 60)}h{' '}
                          {analysis.timeActualAvgMin % 60}m
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[9px]">
                          Pontualidade
                        </span>
                        <strong
                          className={
                            analysis.withinForecastPct >= 90 ? 'text-emerald-700' : 'text-amber-700'
                          }
                        >
                          {analysis.withinForecastPct}%
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[9px]">
                          Custo Médio / t
                        </span>
                        <strong className="text-slate-800">
                          R$ {analysis.avgCostPerTon.toFixed(2)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[9px]">
                          Margem Média
                        </span>
                        <strong className="text-emerald-700">{analysis.avgMarginPct}%</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">
                        {analysis.distinctDriversCount} motoristas •{' '}
                        {analysis.distinctVehiclesCount} veículos
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedItineraryForDetail(analysis)}
                        className="text-xs text-[#005596] hover:bg-sky-50 h-7 px-2"
                      >
                        Comparar <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 4: VEÍCULOS & RANKING DE CONDUTORES (SEGREGAÇÃO TOTAL)                 */}
        {/* ========================================================================= */}
        <TabsContent value="veiculos" className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {distinctPlates.map((plate) => {
              const metrics = buildVehicleConsolidated(plate, historyList, evaluations, complaints)
              if (!metrics) return null

              return (
                <Card
                  key={plate}
                  className="border-slate-200 shadow-sm hover:border-slate-300 transition"
                >
                  <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Truck className="w-4 h-4 text-[#005596]" />
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {metrics.plate}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {metrics.totalTransports} viagens
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">
                          Tipo
                        </span>
                        <span className="text-slate-800">{metrics.vehicleType}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">
                          Capacidade
                        </span>
                        <span className="text-slate-800 font-semibold">
                          {formatWeight(metrics.capacityTon, { unit: 't' })}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">
                          Volume Transportado
                        </span>
                        <span className="text-slate-800 font-semibold">
                          {formatWeight(metrics.totalTonnage, { unit: 't' })}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">
                          Pontualidade
                        </span>
                        <span className="text-emerald-700 font-semibold">
                          {metrics.onTimePct.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Ranking de Condutores deste Veículo */}
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                        Motoristas que Conduziram este Veículo:
                      </span>
                      <div className="space-y-1">
                        {metrics.driverRanking.slice(0, 3).map((dr, idx) => (
                          <div
                            key={dr.driverName}
                            className="flex justify-between items-center text-[11px] p-1.5 rounded bg-slate-50"
                          >
                            <span className="font-medium text-slate-800 truncate max-w-[140px]">
                              {idx + 1}. {dr.driverName}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                {dr.transportsCount} v.
                              </Badge>
                              <span className="text-slate-500 text-[10px]">
                                {formatWeight(dr.tonnage, { unit: 't' })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenVehicle360(plate)}
                      className="w-full text-xs text-[#005596] hover:bg-sky-50 mt-1"
                    >
                      Ver Visão Consolidada do Veículo
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 5: MOTORISTAS & SCORE EXPLICÁVEL                                      */}
        {/* ========================================================================= */}
        <TabsContent value="motoristas" className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {distinctDrivers.map((driverName) => {
              const metrics = buildDriver360(
                driverName,
                historyList,
                evaluations,
                complaints,
                compliments,
              )
              if (!metrics) return null

              return (
                <Card
                  key={driverName}
                  className="border-slate-200 shadow-sm hover:border-[#005596] transition"
                >
                  <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-[#005596]" />
                        <span className="font-bold text-sm text-slate-900 truncate max-w-[160px]">
                          {metrics.driverName}
                        </span>
                      </div>
                      <Badge className="bg-[#005596] text-white text-[10px]">
                        Score {metrics.scoreExplicavel.scoreFinal}/100
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">
                          Transportes
                        </span>
                        <strong className="text-slate-800">
                          {metrics.totalTransports} viagens
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">
                          Volume Total
                        </span>
                        <strong className="text-slate-800">
                          {formatWeight(metrics.totalTonnage, { unit: 't' })}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">
                          Pontualidade
                        </span>
                        <strong className="text-emerald-700">
                          {metrics.onTimePct.toFixed(0)}%
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">
                          Avaliação Média
                        </span>
                        <strong className="text-sky-700">
                          {metrics.avgRating.toFixed(1)} / 5,0
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">
                          Reclamações Proc.
                        </span>
                        <strong
                          className={
                            metrics.complaintsProcedenteCount > 0
                              ? 'text-rose-600'
                              : 'text-slate-700'
                          }
                        >
                          {metrics.complaintsProcedenteCount}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">
                          Elogios
                        </span>
                        <strong className="text-emerald-600">{metrics.complimentsCount}</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                        Veículos Conduzidos ({metrics.uniqueVehicles.length}):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {metrics.uniqueVehicles.map((v) => (
                          <Badge key={v.plate} variant="outline" className="text-[10px] font-mono">
                            {v.plate} ({v.count}x)
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDriverFor360(metrics)}
                      className="w-full text-xs text-[#005596] hover:bg-sky-50 mt-1"
                    >
                      Abrir Visão 360º Completa
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* MODAL 1: DETALHE DO REGISTRO HISTÓRICO                                     */}
      {/* ========================================================================= */}
      <Dialog
        open={!!selectedRecordForDetail}
        onOpenChange={(open) => !open && setSelectedRecordForDetail(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 bg-white">
          {selectedRecordForDetail && (
            <>
              <DialogHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span>
                        Ordem de Transporte: {selectedRecordForDetail.transport_order_number}
                      </span>
                      <Badge className="bg-[#005596] text-white">
                        {selectedRecordForDetail.final_status}
                      </Badge>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 mt-0.5">
                      Número SAP:{' '}
                      <strong>
                        {selectedRecordForDetail.sap_transport_number || 'Não disponível'}
                      </strong>{' '}
                      • Data: {formatDate(selectedRecordForDetail.transport_date)}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-3 text-xs">
                {/* Prestador e Veículo */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Motorista
                    </span>
                    <strong className="text-slate-900 text-sm">
                      {selectedRecordForDetail.driver_name}
                    </strong>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {selectedRecordForDetail.driver_document_masked || 'Não disponível'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Veículo / Placa
                    </span>
                    <strong className="text-slate-900 text-sm font-mono">
                      {selectedRecordForDetail.vehicle_plate}
                    </strong>
                    <div className="text-[10px] text-slate-500">
                      {selectedRecordForDetail.vehicle_type || 'Não disponível'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Carreta / Reboque
                    </span>
                    <strong className="text-slate-800">
                      {selectedRecordForDetail.trailer_plate || 'Não disponível'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Transportadora
                    </span>
                    <strong className="text-slate-800">
                      {selectedRecordForDetail.carrier_name || 'Não disponível'}
                    </strong>
                  </div>
                </div>

                {/* Itinerário e Carga */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Itinerário
                    </span>
                    <strong className="text-[#005596]">
                      {selectedRecordForDetail.itinerary_code || 'Não disponível'}
                    </strong>
                    <div className="text-[10px] text-slate-500">
                      {selectedRecordForDetail.itinerary_description}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Origem → Destino
                    </span>
                    <strong className="text-slate-800">
                      {selectedRecordForDetail.origin_plant || 'CIAFAL Contagem'} →{' '}
                      {selectedRecordForDetail.destination_city || 'Não disponível'} (
                      {selectedRecordForDetail.destination_uf || '—'})
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Peso Líquido
                    </span>
                    <strong className="text-slate-800 text-sm">
                      {formatWeight(
                        selectedRecordForDetail.weight_kg ??
                          (selectedRecordForDetail.weight_ton
                            ? selectedRecordForDetail.weight_ton * 1000
                            : null),
                        { unit: 'kg' },
                      )}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Qtd. Descargas
                    </span>
                    <strong className="text-slate-800">
                      {selectedRecordForDetail.discharges_count !== undefined
                        ? `${selectedRecordForDetail.discharges_count} cliente(s)`
                        : 'Não disponível'}
                    </strong>
                  </div>
                </div>

                {/* Tempos da Expedição Operacional */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#005596]" />
                    Horários e Tempos Operacionais da Expedição
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px] p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">
                        Entrada Pátio
                      </span>
                      <span>{selectedRecordForDetail.actual_entry || 'Não disponível'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">
                        Início Carga
                      </span>
                      <span>{selectedRecordForDetail.loading_start || 'Não disponível'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">
                        Fim Carga
                      </span>
                      <span>{selectedRecordForDetail.loading_end || 'Não disponível'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">
                        Faturamento
                      </span>
                      <span>{selectedRecordForDetail.invoicing_end || 'Não disponível'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">
                        Saída Efetiva
                      </span>
                      <span>{selectedRecordForDetail.actual_exit || 'Não disponível'}</span>
                    </div>
                  </div>
                </div>

                {/* Custos e Margem */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                    Custos e Resultado Operacional
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">
                        Frete Motorista
                      </span>
                      <strong className="text-slate-800 font-mono">
                        {selectedRecordForDetail.freight_cost_driver
                          ? `R$ ${selectedRecordForDetail.freight_cost_driver.toLocaleString('pt-BR')}`
                          : 'Não disponível'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">
                        Pedágio & Extras
                      </span>
                      <strong className="text-slate-800 font-mono">
                        {selectedRecordForDetail.toll_cost
                          ? `R$ ${selectedRecordForDetail.toll_cost.toLocaleString('pt-BR')}`
                          : 'R$ 0,00'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">
                        Frete Cobrado Cliente
                      </span>
                      <strong className="text-slate-800 font-mono">
                        {selectedRecordForDetail.freight_billed_customer
                          ? `R$ ${selectedRecordForDetail.freight_billed_customer.toLocaleString('pt-BR')}`
                          : 'Não disponível'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">
                        Resultado / Margem
                      </span>
                      <strong
                        className={
                          selectedRecordForDetail.margin_pct &&
                          selectedRecordForDetail.margin_pct >= 12
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }
                      >
                        {selectedRecordForDetail.margin_pct !== undefined
                          ? `${selectedRecordForDetail.margin_pct.toFixed(1)} %`
                          : 'Não disponível'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: VISÃO 360º DO MOTORISTA                                          */}
      {/* ========================================================================= */}
      <Dialog
        open={!!selectedDriverFor360}
        onOpenChange={(open) => !open && setSelectedDriverFor360(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-white">
          {selectedDriverFor360 && (
            <>
              <DialogHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-blue-50 text-[#005596] rounded-xl">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <span>{selectedDriverFor360.driverName}</span>
                        <Badge className="bg-[#005596] text-white">
                          Score {selectedDriverFor360.scoreExplicavel.scoreFinal}/100
                        </Badge>
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-500 mt-0.5">
                        CPF: <strong>{selectedDriverFor360.documentMasked}</strong> •
                        Transportadora: {selectedDriverFor360.carrierName}
                      </DialogDescription>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-3 text-xs">
                {/* Indicadores Principais */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Total Viagens
                    </span>
                    <span className="text-lg font-black text-slate-900">
                      {selectedDriverFor360.totalTransports}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      1ª: {formatDate(selectedDriverFor360.firstTransportDate)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Volume Total
                    </span>
                    <span className="text-lg font-black text-slate-900">
                      {formatWeight(selectedDriverFor360.totalTonnage, { unit: 't' })}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Méd:{' '}
                      {formatWeight(selectedDriverFor360.avgTonnagePerTransport, { unit: 't' })} /
                      viagem
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Pontualidade Rota
                    </span>
                    <span className="text-lg font-black text-emerald-700">
                      {selectedDriverFor360.onTimePct.toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {selectedDriverFor360.delaysCount} atraso(s)
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Avaliação Média
                    </span>
                    <span className="text-lg font-black text-sky-700">
                      {selectedDriverFor360.avgRating.toFixed(1)} / 5,0
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {selectedDriverFor360.complaintsProcedenteCount} rec. proc. •{' '}
                      {selectedDriverFor360.complimentsCount} elogios
                    </span>
                  </div>
                </div>

                {/* Score Explicável do Prestador */}
                <Card className="border-sky-200 bg-sky-50/50">
                  <CardHeader className="py-2.5 px-3 border-b border-sky-100">
                    <CardTitle className="text-xs font-bold text-[#005596] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#005596]" />
                      Explicabilidade Aberta do Score (
                      {selectedDriverFor360.scoreExplicavel.scoreFinal}/100)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2">
                    {selectedDriverFor360.scoreExplicavel.fatores.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-start justify-between text-[11px] p-2 rounded bg-white border border-sky-100"
                      >
                        <div>
                          <strong className="text-slate-800">{f.nome}:</strong>{' '}
                          <span className="text-slate-600">{f.explicacao}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            f.tipo === 'positivo'
                              ? 'text-emerald-700 border-emerald-300'
                              : f.tipo === 'negativo'
                                ? 'text-rose-700 border-rose-300'
                                : 'text-slate-600 border-slate-300'
                          }
                        >
                          {f.impacto}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Veículos Utilizados */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-[#005596]" />
                    Veículos Conduzidos por este Motorista
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {selectedDriverFor360.uniqueVehicles.map((v) => (
                      <div
                        key={v.plate}
                        className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs"
                      >
                        <div className="font-mono font-bold text-slate-900">{v.plate}</div>
                        <div className="text-[10px] text-slate-500">
                          {v.count} transportes • Último: {formatDate(v.lastDate)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Itinerários Realizados */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#005596]" />
                    Experiência em Itinerários
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {selectedDriverFor360.itinerariesPerformed.map((it) => (
                      <div
                        key={it.code}
                        className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs"
                      >
                        <div className="font-bold text-[#005596]">{it.code}</div>
                        <div className="text-[10px] text-slate-500">
                          {it.count} viagens ({it.onTimePct.toFixed(0)}% pontual)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: VISÃO CONSOLIDADA DO VEÍCULO                                      */}
      {/* ========================================================================= */}
      <Dialog
        open={!!selectedVehicleFor360}
        onOpenChange={(open) => !open && setSelectedVehicleFor360(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-white">
          {selectedVehicleFor360 && (
            <>
              <DialogHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-blue-50 text-[#005596] rounded-xl">
                      <Truck className="w-6 h-6" />
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <span className="font-mono">Placa: {selectedVehicleFor360.plate}</span>
                        <Badge className="bg-[#005596] text-white">
                          {selectedVehicleFor360.vehicleType}
                        </Badge>
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-500 mt-0.5">
                        Proprietário / Transportador:{' '}
                        <strong>{selectedVehicleFor360.carrierOrOwner}</strong> • Capacidade:{' '}
                        {formatWeight(selectedVehicleFor360.capacityTon, { unit: 't' })}
                      </DialogDescription>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-3 text-xs">
                {/* Indicadores do Veículo */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Total Viagens
                    </span>
                    <span className="text-lg font-black text-slate-900">
                      {selectedVehicleFor360.totalTransports}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Última: {formatDate(selectedVehicleFor360.lastUsedDate)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Volume Total
                    </span>
                    <span className="text-lg font-black text-slate-900">
                      {formatWeight(selectedVehicleFor360.totalTonnage, { unit: 't' })}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Méd: {formatWeight(selectedVehicleFor360.avgTonnage, { unit: 't' })}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Tempo Médio Doca
                    </span>
                    <span className="text-lg font-black text-slate-900">
                      {selectedVehicleFor360.avgLoadingMin} min
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Total Interno: {selectedVehicleFor360.avgDwellInternalMin} min
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Avaliação Veículo
                    </span>
                    <span className="text-lg font-black text-sky-700">
                      {selectedVehicleFor360.avgRating.toFixed(1)} / 5,0
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {selectedVehicleFor360.complaintsProcedenteCount} rec. •{' '}
                      {selectedVehicleFor360.occurrencesCount} ocorr.
                    </span>
                  </div>
                </div>

                {/* Ranking de Condutores deste Veículo (REGRA FUNDAMENTAL) */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#005596]" />
                      Ranking de Condutores deste Veículo (Segregação de Histórico)
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {selectedVehicleFor360.driverRanking.length} motorista(s) conduziram este
                      veículo
                    </Badge>
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold">
                        <tr>
                          <th className="py-2 px-3">Motorista</th>
                          <th className="py-2 px-3 text-center">Viagens</th>
                          <th className="py-2 px-3 text-right">Volume</th>
                          <th className="py-2 px-3 text-center">Pontualidade</th>
                          <th className="py-2 px-3 text-center">Aval. Veículo</th>
                          <th className="py-2 px-3 text-center">Aval. Motorista</th>
                          <th className="py-2 px-3 text-right">Último Uso</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedVehicleFor360.driverRanking.map((dr, idx) => (
                          <tr key={dr.driverName} className="hover:bg-slate-50/70">
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {idx + 1}. {dr.driverName}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <Badge className="bg-[#005596] text-white text-[9px] px-1.5 py-0">
                                {dr.transportsCount}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {formatWeight(dr.tonnage, { unit: 't' })}
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-emerald-700">
                              {dr.onTimePct.toFixed(0)}%
                            </td>
                            <td className="py-2 px-3 text-center text-sky-700 font-bold">
                              {dr.avgVehicleRating ? dr.avgVehicleRating.toFixed(1) : '—'}
                            </td>
                            <td className="py-2 px-3 text-center text-indigo-700 font-bold">
                              {dr.avgDriverRating ? dr.avgDriverRating.toFixed(1) : '—'}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-500 whitespace-nowrap">
                              {formatDate(dr.lastUsed)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: ANÁLISE COMPARATIVA DO ITINERÁRIO                                */}
      {/* ========================================================================= */}
      <Dialog
        open={!!selectedItineraryForDetail}
        onOpenChange={(open) => !open && setSelectedItineraryForDetail(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-white">
          {selectedItineraryForDetail && (
            <>
              <DialogHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span>
                        Itinerário {selectedItineraryForDetail.itineraryCode}:{' '}
                        {selectedItineraryForDetail.description}
                      </span>
                      <Badge className="bg-[#005596] text-white">
                        {selectedItineraryForDetail.uf}
                      </Badge>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 mt-0.5">
                      Região: {selectedItineraryForDetail.region} • Total de Viagens:{' '}
                      <strong>{selectedItineraryForDetail.totalTransports}</strong> • Volume:{' '}
                      <strong>
                        {formatWeight(selectedItineraryForDetail.totalTonnage, { unit: 't' })}
                      </strong>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-3 text-xs">
                {/* Comparação Motorista x Motorista no mesmo Itinerário */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#005596]" />
                      Comparação Motorista x Motorista no Itinerário{' '}
                      {selectedItineraryForDetail.itineraryCode}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Análise multifatorial (descargas, tonelagem e tipo de veículo)
                    </span>
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold">
                        <tr>
                          <th className="py-2 px-3">Motorista</th>
                          <th className="py-2 px-3 text-center">Viagens</th>
                          <th className="py-2 px-3 text-right">Volume</th>
                          <th className="py-2 px-3 text-center">Méd. Descargas</th>
                          <th className="py-2 px-3 text-center">Tempo Rota</th>
                          <th className="py-2 px-3 text-center">Pontualidade</th>
                          <th className="py-2 px-3 text-right">Custo / t</th>
                          <th className="py-2 px-3 text-center">Avaliação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedItineraryForDetail.driversComparison.map((d) => (
                          <tr key={d.driverName} className="hover:bg-slate-50/70">
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {d.driverName}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <Badge className="bg-[#005596] text-white text-[9px] px-1.5 py-0">
                                {d.transports}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {formatWeight(d.totalTonnage, { unit: 't' })}
                            </td>
                            <td className="py-2 px-3 text-center">{d.avgDischarges}</td>
                            <td className="py-2 px-3 text-center font-mono">
                              {Math.floor(d.avgRouteMin / 60)}h {d.avgRouteMin % 60}m
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-emerald-700">
                              {d.onTimePct}%
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              R$ {d.avgCostPerTon.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-center text-sky-700 font-bold">
                              {d.avgRating.toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DriverVehicleHistoryPage
