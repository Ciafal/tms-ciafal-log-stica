import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { KpiRowData, KpiMonthCell } from '@/domain/tmsIndicatorsEngine'
import {
  TmsDeviationTreatment,
  TreatmentStep,
  TreatmentStatus,
  DeviationHypothesis,
  FiveWhysData,
  FiveWhysStep,
  IshikawaCauseItem,
  IshikawaCategory,
  ValidatedRootCause,
  Action5W2H,
  TrackingUpdateEntry,
  EffectivenessOutcome,
  generateAutomaticDeviationDescription,
  generateAiKpiInvestigation,
  formatAbntNumber,
  formatAbntDate,
  formatAbntPercent,
} from '@/domain/tmsDeviationTreatmentEngine'
import { tmsIndicatorsService, UserSelectItem } from '@/services/tmsIndicatorsService'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  HelpCircle,
  GitBranch,
  Target,
  ListTodo,
  TrendingUp,
  Activity,
  User,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  ArrowRight,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
} from 'lucide-react'

interface KpiDeviationTreatmentWorkflowModalProps {
  isOpen: boolean
  onClose: () => void
  kpi: KpiRowData | null
  monthCell: KpiMonthCell | null
  initialGraphicSummary?: string
  existingTreatment?: TmsDeviationTreatment | null
  onSuccessSave?: () => void
}

export const KpiDeviationTreatmentWorkflowModal: React.FC<
  KpiDeviationTreatmentWorkflowModalProps
> = ({
  isOpen,
  onClose,
  kpi,
  monthCell,
  initialGraphicSummary,
  existingTreatment,
  onSuccessSave,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [activeStep, setActiveStep] = useState<TreatmentStep>(1)
  const [usersList, setUsersList] = useState<UserSelectItem[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const [newUpdateComment, setNewUpdateComment] = useState('')

  // Estado completo do tratamento (8 etapas)
  const [treatment, setTreatment] = useState<TmsDeviationTreatment>(() => {
    return buildInitialTreatment(kpi, monthCell, user, initialGraphicSummary, existingTreatment)
  })

  // Carrega lista de usuários reais do HUB
  useEffect(() => {
    tmsIndicatorsService.fetchActiveUsers().then((usrs) => {
      setUsersList(usrs)
    })
  }, [])

  // Inicializa estado quando abre modal ou seleciona outro KPI/Mês
  useEffect(() => {
    if (kpi && monthCell) {
      setTreatment(
        buildInitialTreatment(kpi, monthCell, user, initialGraphicSummary, existingTreatment),
      )
      if (existingTreatment?.current_step) {
        setActiveStep(existingTreatment.current_step)
      } else {
        setActiveStep(1)
      }
    }
  }, [kpi, monthCell, user, initialGraphicSummary, existingTreatment])

  if (!kpi || !monthCell) return null

  // -----------------------------------------------------------
  // GERAÇÃO DE ANÁLISE COM IA (DADOS REAIS, FATO, HIPÓTESES, EVIDÊNCIAS, RECOMENDAÇÃO)
  // -----------------------------------------------------------
  const handleGenerateAiAnalysis = () => {
    setIsAiGenerating(true)
    setTimeout(() => {
      const records = monthCell.drillDownRecords || []
      const aiRes = generateAiKpiInvestigation(kpi, monthCell, records)

      setTreatment((prev) => {
        // Popula Etapa 1
        const updatedAiJson = {
          identifiedFact: aiRes.identifiedFact,
          hypotheses: aiRes.hypotheses,
          necessaryEvidences: aiRes.necessaryEvidences,
          recommendations: aiRes.recommendations,
        }

        // Sugere hipóteses na Etapa 2 sem substituir as manuais existentes
        const newHypotheses: DeviationHypothesis[] = aiRes.hypotheses.map((hyp, i) => ({
          id: `hyp-ai-${Date.now()}-${i}`,
          statement: hyp,
          evidence: aiRes.necessaryEvidences[i] || 'Evidência a verificar com operação',
          dataSourceUsed: kpi.dataSource,
          notes: 'Hipótese preliminar gerada pela IA — requer validação humana.',
          responsibleName: prev.responsible_analyst_name,
          status: 'EM_ANALISE',
          isAiSuggested: true,
          createdAt: new Date().toISOString(),
        }))

        // Sugere causas no Ishikawa (Etapa 4)
        const ishikawaSuggestions: IshikawaCauseItem[] = [
          {
            id: `ish-ai-${Date.now()}-1`,
            category: 'METODO',
            cause: 'Sequenciamento de saída ou conferência no faturamento SAP',
            evidence: 'Espelho de ordens de remessa e notas fiscais',
            relevance: 'ALTA',
            isPotentialRootCause: false,
            isAiSuggested: true,
          },
          {
            id: `ish-ai-${Date.now()}-2`,
            category: 'MAO_DE_OBRA',
            cause: 'Equipe de amarração/carregamento reduzida em picos de demanda',
            evidence: 'Horários de apontamento de pátio',
            relevance: 'MEDIA',
            isPotentialRootCause: false,
            isAiSuggested: true,
          },
          {
            id: `ish-ai-${Date.now()}-3`,
            category: 'MAQUINA',
            cause: 'Disponibilidade de pontes rolantes ou empilhadeiras no setor WSTL',
            evidence: 'Telemetria de docas e manutenção',
            relevance: 'MEDIA',
            isPotentialRootCause: false,
            isAiSuggested: true,
          },
        ]

        return {
          ...prev,
          ai_initial_analysis: aiRes.aiText,
          ai_analysis_json: updatedAiJson,
          hypotheses_json: prev.hypotheses_json.length > 0 ? prev.hypotheses_json : newHypotheses,
          ishikawa_json: prev.ishikawa_json.length > 0 ? prev.ishikawa_json : ishikawaSuggestions,
        }
      })

      setIsAiGenerating(false)
      toast({
        title: 'Análise de IA Gerada com Sucesso',
        description:
          'Fatos, hipóteses e sugestões populados com base nos dados reais do indicador.',
      })
    }, 400)
  }

  // -----------------------------------------------------------
  // SALVAR COM AUDITORIA (SEM DEIXAR TELA TRAVADA)
  // -----------------------------------------------------------
  const handleSaveTreatment = async (advanceNext = false) => {
    setIsSaving(true)
    try {
      const nextStep =
        advanceNext && activeStep < 8 ? ((activeStep + 1) as TreatmentStep) : activeStep
      const payload: Partial<TmsDeviationTreatment> = {
        ...treatment,
        current_step: nextStep,
        status: computeTreatmentStatus(treatment, nextStep),
      }

      const saved = await tmsIndicatorsService.saveDeviationTreatment(
        payload,
        user?.email || 'sistema@ciafal.com.br',
        'TREATMENT_WORKFLOW_SAVE',
      )

      setTreatment(saved)
      if (advanceNext && activeStep < 8) {
        setActiveStep(nextStep)
      }

      toast({
        title: 'Informações salvas com sucesso.',
        description: `Tratamento ${saved.treatment_code} registrado com governança e trilha de auditoria.`,
      })

      if (onSuccessSave) {
        onSuccessSave()
      }
    } catch (err: any) {
      console.error('[KpiDeviationTreatmentWorkflowModal] Erro ao salvar:', err)
      toast({
        variant: 'destructive',
        title: 'Não foi possível salvar',
        description: err?.message || 'Falha de comunicação ou permissão.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // -----------------------------------------------------------
  // MANIPULADORES DE ETAPAS ESPECÍFICAS
  // -----------------------------------------------------------
  // Etapa 2: Hipóteses
  const handleAddHypothesis = () => {
    const newHyp: DeviationHypothesis = {
      id: `hyp-${Date.now()}`,
      statement: '',
      evidence: '',
      dataSourceUsed: kpi.dataSource,
      notes: '',
      responsibleName: treatment.responsible_analyst_name,
      status: 'EM_ANALISE',
      createdAt: new Date().toISOString(),
    }
    setTreatment((prev) => ({
      ...prev,
      hypotheses_json: [...prev.hypotheses_json, newHyp],
    }))
  }

  const handleUpdateHypothesis = (id: string, updates: Partial<DeviationHypothesis>) => {
    setTreatment((prev) => ({
      ...prev,
      hypotheses_json: prev.hypotheses_json.map((h) => (h.id === id ? { ...h, ...updates } : h)),
    }))
  }

  const handleDeleteHypothesis = (id: string) => {
    setTreatment((prev) => ({
      ...prev,
      hypotheses_json: prev.hypotheses_json.filter((h) => h.id !== id),
    }))
  }

  // Etapa 3: 5 Porquês
  const handleAddWhyLevel = () => {
    const currentWhys = treatment.five_whys_json.whys || []
    const nextLevel = currentWhys.length + 1
    const newWhy: FiveWhysStep = {
      level: nextLevel,
      question: `Por quê nível ${nextLevel}?`,
      answer: '',
    }
    setTreatment((prev) => ({
      ...prev,
      five_whys_json: {
        ...prev.five_whys_json,
        whys: [...currentWhys, newWhy],
      },
    }))
  }

  const handleUpdateWhy = (level: number, answer: string) => {
    setTreatment((prev) => ({
      ...prev,
      five_whys_json: {
        ...prev.five_whys_json,
        whys: prev.five_whys_json.whys.map((w) => (w.level === level ? { ...w, answer } : w)),
      },
    }))
  }

  // Etapa 4: Ishikawa 6M
  const handleAddIshikawaItem = (cat: IshikawaCategory) => {
    const newItem: IshikawaCauseItem = {
      id: `ish-${Date.now()}`,
      category: cat,
      cause: '',
      evidence: '',
      relevance: 'ALTA',
      isPotentialRootCause: false,
    }
    setTreatment((prev) => ({
      ...prev,
      ishikawa_json: [...prev.ishikawa_json, newItem],
    }))
  }

  const handleUpdateIshikawa = (id: string, updates: Partial<IshikawaCauseItem>) => {
    setTreatment((prev) => ({
      ...prev,
      ishikawa_json: prev.ishikawa_json.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    }))
  }

  const handleDeleteIshikawa = (id: string) => {
    setTreatment((prev) => ({
      ...prev,
      ishikawa_json: prev.ishikawa_json.filter((item) => item.id !== id),
    }))
  }

  // Etapa 5: Causa Raiz
  const handleAddRootCause = () => {
    const newCause: ValidatedRootCause = {
      id: `rc-${Date.now()}`,
      description: '',
      evidence: '',
      methodUsed: '5_WHYS',
      validatorName: treatment.area_supervisor_name || treatment.responsible_analyst_name,
      validatorEmail: treatment.area_supervisor_email || treatment.responsible_analyst_email,
      validationDate: new Date().toISOString().split('T')[0],
      impactDescription: `Impacto apurado no indicador ${kpi.name}`,
    }
    setTreatment((prev) => ({
      ...prev,
      root_causes_json: [...prev.root_causes_json, newCause],
      root_cause_validated: true,
    }))
  }

  const handleUpdateRootCause = (id: string, updates: Partial<ValidatedRootCause>) => {
    setTreatment((prev) => ({
      ...prev,
      root_causes_json: prev.root_causes_json.map((rc) =>
        rc.id === id ? { ...rc, ...updates } : rc,
      ),
    }))
  }

  const handleDeleteRootCause = (id: string) => {
    setTreatment((prev) => {
      const remaining = prev.root_causes_json.filter((rc) => rc.id !== id)
      return {
        ...prev,
        root_causes_json: remaining,
        root_cause_validated: remaining.length > 0,
      }
    })
  }

  // Etapa 6: 5W2H
  const handleAdd5W2HAction = () => {
    const currentActions = treatment.actions_5w2h_json || []
    const newAction: Action5W2H = {
      id: `act5w2h-${Date.now()}`,
      actionNumber: currentActions.length + 1,
      what: '',
      why: 'Eliminar a causa raiz identificada e restabelecer a meta do indicador',
      where: kpi.category === 'EXPEDICAO' ? 'Pátio & Docas CIAFAL' : 'Rotas & Transporte TMS',
      whenDeadline: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      who: treatment.responsible_analyst_name,
      how: 'Procedimento operacional padronizado e alinhamento com a equipe',
      howMuch: 'Recursos operacionais internos (Sem custo adicional)',
      priority: 'ALTA',
      status: 'NAO_INICIADA',
      progressPct: 0,
      createdDate: new Date().toISOString().split('T')[0],
      targetModule: 'TMS',
    }
    setTreatment((prev) => ({
      ...prev,
      actions_5w2h_json: [...currentActions, newAction],
    }))
  }

  const handleUpdate5W2HAction = (id: string, updates: Partial<Action5W2H>) => {
    setTreatment((prev) => ({
      ...prev,
      actions_5w2h_json: prev.actions_5w2h_json.map((act) =>
        act.id === id ? { ...act, ...updates } : act,
      ),
    }))
  }

  const handleDelete5W2HAction = (id: string) => {
    setTreatment((prev) => ({
      ...prev,
      actions_5w2h_json: prev.actions_5w2h_json.filter((act) => act.id !== id),
    }))
  }

  // Etapa 7: Acompanhamento
  const handleAddTrackingComment = () => {
    if (!newUpdateComment.trim()) return
    const entry: TrackingUpdateEntry = {
      id: `trk-${Date.now()}`,
      date: new Date().toISOString(),
      authorName: user?.name || 'Analista Operacional',
      authorEmail: user?.email || 'analista@ciafal.com.br',
      comment: newUpdateComment.trim(),
      progressSnapshotPct: calculateOverallPlanProgress(treatment.actions_5w2h_json),
    }
    setTreatment((prev) => ({
      ...prev,
      tracking_updates_json: [entry, ...prev.tracking_updates_json],
    }))
    setNewUpdateComment('')
    toast({
      title: 'Atualização de Acompanhamento Registrada',
      description: 'Histórico preservado com data e autoria para governança.',
    })
  }

  const overallProgress = calculateOverallPlanProgress(treatment.actions_5w2h_json)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 bg-background">
        {/* CABEÇALHO DO WORKFLOW CONFORME ESPECIFICADO:
            Código do indicador, nome, empresa, período analisado, meta vigente, resultado realizado, desvio absoluto, desvio percentual, tendência recente, status.
            Exemplo do usuário: "Indicador: Aderência à Programação | Período: Setembro/2026 | Meta: 95,0 % | Realizado: 89,4 % | Desvio: -5,6 p.p. | Tendência: Queda"
        */}
        <DialogHeader className="border-b pb-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-[#005596] text-white text-[11px] font-bold px-2 py-0.5">
                  HUB CIAFAL
                </Badge>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                  {treatment.treatment_code}
                </span>
                <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  Tratamento de Desvios & Análise de Causa (Padrão PCP Robotizado)
                </DialogTitle>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateAiAnalysis}
                  disabled={isAiGenerating}
                  className="text-xs border-sky-400 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                >
                  <Sparkles
                    className={`w-3.5 h-3.5 mr-1.5 text-sky-600 ${isAiGenerating ? 'animate-spin' : ''}`}
                  />
                  {isAiGenerating ? 'Consultando IA...' : '✨ Gerar Análise com IA'}
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleSaveTreatment(false)}
                  disabled={isSaving}
                  className="text-xs bg-[#005596] hover:bg-[#004276] text-white font-semibold"
                >
                  <Save className={`w-3.5 h-3.5 mr-1.5 ${isSaving ? 'animate-spin' : ''}`} />
                  {isSaving ? 'Salvando...' : 'Salvar Informações'}
                </Button>
              </div>
            </div>

            {/* FAIXA CANÔNICA DO CABEÇALHO */}
            <div className="bg-muted/40 border border-border/80 rounded-lg p-2.5 text-xs flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-3 flex-wrap">
                <div>
                  <span className="text-muted-foreground">Indicador:</span>{' '}
                  <strong className="text-foreground">{kpi.name}</strong>
                </div>
                <span className="text-muted-foreground">•</span>
                <div>
                  <span className="text-muted-foreground">Período:</span>{' '}
                  <strong className="text-foreground">{treatment.period_ref}</strong>
                </div>
                <span className="text-muted-foreground">•</span>
                <div>
                  <span className="text-muted-foreground">Meta:</span>{' '}
                  <strong className="text-foreground">
                    {formatAbntNumber(treatment.target_value, 1)} {treatment.unit}
                  </strong>
                </div>
                <span className="text-muted-foreground">•</span>
                <div>
                  <span className="text-muted-foreground">Realizado:</span>{' '}
                  <strong className="text-foreground">
                    {formatAbntNumber(treatment.real_value, 1)} {treatment.unit}
                  </strong>
                </div>
                <span className="text-muted-foreground">•</span>
                <div>
                  <span className="text-muted-foreground">Desvio:</span>{' '}
                  <strong
                    className={treatment.deviation_abs > 0 ? 'text-rose-600' : 'text-emerald-600'}
                  >
                    {treatment.deviation_abs > 0
                      ? `+${formatAbntNumber(treatment.deviation_abs, 1)}`
                      : formatAbntNumber(treatment.deviation_abs, 1)}{' '}
                    {treatment.unit === '%' ? 'p.p.' : treatment.unit}
                  </strong>
                </div>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Tendência:</span>{' '}
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {treatment.trend_label}
                  </Badge>
                </div>
              </div>

              <div>
                <Badge
                  className={
                    treatment.status.startsWith('CONCLUIDO')
                      ? 'bg-emerald-600 text-white'
                      : treatment.status === 'EM_EXECUCAO'
                        ? 'bg-amber-600 text-white'
                        : 'bg-[#005596] text-white'
                  }
                >
                  Status: {treatment.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* NAVEGAÇÃO DAS 8 ETAPAS DO WORKFLOW SEM PERDA DE DADOS */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-2 border-b text-xs">
          {[
            { step: 1, label: '1. Identificação' },
            { step: 2, label: '2. Análise de Causa' },
            { step: 3, label: '3. 5 Porquês' },
            { step: 4, label: '4. Ishikawa 6M' },
            { step: 5, label: '5. Causa Raiz' },
            { step: 6, label: '6. Plano 5W2H' },
            { step: 7, label: '7. Acompanhamento' },
            { step: 8, label: '8. Eficácia' },
          ].map((item) => (
            <button
              key={item.step}
              type="button"
              onClick={() => setActiveStep(item.step as TreatmentStep)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                activeStep === item.step
                  ? 'bg-[#005596] text-white shadow-xs'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* CONTEÚDO DAS ETAPAS */}
        <div className="py-2 space-y-4">
          {/* ========================================================
              ETAPA 1: IDENTIFICAÇÃO & RESPONSABILIDADES
             ======================================================== */}
          {activeStep === 1 && (
            <div className="space-y-4">
              {/* Responsabilidades com Usuários Reais do HUB */}
              <div className="bg-card border rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#005596]" />
                  Matriz de Responsabilidades (Usuários Reais do HUB)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Responsável pela Análise */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Usuário Responsável pela Análise *
                    </label>
                    <Select
                      value={treatment.responsible_analyst_id}
                      onValueChange={(val) => {
                        const found = usersList.find((u) => u.id === val)
                        if (found) {
                          setTreatment((prev) => ({
                            ...prev,
                            responsible_analyst_id: found.id,
                            responsible_analyst_name: found.name,
                            responsible_analyst_email: found.email,
                          }))
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione o analista" />
                      </SelectTrigger>
                      <SelectContent>
                        {usersList.map((u) => (
                          <SelectItem key={u.id} value={u.id} className="text-xs">
                            {u.name} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Supervisor da Área */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Supervisor da Área
                    </label>
                    <Select
                      value={treatment.area_supervisor_id || ''}
                      onValueChange={(val) => {
                        const found = usersList.find((u) => u.id === val)
                        if (found) {
                          setTreatment((prev) => ({
                            ...prev,
                            area_supervisor_id: found.id,
                            area_supervisor_name: found.name,
                            area_supervisor_email: found.email,
                          }))
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione o supervisor" />
                      </SelectTrigger>
                      <SelectContent>
                        {usersList.map((u) => (
                          <SelectItem key={u.id} value={u.id} className="text-xs">
                            {u.name} ({u.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Aprovador do Plano */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Aprovador do Plano (Hierarquia/Gestão)
                    </label>
                    <Select
                      value={treatment.plan_approver_id || ''}
                      onValueChange={(val) => {
                        const found = usersList.find((u) => u.id === val)
                        if (found) {
                          setTreatment((prev) => ({
                            ...prev,
                            plan_approver_id: found.id,
                            plan_approver_name: found.name,
                            plan_approver_email: found.email,
                          }))
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione o aprovador" />
                      </SelectTrigger>
                      <SelectContent>
                        {usersList.map((u) => (
                          <SelectItem key={u.id} value={u.id} className="text-xs">
                            {u.name} ({u.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Descrição Automática do Desvio (Editável) */}
              <div className="bg-card border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Descrição Automática do Desvio (Texto Editável) *
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-sky-600"
                    onClick={() => {
                      const desc = generateAutomaticDeviationDescription(
                        kpi.name,
                        treatment.period_ref,
                        treatment.real_value,
                        treatment.target_value,
                        treatment.unit,
                      )
                      setTreatment((prev) => ({ ...prev, deviation_description: desc }))
                    }}
                  >
                    Restaurar Padrão Automático
                  </Button>
                </div>
                <Textarea
                  rows={3}
                  value={treatment.deviation_description}
                  onChange={(e) =>
                    setTreatment((prev) => ({ ...prev, deviation_description: e.target.value }))
                  }
                  className="text-xs leading-relaxed"
                />
              </div>

              {/* Análise Inicial da IA */}
              {treatment.ai_initial_analysis && (
                <div className="bg-sky-50/60 dark:bg-sky-950/30 border border-sky-300 dark:border-sky-800 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-bold">
                    <Sparkles className="w-4 h-4" />
                    <span>Análise Contextual Inicial com Inteligência Artificial</span>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-foreground/90 text-xs leading-relaxed bg-white/70 dark:bg-card/70 p-3 rounded-lg border">
                    {treatment.ai_initial_analysis}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              ETAPA 2: ANÁLISE DE CAUSA (HIPÓTESES, EVIDÊNCIAS, DADOS)
             ======================================================== */}
          {activeStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Hipóteses de Análise de Causa
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Registre hipóteses, evidências necessárias, dados utilizados e valide com a
                    operação.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleAddHypothesis}
                  className="text-xs bg-[#005596] hover:bg-[#004276] text-white"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Nova Hipótese
                </Button>
              </div>

              {treatment.hypotheses_json.length === 0 ? (
                <div className="bg-muted/30 border rounded-xl p-8 text-center text-xs text-muted-foreground space-y-2">
                  <p>Nenhuma hipótese cadastrada ainda.</p>
                  <p className="text-[11px]">
                    Clique em &quot;Nova Hipótese&quot; ou acione &quot;✨ Gerar Análise com
                    IA&quot; para sugestões preliminares com base no histórico.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {treatment.hypotheses_json.map((hyp, index) => (
                    <div
                      key={hyp.id}
                      className="bg-card border rounded-xl p-3.5 space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#005596]">
                            Hipótese #{index + 1}
                          </span>
                          {hyp.isAiSuggested && (
                            <Badge
                              variant="outline"
                              className="text-[9px] border-sky-400 text-sky-700 bg-sky-50"
                            >
                              Sugestão da IA — requer validação humana
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Select
                            value={hyp.status}
                            onValueChange={(val) =>
                              handleUpdateHypothesis(hyp.id, { status: val as any })
                            }
                          >
                            <SelectTrigger className="h-7 w-32 text-[11px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EM_ANALISE" className="text-xs">
                                Em análise
                              </SelectItem>
                              <SelectItem
                                value="CONFIRMADA"
                                className="text-xs font-semibold text-emerald-600"
                              >
                                Confirmada
                              </SelectItem>
                              <SelectItem
                                value="DESCARTADA"
                                className="text-xs font-semibold text-muted-foreground"
                              >
                                Descartada
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteHypothesis(hyp.id)}
                            className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-foreground">
                            Enunciado da Hipótese *
                          </label>
                          <Input
                            value={hyp.statement}
                            onChange={(e) =>
                              handleUpdateHypothesis(hyp.id, { statement: e.target.value })
                            }
                            placeholder="Descreva a hipótese operacional..."
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-foreground">
                            Evidência Necessária / Comprovação
                          </label>
                          <Input
                            value={hyp.evidence}
                            onChange={(e) =>
                              handleUpdateHypothesis(hyp.id, { evidence: e.target.value })
                            }
                            placeholder="Ex: Registro de pesagem, liberação fiscal..."
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-foreground">
                            Dados Utilizados
                          </label>
                          <Input
                            value={hyp.dataSourceUsed}
                            onChange={(e) =>
                              handleUpdateHypothesis(hyp.id, { dataSourceUsed: e.target.value })
                            }
                            className="h-8 text-xs font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-foreground">
                            Responsável pela Verificação
                          </label>
                          <Input
                            value={hyp.responsibleName}
                            onChange={(e) =>
                              handleUpdateHypothesis(hyp.id, { responsibleName: e.target.value })
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              ETAPA 3: 5 PORQUÊS
             ======================================================== */}
          {activeStep === 3 && (
            <div className="space-y-4">
              <div className="bg-card border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <GitBranch className="w-4 h-4 text-[#005596]" />
                      Método dos 5 Porquês (Cadeia de Causa e Efeito)
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Estrutura sequencial: Problema → Por quê 1..5 → Causa Raiz. Não é obrigatório
                      atingir exatamente 5 níveis caso a causa já esteja demonstrada.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddWhyLevel}
                    className="text-xs border-[#005596] text-[#005596]"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Adicionar Nível de Por Quê
                  </Button>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1 bg-muted/30 p-3 rounded-lg border">
                    <label className="text-[11px] font-bold text-foreground uppercase">
                      Problema Declarado
                    </label>
                    <p className="text-xs font-semibold text-foreground">
                      {treatment.five_whys_json.problemStatement || treatment.deviation_description}
                    </p>
                  </div>

                  {treatment.five_whys_json.whys.map((why) => (
                    <div
                      key={why.level}
                      className="flex items-start gap-3 bg-card p-3 rounded-lg border"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#005596]/10 text-[#005596] font-bold text-xs flex items-center justify-center shrink-0">
                        P{why.level}
                      </div>
                      <div className="flex-1 space-y-1">
                        <span className="text-[11px] font-semibold text-foreground">
                          {why.question}
                        </span>
                        <Input
                          value={why.answer}
                          onChange={(e) => handleUpdateWhy(why.level, e.target.value)}
                          placeholder={`Explicação do porquê ${why.level}...`}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  ))}

                  <div className="space-y-1 bg-sky-50 dark:bg-sky-950/30 p-3 rounded-lg border border-sky-300 dark:border-sky-800">
                    <label className="text-[11px] font-bold text-sky-900 dark:text-sky-200 uppercase">
                      Possível Causa Raiz Concluída pelos 5 Porquês
                    </label>
                    <Textarea
                      rows={2}
                      value={treatment.five_whys_json.concludedRootCause || ''}
                      onChange={(e) =>
                        setTreatment((prev) => ({
                          ...prev,
                          five_whys_json: {
                            ...prev.five_whys_json,
                            concludedRootCause: e.target.value,
                          },
                        }))
                      }
                      placeholder="Descreva a conclusão da investigação dos porquês..."
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              ETAPA 4: ISHIKAWA 6M
             ======================================================== */}
          {activeStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Diagrama de Ishikawa (Espinha de Peixe — 6M)
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Classifique potenciais causas nas 6 categorias: Método, Máquina, Mão de Obra,
                    Material, Medição e Meio Ambiente.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(
                  [
                    { key: 'METODO', title: 'Método' },
                    { key: 'MAQUINA', title: 'Máquina / Equipamento' },
                    { key: 'MAO_DE_OBRA', title: 'Mão de Obra' },
                    { key: 'MATERIAL', title: 'Material' },
                    { key: 'MEDICAO', title: 'Medição' },
                    { key: 'MEIO_AMBIENTE', title: 'Meio Ambiente' },
                  ] as Array<{ key: IshikawaCategory; title: string }>
                ).map((cat) => {
                  const items = treatment.ishikawa_json.filter((i) => i.category === cat.key)
                  return (
                    <div
                      key={cat.key}
                      className="bg-card border rounded-xl p-3 space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between border-b pb-1.5">
                          <span className="font-bold text-xs text-foreground uppercase">
                            {cat.title}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-1.5 text-[#005596]"
                            onClick={() => handleAddIshikawaItem(cat.key)}
                          >
                            <Plus className="w-3 h-3 mr-0.5" /> Adicionar
                          </Button>
                        </div>

                        <div className="space-y-2 pt-2">
                          {items.length === 0 ? (
                            <span className="text-[11px] text-muted-foreground italic block py-2">
                              Sem apontamentos
                            </span>
                          ) : (
                            items.map((item) => (
                              <div
                                key={item.id}
                                className="p-2 rounded-lg bg-muted/30 border space-y-1.5 text-xs"
                              >
                                {item.isAiSuggested && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] border-sky-400 text-sky-700 block mb-1 truncate"
                                  >
                                    Sugestão da IA — requer validação humana
                                  </Badge>
                                )}
                                <Input
                                  value={item.cause}
                                  onChange={(e) =>
                                    handleUpdateIshikawa(item.id, { cause: e.target.value })
                                  }
                                  placeholder="Descrição da causa..."
                                  className="h-7 text-[11px]"
                                />
                                <div className="flex items-center justify-between gap-1 text-[10px]">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      id={`chk-${item.id}`}
                                      checked={item.isPotentialRootCause}
                                      onChange={(e) =>
                                        handleUpdateIshikawa(item.id, {
                                          isPotentialRootCause: e.target.checked,
                                        })
                                      }
                                      className="rounded"
                                    />
                                    <label
                                      htmlFor={`chk-${item.id}`}
                                      className="font-semibold text-rose-600"
                                    >
                                      Potencial Raiz
                                    </label>
                                  </div>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteIshikawa(item.id)}
                                    className="h-5 w-5 p-0 text-muted-foreground hover:text-rose-600"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ========================================================
              ETAPA 5: CAUSA RAIZ
             ======================================================== */}
          {activeStep === 5 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Causas Raiz Validadas
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Selecione uma ou mais causas raiz confirmadas. Não é permitido concluir o
                    tratamento sem causa raiz validada ou justificativa formal de impossibilidade.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleAddRootCause}
                  className="text-xs bg-[#005596] hover:bg-[#004276] text-white"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Nova Causa Raiz Validada
                </Button>
              </div>

              {treatment.root_causes_json.length === 0 ? (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 rounded-xl p-4 text-xs space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Nenhuma causa raiz validada até o momento.</span>
                  </div>
                  <p className="text-muted-foreground">
                    Você pode selecionar as causas potenciais identificadas nas etapas de 5 Porquês
                    ou Ishikawa e registrá-las como confirmadas pelo supervisor.
                  </p>

                  <div className="space-y-1 pt-2">
                    <label className="text-[11px] font-semibold text-foreground">
                      Ou registre uma Justificativa Formal de Impossibilidade de Determinação:
                    </label>
                    <Textarea
                      rows={2}
                      value={treatment.impossibility_justification || ''}
                      onChange={(e) =>
                        setTreatment((prev) => ({
                          ...prev,
                          impossibility_justification: e.target.value,
                        }))
                      }
                      placeholder="Justificativa formal com anuência da diretoria/supervisão..."
                      className="text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {treatment.root_causes_json.map((rc, idx) => (
                    <div
                      key={rc.id}
                      className="bg-card border-2 border-emerald-500/30 rounded-xl p-4 space-y-3 shadow-2xs"
                    >
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Causa Raiz Confirmada #{idx + 1}
                        </span>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRootCause(rc.id)}
                          className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[11px] font-semibold text-foreground">
                            Descrição da Causa Raiz *
                          </label>
                          <Input
                            value={rc.description}
                            onChange={(e) =>
                              handleUpdateRootCause(rc.id, { description: e.target.value })
                            }
                            placeholder="Descreva a falha fundamental que provocou o desvio..."
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-foreground">
                            Evidência Comprobatória
                          </label>
                          <Input
                            value={rc.evidence}
                            onChange={(e) =>
                              handleUpdateRootCause(rc.id, { evidence: e.target.value })
                            }
                            placeholder="Documento, espelho de balança, log..."
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-foreground">
                            Método de Apuração Utilizado
                          </label>
                          <Select
                            value={rc.methodUsed}
                            onValueChange={(val) =>
                              handleUpdateRootCause(rc.id, { methodUsed: val as any })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5_WHYS" className="text-xs">
                                5 Porquês
                              </SelectItem>
                              <SelectItem value="ISHIKAWA" className="text-xs">
                                Ishikawa 6M
                              </SelectItem>
                              <SelectItem value="ANALISE_DADOS" className="text-xs">
                                Análise Determinística de Dados
                              </SelectItem>
                              <SelectItem value="OUTRO" className="text-xs">
                                Outro Método
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-foreground">
                            Responsável pela Validação
                          </label>
                          <Input
                            value={rc.validatorName}
                            onChange={(e) =>
                              handleUpdateRootCause(rc.id, { validatorName: e.target.value })
                            }
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-foreground">
                            Data da Validação
                          </label>
                          <Input
                            type="date"
                            value={rc.validationDate}
                            onChange={(e) =>
                              handleUpdateRootCause(rc.id, { validationDate: e.target.value })
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              ETAPA 6: PLANO 5W2H
             ======================================================== */}
          {activeStep === 6 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <ListTodo className="w-4 h-4 text-[#005596]" />
                    Plano de Ação Corretiva 5W2H
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    What / Why / Where / When / Who / How / How Much com status, percentual e
                    prioridade.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleAdd5W2HAction}
                  className="text-xs bg-[#005596] hover:bg-[#004276] text-white"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Nova Ação 5W2H
                </Button>
              </div>

              {treatment.actions_5w2h_json.length === 0 ? (
                <div className="bg-muted/30 border rounded-xl p-8 text-center text-xs text-muted-foreground">
                  Nenhuma ação 5W2H cadastrada. Clique em &quot;Nova Ação 5W2H&quot; para estruturar
                  o plano de mitigação.
                </div>
              ) : (
                <div className="space-y-3">
                  {treatment.actions_5w2h_json.map((act) => (
                    <div
                      key={act.id}
                      className="bg-card border rounded-xl p-3.5 space-y-3 shadow-2xs"
                    >
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#005596]">
                            Ação #{act.actionNumber}
                          </span>
                          <Select
                            value={act.status}
                            onValueChange={(val) =>
                              handleUpdate5W2HAction(act.id, { status: val as any })
                            }
                          >
                            <SelectTrigger className="h-7 w-32 text-[11px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NAO_INICIADA" className="text-xs">
                                Não iniciada
                              </SelectItem>
                              <SelectItem value="EM_ANDAMENTO" className="text-xs text-amber-600">
                                Em andamento
                              </SelectItem>
                              <SelectItem value="AGUARDANDO" className="text-xs text-sky-600">
                                Aguardando
                              </SelectItem>
                              <SelectItem value="CONCLUIDA" className="text-xs text-emerald-600">
                                Concluída
                              </SelectItem>
                              <SelectItem value="ATRASADA" className="text-xs text-rose-600">
                                Atrasada
                              </SelectItem>
                              <SelectItem
                                value="CANCELADA"
                                className="text-xs text-muted-foreground"
                              >
                                Cancelada
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          <Select
                            value={act.priority}
                            onValueChange={(val) =>
                              handleUpdate5W2HAction(act.id, { priority: val as any })
                            }
                          >
                            <SelectTrigger className="h-7 w-24 text-[11px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BAIXA" className="text-xs">
                                Baixa
                              </SelectItem>
                              <SelectItem value="MEDIA" className="text-xs">
                                Média
                              </SelectItem>
                              <SelectItem
                                value="ALTA"
                                className="text-xs font-semibold text-amber-600"
                              >
                                Alta
                              </SelectItem>
                              <SelectItem
                                value="CRITICA"
                                className="text-xs font-semibold text-rose-600"
                              >
                                Crítica
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>Progresso:</span>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={act.progressPct}
                              onChange={(e) =>
                                handleUpdate5W2HAction(act.id, {
                                  progressPct: Number(e.target.value),
                                })
                              }
                              className="h-7 w-16 text-center text-xs font-bold"
                            />
                            <span>%</span>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete5W2HAction(act.id)}
                            className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Grade 5W2H */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs">
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground">
                            What (O que será feito?) *
                          </label>
                          <Input
                            value={act.what}
                            onChange={(e) =>
                              handleUpdate5W2HAction(act.id, { what: e.target.value })
                            }
                            className="h-8 text-xs"
                            required
                          />
                        </div>

                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground">
                            Why (Por que será feito?)
                          </label>
                          <Input
                            value={act.why}
                            onChange={(e) =>
                              handleUpdate5W2HAction(act.id, { why: e.target.value })
                            }
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground">
                            Where (Onde?)
                          </label>
                          <Input
                            value={act.where}
                            onChange={(e) =>
                              handleUpdate5W2HAction(act.id, { where: e.target.value })
                            }
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground">
                            When (Prazo Limite) *
                          </label>
                          <Input
                            type="date"
                            value={act.whenDeadline}
                            onChange={(e) =>
                              handleUpdate5W2HAction(act.id, { whenDeadline: e.target.value })
                            }
                            className="h-8 text-xs"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground">
                            Who (Quem?) *
                          </label>
                          <Input
                            value={act.who}
                            onChange={(e) =>
                              handleUpdate5W2HAction(act.id, { who: e.target.value })
                            }
                            className="h-8 text-xs"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground">
                            How Much (Quanto custará?)
                          </label>
                          <Input
                            value={act.howMuch}
                            onChange={(e) =>
                              handleUpdate5W2HAction(act.id, { howMuch: e.target.value })
                            }
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="md:col-span-4 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground">
                            How (Como será executado?)
                          </label>
                          <Input
                            value={act.how}
                            onChange={(e) =>
                              handleUpdate5W2HAction(act.id, { how: e.target.value })
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              ETAPA 7: ACOMPANHAMENTO
             ======================================================== */}
          {activeStep === 7 && (
            <div className="space-y-4">
              {/* Dashboard do Plano */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border bg-card">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Total de Ações
                  </span>
                  <div className="text-lg font-bold text-foreground">
                    {treatment.actions_5w2h_json.length}
                  </div>
                </div>

                <div className="p-3 rounded-xl border bg-card">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                    % Conclusão do Plano
                  </span>
                  <div className="text-lg font-bold text-[#005596]">{overallProgress} %</div>
                </div>

                <div className="p-3 rounded-xl border bg-card">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Ações Concluídas
                  </span>
                  <div className="text-lg font-bold text-emerald-600">
                    {treatment.actions_5w2h_json.filter((a) => a.status === 'CONCLUIDA').length}
                  </div>
                </div>

                <div className="p-3 rounded-xl border bg-card">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Ações Atrasadas / Críticas
                  </span>
                  <div className="text-lg font-bold text-rose-600">
                    {
                      treatment.actions_5w2h_json.filter(
                        (a) => a.status === 'ATRASADA' || a.priority === 'CRITICA',
                      ).length
                    }
                  </div>
                </div>
              </div>

              {/* Inserção de Novo Comentário de Acompanhamento */}
              <div className="bg-card border rounded-xl p-4 space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#005596]" />
                  Adicionar Atualização / Comentário de Acompanhamento
                </label>
                <div className="flex gap-2">
                  <Input
                    value={newUpdateComment}
                    onChange={(e) => setNewUpdateComment(e.target.value)}
                    placeholder="Registrar avanço, evidência de execução ou alinhamento com a equipe..."
                    className="h-9 text-xs flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddTrackingComment}
                    className="h-9 text-xs bg-[#005596] text-white"
                  >
                    Registrar
                  </Button>
                </div>
              </div>

              {/* Linha do Tempo de Acompanhamento */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-foreground uppercase">
                  Histórico de Atualizações de Governança
                </h5>
                {treatment.tracking_updates_json.length === 0 ? (
                  <div className="p-4 border rounded-xl text-center text-xs text-muted-foreground">
                    Nenhum apontamento registrado ainda no acompanhamento.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {treatment.tracking_updates_json.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-3 rounded-lg border bg-card text-xs space-y-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                          <span className="font-semibold text-foreground">{entry.authorName}</span>
                          <span>{new Date(entry.date).toLocaleString('pt-BR')}</span>
                        </div>
                        <p className="text-foreground leading-relaxed">{entry.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              ETAPA 8: EFICÁCIA
             ======================================================== */}
          {activeStep === 8 && (
            <div className="space-y-4">
              <div className="bg-card border rounded-xl p-4 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-[#005596]" />
                    Avaliação da Eficácia do Tratamento (Antes x Depois)
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Compare o resultado do indicador antes e após a execução do plano 5W2H para
                    atestar a eficácia.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl border bg-muted/20 space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      Resultado Antes
                    </span>
                    <div className="text-base font-bold text-foreground">
                      {treatment.effectiveness_before_value !== undefined
                        ? `${formatAbntNumber(treatment.effectiveness_before_value, 1)} ${treatment.unit}`
                        : `${formatAbntNumber(treatment.real_value, 1)} ${treatment.unit}`}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border bg-muted/20 space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      Meta Vigente
                    </span>
                    <div className="text-base font-bold text-foreground">
                      {formatAbntNumber(treatment.target_value, 1)} {treatment.unit}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      Resultado Apurado Pós-Ação
                    </span>
                    <Input
                      type="number"
                      step="any"
                      value={treatment.effectiveness_after_value ?? ''}
                      onChange={(e) =>
                        setTreatment((prev) => ({
                          ...prev,
                          effectiveness_after_value:
                            e.target.value !== '' ? Number(e.target.value) : undefined,
                        }))
                      }
                      placeholder="Valor apurado pós-plano"
                      className="h-9 text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Classificação da Eficácia */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase">
                    Classificação da Eficácia *
                  </label>
                  <Select
                    value={treatment.effectiveness_status}
                    onValueChange={(val) =>
                      setTreatment((prev) => ({
                        ...prev,
                        effectiveness_status: val as EffectivenessOutcome,
                        status:
                          val === 'EFICAZ'
                            ? 'CONCLUIDO_EFICAZ'
                            : val === 'PARCIALMENTE_EFICAZ'
                              ? 'CONCLUIDO_PARCIAL'
                              : val === 'INEFICAZ'
                                ? 'CONCLUIDO_INEFICAZ'
                                : 'AGUARDANDO_EFICACIA',
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AGUARDANDO_AVALIACAO" className="text-xs">
                        Aguardando período de avaliação
                      </SelectItem>
                      <SelectItem value="EFICAZ" className="text-xs font-bold text-emerald-600">
                        Eficaz (Meta restabelecida e causa raiz eliminada)
                      </SelectItem>
                      <SelectItem
                        value="PARCIALMENTE_EFICAZ"
                        className="text-xs font-bold text-amber-600"
                      >
                        Parcialmente eficaz (Evolução parcial; novos ajustes necessários)
                      </SelectItem>
                      <SelectItem value="INEFICAZ" className="text-xs font-bold text-rose-600">
                        Ineficaz (Desvio persiste; necessária reabertura da análise)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Parecer do Avaliador */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase">
                    Parecer Formal de Eficácia
                  </label>
                  <Textarea
                    rows={3}
                    value={treatment.effectiveness_evaluation_notes || ''}
                    onChange={(e) =>
                      setTreatment((prev) => ({
                        ...prev,
                        effectiveness_evaluation_notes: e.target.value,
                        effectiveness_evaluated_at: new Date().toISOString(),
                        effectiveness_evaluated_by: user?.name || 'Gestor Logístico',
                      }))
                    }
                    placeholder="Conclusão sobre a estabilização do indicador e eliminação de reincidência..."
                    className="text-xs leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ DO MODAL COM NAVEGAÇÃO ANTERIOR / PRÓXIMO E SALVAR */}
        <DialogFooter className="border-t pt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={activeStep === 1}
              onClick={() => setActiveStep(((activeStep - 1) as TreatmentStep) || 1)}
              className="text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Etapa Anterior
            </Button>

            {activeStep < 8 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSaveTreatment(true)}
                disabled={isSaving}
                className="text-xs border-[#005596] text-[#005596]"
              >
                Próxima Etapa
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs"
            >
              Fechar
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => handleSaveTreatment(false)}
              disabled={isSaving}
              className="text-xs bg-[#005596] hover:bg-[#004276] text-white font-semibold"
            >
              <Save className={`w-3.5 h-3.5 mr-1.5 ${isSaving ? 'animate-spin' : ''}`} />
              {isSaving ? 'Salvando...' : 'Salvar Informações'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// -------------------------------------------------------------
// FUNÇÕES AUXILIARES DE INICIALIZAÇÃO E CÁLCULO
// -------------------------------------------------------------
function buildInitialTreatment(
  kpi: KpiRowData,
  monthCell: KpiMonthCell,
  user: any,
  initialGraphicSummary?: string,
  existing?: TmsDeviationTreatment | null,
): TmsDeviationTreatment {
  if (existing) {
    return existing
  }

  const realVal = monthCell.realValue ?? 0
  const targetVal = monthCell.targetValue ?? kpi.targetConfig.target_value
  const diffAbs = realVal - targetVal
  const diffPct = targetVal !== 0 ? (diffAbs / targetVal) * 100 : 0
  const periodLabel = `${monthCell.monthLabel}/${monthCell.year}`

  const autoDesc = generateAutomaticDeviationDescription(
    kpi.name,
    periodLabel,
    realVal,
    targetVal,
    kpi.unit,
  )

  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  const code = `TRAT-TMS-${monthCell.year}-${String(monthCell.month).padStart(2, '0')}-${randomSuffix}`

  return {
    treatment_code: code,
    kpi_id: kpi.id,
    kpi_name: kpi.name,
    category: kpi.category,
    company: 'CIAFAL',
    center: 'Matriz Contagem',
    period_ref: periodLabel,
    month: monthCell.month,
    year: monthCell.year,
    target_value: targetVal,
    real_value: realVal,
    unit: kpi.unit,
    deviation_abs: Number(diffAbs.toFixed(2)),
    deviation_pct: Number(diffPct.toFixed(2)),
    trend_label: kpi.trend === 'UP' ? 'Alta' : kpi.trend === 'DOWN' ? 'Queda' : 'Estável',
    status: 'EM_ANALISE',
    current_step: 1,

    responsible_analyst_id: user?.id || '262z1iy838v6k7v',
    responsible_analyst_name: user?.name || 'Administrador Master CIAFAL',
    responsible_analyst_email: user?.email || 'ciafal@ciafal.com.br',
    area_supervisor_id: 'cujqrj5hci8z8ox',
    area_supervisor_name: 'Carlos Eduardo (Gestor Logística)',
    area_supervisor_email: 'gestor.logistica@ciafal.com.br',
    plan_approver_id: '262z1iy838v6k7v',
    plan_approver_name: 'Administrador Master CIAFAL',
    plan_approver_email: 'ciafal@ciafal.com.br',

    deviation_description: autoDesc,
    ai_initial_analysis: initialGraphicSummary || undefined,

    hypotheses_json: [],
    five_whys_json: {
      problemStatement: autoDesc,
      whys: [
        { level: 1, question: 'Por que o indicador ficou fora da meta no período?', answer: '' },
        { level: 2, question: 'Por que ocorreu essa variação operacional?', answer: '' },
        { level: 3, question: 'Por que os mecanismos preventivos não atuaram?', answer: '' },
      ],
    },
    ishikawa_json: [],
    root_causes_json: [],
    root_cause_validated: false,
    actions_5w2h_json: [],
    tracking_updates_json: [],
    effectiveness_status: 'AGUARDANDO_AVALIACAO',
    effectiveness_before_value: realVal,
  }
}

function computeTreatmentStatus(
  treatment: TmsDeviationTreatment,
  nextStep: TreatmentStep,
): TreatmentStatus {
  if (treatment.effectiveness_status === 'EFICAZ') return 'CONCLUIDO_EFICAZ'
  if (treatment.effectiveness_status === 'PARCIALMENTE_EFICAZ') return 'CONCLUIDO_PARCIAL'
  if (treatment.effectiveness_status === 'INEFICAZ') return 'CONCLUIDO_INEFICAZ'
  if (nextStep >= 7) return 'EM_EXECUCAO'
  if (nextStep >= 6) return 'PLANO_CRIADO'
  return 'EM_ANALISE'
}

function calculateOverallPlanProgress(actions: Action5W2H[]): number {
  if (!actions || actions.length === 0) return 0
  const sum = actions.reduce((acc, a) => acc + (a.progressPct || 0), 0)
  return Math.round(sum / actions.length)
}
