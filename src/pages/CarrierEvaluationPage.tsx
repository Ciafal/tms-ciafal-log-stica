import React, { useState, useEffect, useMemo } from 'react'
import {
  Star,
  Award,
  AlertOctagon,
  ThumbsUp,
  FileText,
  Clock,
  ShieldCheck,
  User,
  Truck,
  RotateCcw,
  Plus,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
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
  DialogFooter,
} from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate } from '@/lib/utils'
import {
  CarrierOperationalRecord,
  CarrierEvaluationRecord,
  CarrierComplaintRecord,
  CarrierComplimentRecord,
} from '@/domain/carrierHistoryEngine'
import { carrierHistoryService } from '@/services/carrierHistoryService'

export const CarrierEvaluationPage: React.FC = () => {
  const { user, permissions } = useAuth()

  // Estados dos Dados Reais
  const [evaluations, setEvaluations] = useState<CarrierEvaluationRecord[]>([])
  const [complaints, setComplaints] = useState<CarrierComplaintRecord[]>([])
  const [compliments, setCompliments] = useState<CarrierComplimentRecord[]>([])
  const [historyList, setHistoryList] = useState<CarrierOperationalRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modais de Criação
  const [openEvalModal, setOpenEvalModal] = useState(false)
  const [openComplaintModal, setOpenComplaintModal] = useState(false)
  const [openComplimentModal, setOpenComplimentModal] = useState(false)
  const [selectedComplaintForTreatment, setSelectedComplaintForTreatment] =
    useState<CarrierComplaintRecord | null>(null)

  // Formulário: Avaliação
  const [evalForm, setEvalForm] = useState<{
    targetType: CarrierEvaluationRecord['target_type']
    driverName: string
    vehiclePlate: string
    sapTransportNumber: string
    originType: CarrierEvaluationRecord['origin_type']
    operationalMoment: CarrierEvaluationRecord['operational_moment']
    // Motorista
    pontualidade: number
    cumprimentoOrientacoes: number
    relacionamentoInterno: number
    cuidadoCarga: number
    regrasSeguranca: number
    qualidadeGeral: number
    recommendation: 'SIM' | 'SIM_COM_RESSALVAS' | 'NAO'
    // Veículo
    conservacao: number
    limpeza: number
    condicoesAparentes: number
    amarracao: number
    regrasInternas: number
    // Justificativas
    justificationCritical: string
    notes: string
  }>({
    targetType: 'MOTORISTA',
    driverName: '',
    vehiclePlate: '',
    sapTransportNumber: '',
    originType: 'EXPEDICAO',
    operationalMoment: 'APOS_CARREGAMENTO',
    pontualidade: 5,
    cumprimentoOrientacoes: 5,
    relacionamentoInterno: 5,
    cuidadoCarga: 5,
    regrasSeguranca: 5,
    qualidadeGeral: 5,
    recommendation: 'SIM',
    conservacao: 5,
    limpeza: 5,
    condicoesAparentes: 5,
    amarracao: 5,
    regrasInternas: 5,
    justificationCritical: '',
    notes: '',
  })

  // Formulário: Reclamação
  const [complaintForm, setComplaintForm] = useState<{
    targetType: CarrierComplaintRecord['target_type']
    category: CarrierComplaintRecord['category']
    severity: CarrierComplaintRecord['severity']
    driverName: string
    vehiclePlate: string
    sapTransportNumber: string
    originType: CarrierComplaintRecord['origin_type']
    description: string
  }>({
    targetType: 'MOTORISTA',
    category: 'ATRASO',
    severity: 'MEDIA',
    driverName: '',
    vehiclePlate: '',
    sapTransportNumber: '',
    originType: 'EXPEDICAO',
    description: '',
  })

  // Formulário: Elogio
  const [complimentForm, setComplimentForm] = useState<{
    category: CarrierComplimentRecord['category']
    driverName: string
    vehiclePlate: string
    sapTransportNumber: string
    originType: CarrierComplimentRecord['origin_type']
    description: string
  }>({
    category: 'ELOGIO_CLIENTE',
    driverName: '',
    vehiclePlate: '',
    sapTransportNumber: '',
    originType: 'CLIENTE',
    description: '',
  })

  // Formulário: Tratamento de Reclamação (Supervisor)
  const [treatmentStatus, setTreatmentStatus] =
    useState<CarrierComplaintRecord['status']>('EM_ANALISE')
  const [treatmentNotes, setTreatmentNotes] = useState('')
  const [manifestation, setManifestation] = useState('')
  const [conclusion, setConclusion] = useState('')
  const [actionTaken, setActionTaken] = useState('')

  // Carregar dados
  const loadData = async () => {
    setIsLoading(true)
    try {
      const [evalsRes, compRes, complRes, histRes] = await Promise.all([
        carrierHistoryService.getEvaluations(),
        carrierHistoryService.getComplaints(),
        carrierHistoryService.getCompliments(),
        carrierHistoryService.getOperationalHistory({ perPage: 100 }),
      ])
      setEvaluations(evalsRes)
      setComplaints(compRes)
      setCompliments(complRes)
      setHistoryList(histRes.items)
    } catch (err) {
      console.error('Erro ao carregar dados de avaliação:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Submissão de Avaliação
  const handleSaveEvaluation = async () => {
    try {
      const avgDriver =
        (evalForm.pontualidade +
          evalForm.cumprimentoOrientacoes +
          evalForm.relacionamentoInterno +
          evalForm.cuidadoCarga +
          evalForm.regrasSeguranca +
          evalForm.qualidadeGeral) /
        6

      const avgVehicle =
        (evalForm.conservacao +
          evalForm.limpeza +
          evalForm.condicoesAparentes +
          evalForm.amarracao +
          evalForm.regrasInternas) /
        5

      await carrierHistoryService.createEvaluation(
        {
          target_type: evalForm.targetType,
          driver_name: evalForm.driverName,
          vehicle_plate: evalForm.vehiclePlate,
          sap_transport_number: evalForm.sapTransportNumber,
          origin_type: evalForm.originType,
          operational_moment: evalForm.operationalMoment,
          driver_pontualidade: evalForm.pontualidade,
          driver_cumprimento_orientacoes: evalForm.cumprimentoOrientacoes,
          driver_relacionamento_interno: evalForm.relacionamentoInterno,
          driver_cuidado_carga: evalForm.cuidadoCarga,
          driver_regras_seguranca: evalForm.regrasSeguranca,
          driver_qualidade_geral: evalForm.qualidadeGeral,
          driver_avg_score: Number(avgDriver.toFixed(2)),
          driver_recommendation: evalForm.recommendation,
          vehicle_conservacao: evalForm.conservacao,
          vehicle_limpeza: evalForm.limpeza,
          vehicle_condicoes_aparentes: evalForm.condicoesAparentes,
          vehicle_amarracao: evalForm.amarracao,
          vehicle_regras_internas: evalForm.regrasInternas,
          vehicle_avg_score: Number(avgVehicle.toFixed(2)),
          justification_critical: evalForm.justificationCritical,
          general_notes: evalForm.notes,
        },
        user?.email,
        user?.name,
      )

      setOpenEvalModal(false)
      loadData()
    } catch (err) {
      console.error('Falha ao salvar avaliação:', err)
    }
  }

  // Submissão de Reclamação
  const handleSaveComplaint = async () => {
    try {
      await carrierHistoryService.createComplaint(
        {
          complaint_number: '',
          target_type: complaintForm.targetType,
          category: complaintForm.category,
          severity: complaintForm.severity,
          driver_name: complaintForm.driverName,
          vehicle_plate: complaintForm.vehiclePlate,
          sap_transport_number: complaintForm.sapTransportNumber,
          origin_type: complaintForm.originType,
          description: complaintForm.description,
          status: 'REGISTRADA',
        },
        user?.email,
        user?.name,
      )

      setOpenComplaintModal(false)
      loadData()
    } catch (err) {
      console.error('Falha ao registrar reclamação:', err)
    }
  }

  // Submissão de Elogio
  const handleSaveCompliment = async () => {
    try {
      await carrierHistoryService.createCompliment(
        {
          compliment_number: '',
          category: complimentForm.category,
          driver_name: complimentForm.driverName,
          vehicle_plate: complimentForm.vehiclePlate,
          sap_transport_number: complimentForm.sapTransportNumber,
          origin_type: complimentForm.originType,
          description: complimentForm.description,
        },
        user?.name,
      )

      setOpenComplimentModal(false)
      loadData()
    } catch (err) {
      console.error('Falha ao registrar elogio:', err)
    }
  }

  // Submissão de Tratamento de Reclamação
  const handleSaveTreatment = async () => {
    if (!selectedComplaintForTreatment?.id) return
    try {
      await carrierHistoryService.updateComplaintTreatment(selectedComplaintForTreatment.id, {
        status: treatmentStatus,
        analysis_notes: treatmentNotes,
        driver_carrier_manifestation: manifestation,
        conclusion: conclusion,
        action_taken: actionTaken,
        analyst_email: user?.email || 'supervisor@ciafal.com.br',
        analyst_name: user?.name || 'Supervisor Logística',
      })

      setSelectedComplaintForTreatment(null)
      loadData()
    } catch (err) {
      console.error('Falha ao atualizar tratamento:', err)
    }
  }

  // Timeline cronológica unificada
  const timelineEvents = useMemo(() => {
    const events: Array<{
      id: string
      date: string
      type: 'AVALIACAO' | 'RECLAMACAO' | 'ELOGIO' | 'HISTORICO'
      title: string
      description: string
      badge: string
      badgeColor: string
      driver?: string
      plate?: string
    }> = []

    evaluations.forEach((e) => {
      events.push({
        id: e.id || `eval-${Math.random()}`,
        date: e.created || e.evaluation_date || '',
        type: 'AVALIACAO',
        title: `Avaliação Registrada: ${e.target_type}`,
        description: `Nota Motorista: ${e.driver_avg_score ? e.driver_avg_score.toFixed(1) : '—'} • Veículo: ${e.vehicle_avg_score ? e.vehicle_avg_score.toFixed(1) : '—'} (Origem: ${e.origin_type})`,
        badge: 'Avaliação 1-5',
        badgeColor: 'bg-sky-600',
        driver: e.driver_name,
        plate: e.vehicle_plate,
      })
    })

    complaints.forEach((c) => {
      events.push({
        id: c.id || `comp-${Math.random()}`,
        date: c.created || c.occurrence_date || '',
        type: 'RECLAMACAO',
        title: `Reclamação ${c.complaint_number}: ${c.category}`,
        description: `${c.description} (Status: ${c.status})`,
        badge: c.status,
        badgeColor: c.status === 'PROCEDENTE' ? 'bg-rose-600' : 'bg-amber-600',
        driver: c.driver_name,
        plate: c.vehicle_plate,
      })
    })

    compliments.forEach((co) => {
      events.push({
        id: co.id || `compl-${Math.random()}`,
        date: co.created || co.compliment_date || '',
        type: 'ELOGIO',
        title: `Elogio Registrado: ${co.category}`,
        description: co.description,
        badge: 'Ocorrência Positiva',
        badgeColor: 'bg-emerald-600',
        driver: co.driver_name,
        plate: co.vehicle_plate,
      })
    })

    return events.sort((a, b) => b.date.localeCompare(a.date))
  }, [evaluations, complaints, compliments])

  return (
    <div className="space-y-5 pb-12">
      {/* Cabeçalho Oficial */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-[#005596]/10 text-[#005596] rounded-xl border border-[#005596]/20">
            <Award className="w-7 h-7 text-[#005596]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Avaliação Veículo / Motorista
              </h1>
              <Badge className="bg-[#005596] text-white text-[10px] uppercase font-bold">
                Contratação & Qualidade
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestão da qualidade operacional, avaliações estruturadas segregadas, tratamento humano
              de reclamações e reconhecimento de ocorrências positivas.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setOpenEvalModal(true)}
            className="bg-[#005596] hover:bg-[#004070] text-white text-xs gap-1.5"
          >
            <Star className="w-3.5 h-3.5" />
            Nova Avaliação
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpenComplaintModal(true)}
            className="text-xs gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-50"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-amber-700" />
            Registrar Reclamação
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpenComplimentModal(true)}
            className="text-xs gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          >
            <ThumbsUp className="w-3.5 h-3.5 text-emerald-700" />
            Registrar Elogio
          </Button>
        </div>
      </div>

      {/* Regra de Governança CIAFAL */}
      <div className="bg-sky-50 border border-sky-200 text-sky-950 p-4 rounded-xl text-xs space-y-1">
        <div className="flex items-center gap-2 font-bold text-[#005596]">
          <ShieldCheck className="w-4 h-4 text-[#005596] shrink-0" />
          Diretriz de Análise e Tratamento Humano CIAFAL
        </div>
        <p className="text-sky-900 leading-relaxed">
          Uma reclamação registrada <strong>
            NÃO deduz automaticamente o score definitivo
          </strong> do
          prestador. Ela permanece em apuração até análise de evidências e julgamento formal por
          supervisor ou gestor autorizado. Falha técnica do veículo não afeta o motorista, e
          comportamento do motorista não afeta a avaliação técnica do veículo.
        </p>
      </div>

      {/* Cards de Métricas da Qualidade */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-slate-200">
          <CardContent className="p-3 text-center">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Avaliações Feitas
            </span>
            <span className="text-lg font-black text-slate-900">{evaluations.length}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Operacionais 1 a 5</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-3 text-center">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Reclamações em Aberto
            </span>
            <span className="text-lg font-black text-amber-600">
              {
                complaints.filter((c) => c.status === 'REGISTRADA' || c.status === 'EM_ANALISE')
                  .length
              }
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Aguardando Tratamento</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-3 text-center">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Reclamações Procedentes
            </span>
            <span className="text-lg font-black text-rose-700">
              {complaints.filter((c) => c.status === 'PROCEDENTE').length}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Confirmadas com Evidência
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-3 text-center">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Elogios Registrados
            </span>
            <span className="text-lg font-black text-emerald-700">{compliments.length}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Reconhecimento Positivo</span>
          </CardContent>
        </Card>
      </div>

      {/* Abas: Reclamações, Avaliações, Elogios e Timeline */}
      <Tabs defaultValue="reclamacoes" className="w-full">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl text-xs flex flex-wrap gap-1 shadow-sm">
          <TabsTrigger
            value="reclamacoes"
            className="text-xs data-[state=active]:bg-[#005596] data-[state=active]:text-white"
          >
            <AlertOctagon className="w-3.5 h-3.5 mr-1.5" />
            Reclamações & Tratamento ({complaints.length})
          </TabsTrigger>
          <TabsTrigger
            value="avaliacoes"
            className="text-xs data-[state=active]:bg-[#005596] data-[state=active]:text-white"
          >
            <Star className="w-3.5 h-3.5 mr-1.5" />
            Avaliações Estruturadas ({evaluations.length})
          </TabsTrigger>
          <TabsTrigger
            value="elogios"
            className="text-xs data-[state=active]:bg-[#005596] data-[state=active]:text-white"
          >
            <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
            Elogios & Destaques ({compliments.length})
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className="text-xs data-[state=active]:bg-[#005596] data-[state=active]:text-white"
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Timeline Cronológica do Prestador
          </TabsTrigger>
        </TabsList>

        {/* ABA: RECLAMAÇÕES & TRATAMENTO */}
        <TabsContent value="reclamacoes" className="space-y-3 pt-2">
          {complaints.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800 text-sm">Nenhuma reclamação cadastrada</h3>
              <p className="text-xs text-slate-500 mt-1">
                Nenhuma ocorrência crítica registrada no momento.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Nº / Data</th>
                    <th className="py-2.5 px-3">Objeto / Alvo</th>
                    <th className="py-2.5 px-3">Categoria</th>
                    <th className="py-2.5 px-3">Severidade</th>
                    <th className="py-2.5 px-3">Origem</th>
                    <th className="py-2.5 px-3">Descrição Resumida</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {complaints.map((c) => (
                    <tr key={c.id || c.complaint_number} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3">
                        <strong className="text-slate-900 block">{c.complaint_number}</strong>
                        <span className="text-[10px] text-slate-400">
                          {formatDate(c.occurrence_date || c.created)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800 block">
                          {c.driver_name || '—'}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {c.vehicle_plate || '—'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{c.category}</td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant="outline"
                          className={
                            c.severity === 'CRITICA'
                              ? 'border-rose-400 text-rose-700 font-bold'
                              : c.severity === 'ALTA'
                                ? 'border-amber-400 text-amber-700 font-bold'
                                : 'text-slate-600'
                          }
                        >
                          {c.severity}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{c.origin_type}</td>
                      <td
                        className="py-2.5 px-3 text-slate-700 max-w-[240px] truncate"
                        title={c.description}
                      >
                        {c.description}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          className={
                            c.status === 'PROCEDENTE'
                              ? 'bg-rose-600 text-white'
                              : c.status === 'IMPROCEDENTE'
                                ? 'bg-slate-500 text-white'
                                : c.status === 'TRATADA' || c.status === 'ENCERRADA'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-amber-500 text-white'
                          }
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedComplaintForTreatment(c)
                            setTreatmentStatus(c.status)
                            setTreatmentNotes(c.analysis_notes || '')
                            setManifestation(c.driver_carrier_manifestation || '')
                            setConclusion(c.conclusion || '')
                            setActionTaken(c.action_taken || '')
                          }}
                          className="h-7 text-xs text-[#005596] border-[#005596]/30 hover:bg-sky-50 px-2"
                        >
                          Tratar / Analisar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ABA: AVALIAÇÕES ESTRUTURADAS */}
        <TabsContent value="avaliacoes" className="space-y-3 pt-2">
          {evaluations.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <Star className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800 text-sm">
                Nenhuma avaliação estruturada registrada
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Clique em "Nova Avaliação" para cadastrar notas operacionais.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Data / Origem</th>
                    <th className="py-2.5 px-3">Objeto Avaliado</th>
                    <th className="py-2.5 px-3">Motorista</th>
                    <th className="py-2.5 px-3">Placa Veículo</th>
                    <th className="py-2.5 px-3 text-center">Nota Motorista</th>
                    <th className="py-2.5 px-3 text-center">Nota Veículo</th>
                    <th className="py-2.5 px-3 text-center">Recomenda Recontratar?</th>
                    <th className="py-2.5 px-3">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evaluations.map((ev, i) => (
                    <tr key={ev.id || i} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800 block">
                          {formatDate(ev.evaluation_date || ev.created)}
                        </span>
                        <span className="text-[10px] text-slate-400">{ev.origin_type}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-[10px]">
                          {ev.target_type}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {ev.driver_name || 'Não informado'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                        {ev.vehicle_plate || 'Não informado'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-sky-700">
                        {ev.driver_avg_score ? `${ev.driver_avg_score.toFixed(1)} / 5` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-indigo-700">
                        {ev.vehicle_avg_score ? `${ev.vehicle_avg_score.toFixed(1)} / 5` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          className={
                            ev.driver_recommendation === 'SIM'
                              ? 'bg-emerald-600 text-white text-[10px]'
                              : ev.driver_recommendation === 'NAO'
                                ? 'bg-rose-600 text-white text-[10px]'
                                : 'bg-amber-500 text-white text-[10px]'
                          }
                        >
                          {ev.driver_recommendation || 'SIM'}
                        </Badge>
                      </td>
                      <td
                        className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate"
                        title={ev.general_notes}
                      >
                        {ev.general_notes || 'Sem observações'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ABA: ELOGIOS & DESTAQUES */}
        <TabsContent value="elogios" className="space-y-3 pt-2">
          {compliments.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <ThumbsUp className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800 text-sm">Nenhum elogio cadastrado</h3>
              <p className="text-xs text-slate-500 mt-1">
                Elogios de clientes e da expedição ajudam no score do prestador.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {compliments.map((cm, idx) => (
                <Card key={cm.id || idx} className="border-emerald-200 bg-emerald-50/20 shadow-sm">
                  <CardHeader className="py-2.5 px-3 border-b border-emerald-100 flex flex-row items-center justify-between">
                    <span className="font-bold text-emerald-800 text-xs flex items-center gap-1.5">
                      <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                      {cm.category}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-emerald-300 text-emerald-800 text-[9px]"
                    >
                      {formatDate(cm.compliment_date || cm.created)}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-[11px]">
                      <strong className="text-slate-900">{cm.driver_name || 'Motorista'}</strong>
                      <span className="font-mono text-slate-600">{cm.vehicle_plate}</span>
                    </div>
                    <p className="text-slate-700 italic bg-white p-2.5 rounded border border-emerald-100 text-[11px] leading-relaxed">
                      "{cm.description}"
                    </p>
                    <div className="text-[10px] text-slate-400 flex justify-between">
                      <span>Origem: {cm.origin_type}</span>
                      <span>Registrado por: {cm.registered_by_name || 'CIAFAL'}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ABA: TIMELINE CRONOLÓGICA */}
        <TabsContent value="timeline" className="space-y-3 pt-2">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#005596]" />
              Linha do Tempo Operacional Auditável
            </h3>
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {timelineEvents.map((ev) => (
                <div key={ev.id} className="relative pl-4 space-y-1 text-xs">
                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#005596]" />
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{ev.title}</span>
                    <Badge className={`${ev.badgeColor} text-white text-[9px] px-1.5 py-0`}>
                      {ev.badge}
                    </Badge>
                    <span className="text-[10px] text-slate-400 ml-auto">
                      {formatDate(ev.date)}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{ev.description}</p>
                  {(ev.driver || ev.plate) && (
                    <div className="text-[10px] text-slate-400 flex gap-2">
                      {ev.driver && (
                        <span>
                          Motorista: <strong>{ev.driver}</strong>
                        </span>
                      )}
                      {ev.plate && (
                        <span>
                          Placa: <strong>{ev.plate}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* MODAL 1: FORMULÁRIO DE AVALIAÇÃO                                          */}
      {/* ========================================================================= */}
      <Dialog open={openEvalModal} onOpenChange={setOpenEvalModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-white">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Star className="w-4 h-4 text-[#005596]" />
              Nova Avaliação Operacional de Prestador
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registrar nota de qualidade com segregação explícita entre motorista e veículo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Objeto da Avaliação
                </label>
                <select
                  value={evalForm.targetType}
                  onChange={(e) => setEvalForm({ ...evalForm, targetType: e.target.value as any })}
                  className="w-full h-8 px-2 bg-white border border-slate-200 rounded-md text-xs"
                >
                  <option value="MOTORISTA">Apenas Motorista</option>
                  <option value="VEICULO">Apenas Veículo</option>
                  <option value="MOTORISTA_VEICULO">Motorista + Veículo</option>
                  <option value="TRANSPORTE">Transporte Completo</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Motorista
                </label>
                <Input
                  value={evalForm.driverName}
                  onChange={(e) => setEvalForm({ ...evalForm, driverName: e.target.value })}
                  placeholder="Nome do motorista..."
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Placa do Veículo
                </label>
                <Input
                  value={evalForm.vehiclePlate}
                  onChange={(e) =>
                    setEvalForm({ ...evalForm, vehiclePlate: e.target.value.toUpperCase() })
                  }
                  placeholder="Ex: ABC1D23"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* Critérios do Motorista */}
            {(evalForm.targetType === 'MOTORISTA' ||
              evalForm.targetType === 'MOTORISTA_VEICULO' ||
              evalForm.targetType === 'TRANSPORTE') && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
                <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <User className="w-3.5 h-3.5 text-[#005596]" />
                  Critérios do Motorista (1 a 5 estrelas)
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <label className="block text-slate-600 mb-0.5">Pontualidade (1-5)</label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={evalForm.pontualidade}
                      onChange={(e) =>
                        setEvalForm({ ...evalForm, pontualidade: Number(e.target.value) })
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Postura & Relacionamento</label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={evalForm.relacionamentoInterno}
                      onChange={(e) =>
                        setEvalForm({ ...evalForm, relacionamentoInterno: Number(e.target.value) })
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Cuidado com Carga</label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={evalForm.cuidadoCarga}
                      onChange={(e) =>
                        setEvalForm({ ...evalForm, cuidadoCarga: Number(e.target.value) })
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Regras de Segurança</label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={evalForm.regrasSeguranca}
                      onChange={(e) =>
                        setEvalForm({ ...evalForm, regrasSeguranca: Number(e.target.value) })
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Qualidade Geral</label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={evalForm.qualidadeGeral}
                      onChange={(e) =>
                        setEvalForm({ ...evalForm, qualidadeGeral: Number(e.target.value) })
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Recontrataria?</label>
                    <select
                      value={evalForm.recommendation}
                      onChange={(e) =>
                        setEvalForm({ ...evalForm, recommendation: e.target.value as any })
                      }
                      className="w-full h-7 px-2 bg-white border border-slate-200 rounded text-xs"
                    >
                      <option value="SIM">Sim</option>
                      <option value="SIM_COM_RESSALVAS">Sim com ressalvas</option>
                      <option value="NAO">Não</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Critérios do Veículo */}
            {(evalForm.targetType === 'VEICULO' ||
              evalForm.targetType === 'MOTORISTA_VEICULO' ||
              evalForm.targetType === 'TRANSPORTE') && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
                <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Truck className="w-3.5 h-3.5 text-[#005596]" />
                  Critérios do Veículo (1 a 5 estrelas — Operacional)
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <label className="block text-slate-600 mb-0.5">Conservação & Carroceria</label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={evalForm.conservacao}
                      onChange={(e) =>
                        setEvalForm({ ...evalForm, conservacao: Number(e.target.value) })
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Limpeza</label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={evalForm.limpeza}
                      onChange={(e) =>
                        setEvalForm({ ...evalForm, limpeza: Number(e.target.value) })
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Condições de Amarração</label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={evalForm.amarracao}
                      onChange={(e) =>
                        setEvalForm({ ...evalForm, amarracao: Number(e.target.value) })
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Observações Gerais
              </label>
              <textarea
                value={evalForm.notes}
                onChange={(e) => setEvalForm({ ...evalForm, notes: e.target.value })}
                placeholder="Observações complementares sobre a prestação do serviço..."
                className="w-full h-16 p-2 text-xs border border-slate-200 rounded-md"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenEvalModal(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEvaluation}
              className="bg-[#005596] hover:bg-[#004070] text-white text-xs"
            >
              Salvar Avaliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: FORMULÁRIO DE RECLAMAÇÃO                                         */}
      {/* ========================================================================= */}
      <Dialog open={openComplaintModal} onOpenChange={setOpenComplaintModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 bg-white">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-amber-600" />
              Registrar Reclamação Operacional
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              O registro passará por análise e contraditório por responsável antes de qualquer
              conclusão definitiva.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Alvo da Reclamação
                </label>
                <select
                  value={complaintForm.targetType}
                  onChange={(e) =>
                    setComplaintForm({ ...complaintForm, targetType: e.target.value as any })
                  }
                  className="w-full h-8 px-2 bg-white border border-slate-200 rounded-md text-xs"
                >
                  <option value="MOTORISTA">Motorista</option>
                  <option value="VEICULO">Veículo</option>
                  <option value="MOTORISTA_VEICULO">Motorista + Veículo</option>
                  <option value="TRANSPORTADORA">Transportadora</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Severidade
                </label>
                <select
                  value={complaintForm.severity}
                  onChange={(e) =>
                    setComplaintForm({ ...complaintForm, severity: e.target.value as any })
                  }
                  className="w-full h-8 px-2 bg-white border border-slate-200 rounded-md text-xs"
                >
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                  <option value="CRITICA">Crítica</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Motorista
                </label>
                <Input
                  value={complaintForm.driverName}
                  onChange={(e) =>
                    setComplaintForm({ ...complaintForm, driverName: e.target.value })
                  }
                  placeholder="Nome do motorista..."
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Placa
                </label>
                <Input
                  value={complaintForm.vehiclePlate}
                  onChange={(e) =>
                    setComplaintForm({
                      ...complaintForm,
                      vehiclePlate: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="Placa..."
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Descrição do Fato
              </label>
              <textarea
                value={complaintForm.description}
                onChange={(e) =>
                  setComplaintForm({ ...complaintForm, description: e.target.value })
                }
                placeholder="Descreva detalhadamente o fato ocorrido com dados objetivos..."
                className="w-full h-20 p-2 text-xs border border-slate-200 rounded-md"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenComplaintModal(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveComplaint}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
            >
              Registrar para Análise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: TRATAMENTO DE RECLAMAÇÃO (SUPERVISÃO)                            */}
      {/* ========================================================================= */}
      <Dialog
        open={!!selectedComplaintForTreatment}
        onOpenChange={(open) => !open && setSelectedComplaintForTreatment(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-white">
          {selectedComplaintForTreatment && (
            <>
              <DialogHeader className="pb-3 border-b border-slate-100">
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#005596]" />
                  Tratamento e Julgamento: {selectedComplaintForTreatment.complaint_number}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Registrar contraditório, análise de evidências e conclusão formal com trilha de
                  auditoria.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-800 text-xs mb-1">
                    Descrição Original do Fato:
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {selectedComplaintForTreatment.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Conclusão do Julgamento
                    </label>
                    <select
                      value={treatmentStatus}
                      onChange={(e) => setTreatmentStatus(e.target.value as any)}
                      className="w-full h-8 px-2 bg-white border border-slate-200 rounded-md text-xs font-semibold"
                    >
                      <option value="EM_ANALISE">Em Análise / Diligência</option>
                      <option value="PROCEDENTE">Procedente (Confirmada com Falha)</option>
                      <option value="PARCIALMENTE_PROCEDENTE">Parcialmente Procedente</option>
                      <option value="IMPROCEDENTE">Improcedente (Sem Culpa do Prestador)</option>
                      <option value="ACAO_NECESSARIA">Ação Corretiva Necessária</option>
                      <option value="TRATADA">Tratada e Orientada</option>
                      <option value="ENCERRADA">Encerrada</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Manifestação do Motorista / Transportadora
                    </label>
                    <Input
                      value={manifestation}
                      onChange={(e) => setManifestation(e.target.value)}
                      placeholder="Posicionamento apresentado..."
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Análise do Supervisor e Conclusão Técnica
                  </label>
                  <textarea
                    value={conclusion}
                    onChange={(e) => setConclusion(e.target.value)}
                    placeholder="Justificativa da procedência ou improcedência..."
                    className="w-full h-16 p-2 text-xs border border-slate-200 rounded-md"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Ação Tomada / Plano de Ação
                  </label>
                  <Input
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    placeholder="Ex: Orientação formal, ressarcimento, advertência..."
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedComplaintForTreatment(null)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveTreatment}
                  className="bg-[#005596] hover:bg-[#004070] text-white text-xs"
                >
                  Homologar Tratamento
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: FORMULÁRIO DE ELOGIO                                             */}
      {/* ========================================================================= */}
      <Dialog open={openComplimentModal} onOpenChange={setOpenComplimentModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 bg-white">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-emerald-600" />
              Registrar Elogio / Reconhecimento Operacional
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registrar ocorrência positiva observada por cliente, expedição ou gestão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Categoria do Elogio
                </label>
                <select
                  value={complimentForm.category}
                  onChange={(e) =>
                    setComplimentForm({ ...complimentForm, category: e.target.value as any })
                  }
                  className="w-full h-8 px-2 bg-white border border-slate-200 rounded-md text-xs"
                >
                  <option value="ELOGIO_CLIENTE">Elogio de Cliente</option>
                  <option value="ELOGIO_EXPEDICAO">Elogio da Expedição</option>
                  <option value="BOA_ATUACAO_OCORRENCIA">Boa Atuação em Ocorrência</option>
                  <option value="DISPONIBILIDADE_EXTRAORDINARIA">
                    Disponibilidade Extraordinária
                  </option>
                  <option value="EXCELENTE_COMUNICACAO">Excelente Comunicação</option>
                  <option value="CUMPRIMENTO_EXCEPCIONAL">Cumprimento Excepcional</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Origem
                </label>
                <select
                  value={complimentForm.originType}
                  onChange={(e) =>
                    setComplimentForm({ ...complimentForm, originType: e.target.value as any })
                  }
                  className="w-full h-8 px-2 bg-white border border-slate-200 rounded-md text-xs"
                >
                  <option value="CLIENTE">Cliente</option>
                  <option value="EXPEDICAO">Expedição</option>
                  <option value="COMERCIAL">Comercial</option>
                  <option value="TRANSPORTE_LOGISTICA">Transporte / Logística</option>
                  <option value="GESTOR">Gestor</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Motorista
                </label>
                <Input
                  value={complimentForm.driverName}
                  onChange={(e) =>
                    setComplimentForm({ ...complimentForm, driverName: e.target.value })
                  }
                  placeholder="Nome do motorista..."
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Placa Veículo
                </label>
                <Input
                  value={complimentForm.vehiclePlate}
                  onChange={(e) =>
                    setComplimentForm({
                      ...complimentForm,
                      vehiclePlate: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="Placa..."
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Descrição do Elogio
              </label>
              <textarea
                value={complimentForm.description}
                onChange={(e) =>
                  setComplimentForm({ ...complimentForm, description: e.target.value })
                }
                placeholder="Descreva o reconhecimento..."
                className="w-full h-20 p-2 text-xs border border-slate-200 rounded-md"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenComplimentModal(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveCompliment}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              Salvar Elogio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CarrierEvaluationPage
