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
  Search,
  Check,
  Building2,
  Package,
  Radio,
  FileWarning,
  Eye,
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
  CarrierComplaintReason,
} from '@/domain/carrierHistoryEngine'
import { carrierHistoryService } from '@/services/carrierHistoryService'
import { toast } from '@/hooks/use-toast'

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

  // Parametrização e Autocomplete para Reclamações Operacionais
  const [reasonsList, setReasonsList] = useState<CarrierComplaintReason[]>([])
  const [transportOrders, setTransportOrders] = useState<
    Array<{
      transport_order_number: string
      sap_transport_number: string
      driver_name: string
      driver_id: string
      vehicle_plate: string
      carrier_name: string
      itinerary_code: string
      itinerary_description: string
      operation_date: string
      customer_summary: string
      remessas: Array<{
        delivery_number: string
        order_number: string
        customer_code: string
        customer_name: string
      }>
    }>
  >([])

  // Formulário Avançado de Reclamação Operacional
  const [complaintForm, setComplaintForm] = useState<{
    targetType: CarrierComplaintRecord['target_type']
    severity: CarrierComplaintRecord['severity']
    originChannel: 'WS' | 'CLIENTE'
    // Identificação de Transporte & Operação
    hasTransportLink: boolean
    unlinkedJustification: string
    transportOrderNumber: string
    sapTransportNumber: string
    deliveryNumber: string
    customerCode: string
    customerName: string
    customerDisplay: string
    driverName: string
    driverId: string
    vehiclePlate: string
    carrierName: string
    itineraryCode: string
    operationDate: string
    // Motivo padronizado
    reasonCode: string
    reasonName: string
    reasonSpecification: string
    requiresSpecification: boolean
    description: string
  }>({
    targetType: 'MOTORISTA',
    severity: 'MEDIA',
    originChannel: 'WS',
    hasTransportLink: true,
    unlinkedJustification: '',
    transportOrderNumber: '',
    sapTransportNumber: '',
    deliveryNumber: '',
    customerCode: '',
    customerName: '',
    customerDisplay: '',
    driverName: '',
    driverId: '',
    vehiclePlate: '',
    carrierName: '',
    itineraryCode: '',
    operationDate: '',
    reasonCode: '',
    reasonName: '',
    reasonSpecification: '',
    requiresSpecification: false,
    description: '',
  })

  // Pesquisas internas no modal
  const [otSearchQuery, setOtSearchQuery] = useState('')
  const [isOtDropdownOpen, setIsOtDropdownOpen] = useState(false)
  const [reasonSearchQuery, setReasonSearchQuery] = useState('')
  const [selectedOtObject, setSelectedOtObject] = useState<any>(null)
  const [selectedComplaintDetail, setSelectedComplaintDetail] =
    useState<CarrierComplaintRecord | null>(null)
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false)

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
      const [evalsRes, compRes, complRes, histRes, reasonsRes, ordersRes] = await Promise.all([
        carrierHistoryService.getEvaluations(),
        carrierHistoryService.getComplaints(),
        carrierHistoryService.getCompliments(),
        carrierHistoryService.getOperationalHistory({ perPage: 100 }),
        carrierHistoryService.getComplaintReasons(),
        carrierHistoryService.getAvailableTransportOrders(100),
      ])
      setEvaluations(evalsRes)
      setComplaints(compRes)
      setCompliments(complRes)
      setHistoryList(histRes.items)
      setReasonsList(reasonsRes)
      setTransportOrders(ordersRes)
    } catch (err) {
      console.error('Erro ao carregar dados de avaliação:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Selecionar Ordem de Transporte e preencher dados automaticamente
  const handleSelectTransportOrder = (order: (typeof transportOrders)[0]) => {
    setSelectedOtObject(order)
    setOtSearchQuery(order.transport_order_number)
    setIsOtDropdownOpen(false)

    const defaultRemessa = order.remessas.length === 1 ? order.remessas[0].delivery_number : ''
    const defaultCust =
      order.remessas.length === 1
        ? `${order.remessas[0].customer_code} — ${order.remessas[0].customer_name}`
        : order.customer_summary

    setComplaintForm((prev) => ({
      ...prev,
      hasTransportLink: true,
      transportOrderNumber: order.transport_order_number,
      sapTransportNumber: order.sap_transport_number,
      deliveryNumber: defaultRemessa,
      customerCode: order.remessas[0]?.customer_code || '',
      customerName: order.remessas[0]?.customer_name || order.customer_summary,
      customerDisplay: defaultCust,
      driverName: order.driver_name || prev.driverName,
      driverId: order.driver_id || prev.driverId,
      vehiclePlate: order.vehicle_plate || prev.vehiclePlate,
      carrierName: order.carrier_name || prev.carrierName,
      itineraryCode: order.itinerary_code || prev.itineraryCode,
      operationDate: order.operation_date || prev.operationDate,
    }))
  }

  // Filtragem de OTs para autocomplete
  const filteredOtList = useMemo(() => {
    if (!otSearchQuery.trim()) return transportOrders.slice(0, 10)
    const q = otSearchQuery.toLowerCase()
    return transportOrders
      .filter(
        (o) =>
          o.transport_order_number.toLowerCase().includes(q) ||
          o.sap_transport_number.toLowerCase().includes(q) ||
          o.driver_name.toLowerCase().includes(q) ||
          o.vehicle_plate.toLowerCase().includes(q) ||
          o.customer_summary.toLowerCase().includes(q) ||
          o.remessas.some((r) => r.delivery_number.toLowerCase().includes(q)),
      )
      .slice(0, 15)
  }, [transportOrders, otSearchQuery])

  // Filtragem de Motivos
  const filteredReasons = useMemo(() => {
    if (!reasonSearchQuery.trim()) return reasonsList
    const q = reasonSearchQuery.toLowerCase()
    return reasonsList.filter(
      (r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q),
    )
  }, [reasonsList, reasonSearchQuery])

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

  // Submissão de Reclamação Operacional Governamental
  const handleSaveComplaint = async () => {
    // 1. Validações locais conforme especificação
    if (!complaintForm.targetType) {
      toast({
        title: 'Campo Obrigatório',
        description: 'Selecione o Alvo da Reclamação.',
        variant: 'destructive',
      })
      return
    }
    if (!complaintForm.severity) {
      toast({
        title: 'Campo Obrigatório',
        description: 'Selecione a Severidade.',
        variant: 'destructive',
      })
      return
    }
    if (!complaintForm.originChannel) {
      toast({
        title: 'Campo Obrigatório',
        description: 'Selecione a Origem (WS ou Cliente).',
        variant: 'destructive',
      })
      return
    }
    if (!complaintForm.reasonName) {
      toast({
        title: 'Campo Obrigatório',
        description: 'Selecione o Motivo da Reclamação.',
        variant: 'destructive',
      })
      return
    }
    if (
      (complaintForm.reasonName.toLowerCase().includes('outros') ||
        complaintForm.requiresSpecification) &&
      !complaintForm.reasonSpecification.trim()
    ) {
      toast({
        title: 'Especificação Obrigatória',
        description:
          'Ao selecionar o motivo "Outros", é obrigatório detalhar o campo "Especifique o motivo".',
        variant: 'destructive',
      })
      return
    }
    if (!complaintForm.description.trim()) {
      toast({
        title: 'Campo Obrigatório',
        description: 'Preencha a Descrição do Fato.',
        variant: 'destructive',
      })
      return
    }
    if (
      !complaintForm.hasTransportLink &&
      (!complaintForm.unlinkedJustification ||
        complaintForm.unlinkedJustification.trim().length < 5)
    ) {
      toast({
        title: 'Justificativa Obrigatória',
        description:
          'Para reclamação sem vínculo com transporte/remessa, informe a justificativa detalhada.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmittingComplaint(true)
    try {
      const res = await carrierHistoryService.registerComplaintGoverned({
        target_type: complaintForm.targetType,
        severity: complaintForm.severity,
        origin_channel: complaintForm.originChannel,
        reason_code: complaintForm.reasonCode,
        reason_name: complaintForm.reasonName,
        reason_specification: complaintForm.reasonSpecification,
        description: complaintForm.description.trim(),
        transport_order_number: complaintForm.hasTransportLink
          ? complaintForm.transportOrderNumber
          : '',
        sap_transport_number: complaintForm.hasTransportLink
          ? complaintForm.sapTransportNumber
          : '',
        delivery_number: complaintForm.hasTransportLink ? complaintForm.deliveryNumber : '',
        customer_code: complaintForm.customerCode,
        customer_name: complaintForm.customerName,
        customer_display: complaintForm.customerDisplay,
        driver_name: complaintForm.driverName,
        driver_id: complaintForm.driverId,
        vehicle_plate: complaintForm.vehiclePlate,
        carrier_name: complaintForm.carrierName,
        itinerary_code: complaintForm.itineraryCode,
        operation_date: complaintForm.operationDate,
        has_transport_link: complaintForm.hasTransportLink,
        unlinked_transport_justification: complaintForm.unlinkedJustification,
        user_email: user?.email,
        user_name: user?.name,
        user_role: user?.role,
      })

      toast({
        title: 'Reclamação Registrada',
        description:
          res.message ||
          `Reclamação ${res.complaint_number} registrada com sucesso e encaminhada para análise.`,
        className: 'bg-emerald-600 text-white border-0',
      })

      // Atualizar lista imediatamente em memória para não precisar de F5
      if (res.record) {
        setComplaints((prev) => [res.record, ...prev.filter((item) => item.id !== res.record.id)])
      }

      setOpenComplaintModal(false)
      // Resetar formulário
      setComplaintForm({
        targetType: 'MOTORISTA',
        severity: 'MEDIA',
        originChannel: 'WS',
        hasTransportLink: true,
        unlinkedJustification: '',
        transportOrderNumber: '',
        sapTransportNumber: '',
        deliveryNumber: '',
        customerCode: '',
        customerName: '',
        customerDisplay: '',
        driverName: '',
        driverId: '',
        vehiclePlate: '',
        carrierName: '',
        itineraryCode: '',
        operationDate: '',
        reasonCode: '',
        reasonName: '',
        reasonSpecification: '',
        requiresSpecification: false,
        description: '',
      })
      setSelectedOtObject(null)
      setOtSearchQuery('')

      // Recarregar os dados do backend em segundo plano
      loadData()
    } catch (err: any) {
      console.error('Falha ao registrar reclamação:', err)
      toast({
        title: 'Erro ao Registrar',
        description: err.message || 'Falha na comunicação com o servidor.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingComplaint(false)
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
        title: `Reclamação ${c.complaint_number}: ${c.reason_name || c.category}`,
        description: `${c.description} (Status: ${c.status})`,
        badge: c.status,
        badgeColor:
          c.status === 'PROCEDENTE'
            ? 'bg-rose-600'
            : c.status === 'IMPROCEDENTE'
              ? 'bg-slate-500'
              : c.status === 'TRATADA' || c.status === 'ENCERRADA'
                ? 'bg-emerald-600'
                : 'bg-amber-600',
        driver: c.driver_name,
        plate: c.vehicle_plate,
        rawComplaint: c,
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

        {/* ABA: RECLAMAÇÕES & TRATAMENTO (EXPANDIDA COM DADOS OPERACIONAIS) */}
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
                    <th className="py-2.5 px-3">OT / Remessa</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Origem</th>
                    <th className="py-2.5 px-3">Motivo Padronizado</th>
                    <th className="py-2.5 px-3">Motorista / Placa</th>
                    <th className="py-2.5 px-3">Severidade</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {complaints.map((c) => (
                    <tr
                      key={c.id || c.complaint_number}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <strong className="text-[#005596] block font-mono text-[11px]">
                          {c.complaint_number}
                        </strong>
                        <span className="text-[10px] text-slate-400">
                          {formatDate(c.occurrence_date || c.created)}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        {c.transport_order_number || c.sap_transport_number ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-800 block">
                              {c.transport_order_number || c.sap_transport_number}
                            </span>
                            {c.delivery_number && (
                              <span className="font-mono text-[10px] text-slate-500 block">
                                Remessa: {c.delivery_number}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-700 italic">Sem vínculo OT</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className="font-medium text-slate-800 block max-w-[150px] truncate"
                          title={c.customer_display || c.customer_name}
                        >
                          {c.customer_display || c.customer_name || '—'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <Badge
                          variant="outline"
                          className={
                            c.origin_channel === 'CLIENTE'
                              ? 'border-indigo-300 text-indigo-700 bg-indigo-50/40 text-[10px]'
                              : 'border-slate-300 text-slate-700 bg-slate-50 text-[10px]'
                          }
                        >
                          {c.origin_channel || (c.origin_type === 'CLIENTE' ? 'CLIENTE' : 'WS')}
                        </Badge>
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className="font-medium text-slate-900 block max-w-[170px] truncate"
                          title={c.reason_name || c.category}
                        >
                          {c.reason_name || c.category}
                        </span>
                        {c.reason_specification && (
                          <span className="text-[10px] text-slate-500 block truncate max-w-[170px]">
                            {c.reason_specification}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800 block truncate max-w-[120px]">
                          {c.driver_name || '—'}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {c.vehicle_plate || '—'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <Badge
                          variant="outline"
                          className={
                            c.severity === 'CRITICA'
                              ? 'border-rose-400 text-rose-700 font-bold text-[10px]'
                              : c.severity === 'ALTA'
                                ? 'border-amber-400 text-amber-700 font-bold text-[10px]'
                                : 'text-slate-600 text-[10px]'
                          }
                        >
                          {c.severity}
                        </Badge>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          className={
                            c.status === 'PROCEDENTE'
                              ? 'bg-rose-600 text-white text-[10px]'
                              : c.status === 'IMPROCEDENTE'
                                ? 'bg-slate-500 text-white text-[10px]'
                                : c.status === 'TRATADA' || c.status === 'ENCERRADA'
                                  ? 'bg-emerald-600 text-white text-[10px]'
                                  : 'bg-amber-500 text-white text-[10px]'
                          }
                        >
                          {c.status === 'REGISTRADA' ? 'AGUARDANDO ANÁLISE' : c.status}
                        </Badge>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedComplaintDetail(c)}
                            title="Ver Detalhes Completos da Reclamação"
                            className="h-7 w-7 p-0 text-slate-500 hover:text-[#005596]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
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
                            className="h-7 text-[11px] text-[#005596] border-[#005596]/30 hover:bg-sky-50 px-2"
                          >
                            Tratar
                          </Button>
                        </div>
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
      {/* MODAL 2: FORMULÁRIO DE RECLAMAÇÃO EVOLUÍDO (6 LINHAS CONFORME ESPECIFICAÇÃO)*/}
      {/* ========================================================================= */}
      <Dialog open={openComplaintModal} onOpenChange={setOpenComplaintModal}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-6 bg-white border border-slate-200 shadow-xl rounded-xl">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-700 rounded-lg border border-amber-500/20">
                  <AlertOctagon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900">
                    Registrar Reclamação Operacional
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Vinculação completa com OT, Remessa, Cliente, Motivo e Origem. Status inicial:
                    "Aguardando Análise".
                  </DialogDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] text-[#005596] border-[#005596]/30 font-medium"
              >
                HUB CIAFAL Logística
              </Badge>
            </div>
          </DialogHeader>

          {/* Vínculo com Transporte Alternador */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">Tipo de Registro:</span>
              <span className="text-slate-600">
                {complaintForm.hasTransportLink
                  ? 'Reclamação vinculada à Operação / Viagem'
                  : 'Reclamação sem vínculo com transporte/remessa'}
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                setComplaintForm((prev) => ({
                  ...prev,
                  hasTransportLink: !prev.hasTransportLink,
                }))
              }
              className="text-[#005596] hover:underline font-bold text-left sm:text-right"
            >
              {complaintForm.hasTransportLink
                ? 'Sem vínculo com transporte?'
                : 'Vincular a uma Ordem de Transporte'}
            </button>
          </div>

          {!complaintForm.hasTransportLink && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1.5 text-xs">
              <label className="text-[10px] font-bold uppercase text-amber-900 block flex items-center gap-1">
                <FileWarning className="w-3.5 h-3.5 text-amber-700" />
                Justificativa da Ausência de Vínculo com Transporte / Remessa *
              </label>
              <Input
                value={complaintForm.unlinkedJustification}
                onChange={(e) =>
                  setComplaintForm((prev) => ({ ...prev, unlinkedJustification: e.target.value }))
                }
                placeholder="Informe o motivo pelo qual a ocorrência não possui vínculo com Ordem de Transporte ou Remessa..."
                className="h-8 text-xs bg-white border-amber-300"
              />
            </div>
          )}

          {/* Formulário Estruturado em 6 Linhas conforme Item 4 */}
          <div className="space-y-3.5 pt-1 text-xs">
            {/* LINHA 1: Alvo da Reclamação | Severidade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                  Alvo da Reclamação *
                </label>
                <select
                  value={complaintForm.targetType}
                  onChange={(e) =>
                    setComplaintForm({ ...complaintForm, targetType: e.target.value as any })
                  }
                  className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-md text-xs font-medium focus:ring-1 focus:ring-[#005596]"
                >
                  <option value="MOTORISTA">Motorista</option>
                  <option value="VEICULO">Veículo</option>
                  <option value="MOTORISTA_VEICULO">Motorista + Veículo</option>
                  <option value="TRANSPORTADORA">Transportadora</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                  Severidade *
                </label>
                <select
                  value={complaintForm.severity}
                  onChange={(e) =>
                    setComplaintForm({ ...complaintForm, severity: e.target.value as any })
                  }
                  className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-md text-xs font-semibold focus:ring-1 focus:ring-[#005596]"
                >
                  <option value="BAIXA">Baixa — Impacto leve / Advertência</option>
                  <option value="MEDIA">Média — Ocorrência moderada</option>
                  <option value="ALTA">Alta — Falha grave de atendimento / Procedimento</option>
                  <option value="CRITICA">
                    Crítica — Risco de segurança / Avaria pesada / Sinistro
                  </option>
                </select>
              </div>
            </div>

            {/* LINHA 2: Ordem de Transporte | Remessa */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Ordem de Transporte com Autocomplete */}
              <div className="relative">
                <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                  Ordem de Transporte (OT) {complaintForm.hasTransportLink && '*'}
                </label>
                <div className="relative">
                  <Input
                    value={otSearchQuery || complaintForm.transportOrderNumber}
                    disabled={!complaintForm.hasTransportLink}
                    onChange={(e) => {
                      setOtSearchQuery(e.target.value)
                      setComplaintForm((prev) => ({
                        ...prev,
                        transportOrderNumber: e.target.value,
                      }))
                      setIsOtDropdownOpen(true)
                    }}
                    onFocus={() => complaintForm.hasTransportLink && setIsOtDropdownOpen(true)}
                    placeholder={
                      complaintForm.hasTransportLink
                        ? 'Pesquisar OT, SAP, motorista ou placa...'
                        : 'Sem vínculo com OT'
                    }
                    className="h-8 text-xs pr-8 bg-white"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>

                {/* Dropdown de sugestões OT */}
                {isOtDropdownOpen && complaintForm.hasTransportLink && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100 text-xs">
                    <div className="p-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase flex justify-between items-center">
                      <span>Ordens de Transporte ({filteredOtList.length})</span>
                      <button
                        type="button"
                        onClick={() => setIsOtDropdownOpen(false)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        ✕
                      </button>
                    </div>
                    {filteredOtList.length === 0 ? (
                      <div className="p-3 text-center text-slate-500 text-xs">
                        Nenhuma OT encontrada para a busca "{otSearchQuery}".
                      </div>
                    ) : (
                      filteredOtList.map((ot, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectTransportOrder(ot)}
                          className="p-2.5 hover:bg-sky-50/70 cursor-pointer transition-colors space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#005596]">
                              {ot.transport_order_number}
                              {ot.sap_transport_number && (
                                <span className="text-slate-500 font-normal ml-1">
                                  (SAP: {ot.sap_transport_number})
                                </span>
                              )}
                            </span>
                            <Badge variant="outline" className="font-mono text-[9px] px-1 py-0">
                              {ot.vehicle_plate || '—'}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-600">
                            <span>Motorista: {ot.driver_name || '—'}</span>
                            <span className="truncate max-w-[140px] text-slate-400">
                              {ot.customer_summary}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Remessa */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                  Remessa {complaintForm.hasTransportLink && '*'}
                </label>
                {selectedOtObject && selectedOtObject.remessas?.length > 1 ? (
                  <select
                    value={complaintForm.deliveryNumber}
                    onChange={(e) => {
                      const selRem = selectedOtObject.remessas.find(
                        (r: any) => r.delivery_number === e.target.value,
                      )
                      setComplaintForm((prev) => ({
                        ...prev,
                        deliveryNumber: e.target.value,
                        customerCode: selRem?.customer_code || prev.customerCode,
                        customerName: selRem?.customer_name || prev.customerName,
                        customerDisplay: selRem
                          ? `${selRem.customer_code} — ${selRem.customer_name}`
                          : prev.customerDisplay,
                      }))
                    }}
                    className="w-full h-8 px-2 bg-white border border-slate-200 rounded-md text-xs font-mono"
                  >
                    <option value="">Selecione a remessa desta OT...</option>
                    {selectedOtObject.remessas.map((r: any, idx: number) => (
                      <option key={idx} value={r.delivery_number}>
                        Remessa: {r.delivery_number} — {r.customer_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={complaintForm.deliveryNumber}
                    disabled={!complaintForm.hasTransportLink}
                    onChange={(e) =>
                      setComplaintForm({ ...complaintForm, deliveryNumber: e.target.value })
                    }
                    placeholder="Número da remessa..."
                    className="h-8 text-xs font-mono bg-white"
                  />
                )}
              </div>
            </div>

            {/* LINHA 3: Cliente | Origem da Reclamação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                  Cliente (Código — Razão Social) {complaintForm.hasTransportLink && '*'}
                </label>
                <div className="relative">
                  <Input
                    value={complaintForm.customerDisplay || complaintForm.customerName}
                    onChange={(e) =>
                      setComplaintForm({
                        ...complaintForm,
                        customerDisplay: e.target.value,
                        customerName: e.target.value,
                      })
                    }
                    placeholder="Código do cliente — Razão Social / Nome"
                    className="h-8 text-xs bg-white pl-8"
                  />
                  <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Origem da Reclamação: WS ou Cliente */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                  Origem da Reclamação * (Canal de Entrada)
                </label>
                <div className="grid grid-cols-2 gap-2 h-8">
                  <button
                    type="button"
                    onClick={() => setComplaintForm({ ...complaintForm, originChannel: 'WS' })}
                    className={`h-8 rounded-md border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      complaintForm.originChannel === 'WS'
                        ? 'bg-[#005596] text-white border-[#005596] shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current inline-block" />
                    WS (Operação Interna)
                  </button>

                  <button
                    type="button"
                    onClick={() => setComplaintForm({ ...complaintForm, originChannel: 'CLIENTE' })}
                    className={`h-8 rounded-md border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      complaintForm.originChannel === 'CLIENTE'
                        ? 'bg-[#005596] text-white border-[#005596] shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current inline-block" />
                    Cliente (Externo)
                  </button>
                </div>
              </div>
            </div>

            {/* LINHA 4: Motorista | Placa */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                  Motorista
                </label>
                <Input
                  value={complaintForm.driverName}
                  onChange={(e) =>
                    setComplaintForm({ ...complaintForm, driverName: e.target.value })
                  }
                  placeholder="Nome do motorista / prestador..."
                  className="h-8 text-xs bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                  Placa do Veículo
                </label>
                <Input
                  value={complaintForm.vehiclePlate}
                  onChange={(e) =>
                    setComplaintForm({
                      ...complaintForm,
                      vehiclePlate: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="Ex: ABC1D23"
                  className="h-8 text-xs font-mono uppercase bg-white"
                />
              </div>
            </div>

            {/* LINHA 5: Motivo da Reclamação | Especificação do Motivo (quando aplicável) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                  Motivo da Reclamação * (Padronizado)
                </label>
                <select
                  value={complaintForm.reasonName}
                  onChange={(e) => {
                    const selReason = reasonsList.find((r) => r.name === e.target.value)
                    const isOutros =
                      e.target.value.toLowerCase().includes('outros') ||
                      selReason?.requires_specification === true ||
                      selReason?.code === 'MOT-23'

                    setComplaintForm((prev) => ({
                      ...prev,
                      reasonName: e.target.value,
                      reasonCode: selReason?.code || '',
                      requiresSpecification: isOutros,
                    }))
                  }}
                  className="w-full h-8 px-2 bg-white border border-slate-200 rounded-md text-xs font-medium focus:ring-1 focus:ring-[#005596]"
                >
                  <option value="">Selecione o motivo padronizado...</option>
                  {reasonsList.map((r) => (
                    <option key={r.code} value={r.name}>
                      {r.order_index}. {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Especificação do motivo (visível ou obrigatório quando "Outros") */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                  Especificação do Motivo{' '}
                  {complaintForm.requiresSpecification ? (
                    <span className="text-rose-600 font-bold">* (Obrigatório para Outros)</span>
                  ) : (
                    <span className="text-slate-400 font-normal">(Opcional)</span>
                  )}
                </label>
                <Input
                  value={complaintForm.reasonSpecification}
                  disabled={!complaintForm.requiresSpecification && !complaintForm.reasonName}
                  onChange={(e) =>
                    setComplaintForm({ ...complaintForm, reasonSpecification: e.target.value })
                  }
                  placeholder={
                    complaintForm.requiresSpecification
                      ? 'Especifique detalhadamente o motivo da reclamação...'
                      : 'Especificação complementar (opcional)...'
                  }
                  className={`h-8 text-xs bg-white ${
                    complaintForm.requiresSpecification
                      ? 'border-amber-400 ring-1 ring-amber-300'
                      : ''
                  }`}
                />
              </div>
            </div>

            {/* LINHA 6: Descrição do Fato — 100% da Largura */}
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                Descrição do Fato * (Evidência Objetiva e Contexto)
              </label>
              <textarea
                value={complaintForm.description}
                onChange={(e) =>
                  setComplaintForm({ ...complaintForm, description: e.target.value })
                }
                rows={3}
                placeholder="Descreva objetivamente o fato ocorrido, incluindo local, data, situação observada e impacto causado."
                className="w-full p-2.5 text-xs border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-[#005596] placeholder:text-slate-400"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">
              * A gravação gera número único REC-TMS-XXXXXX/YYYY e cria registro em audit_logs.
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenComplaintModal(false)}
                className="text-xs"
                disabled={isSubmittingComplaint}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveComplaint}
                disabled={isSubmittingComplaint}
                className="bg-[#005596] hover:bg-[#004070] text-white text-xs font-bold gap-1.5"
              >
                {isSubmittingComplaint ? (
                  <span>Registrando...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Registrar para Análise
                  </>
                )}
              </Button>
            </div>
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
