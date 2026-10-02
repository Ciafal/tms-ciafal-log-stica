import React, { useState, useEffect, useMemo } from 'react'
import {
  ScoreRuleVersion,
  ScoreWeights,
  DEFAULT_SCORE_WEIGHTS,
  validateWeightsSum,
  simulateScoreImpact,
  calculateGovernedScore,
} from '@/domain/scoreGovernanceEngine'
import {
  CarrierOperationalRecord,
  CarrierEvaluationRecord,
  CarrierComplaintRecord,
  CarrierComplimentRecord,
} from '@/domain/carrierHistoryEngine'
import { carrierHistoryService } from '@/services/carrierHistoryService'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sliders,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  History,
  TrendingUp,
  FileText,
  User,
  ArrowRight,
  Info,
} from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

export const ScoreGovernanceAndCalibrationPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  // Permissão RBAC (Admin Master / Gestor de Contratação)
  const isAuthorized =
    permissions.canManageSystemParameters ||
    (permissions as any).canApproveSpecialFreight ||
    user?.role === 'admin_master' ||
    user?.role === 'admin_tms' ||
    user?.role === 'gestor_logistica' ||
    user?.email?.includes('admin') ||
    (user as any)?.matricula === 'EXP-1044'

  // Estados principais
  const [activeRule, setActiveRule] = useState<ScoreRuleVersion | null>(null)
  const [ruleHistory, setRuleHistory] = useState<ScoreRuleVersion[]>([])
  const [historyList, setHistoryList] = useState<CarrierOperationalRecord[]>([])
  const [evaluations, setEvaluations] = useState<CarrierEvaluationRecord[]>([])
  const [complaints, setComplaints] = useState<CarrierComplaintRecord[]>([])
  const [compliments, setCompliments] = useState<CarrierComplimentRecord[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Formulário do Simulador
  const [candidateWeights, setCandidateWeights] = useState<ScoreWeights>(DEFAULT_SCORE_WEIGHTS)
  const [versionCode, setVersionCode] = useState<string>('REG-SCORE-v1.1.0')
  const [ruleName, setRuleName] = useState<string>('Calibração de Score Operacional CIAFAL')
  const [justification, setJustification] = useState<string>('')
  const [targetCoverage, setTargetCoverage] = useState<number>(80)

  // Modal de Simulação & Homologação
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [simulationResult, setSimulationResult] = useState<any | null>(null)
  const [isHomologating, setIsHomologating] = useState<boolean>(false)

  // Modal de Score Explicável
  const [selectedDriverForExplanation, setSelectedDriverForExplanation] = useState<string | null>(
    null,
  )

  // Validação em tempo real da soma de 100%
  const weightValidation = useMemo(() => {
    return validateWeightsSum(candidateWeights)
  }, [candidateWeights])

  // Carregamento de dados
  const loadData = async () => {
    setIsLoading(true)
    try {
      const [curRule, rules, hist, evals, comp, compl] = await Promise.all([
        carrierHistoryService.getActiveScoreRule(),
        carrierHistoryService.listScoreRuleVersions(),
        carrierHistoryService.getOperationalHistory(200),
        carrierHistoryService.getEvaluations(200),
        carrierHistoryService.getComplaints(200),
        carrierHistoryService.getCompliments(200),
      ])

      setActiveRule(curRule)
      setRuleHistory(rules)
      setCandidateWeights(curRule.weights)
      setTargetCoverage(curRule.target_coverage_pct || 80)
      setHistoryList(hist)
      setEvaluations(evals)
      setComplaints(comp)
      setCompliments(compl)
    } catch (err) {
      console.error('Erro ao carregar governança de score:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Lista de motoristas para teste de impacto
  const sampleDrivers = useMemo(() => {
    return Array.from(new Set(historyList.map((h) => h.driver_name).filter(Boolean)))
  }, [historyList])

  // Executar simulação temporária sem afetar os scores vigentes
  const handleRunSimulation = () => {
    if (!weightValidation.isValid) {
      toast({
        title: 'Soma Inválida dos Pesos',
        description: weightValidation.errorMessage,
        variant: 'destructive',
      })
      return
    }

    if (!activeRule) return

    const candidateRule: ScoreRuleVersion = {
      version_code: versionCode,
      rule_name: ruleName,
      lifecycle_status: 'SIMULADO',
      weights: candidateWeights,
      target_coverage_pct: targetCoverage,
      min_transports_for_high_confidence: activeRule.min_transports_for_high_confidence,
      min_transports_for_medium_confidence: activeRule.min_transports_for_medium_confidence,
      justification,
    }

    const simResult = simulateScoreImpact(
      sampleDrivers,
      historyList,
      evaluations,
      complaints,
      compliments,
      activeRule,
      candidateRule,
    )

    setSimulationResult(simResult)
    setIsSimulating(true)
  }

  // Homologar e ativar nova versão de regra imutável
  const handleHomologateAndActivate = async () => {
    if (!weightValidation.isValid) {
      toast({
        title: 'Soma Inválida dos Pesos',
        description: weightValidation.errorMessage,
        variant: 'destructive',
      })
      return
    }

    if (!justification || justification.trim().length < 15) {
      toast({
        title: 'Justificativa Obrigatória',
        description:
          'Forneça uma justificativa técnica fundamentada de no mínimo 15 caracteres para auditar esta versão.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsHomologating(true)
      const userEmail = user?.email || 'admin.master@ciafal.com.br'
      const userName = user?.name || 'Administrador Master'

      const newRule: ScoreRuleVersion = {
        version_code: versionCode,
        rule_name: ruleName,
        lifecycle_status: 'HOMOLOGADO',
        weights: candidateWeights,
        target_coverage_pct: targetCoverage,
        min_transports_for_high_confidence: activeRule?.min_transports_for_high_confidence || 15,
        min_transports_for_medium_confidence: activeRule?.min_transports_for_medium_confidence || 5,
        effective_start_date: new Date().toISOString(),
        justification,
        created_by_user_email: userEmail,
        created_by_user_name: userName,
        homologated_by_user_email: userEmail,
        homologated_by_user_name: userName,
        homologated_at: new Date().toISOString(),
        previous_values_json: activeRule?.weights,
        simulation_impact_json: simulationResult
          ? {
              drivers_improved: simulationResult.drivers_improved,
              drivers_reduced: simulationResult.drivers_reduced,
              drivers_unchanged: simulationResult.drivers_unchanged,
              total_evaluated: simulationResult.total_evaluated,
            }
          : undefined,
      }

      // Cria a nova versão imutável
      const created = await carrierHistoryService.createScoreRuleVersion(
        newRule,
        userEmail,
        userName,
      )

      // Ativa e arquiva anterior
      if (created.id) {
        await carrierHistoryService.activateScoreRuleVersion(
          created.id,
          userEmail,
          userName,
          `Ativação formal da versão ${versionCode}: ${justification}`,
        )
      }

      toast({
        title: 'Nova Regra de Score Homologada e Vigente',
        description: `A versão ${versionCode} foi ativada com sucesso. A regra anterior foi preservada no histórico auditável.`,
      })

      setIsSimulating(false)
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro na Homologação',
        description: err.message || 'Falha ao salvar a regra de score.',
        variant: 'destructive',
      })
    } finally {
      setIsHomologating(false)
    }
  }

  // Cálculo de cobertura real de avaliações
  const coverageAnalysis = useMemo(() => {
    const totalTrips = historyList.length
    const evaluatedTrips = new Set(evaluations.map((e) => e.transport_order_number).filter(Boolean))
      .size
    const coveragePct = totalTrips > 0 ? (evaluatedTrips / totalTrips) * 100 : 0

    return {
      totalTrips,
      evaluatedTrips,
      coveragePct: Number(coveragePct.toFixed(1)),
      targetPct: activeRule?.target_coverage_pct || 80,
    }
  }, [historyList, evaluations, activeRule])

  // Cálculo do score explicável selecionado
  const explainableScoreModalData = useMemo(() => {
    if (!selectedDriverForExplanation || !activeRule) return null
    return calculateGovernedScore(
      selectedDriverForExplanation,
      'MOTORISTA',
      historyList,
      evaluations,
      complaints,
      compliments,
      activeRule,
    )
  }, [selectedDriverForExplanation, activeRule, historyList, evaluations, complaints, compliments])

  // Verificação de permissão RBAC
  if (!isAuthorized) {
    return (
      <div className="bg-white border border-rose-200 rounded-xl p-12 text-center max-w-xl mx-auto my-12 shadow-sm">
        <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-800">
          Acesso Restrito ao Comitê de Governança
        </h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          A calibração de pesos e homologação do Score Operacional exige permissões de Administrador
          Master ou Gestor de Transporte. Entre em contato com a equipe de governança para solicitar
          autorização.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-12">
      {/* Cabeçalho HUB CIAFAL */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-[#005596]/10 text-[#005596] rounded-xl border border-[#005596]/20">
            <Sliders className="w-7 h-7 text-[#005596]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Calibração e Governança do Score Operacional
              </h1>
              <Badge className="bg-[#005596] text-white text-[10px] uppercase font-bold">
                Módulo Contratação
              </Badge>
              <Badge variant="outline" className="text-slate-600 text-[10px]">
                {activeRule?.version_code || 'v1.0.0'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Parametrização ponderada de critérios, versionamento imutável de regras, simulação de
              impacto histórico e score explicável.
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
            Recarregar Regras
          </Button>
        </div>
      </div>

      {/* Regra de Governança & Princípios CIAFAL */}
      <div className="bg-amber-50 border border-amber-200 text-amber-950 p-4 rounded-xl text-xs space-y-1">
        <div className="flex items-center gap-2 font-bold text-amber-900">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
          Governança Estrita CIAFAL: Imutabilidade, Explicabilidade e Proibição de Zero por Omissão
        </div>
        <p className="text-amber-900 leading-relaxed">
          1. A soma dos 7 pesos ponderados <strong>DEVE ser exatamente 100%</strong> (bloqueio
          automático de salvamento caso diferente).
          <br />
          2. <strong>Versionamento Imutável:</strong> Versões ativadas jamais são sobrescritas,
          garantindo a reprodutibilidade histórica da regra da época.
          <br />
          3. <strong>Ausência de Avaliação:</strong> Falta de registro NUNCA resulta em nota zero;
          exibe &quot;Histórico insuficiente para este critério.&quot;
          <br />
          4. <strong>Confiabilidade Amostral:</strong> Score com poucos transportes é classificado
          como &quot;Confiabilidade Baixa&quot; para evitar falsas correlações.
        </p>
      </div>

      {/* Grid: Indicador de Cobertura e Regra Vigente */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card: Cobertura de Avaliação */}
        <Card className="border-slate-200">
          <CardHeader className="py-2.5 px-4 bg-slate-50 border-b border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Meta de Cobertura de Avaliação
            </span>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-600">Transportes com Avaliação:</span>
              <strong className="text-lg font-black text-slate-900">
                {coverageAnalysis.evaluatedTrips} de {coverageAnalysis.totalTrips} (
                {coverageAnalysis.coveragePct}%)
              </strong>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-[#005596] h-full"
                style={{
                  width: `${Math.min(100, (coverageAnalysis.coveragePct / coverageAnalysis.targetPct) * 100)}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 pt-1">
              <span>Meta Atual: {coverageAnalysis.targetPct}%</span>
              <span>
                Gap:{' '}
                {Math.max(0, coverageAnalysis.targetPct - coverageAnalysis.coveragePct).toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card: Regra Vigente Ativa */}
        <Card className="border-slate-200 col-span-2">
          <CardHeader className="py-2.5 px-4 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#005596] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Regra Vigente em Produção: {activeRule?.version_code}
            </span>
            <Badge className="bg-emerald-600 text-white text-[10px]">Vigente</Badge>
          </CardHeader>
          <CardContent className="p-4 text-xs space-y-2">
            <div className="font-bold text-slate-900">{activeRule?.rule_name}</div>
            <p className="text-slate-600 leading-relaxed italic">
              &quot;{activeRule?.justification}&quot;
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 pt-2 border-t border-slate-100 text-center">
              <div className="p-1.5 rounded bg-slate-50">
                <span className="text-[9px] text-slate-400 uppercase block font-bold">
                  Avaliação
                </span>
                <strong className="text-slate-800">
                  {activeRule?.weights.servicesEvaluationPct}%
                </strong>
              </div>
              <div className="p-1.5 rounded bg-slate-50">
                <span className="text-[9px] text-slate-400 uppercase block font-bold">
                  Pontualidade
                </span>
                <strong className="text-slate-800">{activeRule?.weights.punctualityPct}%</strong>
              </div>
              <div className="p-1.5 rounded bg-slate-50">
                <span className="text-[9px] text-slate-400 uppercase block font-bold">
                  Reclamações
                </span>
                <strong className="text-slate-800">
                  {activeRule?.weights.procedenteComplaintsPct}%
                </strong>
              </div>
              <div className="p-1.5 rounded bg-slate-50">
                <span className="text-[9px] text-slate-400 uppercase block font-bold">
                  Ocorrências
                </span>
                <strong className="text-slate-800">{activeRule?.weights.occurrencesPct}%</strong>
              </div>
              <div className="p-1.5 rounded bg-slate-50">
                <span className="text-[9px] text-slate-400 uppercase block font-bold">
                  Comunicação
                </span>
                <strong className="text-slate-800">{activeRule?.weights.communicationPct}%</strong>
              </div>
              <div className="p-1.5 rounded bg-slate-50">
                <span className="text-[9px] text-slate-400 uppercase block font-bold">
                  Histórico
                </span>
                <strong className="text-slate-800">
                  {activeRule?.weights.deliveryHistoryPct}%
                </strong>
              </div>
              <div className="p-1.5 rounded bg-slate-50">
                <span className="text-[9px] text-slate-400 uppercase block font-bold">Elogios</span>
                <strong className="text-slate-800">{activeRule?.weights.complimentsPct}%</strong>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* FORMULÁRIO DO SIMULADOR E CALIBRAÇÃO DE PESOS                             */}
      {/* ========================================================================= */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#005596]" />
              Simulador de Pesos do Score Operacional (Sem Afetar Produção)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Altere os pesos para testar cenários. A soma dos 7 critérios deve resultar
              obrigatoriamente em 100%.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Soma Atual:</span>
            <Badge
              className={
                weightValidation.isValid
                  ? 'bg-emerald-600 text-white font-mono'
                  : 'bg-rose-600 text-white font-mono animate-pulse'
              }
            >
              {weightValidation.currentSum}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4 text-xs">
          {/* Bloqueio visual se soma != 100 */}
          {!weightValidation.isValid && (
            <div className="bg-rose-50 border border-rose-300 p-3 rounded-lg flex items-center gap-2 text-rose-900 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{weightValidation.errorMessage}</span>
            </div>
          )}

          {/* Os 7 Pesos Configuráveis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">1. Avaliação dos Serviços (%)</Label>
              <Input
                type="number"
                value={candidateWeights.servicesEvaluationPct}
                onChange={(e) =>
                  setCandidateWeights({
                    ...candidateWeights,
                    servicesEvaluationPct: Number(e.target.value),
                  })
                }
                className="h-8 text-xs font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400">Padrão: 30%</span>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">2. Pontualidade de Entrega (%)</Label>
              <Input
                type="number"
                value={candidateWeights.punctualityPct}
                onChange={(e) =>
                  setCandidateWeights({
                    ...candidateWeights,
                    punctualityPct: Number(e.target.value),
                  })
                }
                className="h-8 text-xs font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400">Padrão: 20%</span>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">3. Reclamações Procedentes (%)</Label>
              <Input
                type="number"
                value={candidateWeights.procedenteComplaintsPct}
                onChange={(e) =>
                  setCandidateWeights({
                    ...candidateWeights,
                    procedenteComplaintsPct: Number(e.target.value),
                  })
                }
                className="h-8 text-xs font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400">Padrão: 15%</span>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">
                4. Ocorrências Operacionais (%)
              </Label>
              <Input
                type="number"
                value={candidateWeights.occurrencesPct}
                onChange={(e) =>
                  setCandidateWeights({
                    ...candidateWeights,
                    occurrencesPct: Number(e.target.value),
                  })
                }
                className="h-8 text-xs font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400">Padrão: 10%</span>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">
                5. Atendimento / Comunicação (%)
              </Label>
              <Input
                type="number"
                value={candidateWeights.communicationPct}
                onChange={(e) =>
                  setCandidateWeights({
                    ...candidateWeights,
                    communicationPct: Number(e.target.value),
                  })
                }
                className="h-8 text-xs font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400">Padrão: 10%</span>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">6. Histórico de Entregas (%)</Label>
              <Input
                type="number"
                value={candidateWeights.deliveryHistoryPct}
                onChange={(e) =>
                  setCandidateWeights({
                    ...candidateWeights,
                    deliveryHistoryPct: Number(e.target.value),
                  })
                }
                className="h-8 text-xs font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400">Padrão: 10%</span>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">
                7. Elogios e Reconhecimentos (%)
              </Label>
              <Input
                type="number"
                value={candidateWeights.complimentsPct}
                onChange={(e) =>
                  setCandidateWeights({
                    ...candidateWeights,
                    complimentsPct: Number(e.target.value),
                  })
                }
                className="h-8 text-xs font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400">Padrão: 5%</span>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">Meta de Cobertura (%)</Label>
              <Input
                type="number"
                value={targetCoverage}
                onChange={(e) => setTargetCoverage(Number(e.target.value))}
                className="h-8 text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400">Meta recomendada: 80%</span>
            </div>
          </div>

          {/* Identificação da Versão e Justificativa Auditável */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <Label className="text-slate-700 font-semibold">Código da Nova Versão</Label>
              <Input
                value={versionCode}
                onChange={(e) => setVersionCode(e.target.value)}
                placeholder="Ex.: REG-SCORE-v1.1.0"
                className="h-8 text-xs font-mono mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold">Título Descritivo da Regra</Label>
              <Input
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="Ex.: Ponderação Reforçada em Pontualidade 2026"
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-700 font-semibold">
              Justificativa Técnica da Mudança (Registro Auditável Obrigatório) *
            </Label>
            <Textarea
              placeholder="Descreva a razão operacional da nova calibração (ex.: aumento de rigor na pontualidade devido a novas exigências de clientes industriais)..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={2}
              className="mt-1 text-xs"
            />
          </div>

          {/* Botões do Simulador */}
          <div className="flex justify-between items-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCandidateWeights(DEFAULT_SCORE_WEIGHTS)}
              className="text-xs"
            >
              Restaurar Padrão (30/20/15/10/10/10/5)
            </Button>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleRunSimulation}
                disabled={!weightValidation.isValid}
                className="bg-[#005596] hover:bg-sky-800 text-white text-xs font-semibold"
              >
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                Simular Impacto Histórico
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* HISTÓRICO VERSIONADO DE REGRAS IMUTÁVEIS                                  */}
      {/* ========================================================================= */}
      <Card className="border-slate-200">
        <CardHeader className="py-2.5 px-4 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-[#005596]" />
            Trilha Imutável de Versões de Regras de Score
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {ruleHistory.length} versões registradas
          </Badge>
        </CardHeader>
        <CardContent className="p-4">
          <div className="border border-slate-200 rounded-lg overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold">
                <tr>
                  <th className="p-2">Versão</th>
                  <th className="p-2">Nome da Regra</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Pesos (Av/Pon/Rec/Oco/Com/His/Elo)</th>
                  <th className="p-2">Data Início</th>
                  <th className="p-2">Homologado Por</th>
                  <th className="p-2">Justificativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ruleHistory.map((r) => (
                  <tr key={r.version_code} className="hover:bg-slate-50">
                    <td className="p-2 font-mono font-bold text-slate-900">{r.version_code}</td>
                    <td className="p-2 font-medium">{r.rule_name}</td>
                    <td className="p-2">
                      <Badge
                        className={
                          r.lifecycle_status === 'VIGENTE'
                            ? 'bg-emerald-600 text-white text-[9px]'
                            : 'bg-slate-200 text-slate-700 text-[9px]'
                        }
                      >
                        {r.lifecycle_status}
                      </Badge>
                    </td>
                    <td className="p-2 font-mono text-[11px] text-slate-700">
                      {r.weights.servicesEvaluationPct}/{r.weights.punctualityPct}/
                      {r.weights.procedenteComplaintsPct}/{r.weights.occurrencesPct}/
                      {r.weights.communicationPct}/{r.weights.deliveryHistoryPct}/
                      {r.weights.complimentsPct}%
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {r.effective_start_date ? formatDate(r.effective_start_date) : '—'}
                    </td>
                    <td className="p-2 text-slate-600">
                      {r.homologated_by_user_name || r.created_by_user_name || 'Admin'}
                    </td>
                    <td
                      className="p-2 text-slate-500 max-w-[200px] truncate"
                      title={r.justification}
                    >
                      {r.justification}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* MODAL DE RESULTADO DA SIMULAÇÃO COM BOTÕES DE HOMOLOGAÇÃO                 */}
      {/* ========================================================================= */}
      <Dialog open={isSimulating} onOpenChange={setIsSimulating}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 bg-white">
          {simulationResult && (
            <>
              <DialogHeader className="pb-3 border-b border-slate-100">
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#005596]" />
                  Simulação de Impacto Histórico nos Motoristas
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Comparação prévia entre a regra vigente ({activeRule?.version_code}) e a proposta
                  ({versionCode}).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2 text-xs">
                {/* Resumo Consolidado de Impacto */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                      Aumentariam Score
                    </span>
                    <span className="text-lg font-black text-emerald-700">
                      +{simulationResult.drivers_improved}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100">
                    <span className="text-[10px] uppercase font-bold text-rose-800 block">
                      Reduziriam Score
                    </span>
                    <span className="text-lg font-black text-rose-700">
                      -{simulationResult.drivers_reduced}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-600 block">
                      Permaneceriam Iguais
                    </span>
                    <span className="text-lg font-black text-slate-800">
                      {simulationResult.drivers_unchanged}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                    <span className="text-[10px] uppercase font-bold text-blue-800 block">
                      Total Avaliados
                    </span>
                    <span className="text-lg font-black text-blue-900">
                      {simulationResult.total_evaluated}
                    </span>
                  </div>
                </div>

                {/* Tabela de Motoristas Afetados */}
                <div className="border border-slate-200 rounded-lg overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="p-2">Motorista</th>
                        <th className="p-2 text-center">Score Atual</th>
                        <th className="p-2 text-center">Score Simulado</th>
                        <th className="p-2 text-center">Variação</th>
                        <th className="p-2">Fator Responsável</th>
                        <th className="p-2 text-center">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {simulationResult.sampleImpacts.map((it: any) => (
                        <tr key={it.driverName} className="hover:bg-slate-50">
                          <td className="p-2 font-medium text-slate-900">{it.driverName}</td>
                          <td className="p-2 text-center font-bold text-slate-700">
                            {it.currentScore}/100
                          </td>
                          <td className="p-2 text-center font-bold text-[#005596]">
                            {it.simulatedScore}/100
                          </td>
                          <td className="p-2 text-center font-mono font-bold">
                            {it.delta > 0 && <span className="text-emerald-700">+{it.delta}</span>}
                            {it.delta < 0 && <span className="text-rose-700">{it.delta}</span>}
                            {it.delta === 0 && <span className="text-slate-400">0</span>}
                          </td>
                          <td className="p-2 text-slate-600">{it.mainFactor}</td>
                          <td className="p-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedDriverForExplanation(it.driverName)}
                              className="h-6 text-[10px] text-[#005596]"
                            >
                              Ver Fórmula
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100 flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSimulating(false)}
                  disabled={isHomologating}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleHomologateAndActivate}
                  disabled={isHomologating}
                  className="bg-[#005596] hover:bg-sky-800 text-white text-xs font-semibold"
                >
                  {isHomologating ? 'Homologando...' : 'Homologar & Tornar Vigente'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL DE COMPOSIÇÃO DO SCORE EXPLICÁVEL                                   */}
      {/* ========================================================================= */}
      <Dialog
        open={!!selectedDriverForExplanation}
        onOpenChange={(open) => !open && setSelectedDriverForExplanation(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6 bg-white">
          {explainableScoreModalData && (
            <>
              <DialogHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#005596]" />
                      Composição do Score Explicável: {selectedDriverForExplanation}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 mt-0.5">
                      Regra: {explainableScoreModalData.ruleVersionCode} • Viagens:{' '}
                      {explainableScoreModalData.transportsTotal} • Avaliações:{' '}
                      {explainableScoreModalData.evaluationsTotal}
                    </DialogDescription>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-[#005596]">
                      {explainableScoreModalData.finalScore}/100
                    </span>
                    <Badge
                      className={
                        explainableScoreModalData.confidenceLevel === 'ALTA'
                          ? 'bg-emerald-600 text-white text-[9px] block mt-0.5'
                          : explainableScoreModalData.confidenceLevel === 'MEDIA'
                            ? 'bg-amber-600 text-white text-[9px] block mt-0.5'
                            : 'bg-slate-500 text-white text-[9px] block mt-0.5'
                      }
                    >
                      Amostra: {explainableScoreModalData.confidenceLevel}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3 pt-2 text-xs">
                <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-100 text-slate-700 leading-relaxed">
                  <strong>Confiabilidade Estatística:</strong>{' '}
                  {explainableScoreModalData.confidenceReason}
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="p-2">Critério</th>
                        <th className="p-2">Medição Real</th>
                        <th className="p-2 text-center">Peso</th>
                        <th className="p-2 text-right">Contribuição</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {explainableScoreModalData.criteriaBreakdown.map((item) => (
                        <tr key={item.criterionName} className="hover:bg-slate-50">
                          <td className="p-2 font-medium text-slate-900">{item.criterionName}</td>
                          <td className="p-2 text-slate-600">
                            {item.rawMetricDisplay}
                            <div className="text-[10px] text-slate-400 italic">
                              {item.explanationNote}
                            </div>
                          </td>
                          <td className="p-2 text-center font-mono">{item.weightPct}%</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-800">
                            {item.weightedContribution.toFixed(1)} pts
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
