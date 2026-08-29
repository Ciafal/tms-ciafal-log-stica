import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { tmsService } from '@/services/tmsService'
import { useToast } from '@/hooks/use-toast'
import {
  OperationalExpeditionStatus,
  DEFAULT_EXPEDITION_SLAS,
  evaluateStageSla,
  calculateBottleneckPareto,
  ExpeditionTrackingItem,
  BottleneckParetoCause,
} from '@/domain/expeditionTowerEngine'
import {
  Truck,
  Layers,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  RotateCcw,
  Search,
  Filter,
  Eye,
  FileText,
  Bot,
  Warehouse,
  Shield,
  Zap,
  ArrowRight,
  Sparkles,
  AlertOctagon,
  Timer,
  Check,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const ExpeditionManagementPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [expeditions, setExpeditions] = useState<ExpeditionTrackingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [selectedExpedition, setSelectedExpedition] = useState<ExpeditionTrackingItem | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Modals
  const [wmsPriorityModalOpen, setWmsPriorityModalOpen] = useState(false)
  const [aiAnalysisModalOpen, setAiAnalysisModalOpen] = useState(false)
  const [selectedAiExpedition, setSelectedAiExpedition] = useState<ExpeditionTrackingItem | null>(
    null,
  )

  const loadData = useCallback(async () => {
    try {
      const list = await tmsService.getExpeditionTrackings()
      setExpeditions(list as any[])
    } catch (err) {
      console.error('Error loading expedition trackings:', err)
      toast({
        title: 'Erro ao carregar expedição',
        description: 'Não foi possível carregar o fluxo operacional da expedição.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Contadores dos Cards no Topo
  const metrics = useMemo(() => {
    const total = expeditions.length
    const aguardandoMotorista = expeditions.filter(
      (e) => e.operationalStatus === 'PROGRAMADA' || e.operationalStatus === 'MOTORISTA_CONFIRMADO',
    ).length
    const patio = expeditions.filter(
      (e) => e.operationalStatus === 'PRESENCA_NO_PATIO' || e.operationalStatus === 'CHECK_IN',
    ).length
    const aguardandoEstoque = expeditions.filter(
      (e) => e.operationalStatus === 'AGUARDANDO_ESTOQUE',
    ).length
    const emSeparacao = expeditions.filter((e) => e.operationalStatus === 'EM_SEPARACAO').length
    const emCarregamento = expeditions.filter(
      (e) => e.operationalStatus === 'EM_CARREGAMENTO',
    ).length
    const faturamento = expeditions.filter(
      (e) => e.operationalStatus === 'AGUARDANDO_FATURAMENTO',
    ).length
    const liberadas = expeditions.filter((e) => e.operationalStatus === 'LIBERADO').length
    const expedidas = expeditions.filter(
      (e) => e.operationalStatus === 'SAIDA_DO_PATIO' || e.operationalStatus === 'EM_VIAGEM',
    ).length
    const criticasAtraso = expeditions.filter(
      (e) => e.slaStatus === 'CRITICO_ATRASADO' || e.delayRiskPct > 60,
    ).length

    return {
      total,
      aguardandoMotorista,
      patio,
      aguardandoEstoque,
      emSeparacao,
      emCarregamento,
      faturamento,
      liberadas,
      expedidas,
      criticasAtraso,
    }
  }, [expeditions])

  // Filtragem
  const filteredExpeditions = useMemo(() => {
    return expeditions.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.cargoId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sapTransportNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.destinationCities.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PATIO' &&
          (item.operationalStatus === 'PRESENCA_NO_PATIO' ||
            item.operationalStatus === 'CHECK_IN')) ||
        (statusFilter === 'CARREGAMENTO' && item.operationalStatus === 'EM_CARREGAMENTO') ||
        (statusFilter === 'ESTOQUE' &&
          (item.operationalStatus === 'AGUARDANDO_ESTOQUE' ||
            item.operationalStatus === 'EM_SEPARACAO')) ||
        (statusFilter === 'FATURAMENTO' && item.operationalStatus === 'AGUARDANDO_FATURAMENTO') ||
        (statusFilter === 'ATRASO' &&
          (item.slaStatus === 'CRITICO_ATRASADO' || item.delayRiskPct > 50))

      return matchesSearch && matchesStatus
    })
  }, [expeditions, searchTerm, statusFilter])

  // Pareto de Gargalos por IA
  const paretoData = useMemo(() => {
    return calculateBottleneckPareto(expeditions)
  }, [expeditions])

  // Ação: Solicitar Prioridade ao WMS
  const handleRequestWmsPriority = async (item: ExpeditionTrackingItem) => {
    setActionLoading(true)
    try {
      if (item.id) {
        await tmsService.updateExpeditionTracking(item.id, {
          wms_priority_requested: true,
          wms_priority_requested_at: new Date().toISOString(),
          priority_level: 'URGENTE',
        })
      }
      toast({
        title: 'Prioridade Solicitada ao WMS DP34',
        description: `Alerta disparado com sucesso para a carga ${item.cargoId}. Equipe de pontes acionada.`,
        className: 'bg-[#005596] text-white',
      })
      await loadData()
      setWmsPriorityModalOpen(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao solicitar prioridade',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <Truck className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Gestão da Expedição & Torre Operacional
            </h1>
            <Badge className="bg-[#005596] text-white text-xs font-bold px-2.5 py-0.5">
              Tempo Real
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Torre de controle de tempos operacionais: Check-in → Liberação WMS DP34 → Separação →
            Carregamento → Faturamento SAP → Saída.
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
            Atualizar Torre
          </Button>
          <Link to="/tms/torre-controle">
            <Button
              size="sm"
              className="bg-[#005596] hover:bg-[#004275] text-white font-bold text-xs gap-1.5 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Modo Torre de Controle
            </Button>
          </Link>
        </div>
      </div>

      {/* CARDS CLICÁVEIS DE STATUS NO TOPO */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`cursor-pointer p-3 rounded-xl border transition shadow-sm ${
            statusFilter === 'ALL'
              ? 'bg-[#005596] text-white border-[#005596]'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
            Total Programadas
          </p>
          <div className="text-xl font-black mt-0.5">{metrics.total}</div>
        </div>

        <div
          onClick={() => setStatusFilter('PATIO')}
          className={`cursor-pointer p-3 rounded-xl border transition shadow-sm ${
            statusFilter === 'PATIO'
              ? 'bg-sky-600 text-white border-sky-600'
              : 'bg-sky-50 text-sky-900 border-sky-200 hover:border-sky-300'
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider">No Pátio</p>
          <div className="text-xl font-black mt-0.5">{metrics.patio}</div>
        </div>

        <div
          onClick={() => setStatusFilter('ESTOQUE')}
          className={`cursor-pointer p-3 rounded-xl border transition shadow-sm ${
            statusFilter === 'ESTOQUE'
              ? 'bg-amber-600 text-white border-amber-600'
              : 'bg-amber-50 text-amber-900 border-amber-200 hover:border-amber-300'
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider">Aguard. Estoque</p>
          <div className="text-xl font-black mt-0.5">{metrics.aguardandoEstoque}</div>
        </div>

        <div
          onClick={() => setStatusFilter('ESTOQUE')}
          className="cursor-pointer p-3 rounded-xl border bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300 shadow-sm"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Em Separação
          </p>
          <div className="text-xl font-black mt-0.5">{metrics.emSeparacao}</div>
        </div>

        <div
          onClick={() => setStatusFilter('CARREGAMENTO')}
          className={`cursor-pointer p-3 rounded-xl border transition shadow-sm ${
            statusFilter === 'CARREGAMENTO'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:border-indigo-300'
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider">Em Carregamento</p>
          <div className="text-xl font-black mt-0.5">{metrics.emCarregamento}</div>
        </div>

        <div
          onClick={() => setStatusFilter('FATURAMENTO')}
          className={`cursor-pointer p-3 rounded-xl border transition shadow-sm ${
            statusFilter === 'FATURAMENTO'
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-purple-50 text-purple-900 border-purple-200 hover:border-purple-300'
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider">Aguard. Faturam.</p>
          <div className="text-xl font-black mt-0.5">{metrics.faturamento}</div>
        </div>

        <div className="p-3 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider">Liberadas</p>
          <div className="text-xl font-black mt-0.5">{metrics.liberadas}</div>
        </div>

        <div
          onClick={() => setStatusFilter('ATRASO')}
          className={`cursor-pointer p-3 rounded-xl border transition shadow-sm ${
            statusFilter === 'ATRASO'
              ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
              : 'bg-rose-50 text-rose-900 border-rose-200 hover:border-rose-300'
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider">Risco Atraso</p>
          <div className="text-xl font-black mt-0.5 text-rose-700">{metrics.criticasAtraso}</div>
        </div>
      </div>

      {/* PAINEL DE RISCO DE ATRASO & GARGALOS POR IA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quadro Risco de Atraso */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Quadro de Atenção & Cargas em Risco de Atraso
            </h3>
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
              Diagnóstico Ativo
            </Badge>
          </div>

          <div className="space-y-3 pt-1">
            {expeditions
              .filter((e) => e.slaStatus === 'CRITICO_ATRASADO' || e.delayRiskPct > 50)
              .map((exp) => (
                <div
                  key={exp.cargoId}
                  className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-rose-900 text-sm">{exp.cargoId}</span>
                      <Badge className="bg-rose-600 text-white font-mono text-[10px]">
                        Probabilidade: {exp.delayRiskPct}%
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {exp.driverName} ({exp.vehiclePlate})
                      </Badge>
                    </div>
                    <span className="text-slate-500 font-semibold">
                      Duração na Etapa:{' '}
                      <strong className="text-rose-700">{exp.currentStageDurationMin} min</strong>{' '}
                      (Meta: 20 min)
                    </span>
                  </div>

                  <p className="text-slate-700">
                    <strong>Motivo do Gargalo:</strong>{' '}
                    {exp.delayRootCause ||
                      'Pendência de liberação de saldo no depósito DP34 pelo WMS.'}
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    <strong>Evidência Operacional:</strong>{' '}
                    {exp.delayEvidence ||
                      'Motorista no pátio aguardando separação das últimas 2,8 toneladas.'}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-rose-200">
                    <span className="text-emerald-800 font-bold">
                      Ação Recomendada:{' '}
                      {exp.delaySuggestedAction || 'Priorizar WMS DP34 e alocar ponte rolante 02.'}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedAiExpedition(exp)
                          setAiAnalysisModalOpen(true)
                        }}
                        className="h-7 text-xs bg-[#005596] text-white font-bold gap-1"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        Analisar com IA
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRequestWmsPriority(exp)}
                        disabled={actionLoading}
                        className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Priorizar WMS
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Pareto de Gargalos */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-[#005596]" />
            Pareto de Causas de Atraso
          </h3>
          <p className="text-xs text-slate-500">
            Distribuição dos principais fatores causadores de desvio no tempo total de expedição.
          </p>

          <div className="space-y-2.5 pt-2 text-xs">
            {paretoData.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1"
              >
                <div className="flex justify-between font-bold text-slate-800">
                  <span>{item.category}</span>
                  <span className="text-[#005596]">
                    {item.percentage}% ({item.totalDelayMinutes} min)
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#005596] h-full rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1">{item.mainRecommendation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LISTAGEM OPERACIONAL DE CARGAS */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Pesquisar por carga, transporte SAP, motorista, placa, cliente, rota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
              Total listado: {filteredExpeditions.length} cargas
            </Badge>
          </div>
        </div>

        {/* Tabela Operacional */}
        <div className="border rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b text-[10px] uppercase font-bold text-slate-500">
              <tr>
                <th className="p-3">Carga / SAP</th>
                <th className="p-3">Motorista & Placa</th>
                <th className="p-3">Rota / Destino</th>
                <th className="p-3">Peso Total</th>
                <th className="p-3">Etapa Operacional</th>
                <th className="p-3">Tempo Etapa</th>
                <th className="p-3">SLA / Semáforo</th>
                <th className="p-3">WMS & Estoque</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpeditions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Nenhuma carga encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredExpeditions.map((item) => (
                  <tr key={item.cargoId} className="hover:bg-slate-50/80 transition">
                    <td className="p-3">
                      <div className="font-extrabold text-slate-900">{item.cargoId}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        SAP: {item.sapTransportNumber || 'Aguardando'}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{item.driverName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Placa: {item.vehiclePlate} • {item.driverPhone || '---'}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{item.destinationCities}</div>
                      <div className="text-[10px] text-slate-500">
                        {item.itineraryCode || 'ITIN-SP-01'}
                      </div>
                    </td>
                    <td className="p-3 font-bold text-slate-800">
                      {((item.weightTotalKg || 27000) / 1000).toFixed(1)} t
                    </td>
                    <td className="p-3">
                      <Badge className="bg-sky-50 text-[#005596] border-sky-200 font-bold text-[10px]">
                        {item.operationalStatus}
                      </Badge>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.currentStageName}
                      </div>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-800">
                      {item.currentStageDurationMin} min
                    </td>
                    <td className="p-3">
                      <Badge
                        className={`text-[10px] font-bold ${
                          item.slaStatus === 'CRITICO_ATRASADO'
                            ? 'bg-rose-600 text-white'
                            : item.slaStatus === 'ATENCAO'
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {item.slaStatus}
                      </Badge>
                      {item.delayRiskPct > 0 && (
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          Risco: {item.delayRiskPct}%
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="text-[11px] font-medium text-slate-700">
                        {item.wmsStatusDetail || 'Disponível 100% DP34'}
                      </div>
                      {item.wmsPriorityRequested && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] font-bold mt-0.5">
                          Prioridade Solicitada
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedExpedition(item)
                          setDetailsModalOpen(true)
                        }}
                        className="h-7 text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-[#005596]" />
                        Abrir Carga
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: DETALHES DA CARGA & TIMELINE ÚNICA */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center justify-between">
              <span>Detalhes da Expedição: {selectedExpedition?.cargoId}</span>
              <Badge className="bg-[#005596] text-white">
                SAP: {selectedExpedition?.sapTransportNumber || '1004829102'}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Rastreabilidade total: Planejamento → Contratação Carlão → Expedição Doca →
              Faturamento.
            </DialogDescription>
          </DialogHeader>

          {selectedExpedition && (
            <div className="space-y-4 py-2 text-xs">
              {/* Box de Informações da Carga */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  Motorista: <strong>{selectedExpedition.driverName}</strong>
                </div>
                <div>
                  Veículo: <strong>{selectedExpedition.vehiclePlate}</strong>
                </div>
                <div>
                  Doca Alocada: <strong>{selectedExpedition.assignedDock || 'Doca 04'}</strong>
                </div>
                <div>
                  Peso Total:{' '}
                  <strong>
                    {((selectedExpedition.weightTotalKg || 27000) / 1000).toFixed(1)} toneladas
                  </strong>
                </div>
                <div>
                  Tempo Total no Pátio: <strong>{selectedExpedition.totalLeadTimeMin} min</strong>
                </div>
                <div>
                  Meta Lead Time: <strong>{selectedExpedition.targetLeadTimeMin} min</strong>
                </div>
              </div>

              {/* Status WMS */}
              <div className="bg-sky-50 p-3 rounded-xl border border-sky-200 space-y-1">
                <span className="font-bold text-[#005596] block">Status WMS & Saldo Físico:</span>
                <p className="text-slate-700">
                  {selectedExpedition.wmsStatusDetail ||
                    'Material 100% liberado pelo depósito DP34.'}
                </p>
              </div>

              {/* TIMELINE COMPLETA DA CARGA (ITEM 15) */}
              <div className="space-y-2 border-t pt-3">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#005596]" />
                  Timeline Completa de Rastreabilidade Operacional
                </h4>

                <div className="space-y-2.5 pl-2 text-[11px] text-slate-700">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>
                      <strong>13:02</strong> — Carga Aprovada no Planejador IA
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>
                      <strong>13:05</strong> — Carlão iniciou negociação com{' '}
                      {selectedExpedition.driverName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>
                      <strong>13:19</strong> — Motorista aceitou a proposta (Frete R$ 2.750 +
                      Pedágio R$ 428,40)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>
                      <strong>13:21</strong> — Transporte SAP Nº{' '}
                      {selectedExpedition.sapTransportNumber || '1004829102'} gerado com sucesso
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>
                      <strong>13:58</strong> — Motorista chegou à CIAFAL (Entrada na cancela)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>
                      <strong>14:03</strong> — Check-in e validação de documentação concluídos
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                    <span>
                      <strong>14:29</strong> — Início do carregamento na Doca 04
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailsModalOpen(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: ANÁLISE COM IA DE GARGALOS */}
      <Dialog open={aiAnalysisModalOpen} onOpenChange={setAiAnalysisModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#005596]" />
              Diagnóstico de Gargalo por IA — {selectedAiExpedition?.cargoId}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Proposta consultiva de ação para liberação do fluxo.
            </DialogDescription>
          </DialogHeader>

          {selectedAiExpedition && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div>
                  <strong>FATO:</strong> Atraso de 47 minutos na etapa de Liberação de Estoque DP34.
                </div>
                <div>
                  <strong>HIPÓTESE:</strong> Concentração de ordens pesadas na mesma ponte rolante.
                </div>
                <div>
                  <strong>EVIDÊNCIA:</strong> 72% dos desvios nesta janela horária ocorreram no
                  DP34.
                </div>
                <div>
                  <strong>CONFIANÇA:</strong> Alta (88%)
                </div>
              </div>

              <div className="p-3 bg-sky-50 rounded-lg border border-sky-200 space-y-1 text-slate-800">
                <strong className="text-[#005596] block">AÇÃO RECOMENDADA PELA IA:</strong>
                <p>
                  Acionar equipe de ponte do depósito 34 e solicitar priorização das últimas 2,8
                  toneladas antes do início da próxima carga.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => setAiAnalysisModalOpen(false)}
              className="bg-[#005596] text-white"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default ExpeditionManagementPage
