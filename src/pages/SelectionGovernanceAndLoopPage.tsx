import React, { useState, useEffect, useCallback } from 'react'
import {
  Sliders,
  ShieldCheck,
  RotateCcw,
  Plus,
  Save,
  CheckCircle2,
  AlertTriangle,
  History,
  TrendingUp,
  Cpu,
  Layers,
  Sparkles,
  BarChart3,
  Scale,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { useAuth } from '@/contexts/AuthContext'
import { tmsService } from '@/services/tmsService'

export const SelectionGovernanceAndLoopPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'templates' | 'loop' | 'audits' | 'appeals'>('loop')
  const [templates, setTemplates] = useState<any[]>([])
  const [decisionAudits, setDecisionAudits] = useState<any[]>([])
  const [appeals, setAppeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Edição de Template
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState<any>({
    name: '',
    operation_type: 'NORMAL',
    model_version: 'Modelo Seleção v1.1',
    weight_operational_compatibility_pct: 20,
    weight_historical_performance_pct: 15,
    weight_route_experience_pct: 10,
    weight_customer_experience_pct: 10,
    weight_location_availability_pct: 10,
    weight_expected_cost_pct: 20,
    weight_punctuality_pct: 5,
    weight_occurrences_pct: 5,
    weight_fred_collaboration_pct: 5,
    expected_impact_notes: '',
  })

  // Julgamento de Contestação
  const [selectedAppeal, setSelectedAppeal] = useState<any | null>(null)
  const [appealReviewModalOpen, setAppealReviewModalOpen] = useState(false)
  const [appealDecisionStatus, setAppealDecisionStatus] = useState<string>(
    'DEFERIDA_SCORE_RESTAURADO',
  )
  const [appealDecisionNotes, setAppealDecisionNotes] = useState('')

  const loadAllData = useCallback(async () => {
    setLoading(true)
    try {
      const [tplList, auditList, appealList] = await Promise.all([
        tmsService.getSelectionCriteriaTemplates(),
        tmsService.getSelectionDecisionAudits(),
        tmsService.getDriverPerformanceAppeals(),
      ])
      setTemplates(tplList)
      setDecisionAudits(auditList)
      setAppeals(appealList)
      if (tplList.length > 0 && !selectedTemplate) {
        setSelectedTemplate(tplList[0])
      }
    } catch (err) {
      console.error('Erro ao carregar governança de seleção:', err)
      toast({
        title: 'Erro de Carregamento',
        description: 'Não foi possível carregar os templates e auditorias.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast, selectedTemplate])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Soma dos Pesos
  const totalWeightSum =
    Number(editForm.weight_operational_compatibility_pct || 0) +
    Number(editForm.weight_historical_performance_pct || 0) +
    Number(editForm.weight_route_experience_pct || 0) +
    Number(editForm.weight_customer_experience_pct || 0) +
    Number(editForm.weight_location_availability_pct || 0) +
    Number(editForm.weight_expected_cost_pct || 0) +
    Number(editForm.weight_punctuality_pct || 0) +
    Number(editForm.weight_occurrences_pct || 0) +
    Number(editForm.weight_fred_collaboration_pct || 0)

  const handleOpenEdit = (tpl: any) => {
    setSelectedTemplate(tpl)
    setEditForm({
      name: tpl.name,
      operation_type: tpl.operation_type || 'NORMAL',
      model_version: tpl.model_version || 'Modelo Seleção v1.0',
      weight_operational_compatibility_pct: tpl.weight_operational_compatibility_pct ?? 20,
      weight_historical_performance_pct: tpl.weight_historical_performance_pct ?? 15,
      weight_route_experience_pct: tpl.weight_route_experience_pct ?? 10,
      weight_customer_experience_pct: tpl.weight_customer_experience_pct ?? 10,
      weight_location_availability_pct: tpl.weight_location_availability_pct ?? 10,
      weight_expected_cost_pct: tpl.weight_expected_cost_pct ?? 20,
      weight_punctuality_pct: tpl.weight_punctuality_pct ?? 5,
      weight_occurrences_pct: tpl.weight_occurrences_pct ?? 5,
      weight_fred_collaboration_pct: tpl.weight_fred_collaboration_pct ?? 5,
      expected_impact_notes: tpl.expected_impact_notes || '',
    })
    setEditModalOpen(true)
  }

  const handleSaveTemplate = async () => {
    if (totalWeightSum !== 100) {
      toast({
        title: 'A soma dos pesos deve ser exatamente 100%',
        description: `Soma atual: ${totalWeightSum}%. Ajuste os percentuais.`,
        variant: 'destructive',
      })
      return
    }

    try {
      await tmsService.saveSelectionCriteriaTemplate(selectedTemplate?.id || null, {
        ...editForm,
        responsible_user_email: user?.email || 'gestor@ciafal.com.br',
        responsible_user_name: user?.name || 'Gestor Logístico',
        effective_date_start: new Date().toISOString().split('T')[0],
      })

      toast({
        title: 'Template Salvo com Sucesso!',
        description: 'Pesos parametrizáveis atualizados e versionados.',
        className: 'bg-emerald-600 text-white',
      })
      setEditModalOpen(false)
      await loadAllData()
    } catch (err: any) {
      toast({
        title: 'Erro ao Salvar Template',
        description: err?.message,
        variant: 'destructive',
      })
    }
  }

  const handleReviewAppeal = async () => {
    if (!selectedAppeal) return
    try {
      await tmsService.updateDriverPerformanceAppeal(selectedAppeal.id, {
        status: appealDecisionStatus,
        human_decision_notes: appealDecisionNotes || 'Análise concluída pelo gestor logístico.',
        human_reviewer_email: user?.email || 'gestor@ciafal.com.br',
        human_reviewer_name: user?.name || 'Gestor de Logística',
        decision_timestamp: new Date().toISOString(),
        score_impact_reverted: appealDecisionStatus === 'DEFERIDA_SCORE_RESTAURADO' ? 4 : 0,
        notified_driver_fred_status: true,
      })

      toast({
        title: 'Contestação Julgada com Sucesso!',
        description: 'Decisão registrada e motorista notificado via Fred IA.',
        className: 'bg-emerald-700 text-white',
      })
      setAppealReviewModalOpen(false)
      await loadAllData()
    } catch (err: any) {
      toast({
        title: 'Erro ao Julgar Contestação',
        description: err?.message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <Cpu className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Ciclo de Inteligência Logística & Governança de Seleção
            </h1>
            <Badge className="bg-[#005596] text-white text-xs font-bold px-2.5 py-0.5">
              Feedback Loop 360°
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Governança da fórmula de seleção multicritério, auditoria de decisões com override e
            ciclo fechado: Planejamento → Negociação → Execução → Performance → Resultado →
            Aprendizado.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadAllData}
          className="text-xs border-slate-300 gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Atualizar Dados
        </Button>
      </div>

      {/* TABS */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="loop" className="gap-1.5 text-xs font-bold">
            <Layers className="w-4 h-4 text-[#005596]" />
            Ciclo de Inteligência (Dashboard)
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs font-bold">
            <Sliders className="w-4 h-4 text-purple-600" />
            Critérios & Templates Parametrizáveis ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="audits" className="gap-1.5 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Auditoria de Decisões & Overrides ({decisionAudits.length})
          </TabsTrigger>
          <TabsTrigger value="appeals" className="gap-1.5 text-xs font-bold">
            <Scale className="w-4 h-4 text-amber-600" />
            Contestações de Motoristas ({appeals.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. CICLO DE INTELIGÊNCIA LOGÍSTICA DASHBOARD */}
        <TabsContent value="loop" className="space-y-4 mt-4">
          {/* 7 Etapas do Ciclo */}
          <Card className="border-slate-200 bg-white shadow-sm p-4 space-y-3">
            <CardTitle className="text-xs font-bold uppercase text-slate-700">
              Fluxo Contínuo do Feedback Loop CIAFAL
            </CardTitle>
            <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200">
                <strong className="block text-[#005596]">1. Planejamento</strong>
                <span className="text-[10px] text-slate-500">Cargas & Janelas</span>
              </div>
              <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200">
                <strong className="block text-[#005596]">2. Seleção / Carlão</strong>
                <span className="text-[10px] text-slate-500">Score Adequação</span>
              </div>
              <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200">
                <strong className="block text-[#005596]">3. Negociação</strong>
                <span className="text-[10px] text-slate-500">Custo Total Esperado</span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <strong className="block text-emerald-800">4. Execução / Fred</strong>
                <span className="text-[10px] text-slate-500">Rastreio & Ocorrências</span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <strong className="block text-emerald-800">5. Performance</strong>
                <span className="text-[10px] text-slate-500">Score 7 Dimensões</span>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200">
                <strong className="block text-purple-800">6. Resultado Real</strong>
                <span className="text-[10px] text-slate-500">Margem & Custos</span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 col-span-2 sm:col-span-1">
                <strong className="block text-amber-800">7. Aprendizado</strong>
                <span className="text-[10px] text-slate-500">Nova Seleção IA</span>
              </div>
            </div>
          </Card>

          {/* Cards de Métricas Centrais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <Card className="bg-white border-slate-200 shadow-sm p-4">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">
                Decisões com Score
              </span>
              <div className="text-2xl font-black text-[#005596] mt-0.5">100%</div>
              <span className="text-[10px] text-slate-500">Todas auditadas e explicáveis</span>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm p-4">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">
                Custo Evitado (Estimado)
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-0.5">R$ 18.420</div>
              <span className="text-[10px] text-slate-500">vs Menor frete com risco alto</span>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm p-4">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">
                Custo Médio / Tonelada
              </span>
              <div className="text-2xl font-black text-slate-800 mt-0.5">R$ 104,20 / t</div>
              <span className="text-[10px] text-slate-500">Frete + Pedágio + Ocorrências</span>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm p-4">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">
                Redução de Ocorrências
              </span>
              <div className="text-2xl font-black text-purple-700 mt-0.5">−34%</div>
              <span className="text-[10px] text-slate-500">Após seleção inteligente</span>
            </Card>
          </div>

          {/* Matriz Custo x Qualidade (4 Quadrantes) */}
          <Card className="bg-white border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <CardTitle className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#005596]" />
                  Matriz Custo Total / t × Score de Qualidade (4 Quadrantes Analíticos)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Apoio à decisão estratégica: nunca bloqueio automático.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                Governança Ativa
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-300 space-y-1">
                <div className="flex items-center justify-between font-extrabold text-emerald-950">
                  <span>Q1: Alta Performance + Baixo Custo</span>
                  <Badge className="bg-emerald-700 text-white text-[10px]">
                    Parceiros Estratégicos
                  </Badge>
                </div>
                <p className="text-slate-700 text-[11px]">
                  Motoristas com score &gt; 85 e custo/t competitivo. Prioridade absoluta na Onda 1
                  de leilão do Carlão.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-300 space-y-1">
                <div className="flex items-center justify-between font-extrabold text-sky-950">
                  <span>Q2: Alta Performance + Custo Elevado</span>
                  <Badge className="bg-[#005596] text-white text-[10px]">Avaliar Negociação</Badge>
                </div>
                <p className="text-slate-700 text-[11px]">
                  Excelente pontualidade e zero avarias. Carlão atua com contrapropostas cordiais
                  para viabilizar margem.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-300 space-y-1">
                <div className="flex items-center justify-between font-extrabold text-amber-950">
                  <span>Q3: Baixa Performance + Baixo Frete</span>
                  <Badge className="bg-amber-600 text-white text-[10px]">Custo Oculto Alto</Badge>
                </div>
                <p className="text-slate-700 text-[11px]">
                  Apresenta frete nominal atraente, porém histórico com esperas e reentregas
                  encarece o custo total final.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-300 space-y-1">
                <div className="flex items-center justify-between font-extrabold text-rose-950">
                  <span>Q4: Baixa Performance + Custo Alto</span>
                  <Badge className="bg-rose-600 text-white text-[10px]">Baixa Atratividade</Badge>
                </div>
                <p className="text-slate-700 text-[11px]">
                  Requer plano de desenvolvimento com Fred IA e capacitação antes de novas rodadas
                  prioritárias.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 2. TEMPLATES & PESOS PARAMETRIZÁVEIS */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tpl) => (
              <Card
                key={tpl.id}
                className="border-slate-200 bg-white shadow-sm hover:shadow transition"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-[#005596] text-white text-xs font-mono">
                      {tpl.template_code}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {tpl.model_version}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 mt-1">
                    {tpl.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    {tpl.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3 text-xs">
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-2.5 rounded-lg border text-[11px]">
                    <div>
                      Compat: <strong>{tpl.weight_operational_compatibility_pct}%</strong>
                    </div>
                    <div>
                      Perf Hist: <strong>{tpl.weight_historical_performance_pct}%</strong>
                    </div>
                    <div>
                      Exp Rota: <strong>{tpl.weight_route_experience_pct}%</strong>
                    </div>
                    <div>
                      Exp Cliente: <strong>{tpl.weight_customer_experience_pct}%</strong>
                    </div>
                    <div>
                      Localização: <strong>{tpl.weight_location_availability_pct}%</strong>
                    </div>
                    <div>
                      Custo: <strong>{tpl.weight_expected_cost_pct}%</strong>
                    </div>
                    <div>
                      Pontual: <strong>{tpl.weight_punctuality_pct}%</strong>
                    </div>
                    <div>
                      Ocorrências: <strong>{tpl.weight_occurrences_pct}%</strong>
                    </div>
                    <div>
                      Fred Colab: <strong>{tpl.weight_fred_collaboration_pct}%</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-[10px] text-slate-400">
                      Responsável: {tpl.responsible_user_name || 'Gestor'}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleOpenEdit(tpl)}
                      className="bg-[#005596] text-white text-xs font-bold"
                    >
                      Editar Pesos & Fórmula
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 3. AUDITORIA DE DECISÕES */}
        <TabsContent value="audits" className="space-y-4 mt-4">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="p-4 border-b bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase text-slate-800">
                Trilha de Auditoria de Decisões de Contratação (Mesa de Fretes)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Registro imutável de quem decidiu, candidatos disponíveis, scores e justificativas
                de override.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
                  <tr>
                    <th className="p-2.5">ID Carga</th>
                    <th className="p-2.5">Motorista Escolhido</th>
                    <th className="p-2.5 text-right">Score</th>
                    <th className="p-2.5">Top Recomendado IA</th>
                    <th className="p-2.5">Houve Override?</th>
                    <th className="p-2.5">Motivo / Justificativa</th>
                    <th className="p-2.5">Decidido Por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {decisionAudits.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-400">
                        Nenhuma decisão auditada registrada até o momento.
                      </td>
                    </tr>
                  ) : (
                    decisionAudits.map((a, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono font-bold text-slate-900">{a.cargo_id}</td>
                        <td className="p-2.5 font-bold text-slate-800">{a.selected_driver_name}</td>
                        <td className="p-2.5 text-right font-black text-[#005596]">
                          {a.selected_driver_score}/100
                        </td>
                        <td className="p-2.5 text-slate-700">
                          {a.ai_top_recommended_driver_name || '---'}
                        </td>
                        <td className="p-2.5">
                          {a.is_human_override ? (
                            <Badge className="bg-amber-600 text-white text-[9px]">
                              OVERRIDE HUMANO
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-600 text-white text-[9px]">
                              SELEÇÃO IA
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-600 max-w-xs truncate">
                          {a.override_justification_text ||
                            a.override_reason_category ||
                            'Critério padrão'}
                        </td>
                        <td className="p-2.5 text-slate-500">
                          {a.decided_by_user_name || 'Gestor'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. CONTESTAÇÕES DE MOTORISTAS */}
        <TabsContent value="appeals" className="space-y-4 mt-4">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold uppercase text-slate-800">
                  Contestações & Pedidos de Revisão Humana (Direito do Motorista)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Solicitações enviadas pelo Fred IA aguardando decisão humana do gestor logístico.
                </CardDescription>
              </div>
              <Badge className="bg-amber-600 text-white text-xs">
                {appeals.length} solicitações
              </Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
                  <tr>
                    <th className="p-2.5">Motorista</th>
                    <th className="p-2.5">Transporte SAP</th>
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5">Justificativa do Motorista</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {appeals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400">
                        Nenhuma contestação pendente.
                      </td>
                    </tr>
                  ) : (
                    appeals.map((app, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">{app.driver_name}</td>
                        <td className="p-2.5 font-mono">{app.sap_transport_number || '---'}</td>
                        <td className="p-2.5 font-semibold text-slate-700">{app.appeal_type}</td>
                        <td className="p-2.5 text-slate-600 max-w-sm">{app.reason_text}</td>
                        <td className="p-2.5">
                          <Badge
                            className={`text-[9px] ${
                              app.status === 'DEFERIDA_SCORE_RESTAURADO'
                                ? 'bg-emerald-600'
                                : app.status === 'SOLICITADA'
                                  ? 'bg-amber-500'
                                  : 'bg-slate-600'
                            } text-white`}
                          >
                            {app.status}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-right">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedAppeal(app)
                              setAppealReviewModalOpen(true)
                            }}
                            className="bg-[#005596] text-white text-xs h-7"
                          >
                            Julgar Revisão
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL EDIÇÃO DE TEMPLATE */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#005596]" />
              Editar Pesos do Template de Seleção
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              A soma dos 9 critérios deve resultar exatamente em 100%. Versionamento:{' '}
              {editForm.model_version}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700">Nome do Template:</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Versão da Fórmula:</label>
                <Input
                  value={editForm.model_version}
                  onChange={(e) => setEditForm({ ...editForm, model_version: e.target.value })}
                  className="text-xs mt-1"
                />
              </div>
            </div>

            {/* 9 Critérios */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center font-bold text-slate-800">
                <span>Distribuição dos Pesos Parametrizáveis:</span>
                <Badge
                  className={
                    totalWeightSum === 100 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }
                >
                  Soma: {totalWeightSum}% / 100%
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="text-[11px] text-slate-600">Compatibilidade (%)</label>
                  <Input
                    type="number"
                    value={editForm.weight_operational_compatibility_pct}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        weight_operational_compatibility_pct: Number(e.target.value),
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600">Performance Hist. (%)</label>
                  <Input
                    type="number"
                    value={editForm.weight_historical_performance_pct}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        weight_historical_performance_pct: Number(e.target.value),
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600">Exp. Rota (%)</label>
                  <Input
                    type="number"
                    value={editForm.weight_route_experience_pct}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        weight_route_experience_pct: Number(e.target.value),
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600">Exp. Cliente (%)</label>
                  <Input
                    type="number"
                    value={editForm.weight_customer_experience_pct}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        weight_customer_experience_pct: Number(e.target.value),
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600">Localização (%)</label>
                  <Input
                    type="number"
                    value={editForm.weight_location_availability_pct}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        weight_location_availability_pct: Number(e.target.value),
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600">Custo Previsto (%)</label>
                  <Input
                    type="number"
                    value={editForm.weight_expected_cost_pct}
                    onChange={(e) =>
                      setEditForm({ ...editForm, weight_expected_cost_pct: Number(e.target.value) })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600">Pontualidade (%)</label>
                  <Input
                    type="number"
                    value={editForm.weight_punctuality_pct}
                    onChange={(e) =>
                      setEditForm({ ...editForm, weight_punctuality_pct: Number(e.target.value) })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600">Ocorrências (%)</label>
                  <Input
                    type="number"
                    value={editForm.weight_occurrences_pct}
                    onChange={(e) =>
                      setEditForm({ ...editForm, weight_occurrences_pct: Number(e.target.value) })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600">Colab. Fred (%)</label>
                  <Input
                    type="number"
                    value={editForm.weight_fred_collaboration_pct}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        weight_fred_collaboration_pct: Number(e.target.value),
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700">
                Impacto Esperado / Justificativa da Alteração:
              </label>
              <Textarea
                value={editForm.expected_impact_notes}
                onChange={(e) =>
                  setEditForm({ ...editForm, expected_impact_notes: e.target.value })
                }
                placeholder="Ex: Aumento do peso de pontualidade para mitigar atrasos em clientes Classe A..."
                className="text-xs h-16 mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveTemplate}
              className="bg-[#005596] hover:bg-[#004275] text-white font-bold"
            >
              Salvar Nova Versão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL JULGAMENTO DE CONTESTAÇÃO */}
      <Dialog open={appealReviewModalOpen} onOpenChange={setAppealReviewModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-600" />
              Julgamento Humano de Contestação
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Motorista: {selectedAppeal?.driver_name} • SAP {selectedAppeal?.sap_transport_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <strong className="text-slate-800 block">Justificativa do Motorista:</strong>
              <p className="text-slate-600 mt-0.5">{selectedAppeal?.reason_text}</p>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Decisão do Gestor Logístico:</label>
              <select
                value={appealDecisionStatus}
                onChange={(e) => setAppealDecisionStatus(e.target.value)}
                className="w-full p-2 border rounded-md text-xs bg-white font-semibold"
              >
                <option value="DEFERIDA_SCORE_RESTAURADO">
                  Deferida (Score e Histórico Restaurados)
                </option>
                <option value="AJUSTADA_PARCIALMENTE">Ajustada Parcialmente</option>
                <option value="INDEFERIDA">Indeferida (Manter Ocorrência)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Parecer Conclusivo:</label>
              <Textarea
                value={appealDecisionNotes}
                onChange={(e) => setAppealDecisionNotes(e.target.value)}
                placeholder="Parecer registrado na trilha de auditoria..."
                className="text-xs h-20"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setAppealReviewModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleReviewAppeal}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
            >
              Gravar Decisão Conclusiva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default SelectionGovernanceAndLoopPage
