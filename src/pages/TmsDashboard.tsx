import React, { useState, useEffect, useCallback } from 'react'
import {
  Layers,
  Truck,
  Building,
  Radio,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Activity,
  FileSpreadsheet,
  Package,
  Calendar,
  Sparkles,
  Bot,
  Zap,
  Phone,
  MessageSquare,
  ShieldCheck,
  Send,
  Compass,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader, KpiCard, IntegrationCard, SectionHeader } from '@/components/ui-custom'
import { useAuth } from '@/contexts/AuthContext'
import { TmsService } from '@/services/tmsService'
import {
  ControlTowerService,
  TowerTimePeriod,
  TowerSummaryResponse,
} from '@/services/controlTowerService'
import { TowerTimePeriodFilter } from '@/components/control-tower/TowerTimePeriodFilter'
import { TowerCargoFlowSection } from '@/components/control-tower/TowerCargoFlowSection'
import { useRealtime } from '@/hooks/use-realtime'
import {
  QueueEntryEntity,
  SapSalesOrderEntity,
  OportunidadeComplementoCargaEntity,
  VehicleEntity,
  DriverEntity,
  FreightRuleParameterEntity,
} from '@/domain/rules'
import {
  computeOperacaoHojeAnalysis,
  type OperacaoHojeAnalysis,
} from '@/domain/operacaoHojeWalletEngine'
import { CarteiraEstoqueSemCreditoModal } from '@/components/control-tower/CarteiraEstoqueSemCreditoModal'
import { CarteiraSemEstoqueModal } from '@/components/control-tower/CarteiraSemEstoqueModal'
import { MatchVeiculosEstoqueModal } from '@/components/control-tower/MatchVeiculosEstoqueModal'
import { Link } from 'react-router-dom'

export const TmsDashboard: React.FC = () => {
  const { user } = useAuth()
  const [orders, setOrders] = useState<SapSalesOrderEntity[]>([])
  const [queueEntries, setQueueEntries] = useState<QueueEntryEntity[]>([])
  const [opportunities, setOpportunities] = useState<OportunidadeComplementoCargaEntity[]>([])
  const [cargos, setCargos] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<VehicleEntity[]>([])
  const [drivers, setDrivers] = useState<DriverEntity[]>([])
  const [freightRuleParams, setFreightRuleParams] = useState<FreightRuleParameterEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modais de detalhamento da Operação Hoje
  const [isEstoqueSemCreditoOpen, setIsEstoqueSemCreditoOpen] = useState(false)
  const [isSemEstoqueOpen, setIsSemEstoqueOpen] = useState(false)
  const [isMatchVeiculosEstoqueOpen, setIsMatchVeiculosEstoqueOpen] = useState(false)

  // Estado do Filtro Temporal da Torre de Controle (Default: 'today' / HOJE)
  const [selectedPeriod, setSelectedPeriod] = useState<TowerTimePeriod>('today')
  const [isRefreshingTower, setIsRefreshingTower] = useState(false)
  const [towerData, setTowerData] = useState<TowerSummaryResponse>({
    period: 'today',
    period_label: new Date().toLocaleDateString('pt-BR'),
    range: { start: '', end: '' },
    fluxo_cargas: {
      em_negociacao: {
        loads: 0,
        tons: 0,
        loads_formatted: '0 cargas',
        tons_formatted: '0,00 t',
        items: [],
      },
      com_contraproposta: {
        loads: 0,
        tons: 0,
        loads_formatted: '0 cargas',
        tons_formatted: '0,00 t',
        items: [],
      },
      recusadas: {
        loads: 0,
        tons: 0,
        loads_formatted: '0 cargas',
        tons_formatted: '0,00 t',
        items: [],
      },
      em_expedicao: {
        loads: 0,
        tons: 0,
        loads_formatted: '0 cargas',
        tons_formatted: '0,00 t',
        items: [],
      },
      faturadas: {
        loads: 0,
        tons: 0,
        loads_formatted: '0 cargas',
        tons_formatted: '0,00 t',
        items: [],
      },
    },
    timestamp: new Date().toISOString(),
  })

  // Carregar dados gerais do TMS
  const fetchGeneralData = useCallback(async () => {
    try {
      setDataError(null)
      const [ordersData, queueData, oppsData, cargosData, vehiclesData, driversData, paramsData] =
        await Promise.all([
          TmsService.getSapSalesOrders(),
          TmsService.getOperationalQueue(),
          TmsService.getComplementOpportunities(),
          TmsService.getCargos(),
          TmsService.getVehicles(),
          TmsService.getDrivers(),
          TmsService.getFreightRuleParameters(),
        ])
      setOrders(ordersData || [])
      setQueueEntries(queueData || [])
      setOpportunities(oppsData || [])
      setCargos(cargosData || [])
      setVehicles(vehiclesData || [])
      setDrivers(driversData || [])
      setFreightRuleParams(paramsData || [])
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err)
      setDataError(err?.message || 'Falha na comunicação')
      TmsService.logAudit({
        user_name: 'Sistema / Hub CIAFAL',
        user_email: 'tms.integracoes@ciafal.com.br',
        action: 'ERRO_INTEGRACAO_OPERACAO_HOJE',
        resource: 'operacao_hoje_datasource',
        payload: {
          error_message: err?.message || String(err),
          timestamp: new Date().toISOString(),
        },
      }).catch((e) => console.warn('Erro log audit:', e))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Carregar dados agregados do Fluxo das Cargas para o período selecionado
  const fetchTowerSummary = useCallback(async (period: TowerTimePeriod) => {
    setIsRefreshingTower(true)
    try {
      const summary = await ControlTowerService.getTowerSummary(period)
      setTowerData(summary)
    } catch (err) {
      console.error('Error fetching tower summary:', err)
    } finally {
      setIsRefreshingTower(false)
    }
  }, [])

  useEffect(() => {
    fetchGeneralData()
  }, [fetchGeneralData])

  useEffect(() => {
    fetchTowerSummary(selectedPeriod)
  }, [selectedPeriod, fetchTowerSummary])

  // Inscrições Realtime para recálculo automático sem necessidade de F5
  useRealtime('negociacoes', () => {
    fetchTowerSummary(selectedPeriod)
  })
  useRealtime('chicao_freight_offers', () => {
    fetchTowerSummary(selectedPeriod)
  })
  useRealtime('carrier_operational_history', () => {
    fetchTowerSummary(selectedPeriod)
  })
  useRealtime('expedition_tracking', () => {
    fetchTowerSummary(selectedPeriod)
  })
  useRealtime('queue_entries', () => {
    fetchGeneralData()
  })
  useRealtime('sap_sales_orders', () => {
    fetchGeneralData()
  })

  const portaDrivers = queueEntries.filter(
    (q) => q.type === 'PORTA' && !['removido', 'bloqueado'].includes(q.status),
  )
  const foraDrivers = queueEntries.filter(
    (q) => q.type === 'FORA' && !['removido', 'bloqueado'].includes(q.status),
  )
  const progDrivers = queueEntries.filter(
    (q) => q.type === 'PROGRAMADO' && !['removido', 'bloqueado'].includes(q.status),
  )

  const totalCapTodayKg = [...portaDrivers, ...foraDrivers].reduce(
    (acc, q) => acc + (q.vehicle_capacity_kg_cached || 0),
    0,
  )
  const totalCapTomorrowKg = progDrivers.reduce(
    (acc, q) => acc + (q.vehicle_capacity_kg_cached || 0),
    0,
  )

  const inProdOrders = orders.filter((o) => o.production_status === 'Em Produção')
  const uniqueItinerariesWithDemand = Array.from(
    new Set(orders.map((o) => o.itinerary_code).filter(Boolean)),
  ).length
  const activeMontagemCargos = cargos.filter(
    (c) => c.status === 'Em simulação' || c.status === 'Planejada',
  ).length
  const cargosSemVeiculo = cargos.filter(
    (c) => !c.vehicle_plate || c.vehicle_plate === 'Aguardando alocação',
  ).length

  // Análise Unificada da Operação Hoje (sem dupla contagem, cruzando carteira única + estoque + crédito + veículos)
  const operacaoHojeAnalysis: OperacaoHojeAnalysis = React.useMemo(() => {
    try {
      return computeOperacaoHojeAnalysis({
        orders,
        queueEntries,
        vehicles,
        drivers,
        freightRuleParameters: freightRuleParams,
      })
    } catch (err) {
      console.error('Erro ao calcular OperacaoHojeAnalysis:', err)
      return {
        estoqueSemCredito: { ordersCount: 0, itemsCount: 0, totalTons: 0, items: [] },
        semEstoque: {
          ordersCount: 0,
          itemsCount: 0,
          missingTons: 0,
          totalPendingTons: 0,
          semEstoqueCount: 0,
          semEstoqueTons: 0,
          estoqueParcialCount: 0,
          estoqueParcialTons: 0,
          items: [],
        },
        matchVeiculosEstoque: {
          matchesCount: 0,
          vehiclesWithMatchesCount: 0,
          potentialTons: 0,
          matches: [],
        },
        totalOrdersAnalyzed: orders.length,
        generatedAt: new Date().toISOString(),
      }
    }
  }, [orders, queueEntries, vehicles, drivers, freightRuleParams])

  const [dataError, setDataError] = useState<string | null>(null)

  // Auditoria ao abrir modais de detalhamento
  const handleOpenDetailModal = (
    type: 'ESTOQUE_SEM_CREDITO' | 'SEM_ESTOQUE' | 'MATCH_VEICULOS_ESTOQUE',
  ) => {
    TmsService.logAudit({
      user_name: user?.name || 'Operador Logística',
      user_email: user?.email || 'operador.tms@ciafal.com.br',
      action: `ABRIR_DETALHAMENTO_${type}`,
      resource: 'control_tower_operacao_hoje',
      payload: {
        indicator: type,
        period: selectedPeriod,
        timestamp: new Date().toISOString(),
      },
    }).catch((e) => console.warn('Erro log audit:', e))

    if (type === 'ESTOQUE_SEM_CREDITO') setIsEstoqueSemCreditoOpen(true)
    if (type === 'SEM_ESTOQUE') setIsSemEstoqueOpen(true)
    if (type === 'MATCH_VEICULOS_ESTOQUE') setIsMatchVeiculosEstoqueOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Top Header Canônico HUB CIAFAL */}
      <PageHeader
        title="Torre de Controle — Transporte & Logística"
        subtitle="Visão integrada da disponibilidade, planejamento, negociação, expedição, faturamento e execução dos transportes."
        icon={Activity}
        breadcrumbs={[
          { label: 'TMS CIAFAL', href: '/tms' },
          { label: 'Painel Geral', href: '/tms/dashboard' },
          { label: 'Torre de Controle Logística' },
        ]}
        badge={<Badge className="bg-[#005596] text-white text-[10px] font-bold">HUB CIAFAL</Badge>}
        actions={
          <Link to="/tms/planejador-cargas">
            <Button
              size="sm"
              className="bg-[#005596] hover:bg-[#004275] text-white text-xs font-bold shadow-sm h-9"
            >
              <Package className="w-3.5 h-3.5 mr-1.5" />
              Abrir Planejador de Cargas
            </Button>
          </Link>
        }
        className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm mb-0"
      />

      {/* FILTRO TEMPORAL PRINCIPAL: [ HOJE ] [ ONTEM ] [ SEMANA ] [ MÊS ] [ ANO ] */}
      <TowerTimePeriodFilter
        selectedPeriod={selectedPeriod}
        onSelectPeriod={(p) => setSelectedPeriod(p)}
        periodLabel={towerData.period_label}
        isRefreshing={isRefreshingTower}
        onRefresh={() => {
          TmsService.logAudit({
            user_name: user?.name || 'Operador Logística',
            user_email: user?.email || 'operador.tms@ciafal.com.br',
            action: 'ATUALIZAR_MANUAL_OPERACAO_HOJE',
            resource: 'control_tower_operacao_hoje',
            payload: {
              period: selectedPeriod,
              timestamp: new Date().toISOString(),
            },
          }).catch((e) => console.warn('Erro log audit:', e))
          fetchTowerSummary(selectedPeriod)
          fetchGeneralData()
        }}
      />

      {/* SEÇÃO 1: INDICADORES OPERACIONAIS EXISTENTES (PRESERVADOS INTEGRALMENTE) */}
      <div className="space-y-3">
        <SectionHeader
          title="Operação Hoje (Disponibilidade & Montagem)"
          icon={Calendar}
          iconColor="text-[#005596]"
          badge={new Date().toLocaleDateString('pt-BR')}
        />

        {/* Linha 1: Indicadores Operacionais de Pátio e Execução (6 cards em grid responsivo, sem espaço vazio) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Card 1: Motoristas PORTA */}
          <KpiCard
            title="Motoristas PORTA"
            value={portaDrivers.length}
            description="Pátio CIAFAL"
            variant="highlight"
            status="Presente"
            statusColor="blue"
            badge="Posição atual"
          />

          {/* Card 2: Motoristas FORA */}
          <KpiCard
            title="Motoristas FORA"
            value={foraDrivers.length}
            description="Raio ≤ 60 km"
            variant="success"
            status="Em raio"
            statusColor="emerald"
            badge="Posição atual"
          />

          {/* Card 3: Capacidade Disponível */}
          <KpiCard
            title="Capacidade Hoje"
            value={
              totalCapTodayKg > 0
                ? (totalCapTodayKg / 1000).toLocaleString('pt-BR', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 1,
                  })
                : '0'
            }
            unit="t"
            description="PORTA + FORA"
            variant="default"
            badge="Posição atual"
          />

          {/* Card 4: Cargas em Montagem */}
          <KpiCard
            title="Cargas em Montagem"
            value={activeMontagemCargos}
            description="Planejador Ativo"
            variant="default"
            badge="Posição atual"
          />

          {/* Card 5: Cargas Sem Veículo */}
          <KpiCard
            title="Sem Veículo"
            value={cargosSemVeiculo}
            description="Aguardando Veículo"
            variant="warning"
            status={cargosSemVeiculo > 0 ? 'Atenção' : 'Normal'}
            statusColor={cargosSemVeiculo > 0 ? 'amber' : 'emerald'}
            badge="Posição atual"
          />

          {/* Card 6: Complementos Possíveis */}
          <KpiCard
            title="Complementos CRM"
            value={opportunities.length}
            description="Oportunidades"
            variant="purple"
            status="Avisados"
            statusColor="purple"
            badge="Posição atual"
          />
        </div>

        {/* Linha 2 (Novos Indicadores Operação Hoje): Carteira com Estoque s/ Crédito, Carteira s/ Estoque e Match Veículos × Estoque */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Card 1: CARTEIRA COM ESTOQUE S/ CRÉDITO */}
          <Card
            onClick={() => handleOpenDetailModal('ESTOQUE_SEM_CREDITO')}
            className="cursor-pointer transition-all duration-200 shadow-xs hover:shadow-md bg-white border-amber-200 hover:border-amber-400 flex flex-col justify-between"
          >
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Carteira c/ Estoque s/ Crédito
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Material disponível fisicamente · Crédito pendente/bloqueado
                  </span>
                </div>
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] font-bold shrink-0">
                  Posição atual
                </Badge>
              </div>

              {dataError ? (
                <div className="py-2 text-xs text-amber-800 font-medium">
                  Dados temporariamente indisponíveis
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <strong className="text-2xl sm:text-3xl font-mono font-black text-amber-900 tracking-tight leading-none">
                      {operacaoHojeAnalysis.estoqueSemCredito.totalTons.toLocaleString('pt-BR', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}
                    </strong>
                    <span className="text-xs font-semibold text-slate-500 font-sans">
                      t retidas
                    </span>
                    <Badge
                      variant="outline"
                      className="ml-auto text-[10px] font-mono border-amber-300 text-amber-800 bg-amber-50/50"
                    >
                      {operacaoHojeAnalysis.estoqueSemCredito.ordersCount} pedidos ·{' '}
                      {operacaoHojeAnalysis.estoqueSemCredito.itemsCount} itens
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-600 bg-amber-50/60 p-1.5 rounded border border-amber-200/60">
                    <span className="flex items-center gap-1 font-semibold text-amber-900">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      Criticidade:
                    </span>
                    <span className="font-bold text-amber-900">
                      {operacaoHojeAnalysis.estoqueSemCredito.ordersCount > 0
                        ? `${operacaoHojeAnalysis.estoqueSemCredito.ordersCount} pedidos com risco de atraso`
                        : 'Nenhum bloqueio'}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-2 border-t border-slate-100">
                <span className="truncate">Estoque disponível | Crédito pendente/bloqueado</span>
                <span className="text-[#005596] font-bold hover:underline shrink-0 ml-1">
                  Ver detalhes →
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: CARTEIRA S/ ESTOQUE */}
          <Card
            onClick={() => handleOpenDetailModal('SEM_ESTOQUE')}
            className="cursor-pointer transition-all duration-200 shadow-xs hover:shadow-md bg-white border-rose-200 hover:border-rose-400 flex flex-col justify-between"
          >
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Carteira s/ Estoque
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Carteira aguardando disponibilidade física / PCP
                  </span>
                </div>
                <Badge className="bg-rose-100 text-rose-900 border-rose-300 text-[9px] font-bold shrink-0">
                  Posição atual
                </Badge>
              </div>

              {dataError ? (
                <div className="py-2 text-xs text-rose-800 font-medium">
                  Dados temporariamente indisponíveis
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <strong className="text-2xl sm:text-3xl font-mono font-black text-rose-900 tracking-tight leading-none">
                      {operacaoHojeAnalysis.semEstoque.missingTons.toLocaleString('pt-BR', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}
                    </strong>
                    <span className="text-xs font-semibold text-slate-500 font-sans">
                      t faltante
                    </span>
                    <Badge
                      variant="outline"
                      className="ml-auto text-[10px] font-mono border-rose-300 text-rose-800 bg-rose-50/50"
                    >
                      {operacaoHojeAnalysis.semEstoque.ordersCount} pedidos ·{' '}
                      {operacaoHojeAnalysis.semEstoque.itemsCount} itens
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-[10px] bg-rose-50/60 p-1.5 rounded border border-rose-200/60">
                    <span className="text-slate-700">Composição do déficit:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-rose-800 font-mono">
                        Zero: {operacaoHojeAnalysis.semEstoque.semEstoqueCount} (
                        {operacaoHojeAnalysis.semEstoque.semEstoqueTons.toFixed(1)}t)
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="font-bold text-amber-800 font-mono">
                        Parcial: {operacaoHojeAnalysis.semEstoque.estoqueParcialCount} (
                        {operacaoHojeAnalysis.semEstoque.estoqueParcialTons.toFixed(1)}t)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-2 border-t border-slate-100">
                <span className="truncate">Carteira aguardando disponibilidade</span>
                <span className="text-[#005596] font-bold hover:underline shrink-0 ml-1">
                  Ver detalhes →
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: MATCH VEÍCULOS × ESTOQUE */}
          <Card
            onClick={() => handleOpenDetailModal('MATCH_VEICULOS_ESTOQUE')}
            className="cursor-pointer transition-all duration-200 shadow-xs hover:shadow-md bg-white border-[#005596]/30 hover:border-[#005596] flex flex-col justify-between"
          >
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#005596] shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Match Veículos × Estoque
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Oportunidades imediatas de montagem e expedição
                  </span>
                </div>
                <Badge className="bg-sky-100 text-[#005596] border-sky-300 text-[9px] font-bold shrink-0">
                  Posição atual
                </Badge>
              </div>

              {dataError ? (
                <div className="py-2 text-xs text-sky-800 font-medium">
                  Dados temporariamente indisponíveis
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <strong className="text-2xl sm:text-3xl font-mono font-black text-[#005596] tracking-tight leading-none">
                      {operacaoHojeAnalysis.matchVeiculosEstoque.potentialTons.toLocaleString(
                        'pt-BR',
                        {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        },
                      )}
                    </strong>
                    <span className="text-xs font-semibold text-slate-500 font-sans">
                      t potencial
                    </span>
                    <Badge
                      variant="outline"
                      className="ml-auto text-[10px] font-mono border-sky-300 text-[#005596] bg-sky-50/50"
                    >
                      {operacaoHojeAnalysis.matchVeiculosEstoque.matchesCount} matches viáveis
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-[10px] bg-sky-50/60 p-1.5 rounded border border-sky-200/60">
                    <span className="text-slate-700">Veículos com carga viável:</span>
                    <span className="font-bold text-[#005596] font-mono">
                      {operacaoHojeAnalysis.matchVeiculosEstoque.vehiclesWithMatchesCount}{' '}
                      veículo(s) aptos
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-2 border-t border-slate-100">
                <span className="truncate">Veículo + rota + carteira + estoque</span>
                <span className="text-[#005596] font-bold hover:underline shrink-0 ml-1">
                  Ver oportunidades →
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SEÇÃO 2: NOVA SEÇÃO — FLUXO DAS CARGAS (5 CARDS CLICÁVEIS COM HISTÓRICO REAL POR EVENTO) */}
      <TowerCargoFlowSection periodLabel={towerData.period_label} fluxo={towerData.fluxo_cargas} />

      {/* SEÇÃO 3: VISÃO AMANHÃ & FUTURO (PRESERVADA) */}
      <div className="space-y-3">
        <SectionHeader
          title="Visão Futura (Programação D+1 e Capacidade Declarada)"
          icon={TrendingUp}
          iconColor="text-purple-600"
          action={
            <Link
              to="/tms/programacao-futura"
              className="text-xs text-[#005596] hover:underline font-semibold flex items-center gap-1 shrink-0"
            >
              Ver Matriz Completa <ArrowRight className="w-3 h-3" />
            </Link>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Card 1: Disponibilidade Programada */}
          <KpiCard
            title="Disponibilidade Programada"
            value={progDrivers.length}
            description="Veículos Futuros"
            variant="purple"
          />

          {/* Card 2: Capacidade Futura */}
          <KpiCard
            title="Capacidade Futura"
            value={
              totalCapTomorrowKg > 0
                ? (totalCapTomorrowKg / 1000).toLocaleString('pt-BR', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 1,
                  })
                : '0'
            }
            unit="t"
            description="Programados D+1"
            variant="purple"
          />

          {/* Card 3: Em Produção PCP */}
          <KpiCard
            title="Em Produção PCP"
            value={inProdOrders.length}
            description="Liberação Prevista"
            variant="sky"
          />

          {/* Card 4: Gaps Diagnosticados */}
          <KpiCard
            title="Gaps Diagnosticados"
            value="Equilibrado"
            description="Matriz Estável"
            variant="success"
            status="Normal"
            statusColor="emerald"
            tooltip="Balanço entre demanda SAP e oferta de veículos equilibrado no período."
          />

          {/* Card 5: Itinerários com Demanda */}
          <KpiCard
            title="Itinerários com Demanda"
            value={uniqueItinerariesWithDemand}
            description="Rotas Ativas SAP"
            variant="default"
          />

          {/* Card 6: Alertas Comerciais */}
          <KpiCard
            title="Alertas Comerciais"
            value={opportunities.length}
            description="CRM 360° Notificado"
            variant="purple"
          />
        </div>
      </div>

      {/* SEÇÃO 4: STATUS DAS INTEGRAÇÕES CORPORATIVAS (PRESERVADA) */}
      <div className="space-y-3">
        <SectionHeader
          title="Monitor de Integrações & Sistemas Conectados"
          icon={Activity}
          iconColor="text-emerald-600"
          action={
            <Link
              to="/tms/monitor-integracoes"
              className="text-xs text-[#005596] hover:underline font-semibold flex items-center gap-1 shrink-0"
            >
              Ver Central de Integrações <ArrowRight className="w-3 h-3" />
            </Link>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* SAP ECC 6.0 */}
          <IntegrationCard
            systemName="SAP ECC 6.0"
            integrationType="qRFC / RFC"
            typeBadgeColor="bg-[#005596] text-white"
            description="System of Record oficial. Sincronização de TVROT e ZSD35."
            status="Conectado"
            statusLabel="Sincronizado"
            statusDetails="TVROT / ZSD35"
          />

          {/* PCP Robotizado */}
          <IntegrationCard
            systemName="PCP Robotizado"
            integrationType="Preparado"
            typeBadgeColor="bg-blue-600 text-white"
            description="Data programada de produção e saldo pronto de materiais."
            status="Preparado"
            statusLabel="Preparado"
            statusDetails="MB52 + PCP"
          />

          {/* CRM 360° */}
          <IntegrationCard
            systemName="CRM 360°"
            integrationType="Preparado"
            typeBadgeColor="bg-purple-600 text-white"
            description="Disparo de alertas de complementos de carga aos vendedores."
            status="Preparado"
            statusLabel="Alertas Ativos"
            statusDetails="CRM Loop"
          />

          {/* Telegram */}
          <IntegrationCard
            systemName="Telegram Bot"
            integrationType="Mensageria"
            typeBadgeColor="bg-sky-500 text-white"
            description="Canal direto de avisos para motoristas cadastrados."
            status="Conectado"
            statusLabel="Adapter Ativo"
            statusDetails="Bot API"
          />

          {/* WhatsApp */}
          <IntegrationCard
            systemName="WhatsApp API"
            integrationType="Mensageria"
            typeBadgeColor="bg-emerald-600 text-white"
            description="Comunicação com motoristas e pré-cadastros via link público."
            status="Conectado"
            statusLabel="Adapter Ativo"
            statusDetails="Link Público"
          />

          {/* TARGET */}
          <IntegrationCard
            systemName="TARGET"
            integrationType="Em desenvolv."
            typeBadgeColor="bg-amber-100 text-amber-800 border-amber-300 border"
            description="Controle de pátio e agendamento de docas operacionais."
            status="Atenção"
            statusLabel="Em desenvolv."
            statusDetails="Fase Posterior"
            disabled
          />
        </div>
      </div>

      {/* Modais de Detalhamento da Operação Hoje (com tabelas e reconciliação) */}
      <CarteiraEstoqueSemCreditoModal
        open={isEstoqueSemCreditoOpen}
        onOpenChange={setIsEstoqueSemCreditoOpen}
        items={operacaoHojeAnalysis.estoqueSemCredito.items}
      />

      <CarteiraSemEstoqueModal
        open={isSemEstoqueOpen}
        onOpenChange={setIsSemEstoqueOpen}
        items={operacaoHojeAnalysis.semEstoque.items}
      />

      <MatchVeiculosEstoqueModal
        open={isMatchVeiculosEstoqueOpen}
        onOpenChange={setIsMatchVeiculosEstoqueOpen}
        matches={operacaoHojeAnalysis.matchVeiculosEstoque.matches}
      />
    </div>
  )
}
export default TmsDashboard
