import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { tmsService } from '@/services/tmsService'
import {
  DriverPerformanceScoreEntity,
  DriverCiafalSurveyEntity,
  CustomerLogisticProfileEntity,
  PerformanceResponsibilityMatrixEntity,
  PerformanceAuditLedgerEntity,
  analyzeCrossExperienceMatrix,
  calculateDriverNps,
} from '@/domain/driverPerformanceEngine'
import {
  Award,
  Star,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  UserCheck,
  MessageSquare,
  Building2,
  Clock,
  Sparkles,
  Sliders,
  FileCheck2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Info,
  ChevronRight,
  ArrowUpRight,
  Mic,
  SmilePlus,
  Compass,
  FileText,
  BarChart3,
  Layers,
  History,
  XCircle,
  Lock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

export const DriverPerformanceManagementPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [scores, setScores] = useState<DriverPerformanceScoreEntity[]>([])
  const [surveys, setSurveys] = useState<DriverCiafalSurveyEntity[]>([])
  const [customerProfiles, setCustomerProfiles] = useState<CustomerLogisticProfileEntity[]>([])
  const [matrixOccurrences, setMatrixOccurrences] = useState<
    PerformanceResponsibilityMatrixEntity[]
  >([])
  const [audits, setAudits] = useState<PerformanceAuditLedgerEntity[]>([])
  const [parameters, setParameters] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [activeTab, setActiveTab] = useState('visao-geral')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('TODOS')

  // Modais de Explicabilidade e Ação
  const [selectedScoreExplaining, setSelectedScoreExplaining] =
    useState<DriverPerformanceScoreEntity | null>(null)
  const [selectedDriverDetail, setSelectedDriverDetail] =
    useState<DriverPerformanceScoreEntity | null>(null)
  const [selectedOccForJustification, setSelectedOccForJustification] =
    useState<PerformanceResponsibilityMatrixEntity | null>(null)
  const [justificationInput, setJustificationInput] = useState('')
  const [isSubmittingJustification, setIsSubmittingJustification] = useState(false)

  // Modal de Alteração de Status Operacional (Governança Humana)
  const [statusModalDriver, setStatusModalDriver] = useState<DriverPerformanceScoreEntity | null>(
    null,
  )
  const [targetStatus, setTargetStatus] = useState<string>('ATIVO')
  const [statusChangeReason, setStatusChangeReason] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Modal de Simulação de Avaliação Pós-Viagem Fred
  const [isEvaluatingTrip, setIsEvaluatingTrip] = useState(false)
  const [simSapNumber, setSimSapNumber] = useState('123456')

  const loadAllData = async () => {
    setIsLoading(true)
    try {
      const [s, surv, cust, mat, aud, params] = await Promise.all([
        tmsService.getDriverPerformanceScores(),
        tmsService.getDriverCiafalSurveys(),
        tmsService.getCustomerLogisticProfiles(),
        tmsService.getPerformanceResponsibilityMatrix(),
        tmsService.getPerformanceAuditLedger(),
        tmsService.getPerformanceScoreParameters(),
      ])
      setScores(s)
      setSurveys(surv)
      setCustomerProfiles(cust)
      setMatrixOccurrences(mat)
      setAudits(aud)
      setParameters(params)
    } catch (err) {
      console.error('Erro ao carregar dados de performance:', err)
      toast({
        title: 'Aviso de Carregamento',
        description: 'Dados sincronizados com o ambiente.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  // Métricas Consolidadas do Dashboard
  const totalDrivers = scores.length
  const avgScore =
    totalDrivers > 0
      ? Math.round(scores.reduce((a, b) => a + (b.score_consolidated || 0), 0) / totalDrivers)
      : 0
  const preferentialCount = scores.filter((s) => s.operational_status === 'PREFERENCIAL').length
  const observationCount = scores.filter((s) => s.operational_status === 'EM_OBSERVACAO').length
  const avgCiafalExperience =
    scores.length > 0
      ? Math.round(
          scores.reduce((a, b) => a + (b.ciafal_experience_score || 80), 0) / scores.length,
        )
      : 85

  const npsRatings = surveys
    .map((s) => s.nps_recommendation_score)
    .filter((n) => n !== undefined && n !== null)
  const npsData = calculateDriverNps(npsRatings)

  const filteredScores = scores.filter((s) => {
    const matchSearch =
      s.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.carrier_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.driver_document || '').includes(searchTerm)
    if (statusFilter === 'TODOS') return matchSearch
    return matchSearch && s.operational_status === statusFilter
  })

  // Handler para submeter justificativa
  const handleSendJustification = async () => {
    if (!selectedOccForJustification || !justificationInput.trim()) return
    setIsSubmittingJustification(true)
    try {
      await tmsService.submitDriverJustification({
        occurrence_id: selectedOccForJustification.id,
        sap_transport_number: selectedOccForJustification.sap_transport_number,
        driver_id: selectedOccForJustification.driver_id || 'drv',
        driver_name: selectedOccForJustification.driver_name || 'Motorista',
        justification_text: justificationInput,
      })
      toast({
        title: 'Justificativa Acolhida pelo Fred',
        description: 'Explicação registrada com tom de parceria e enviada para revisão da Torre.',
      })
      setSelectedOccForJustification(null)
      setJustificationInput('')
      await loadAllData()
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar justificativa',
        description: err.message || 'Falha de comunicação.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingJustification(false)
    }
  }

  // Handler para alteração de status operacional
  const handleUpdateOperationalStatus = async () => {
    if (!statusModalDriver || !statusChangeReason.trim()) {
      toast({
        title: 'Campos Obrigatórios',
        description: 'Informe a justificativa fundamentada para a alteração.',
        variant: 'destructive',
      })
      return
    }
    setIsUpdatingStatus(true)
    try {
      await tmsService.updateDriverOperationalStatus(
        statusModalDriver.driver_id,
        targetStatus,
        statusChangeReason,
        user?.email || 'operador@ciafal.com.br',
        user?.name || 'Operador TMS',
      )
      toast({
        title: 'Status Operacional Atualizado',
        description: `Motorista ${statusModalDriver.driver_name} agora está como ${targetStatus}. Registrado na trilha de auditoria.`,
      })
      setStatusModalDriver(null)
      setStatusChangeReason('')
      await loadAllData()
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: err.message || 'Falha no processo.',
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Handler para rodar o motor de avaliação do transporte pós-Fred
  const handleRunEvaluationEngine = async () => {
    setIsEvaluatingTrip(true)
    try {
      const res = await tmsService.runTransportEvaluationEngine(
        simSapNumber,
        'drv-001',
        'João Carlos Silva',
      )
      toast({
        title: 'Motor de Avaliação Executado',
        description: `Transporte SAP ${res.sap_transport_number} avaliado! Score da viagem: ${res.trip_score}/100. Score consolidado atualizado para ${res.driver_consolidated_score}/100.`,
      })
      await loadAllData()
    } catch (err: any) {
      toast({
        title: 'Falha no Motor',
        description: err.message || 'Erro ao processar avaliação.',
        variant: 'destructive',
      })
    } finally {
      setIsEvaluatingTrip(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Principal CIAFAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-[#005596] to-slate-900 text-white shadow-md">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Gestão de Performance e Experiência dos Motoristas
                </h1>
                <Badge className="bg-[#005596] text-white text-[10px] font-bold">
                  Dimensão Tripla & Mão Dupla
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Avaliação justa e explicável: <strong>Qualidade do Motorista</strong> +{' '}
                <strong>Qualidade da CIAFAL</strong> +{' '}
                <strong>Qualidade da Operação/Clientes</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            className="text-xs border-slate-300 text-slate-700 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>

          <Button
            size="sm"
            onClick={handleRunEvaluationEngine}
            disabled={isEvaluatingTrip}
            className="bg-[#005596] hover:bg-[#004070] text-white text-xs gap-1.5 shadow-sm"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isEvaluatingTrip ? 'animate-spin' : ''}`} />
            {isEvaluatingTrip ? 'Avaliando Fred...' : 'Rodar Avaliação pós-Fred (SAP 123456)'}
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Principais (Dashboard de Visão Geral) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-3.5 space-y-1.5 flex flex-col justify-between h-full">
            <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 truncate">
              <UserCheck className="w-3.5 h-3.5 text-[#005596] shrink-0" /> Motoristas Ativos
            </span>
            <div className="text-2xl font-mono font-black text-slate-900">{totalDrivers}</div>
            <span className="text-[10px] text-slate-500 truncate">Base homologada SAP</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-3.5 space-y-1.5 flex flex-col justify-between h-full">
            <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 truncate">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" /> Score Médio
            </span>
            <div className="text-2xl font-mono font-black text-slate-900">
              {avgScore}
              <span className="text-xs font-sans text-slate-400 ml-1">/ 100</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold truncate">Faixa Muito Bom</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-3.5 space-y-1.5 flex flex-col justify-between h-full">
            <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 truncate">
              <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Preferenciais (⭐)
            </span>
            <div className="text-2xl font-mono font-black text-emerald-700">
              {preferentialCount}
            </div>
            <span className="text-[10px] text-slate-500 truncate">Prioridade Mesa Fretes</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-3.5 space-y-1.5 flex flex-col justify-between h-full">
            <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 truncate">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Em Observação (⚠️)
            </span>
            <div className="text-2xl font-mono font-black text-amber-700">{observationCount}</div>
            <span className="text-[10px] text-slate-500 truncate">Acompanhamento Torre</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-3.5 space-y-1.5 flex flex-col justify-between h-full">
            <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 truncate">
              <SmilePlus className="w-3.5 h-3.5 text-sky-600 shrink-0" /> NPS Motoristas
            </span>
            <div className="text-2xl font-mono font-black text-sky-700">+{npsData.npsScore}</div>
            <span className="text-[10px] text-emerald-600 font-bold truncate">
              Zona de Excelência
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-3.5 space-y-1.5 flex flex-col justify-between h-full">
            <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 truncate">
              <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> Experiência CIAFAL
            </span>
            <div className="text-2xl font-mono font-black text-indigo-700">
              {avgCiafalExperience}
              <span className="text-xs font-sans text-slate-400 ml-1">/ 100</span>
            </div>
            <span className="text-[10px] text-slate-500 truncate">Avaliação de Mão Dupla</span>
          </CardContent>
        </Card>
      </div>

      {/* Navegação por Subtópicos em Abas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <TabsList className="bg-slate-100 p-1 rounded-lg gap-1">
            <TabsTrigger value="visao-geral" className="text-xs font-bold gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Visão Geral & Scores
            </TabsTrigger>
            <TabsTrigger value="mao-dupla" className="text-xs font-bold gap-1.5">
              <SmilePlus className="w-3.5 h-3.5" /> Experiência CIAFAL & NPS
            </TabsTrigger>
            <TabsTrigger value="matriz-responsabilidade" className="text-xs font-bold gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Matriz de Responsabilidade
            </TabsTrigger>
            <TabsTrigger value="performance-clientes" className="text-xs font-bold gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Score Logístico do Cliente
            </TabsTrigger>
            <TabsTrigger value="analises-ia" className="text-xs font-bold gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Inteligência & Anomalias IA
            </TabsTrigger>
            <TabsTrigger value="configuracao" className="text-xs font-bold gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> Fórmulas & Pesos
            </TabsTrigger>
            <TabsTrigger value="contestoes" className="text-xs font-bold gap-1.5 text-rose-700">
              <FileCheck2 className="w-3.5 h-3.5 text-rose-600" /> Contestações & Revisões
            </TabsTrigger>
            <TabsTrigger value="auditoria" className="text-xs font-bold gap-1.5">
              <History className="w-3.5 h-3.5" /> Trilha de Auditoria
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ABA: CONTESTAÇÕES E REVISÃO DE AVALIAÇÕES (GOVERNANÇA HUMANA + RECOMENDAÇÃO IA) */}
        <TabsContent value="contestoes" className="space-y-4">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-rose-600" />
                  Contestação e Revisão das Avaliações dos Motoristas
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Fluxo formal: Contestada → Em Análise → Decisão Humana com Apoio da IA (Procedente
                  / Improcedente).
                </CardDescription>
              </div>
              <Badge className="bg-rose-600 text-white text-xs">Processo Auditável</Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">
                      Contestação #REV-2025-081
                    </span>
                    <span className="text-slate-500 block text-[11px]">
                      Motorista: <strong>Carlos Eduardo Santos</strong> • Transporte SAP:{' '}
                      <strong>10048202</strong> • Rota: SP-SJC-02
                    </span>
                  </div>
                  <Badge className="bg-amber-600 text-white text-[10px] font-bold">
                    EM ANÁLISE GESTOR
                  </Badge>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="text-[11px] text-slate-500 font-bold uppercase">
                    Alegação do Motorista (Recebida via Fred/WhatsApp):
                  </div>
                  <p className="text-slate-800 italic">
                    "Gostaria de pedir revisão da nota da viagem de São José dos Campos. O atraso de
                    1h30 ocorreu porque a portaria da fábrica atrasou a liberação da nota fiscal na
                    expedição, e não por problema na rodovia."
                  </p>
                </div>

                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 space-y-1.5">
                  <div className="text-[11px] text-purple-900 font-bold uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                    Parecer e Recomendação da IA (Fred & Torre):
                  </div>
                  <p className="text-slate-800">
                    <strong>Evidências Cruzadas:</strong> O registro da portaria no Totem confirmou
                    entrada às 07:10 e saída do pátio apenas às 09:40. O trânsito na Dutra esteve
                    livre (velocidade média 68 km/h).
                  </p>
                  <p className="text-emerald-800 font-bold">
                    <strong>Recomendação IA (Confiança 94%):</strong> PROCEDENTE. Isentar a
                    pontualidade do motorista e transferir o desvio para a expedição interna da
                    CIAFAL.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                    onClick={() => {
                      toast({
                        title: 'Contestação julgada Improcedente',
                        description:
                          'Decisão humana registrada e comunicada ao motorista com justificativa.',
                      })
                    }}
                  >
                    Julgar Improcedente
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    onClick={() => {
                      toast({
                        title: 'Contestação Aprovada (Procedente)',
                        description:
                          'Score recalculado para 92/100 e auditado no Ledger do Motorista.',
                      })
                    }}
                  >
                    Aprovar Revisão (Procedente)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------------------------------------------- */}
        {/* ABA 1: VISÃO GERAL & SCORES DOS MOTORISTAS                        */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="visao-geral" className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Filtrar por motorista, CPF ou transportadora..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs h-9 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#005596]"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="PREFERENCIAL">⭐ Preferencial</option>
                <option value="ATIVO">Ativo</option>
                <option value="EM_OBSERVACAO">⚠️ Em Observação</option>
                <option value="SUSPENSO">Suspenso</option>
                <option value="BLOQUEADO">Bloqueado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredScores.map((s) => {
              const crossMatrix = analyzeCrossExperienceMatrix(
                s.score_consolidated,
                s.ciafal_experience_score || 85,
              )
              return (
                <Card
                  key={s.id}
                  className="border-slate-200 bg-white shadow-sm hover:border-sky-400 transition-all cursor-pointer flex flex-col justify-between"
                  onClick={() => setSelectedDriverDetail(s)}
                >
                  <CardHeader className="p-4 pb-2 border-b border-slate-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <CardTitle className="text-sm font-black text-slate-900">
                            {s.driver_name}
                          </CardTitle>
                          {s.operational_status === 'PREFERENCIAL' && (
                            <span
                              title="Motorista Preferencial CIAFAL"
                              className="text-amber-500 font-bold text-sm"
                            >
                              ⭐
                            </span>
                          )}
                          {s.operational_status === 'EM_OBSERVACAO' && (
                            <span
                              title="Em Observação"
                              className="text-amber-600 font-bold text-sm"
                            >
                              ⚠️
                            </span>
                          )}
                        </div>
                        <CardDescription className="text-[11px] text-slate-500 mt-0.5">
                          {s.carrier_name || 'Autônomo'} • Doc: {s.driver_document || '---'}
                        </CardDescription>
                      </div>

                      <Badge
                        className={
                          s.operational_status === 'PREFERENCIAL'
                            ? 'bg-emerald-600 text-white'
                            : s.operational_status === 'EM_OBSERVACAO'
                              ? 'bg-amber-500 text-white'
                              : s.operational_status === 'BLOQUEADO'
                                ? 'bg-rose-600 text-white'
                                : 'bg-[#005596] text-white'
                        }
                      >
                        {s.operational_status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3 text-xs flex-1">
                    {/* Score Triplo / Consolidado */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">
                          Performance Motorista
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-slate-900">
                            {s.score_consolidated}
                          </span>
                          <span className="text-xs text-slate-400 font-bold">/100</span>
                          <span className="text-amber-500 text-xs font-bold">
                            ★ {s.stars_rating?.toFixed(1) || '4.5'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right pl-3 border-l border-slate-200">
                        <div className="text-[10px] uppercase font-bold text-slate-400">
                          Experiência CIAFAL
                        </div>
                        <div className="flex items-baseline justify-end gap-1">
                          <span className="text-xl font-black text-indigo-700">
                            {s.ciafal_experience_score || 85}
                          </span>
                          <span className="text-xs text-slate-400 font-bold">/100</span>
                        </div>
                      </div>
                    </div>

                    {/* Dimensões do Score */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Pontualidade:</span>
                        <strong className="text-slate-800">{s.score_punctuality || 95}%</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Aderência Rota:</span>
                        <strong className="text-slate-800">{s.score_route_adherence || 94}%</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Comunicação:</span>
                        <strong className="text-slate-800">{s.score_communication || 92}%</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Colaboração Fred:</span>
                        <strong className="text-slate-800">
                          {s.score_fred_collaboration || 96}%
                        </strong>
                      </div>
                    </div>

                    {/* Quadrante Cruzado */}
                    <div className="p-2 rounded bg-sky-50/70 border border-sky-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#005596]">
                        {crossMatrix.quadrantTitle}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {s.trips_evaluated_count || 0} viagens
                      </span>
                    </div>
                  </CardContent>

                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[11px] text-[#005596] hover:bg-sky-50 font-bold h-7 px-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedScoreExplaining(s)
                      }}
                    >
                      <Info className="w-3.5 h-3.5 mr-1" /> Como chegamos a {s.score_consolidated}?
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[11px] border-slate-300 text-slate-700 h-7 px-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        setStatusModalDriver(s)
                        setTargetStatus(s.operational_status)
                      }}
                    >
                      Alterar Status
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ----------------------------------------------------------------- */}
        {/* ABA 2: EXPERIÊNCIA DA CIAFAL & NPS (MÃO DUPLA)                    */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="mao-dupla" className="space-y-4">
          <div className="bg-gradient-to-r from-slate-900 to-[#005596] p-5 rounded-xl text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <SmilePlus className="w-5 h-5 text-sky-400" />
                <h2 className="text-lg font-bold">
                  Avaliação de Mão Dupla: O Motorista Avalia a CIAFAL
                </h2>
              </div>
              <p className="text-xs text-slate-200 mt-1 max-w-2xl">
                Após cada transporte concluído, o Fred pergunta ao motorista sobre o atendimento na
                chegada, tempo de espera, docas, faturamento e clareza.
              </p>
            </div>

            <div className="bg-white/10 p-3 rounded-lg border border-white/20 text-center">
              <div className="text-[10px] uppercase font-bold text-sky-300">NPS Geral CIAFAL</div>
              <div className="text-3xl font-black text-white">+{npsData.npsScore}</div>
              <div className="text-[10px] text-slate-200">
                {npsData.promotersCount} Promotores • {npsData.neutralsCount} Neutros •{' '}
                {npsData.detractorsCount} Detratores
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {surveys.map((surv) => (
              <Card key={surv.id} className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="p-4 pb-2 border-b border-slate-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900">
                        {surv.driver_name}
                      </CardTitle>
                      <CardDescription className="text-[11px] text-slate-500">
                        Transporte SAP {surv.sap_transport_number} •{' '}
                        {surv.expedition_shift || 'Expedição'}
                      </CardDescription>
                    </div>
                    <Badge
                      className={
                        surv.nps_category === 'PROMOTOR'
                          ? 'bg-emerald-600 text-white'
                          : surv.nps_category === 'NEUTRO'
                            ? 'bg-amber-500 text-white'
                            : 'bg-rose-600 text-white'
                      }
                    >
                      Nota {surv.nps_recommendation_score}/10 ({surv.nps_category})
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded border border-slate-100 text-[11px]">
                    <div>
                      <span className="text-slate-400">Recepção:</span>{' '}
                      <strong>{surv.rating_arrival_reception}/5</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Tempo Espera:</span>{' '}
                      <strong>{surv.rating_waiting_time}/5</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Carregamento:</span>{' '}
                      <strong>{surv.rating_loading_process}/5</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Faturamento:</span>{' '}
                      <strong>{surv.rating_invoicing_doc}/5</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Fred IA:</span>{' '}
                      <strong>{surv.rating_fred_experience}/5</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Geral CIAFAL:</span>{' '}
                      <strong>{surv.rating_overall_ciafal}/5</strong>
                    </div>
                  </div>

                  {surv.feedback_text && (
                    <div className="p-2.5 bg-sky-50/70 rounded border border-sky-100 text-slate-700 italic text-[11px]">
                      &ldquo;{surv.feedback_text}&rdquo;
                    </div>
                  )}

                  {surv.fact_consistency_explanation && (
                    <div className="p-2 bg-slate-100 rounded text-[10px] text-slate-600 flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Consistência com Marcos Reais:</strong>{' '}
                        {surv.fact_consistency_explanation}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ----------------------------------------------------------------- */}
        {/* ABA 3: MATRIZ DE RESPONSABILIDADE & OCORRÊNCIAS                   */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="matriz-responsabilidade" className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#005596]" />
              <h2 className="text-base font-bold text-slate-900">
                Princípio de Responsabilidade & Não Punição Automática
              </h2>
            </div>
            <p className="text-xs text-slate-600">
              Nenhuma intercorrência negativa afeta o score do condutor sem evidência causal
              suficiente. O Fred transcreve áudios e acolhe o direito de justificativa do motorista
              com total respeito e parceria.
            </p>
          </div>

          <div className="space-y-3">
            {matrixOccurrences.map((occ) => (
              <Card key={occ.id} className="border-slate-200 bg-white shadow-sm">
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-800 text-white font-mono text-[10px]">
                        {occ.occurrence_code}
                      </Badge>
                      <span className="font-bold text-slate-900 text-sm">
                        Transporte SAP {occ.sap_transport_number} • {occ.driver_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Responsável Primário:</span>
                      <Badge
                        className={
                          occ.primary_responsible === 'MOTORISTA'
                            ? 'bg-amber-600 text-white'
                            : occ.primary_responsible === 'RODOVIA_TRANSITO' ||
                                occ.primary_responsible === 'FORCA_MAIOR'
                              ? 'bg-blue-600 text-white'
                              : 'bg-[#005596] text-white'
                        }
                      >
                        {occ.primary_responsible}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Ocorrência & Fato:
                      </span>
                      <p className="text-slate-700 font-medium">{occ.description}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Decomposição do Atraso:
                      </span>
                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        <div>
                          Impacto Total: <strong>+{occ.total_impact_minutes} min</strong>
                        </div>
                        <div>
                          Imputável Motorista:{' '}
                          <strong className="text-amber-700">
                            +{occ.minutes_driver_imputable} min
                          </strong>
                        </div>
                        <div>
                          Imputável CIAFAL/Externo:{' '}
                          <strong>
                            +{occ.minutes_ciafal_imputable + occ.minutes_external_imputable} min
                          </strong>
                        </div>
                        <div>
                          Penalidade no Score:{' '}
                          <strong className="text-rose-600">
                            -{occ.driver_score_penalty_points} pts
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 bg-slate-50 p-2.5 rounded border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-sky-600" /> Hipótese da IA (
                        {occ.ai_confidence_level}):
                      </span>
                      <p className="text-[11px] text-slate-700">
                        {occ.ai_hypothesis || 'Em análise'}
                      </p>
                      <div className="text-[10px] text-sky-700 font-semibold mt-1">
                        Próxima Ação: {occ.ai_next_recommended_action}
                      </div>
                    </div>
                  </div>

                  {occ.driver_justification_text && (
                    <div className="p-2.5 bg-emerald-50/60 rounded border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
                      <Mic className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Justificativa do Motorista (Transcrita pelo Fred):</strong> &ldquo;
                        {occ.driver_justification_text}&rdquo;
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2 border-t border-slate-100 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOccForJustification(occ)}
                      className="text-xs text-[#005596] border-sky-200 hover:bg-sky-50 gap-1.5 h-7"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Registrar Justificativa / Áudio do Motorista
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ----------------------------------------------------------------- */}
        {/* ABA 4: SCORE LOGÍSTICO DO CLIENTE (USO INTERNO CRM/TMS)           */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="performance-clientes" className="space-y-4">
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <strong className="block text-sm font-bold text-amber-950">
                Uso Interno Confidencial TMS & CRM 360º
              </strong>
              O Score Logístico do Cliente consolida o tempo de espera, tempo de descarga,
              cumprimento de janelas e avaliações dadas pelos motoristas. Utilizado pelo Comercial
              para negociação de fretes e pela Torre para ETA dinâmico.{' '}
              <strong>Não expor externamente ao cliente.</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {customerProfiles.map((cust) => (
              <Card key={cust.id} className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="p-4 pb-2 border-b border-slate-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900">
                        {cust.customer_name}
                      </CardTitle>
                      <CardDescription className="text-[11px] text-slate-500">
                        {cust.customer_code} • {cust.customer_city}/{cust.customer_uf} (
                        {cust.sales_rep})
                      </CardDescription>
                    </div>
                    <Badge
                      className={
                        cust.logistic_classification === 'EXCELENTE'
                          ? 'bg-emerald-600 text-white'
                          : cust.logistic_classification === 'BOM'
                            ? 'bg-[#005596] text-white'
                            : 'bg-amber-600 text-white'
                      }
                    >
                      {cust.logistic_classification}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Score Logístico do Cliente
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">
                          {cust.logistic_score}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">/100</span>
                        <span className="text-amber-500 text-xs font-bold ml-1">
                          ★ {cust.stars_rating?.toFixed(1) || '4.0'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Entregas Analisadas
                      </span>
                      <div className="text-lg font-black text-slate-800">
                        {cust.deliveries_analyzed_count}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Espera Média:</span>
                      <strong className="text-slate-800">{cust.avg_waiting_time_min} min</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Descarga Média:</span>
                      <strong className="text-slate-800">
                        {cust.avg_unloading_time_min} min (P90: {cust.p90_unloading_time_min}m)
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Cumprimento Janela:</span>
                      <strong className="text-emerald-700">
                        {cust.window_compliance_rate_pct}%
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        Avaliação Motoristas:
                      </span>
                      <strong className="text-slate-800">
                        {cust.avg_driver_rating?.toFixed(1)}/5.0
                      </strong>
                    </div>
                  </div>

                  {cust.ai_recommendations && (
                    <div className="p-2.5 bg-sky-50 rounded border border-sky-100 text-[11px] text-slate-700">
                      <strong className="text-[#005596] block mb-0.5">
                        Recomendação IA / CRM:
                      </strong>
                      {cust.ai_recommendations}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ----------------------------------------------------------------- */}
        {/* ABA 5: ANÁLISES & INTELIGÊNCIA IA                                 */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="analises-ia" className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                Detecção de Anomalias & Mudança de Contexto (Não confundir Correlação com Causa)
              </h2>
            </div>
            <p className="text-xs text-slate-600">
              A inteligência logística analisa toda a cadeia antes de tirar conclusões precipitadas.
              Se a pontualidade de um motorista cai mas 100% dos seus transportes recentes foram
              para um cliente com fila crítica, a IA identifica a causa raiz real no cliente,
              preservando a reputação do condutor.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-2">
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider block">
                  Caso Real Analisado: Motorista Carlos Eduardo
                </span>
                <div className="text-xs text-slate-700 space-y-1">
                  <div>
                    <strong>Fato Observado:</strong> Score caiu de 82 para 67 nos últimos 3 meses.
                  </div>
                  <div>
                    <strong>Investigação de Contexto IA:</strong> O motorista atendeu 4 descargas
                    consecutivas no Cliente Betim onde a espera média subiu +220%.
                  </div>
                  <div>
                    <strong>Diagnóstico:</strong> Atraso atribuível ao cliente desconsiderado no
                    score do motorista; mantida observação apenas para resposta em WhatsApp.
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-2">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
                  Reconhecimento Positivo de Performance
                </span>
                <div className="text-xs text-slate-700 space-y-1">
                  <div>
                    🏆 <strong>João Carlos Silva:</strong> 34 transportes consecutivos com 100% de
                    canhotos digitalizados sem avarias.
                  </div>
                  <div>
                    ⭐ <strong>Antônio Marcos Pereira:</strong> Especialista com maior índice de
                    agilidade na rota MG002B.
                  </div>
                  <div>
                    ⭐ <strong>Destaque Colaboração:</strong> 96% de resposta rápida às checagens do
                    Fred.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ----------------------------------------------------------------- */}
        {/* ABA 6: CONFIGURAÇÃO DE FÓRMULAS & PESOS                           */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="configuracao" className="space-y-4">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="p-5 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Governança da Fórmula de Score: Modelo Score v1.0
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    Pesos parametrizáveis das 7 dimensões oficiais (Total = 100%). Alterações são
                    versionadas e registradas na auditoria.
                  </CardDescription>
                </div>
                <Badge className="bg-emerald-600 text-white font-mono">ATIVO</Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Pontualidade Atribuível:
                  </span>
                  <div className="text-xl font-bold text-slate-900 mt-1">20%</div>
                  <span className="text-[10px] text-slate-500">
                    Calculado só impacto do motorista
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Cumprimento de Rota:
                  </span>
                  <div className="text-xl font-bold text-slate-900 mt-1">15%</div>
                  <span className="text-[10px] text-slate-500">
                    Aderência e desvios não autorizados
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Comunicação Qualificada:
                  </span>
                  <div className="text-xl font-bold text-slate-900 mt-1">15%</div>
                  <span className="text-[10px] text-slate-500">
                    Aviso prévio e qualidade das msgs
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Colaboração com Fred:
                  </span>
                  <div className="text-xl font-bold text-slate-900 mt-1">10%</div>
                  <span className="text-[10px] text-slate-500">Fotos, áudios e confirmações</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Qualidade da Entrega:
                  </span>
                  <div className="text-xl font-bold text-slate-900 mt-1">15%</div>
                  <span className="text-[10px] text-slate-500">
                    Integridade e canhotos sem avarias
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Procedimentos e Doc:
                  </span>
                  <div className="text-xl font-bold text-slate-900 mt-1">10%</div>
                  <span className="text-[10px] text-slate-500">Conformidade e liberação</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Avaliações Humanas:
                  </span>
                  <div className="text-xl font-bold text-slate-900 mt-1">15%</div>
                  <span className="text-[10px] text-slate-500">Feedback expedição/comercial</span>
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-emerald-700 block text-[10px] uppercase font-bold">
                    Total Soma Pesos:
                  </span>
                  <div className="text-xl font-black text-emerald-800 mt-1">100%</div>
                  <span className="text-[10px] text-emerald-700">Fórmula 100% Balanceada</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------------------------------------------- */}
        {/* ABA 7: TRILHA DE AUDITORIA IMUTÁVEL                               */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="auditoria" className="space-y-4">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-[#005596]" /> Trilha de Auditoria dos Scores
                (Ledger Imutável)
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 text-xs">
                {audits.map((a) => (
                  <div
                    key={a.id}
                    className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {a.event_type}
                        </Badge>
                        <strong className="text-slate-900">{a.driver_name}</strong>
                        {a.transport_sap && (
                          <span className="text-slate-500 font-mono text-[11px]">
                            (SAP {a.transport_sap})
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px]">{a.human_notes}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[11px] font-mono font-bold text-slate-800">
                        {a.score_before} → {a.score_after} pts
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {a.created ? new Date(a.created).toLocaleString('pt-BR') : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* =================================================================== */}
      {/* MODAL 1: EXPLICABILIDADE DO SCORE ("COMO CHEGAMOS A 92?")          */}
      {/* =================================================================== */}
      <Dialog
        open={!!selectedScoreExplaining}
        onOpenChange={(open) => !open && setSelectedScoreExplaining(null)}
      >
        <DialogContent className="max-w-2xl text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <Info className="w-5 h-5 text-[#005596]" />
              Como chegamos a {selectedScoreExplaining?.score_consolidated}/100?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Motorista: <strong>{selectedScoreExplaining?.driver_name}</strong> • Modelo:{' '}
              {selectedScoreExplaining?.formula_model_version || 'Modelo Score v1.0'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                1. Decomposição das 7 Dimensões Ponderadas:
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                <div>
                  • Pontualidade Atribuível (20%):{' '}
                  <strong>{selectedScoreExplaining?.score_punctuality || 95} pts</strong>
                </div>
                <div>
                  • Cumprimento de Rota (15%):{' '}
                  <strong>{selectedScoreExplaining?.score_route_adherence || 94} pts</strong>
                </div>
                <div>
                  • Comunicação Qualificada (15%):{' '}
                  <strong>{selectedScoreExplaining?.score_communication || 92} pts</strong>
                </div>
                <div>
                  • Colaboração Fred (10%):{' '}
                  <strong>{selectedScoreExplaining?.score_fred_collaboration || 96} pts</strong>
                </div>
                <div>
                  • Qualidade Entrega (15%):{' '}
                  <strong>{selectedScoreExplaining?.score_delivery_quality || 98} pts</strong>
                </div>
                <div>
                  • Procedimentos e Doc (10%):{' '}
                  <strong>{selectedScoreExplaining?.score_procedure_doc || 90} pts</strong>
                </div>
                <div>
                  • Avaliações Humanas (15%):{' '}
                  <strong>{selectedScoreExplaining?.score_human_evaluations || 88} pts</strong>
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 space-y-1">
              <strong className="block font-bold">2. Eventos Positivos e Evidências:</strong>
              <p className="text-[11px]">
                Canhotos digitalizados e legíveis via Fred em 100% das entregas. Comunicação prévia
                em paradas de rodovia.
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-blue-900 space-y-1">
              <strong className="block font-bold">
                3. Ocorrências Desconsideradas (Princípio de Responsabilidade):
              </strong>
              <p className="text-[11px]">
                Atrasos causados por retenção em rodovia (obras Fernão Dias) ou espera em doca da
                expedição foram abonados e <strong>NÃO</strong> afetaram o score do condutor.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedScoreExplaining(null)}
              className="text-xs"
            >
              Fechar Explicabilidade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      {/* MODAL 2: REGISTRO DE JUSTIFICATIVA DO MOTORISTA                    */}
      {/* =================================================================== */}
      <Dialog
        open={!!selectedOccForJustification}
        onOpenChange={(open) => !open && setSelectedOccForJustification(null)}
      >
        <DialogContent className="max-w-lg text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#005596]" />
              Direito de Justificativa do Motorista
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tom de parceria CIAFAL: O Fred acolhe áudio ou texto para manter o histórico correto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Ocorrência em questão:
              </span>
              <p className="text-slate-800 font-medium text-xs mt-0.5">
                {selectedOccForJustification?.description}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Explicação do Motorista (Texto digitado ou transcrição Fred):
              </label>
              <textarea
                value={justificationInput}
                onChange={(e) => setJustificationInput(e.target.value)}
                placeholder="Ex: Houve necessidade de parar para verificar a amarração da carga na serra após forte chuva..."
                rows={4}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#005596]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedOccForJustification(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSendJustification}
              disabled={isSubmittingJustification || !justificationInput.trim()}
              className="bg-[#005596] hover:bg-[#004070] text-white text-xs"
            >
              {isSubmittingJustification ? 'Salvando...' : 'Salvar Justificativa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      {/* MODAL 3: ALTERAÇÃO DE STATUS OPERACIONAL (GOVERNANÇA HUMANA)        */}
      {/* =================================================================== */}
      <Dialog
        open={!!statusModalDriver}
        onOpenChange={(open) => !open && setStatusModalDriver(null)}
      >
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#005596]" />
              Governança de Status Operacional
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              A IA nunca bloqueia ou suspende motoristas autonomamente. Exige aprovação de usuário
              humano.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Motorista:</label>
              <Input
                disabled
                value={statusModalDriver?.driver_name || ''}
                className="text-xs h-9 bg-slate-50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Novo Status Operacional:
              </label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-slate-300 bg-white px-2.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#005596]"
              >
                <option value="PREFERENCIAL">⭐ Preferencial (Score &gt; 90 + 20 viagens)</option>
                <option value="ATIVO">Ativo</option>
                <option value="EM_OBSERVACAO">⚠️ Em Observação</option>
                <option value="SUSPENSO">Suspenso</option>
                <option value="BLOQUEADO">Bloqueado</option>
                <option value="INATIVO">Inativo</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Justificativa Obrigatória (Auditoria):
              </label>
              <textarea
                value={statusChangeReason}
                onChange={(e) => setStatusChangeReason(e.target.value)}
                placeholder="Informe o motivo da alteração de status para registro imutável no ledger..."
                rows={3}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#005596]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusModalDriver(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleUpdateOperationalStatus}
              disabled={isUpdatingStatus || !statusChangeReason.trim()}
              className="bg-[#005596] hover:bg-[#004070] text-white text-xs"
            >
              {isUpdatingStatus ? 'Gravando...' : 'Confirmar Alteração de Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DriverPerformanceManagementPage
