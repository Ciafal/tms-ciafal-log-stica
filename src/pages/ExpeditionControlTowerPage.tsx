import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { tmsService } from '@/services/tmsService'
import {
  Zap,
  RotateCcw,
  Truck,
  LayoutDashboard,
  Kanban,
  BarChart3,
  Calendar,
  Map,
  AlertTriangle,
  ListFilter,
  Grid,
  ChevronRight,
  ShieldCheck,
  Building2,
  Clock,
  Layers,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import {
  TowerViewMode,
  TowerGlobalFilters,
  INITIAL_TOWER_FILTERS,
  UnifiedTransportItem,
  buildUnifiedTransports,
  filterUnifiedTransports,
  calculateExecutiveMetrics,
  KANBAN_COLUMNS,
} from '@/domain/controlTowerConsolidatedEngine'

import { TowerFilterBar } from '@/components/control-tower/TowerFilterBar'
import { ExecutiveView } from '@/components/control-tower/ExecutiveView'
import { CardsView } from '@/components/control-tower/CardsView'
import { KanbanView } from '@/components/control-tower/KanbanView'
import { TransportTableView } from '@/components/control-tower/TransportTableView'
import { ChartsView } from '@/components/control-tower/ChartsView'
import { YtdView } from '@/components/control-tower/YtdView'
import { MapView } from '@/components/control-tower/MapView'
import { AlertsView } from '@/components/control-tower/AlertsView'
import { TransportDetailModal } from '@/components/control-tower/TransportDetailModal'

export const ExpeditionControlTowerPage: React.FC = () => {
  const { user } = useAuth()

  // Estados principais
  const [viewMode, setViewMode] = useState<TowerViewMode>('executiva')
  const [filters, setFilters] = useState<TowerGlobalFilters>(INITIAL_TOWER_FILTERS)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [loadError, setLoadError] = useState<string | null>(null)

  // Dados brutos das coleções do PocketBase
  const [rawQueue, setRawQueue] = useState<any[]>([])
  const [rawOffers, setRawOffers] = useState<any[]>([])
  const [rawNegotiations, setRawNegotiations] = useState<any[]>([])
  const [rawExpeditions, setRawExpeditions] = useState<any[]>([])
  const [rawFredTransports, setRawFredTransports] = useState<any[]>([])
  const [rawFredOccurrences, setRawFredOccurrences] = useState<any[]>([])
  const [rawSalesOrders, setRawSalesOrders] = useState<any[]>([])

  // Modal de Detalhes
  const [selectedTransport, setSelectedTransport] = useState<UnifiedTransportItem | null>(null)

  // Carregamento consolidado das coleções
  const loadAllData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    setIsRefreshing(true)
    setLoadError(null)

    try {
      const [
        queueRes,
        offersRes,
        negotiationsRes,
        expeditionsRes,
        fredTransportsRes,
        fredOccurrencesRes,
        salesOrdersRes,
      ] = await Promise.allSettled([
        pb.collection('queue_entries').getFullList({ sort: '-created' }),
        pb.collection('freight_offers').getFullList({ sort: '-created' }),
        pb.collection('freight_negotiations').getFullList({ sort: '-created' }),
        pb.collection('expedition_tracking').getFullList({ sort: '-created' }),
        pb.collection('fred_transports').getFullList({ sort: '-created' }),
        pb.collection('fred_occurrences').getFullList({ sort: '-created' }),
        pb.collection('sap_sales_orders').getFullList({ sort: '-created' }),
      ])

      setRawQueue(queueRes.status === 'fulfilled' ? queueRes.value : [])
      setRawOffers(offersRes.status === 'fulfilled' ? offersRes.value : [])
      setRawNegotiations(negotiationsRes.status === 'fulfilled' ? negotiationsRes.value : [])
      setRawExpeditions(expeditionsRes.status === 'fulfilled' ? expeditionsRes.value : [])
      setRawFredTransports(fredTransportsRes.status === 'fulfilled' ? fredTransportsRes.value : [])
      setRawFredOccurrences(
        fredOccurrencesRes.status === 'fulfilled' ? fredOccurrencesRes.value : [],
      )
      setRawSalesOrders(salesOrdersRes.status === 'fulfilled' ? salesOrdersRes.value : [])

      setLastUpdated(new Date())
    } catch (err: any) {
      console.error('Erro ao carregar dados consolidados da Torre de Controle:', err)
      setLoadError('Não foi possível sincronizar os dados da Torre de Controle com o backend.')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Processamento e unificação dos transportes
  const allTransports = useMemo(() => {
    return buildUnifiedTransports(
      rawQueue,
      rawOffers,
      rawNegotiations,
      rawExpeditions,
      rawFredTransports,
      rawFredOccurrences,
      rawSalesOrders,
    )
  }, [
    rawQueue,
    rawOffers,
    rawNegotiations,
    rawExpeditions,
    rawFredTransports,
    rawFredOccurrences,
    rawSalesOrders,
  ])

  // Filtragem dos transportes
  const filteredTransports = useMemo(() => {
    return filterUnifiedTransports(allTransports, filters)
  }, [allTransports, filters])

  // Métricas Executivas calculadas
  const executiveMetrics = useMemo(() => {
    return calculateExecutiveMetrics(
      rawQueue,
      rawOffers,
      rawNegotiations,
      rawExpeditions,
      rawFredTransports,
      rawFredOccurrences,
    )
  }, [rawQueue, rawOffers, rawNegotiations, rawExpeditions, rawFredTransports, rawFredOccurrences])

  // Opções dinâmicas para a barra de filtros
  const filterOptions = useMemo(() => {
    const companies = Array.from(new Set(allTransports.map((t) => t.company).filter(Boolean)))
    const plants = Array.from(new Set(allTransports.map((t) => t.plant).filter(Boolean)))
    const carriers = Array.from(new Set(allTransports.map((t) => t.carrierName).filter(Boolean)))
    const drivers = Array.from(
      new Set(
        allTransports
          .map((t) => t.driverName)
          .filter((d) => d && !d.includes('Não Atribuído') && !d.includes('Aguardando')),
      ),
    )
    const plates = Array.from(
      new Set(
        allTransports
          .map((t) => t.vehiclePlate)
          .filter((p) => p && p !== 'A DEFINIR' && p !== 'NÃO ALOCADO' && p !== 'S/ PLACA'),
      ),
    )
    const customers = Array.from(
      new Set(
        allTransports
          .map((t) => t.customerName)
          .filter((c) => c && !c.includes('Aguardando') && !c.includes('Carga')),
      ),
    )
    const ufs = Array.from(new Set(allTransports.map((t) => t.destinationUf).filter(Boolean)))
    const routes = Array.from(new Set(allTransports.map((t) => t.routeCode).filter(Boolean)))
    const vehicleTypes = Array.from(
      new Set(allTransports.map((t) => t.vehicleType).filter(Boolean)),
    )

    const statuses = KANBAN_COLUMNS.map((col) => ({
      value: col.id,
      label: col.label,
    }))

    return {
      companies,
      plants,
      carriers,
      drivers,
      plates,
      customers,
      ufs,
      routes,
      vehicleTypes,
      statuses,
    }
  }, [allTransports])

  // Formatação de data/hora no padrão ABNT
  const formattedLastUpdated = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, '0')
    const d = lastUpdated
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
      d.getHours(),
    )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }, [lastUpdated])

  return (
    <div className="space-y-5 animate-fade-in pb-16">
      {/* 1. Breadcrumb e Cabeçalho Consolidado */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
          <Link
            to="/tms/dashboard"
            className="hover:text-[#005596] transition flex items-center gap-1"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            TMS
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[#005596] font-bold">Torre de Controle</span>
        </div>

        {/* Header Principal */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center space-x-2.5">
              <Zap className="w-6 h-6 text-[#005596]" />
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Torre de Controle TMS CIAFAL
              </h1>
              <Badge className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-0.5">
                Visão 360º Live
              </Badge>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl">
              Visão integrada da operação logística CIAFAL — da disponibilidade do veículo à entrega
              ao cliente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Última atualização:
              </span>
              <span className="text-xs font-mono font-bold text-slate-700">
                {formattedLastUpdated}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAllData(false)}
              disabled={isRefreshing}
              className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5 font-semibold"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#005596]' : ''}`}
              />
              Atualizar
            </Button>

            <Link to="/tms/expedicao">
              <Button
                size="sm"
                className="bg-[#005596] hover:bg-[#004275] text-white font-bold text-xs gap-1.5 shadow-sm"
              >
                <Truck className="w-3.5 h-3.5" />
                Gestão da Expedição
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Barra de Botões de Alternância de Visão */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          <Button
            variant={viewMode === 'executiva' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('executiva')}
            className={`text-xs font-bold gap-1.5 rounded-lg ${
              viewMode === 'executiva'
                ? 'bg-[#005596] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Visão Executiva
          </Button>

          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className={`text-xs font-bold gap-1.5 rounded-lg ${
              viewMode === 'cards'
                ? 'bg-[#005596] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            Cards
          </Button>

          <Button
            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('kanban')}
            className={`text-xs font-bold gap-1.5 rounded-lg ${
              viewMode === 'kanban'
                ? 'bg-[#005596] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            Kanban
          </Button>

          <Button
            variant={viewMode === 'graficos' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('graficos')}
            className={`text-xs font-bold gap-1.5 rounded-lg ${
              viewMode === 'graficos'
                ? 'bg-[#005596] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Gráficos
          </Button>

          <Button
            variant={viewMode === 'ytd' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('ytd')}
            className={`text-xs font-bold gap-1.5 rounded-lg ${
              viewMode === 'ytd'
                ? 'bg-[#005596] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            YTD
          </Button>

          <Button
            variant={viewMode === 'mapa' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('mapa')}
            className={`text-xs font-bold gap-1.5 rounded-lg ${
              viewMode === 'mapa'
                ? 'bg-[#005596] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            Mapa
          </Button>

          <Button
            variant={viewMode === 'alertas' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('alertas')}
            className={`text-xs font-bold gap-1.5 rounded-lg ${
              viewMode === 'alertas'
                ? 'bg-[#005596] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Alertas
            {allTransports.filter((t) => t.hasIntercurrence || t.slaStatus === 'CRITICO').length >
              0 && (
              <Badge className="bg-rose-600 text-white text-[9px] px-1.5 py-0">
                {
                  allTransports.filter((t) => t.hasIntercurrence || t.slaStatus === 'CRITICO')
                    .length
                }
              </Badge>
            )}
          </Button>

          <Button
            variant={viewMode === 'lista' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('lista')}
            className={`text-xs font-bold gap-1.5 rounded-lg ${
              viewMode === 'lista'
                ? 'bg-[#005596] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            Lista de Transportes
          </Button>
        </div>
      </div>

      {/* 3. Barra de Filtros Globais */}
      <TowerFilterBar
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(INITIAL_TOWER_FILTERS)}
        availableOptions={filterOptions}
      />

      {/* Estado de Erro de Integração */}
      {loadError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{loadError}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAllData(false)}
            className="text-xs border-rose-300 text-rose-900 hover:bg-rose-100"
          >
            Tentar Novamente
          </Button>
        </div>
      )}

      {/* 4. Conteúdo Renderizado Conforme a Visão Selecionada */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl bg-slate-200" />
            ))}
          </div>
        </div>
      ) : allTransports.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
          <Layers className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            Nenhum registro encontrado no TMS CIAFAL
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Dados aguardando integração. Quando veículos derem check-in na portaria ou pedidos forem
            carregados no SAP, os indicadores serão atualizados em tempo real.
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'executiva' && (
            <ExecutiveView
              metrics={executiveMetrics}
              onSelectStage={(stage) => {
                setFilters({ ...filters, status: stage })
                setViewMode('kanban')
              }}
            />
          )}

          {viewMode === 'cards' && (
            <CardsView transports={filteredTransports} onSelectTransport={setSelectedTransport} />
          )}

          {viewMode === 'kanban' && (
            <KanbanView transports={filteredTransports} onSelectTransport={setSelectedTransport} />
          )}

          {viewMode === 'graficos' && <ChartsView transports={filteredTransports} />}

          {viewMode === 'ytd' && <YtdView metrics={executiveMetrics} />}

          {viewMode === 'mapa' && (
            <MapView transports={filteredTransports} onSelectTransport={setSelectedTransport} />
          )}

          {viewMode === 'alertas' && (
            <AlertsView transports={filteredTransports} onSelectTransport={setSelectedTransport} />
          )}

          {viewMode === 'lista' && (
            <TransportTableView
              transports={filteredTransports}
              onSelectTransport={setSelectedTransport}
            />
          )}
        </>
      )}

      {/* Modal de Detalhe Completo do Transporte */}
      <TransportDetailModal item={selectedTransport} onClose={() => setSelectedTransport(null)} />
    </div>
  )
}

export default ExpeditionControlTowerPage
