import React, { useState } from 'react'
import {
  SmartAlertItem,
  SmartAlertRuleConfig,
  DEFAULT_ALERT_RULES,
  AlertType,
  AlertSeverity,
  AlertStatus,
} from '@/domain/smartAlertsEngine'
import { carrierHistoryService } from '@/services/carrierHistoryService'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  SlidersHorizontal,
  XCircle,
  FileText,
  User,
  Truck,
  Building,
  ArrowRight,
  Info,
} from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface SmartAlertsTabProps {
  alerts: SmartAlertItem[]
  onRefresh: () => void
  userEmail?: string
  userName?: string
  onOpenTransportDetail?: (orderNumber: string) => void
  onOpenDriver360?: (driverName: string) => void
  onOpenVehicle360?: (plate: string) => void
}

export const SmartAlertsTab: React.FC<SmartAlertsTabProps> = ({
  alerts,
  onRefresh,
  userEmail = 'admin.master@ciafal.com.br',
  userName = 'Administrador Master',
  onOpenTransportDetail,
  onOpenDriver360,
  onOpenVehicle360,
}) => {
  const { toast } = useToast()

  // Filtros
  const [filterType, setFilterType] = useState<string>('TODOS')
  const [filterSeverity, setFilterSeverity] = useState<string>('TODAS')
  const [filterStatus, setFilterStatus] = useState<string>('TODOS')
  const [searchTarget, setSearchTarget] = useState<string>('')

  // Modal de Detalhe e Tratamento
  const [selectedAlert, setSelectedAlert] = useState<SmartAlertItem | null>(null)
  const [targetStatus, setTargetStatus] = useState<AlertStatus>('EM_ANALISE')
  const [actionPlan, setActionPlan] = useState<string>('')
  const [actionDeadline, setActionDeadline] = useState<string>('')
  const [discardJustification, setDiscardJustification] = useState<string>('')
  const [resolutionNotes, setResolutionNotes] = useState<string>('')
  const [isSaving, setIsSaving] = useState<boolean>(false)

  // Modal de Configuração de Parâmetros de Alerta
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false)
  const [config, setConfig] = useState<SmartAlertRuleConfig>(DEFAULT_ALERT_RULES)

  // Filtragem dos alertas
  const filteredAlerts = alerts.filter((alt) => {
    if (filterType !== 'TODOS' && alt.alert_type !== filterType) return false
    if (filterSeverity !== 'TODAS' && alt.severity !== filterSeverity) return false
    if (filterStatus !== 'TODOS' && alt.status !== filterStatus) return false
    if (searchTarget.trim()) {
      const q = searchTarget.toLowerCase()
      const match =
        alt.driver_name?.toLowerCase().includes(q) ||
        alt.vehicle_plate?.toLowerCase().includes(q) ||
        alt.carrier_name?.toLowerCase().includes(q) ||
        alt.alert_code.toLowerCase().includes(q) ||
        alt.evidence_summary.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })

  // Badges visuais de severidade
  const getSeverityBadge = (sev: AlertSeverity) => {
    switch (sev) {
      case 'CRITICO':
        return <Badge className="bg-rose-600 text-white font-bold">Crítico</Badge>
      case 'IMPORTANTE':
        return <Badge className="bg-amber-600 text-white font-bold">Importante</Badge>
      case 'ATENCAO':
        return <Badge className="bg-yellow-500 text-slate-900 font-bold">Atenção</Badge>
      case 'INFORMATIVO':
      default:
        return <Badge className="bg-sky-500 text-white">Informativo</Badge>
    }
  }

  // Badges visuais de status
  const getStatusBadge = (st: AlertStatus) => {
    switch (st) {
      case 'NOVO':
        return (
          <Badge variant="outline" className="border-sky-500 text-sky-700 bg-sky-50">
            Novo
          </Badge>
        )
      case 'EM_ANALISE':
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">
            Em Análise
          </Badge>
        )
      case 'ACAO_NECESSARIA':
        return <Badge className="bg-orange-600 text-white">Ação Necessária</Badge>
      case 'EM_TRATAMENTO':
        return <Badge className="bg-blue-600 text-white">Em Tratamento</Badge>
      case 'RESOLVIDO':
        return <Badge className="bg-emerald-600 text-white">Resolvido</Badge>
      case 'ENCERRADO':
        return (
          <Badge variant="outline" className="border-slate-400 text-slate-600 bg-slate-50">
            Encerrado
          </Badge>
        )
      case 'DESCARTADO':
        return (
          <Badge variant="outline" className="border-rose-400 text-rose-600 bg-rose-50">
            Descartado
          </Badge>
        )
      case 'FALSO_POSITIVO':
        return (
          <Badge variant="outline" className="border-purple-400 text-purple-700 bg-purple-50">
            Falso Positivo
          </Badge>
        )
      default:
        return <Badge>{st}</Badge>
    }
  }

  // Abertura do modal de tratamento
  const handleOpenTreatment = (alt: SmartAlertItem) => {
    setSelectedAlert(alt)
    setTargetStatus(alt.status)
    setActionPlan(alt.action_plan || '')
    setActionDeadline(alt.action_deadline ? alt.action_deadline.slice(0, 10) : '')
    setDiscardJustification(alt.discard_justification || '')
    setResolutionNotes(alt.resolution_notes || '')
  }

  // Gravar tratamento do alerta
  const handleSaveTreatment = async () => {
    if (!selectedAlert) return

    // Validação estrita: Descarte e Falso Positivo exigem justificativa
    if (
      (targetStatus === 'DESCARTADO' || targetStatus === 'FALSO_POSITIVO') &&
      (!discardJustification || discardJustification.trim().length < 10)
    ) {
      toast({
        title: 'Justificativa Obrigatória',
        description:
          'Para descartar um alerta ou marcá-lo como falso positivo, forneça uma justificativa detalhada com no mínimo 10 caracteres.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSaving(true)
      const updateData: Partial<SmartAlertItem> = {
        status: targetStatus,
        action_plan: actionPlan,
        action_deadline: actionDeadline ? new Date(actionDeadline).toISOString() : undefined,
        discard_justification: discardJustification,
        resolution_notes: resolutionNotes,
        resolved_at:
          targetStatus === 'RESOLVIDO' || targetStatus === 'ENCERRADO'
            ? new Date().toISOString()
            : undefined,
      }

      await carrierHistoryService.updateAlertTreatment(
        selectedAlert.alert_code,
        updateData,
        userEmail,
        userName,
        targetStatus === 'DESCARTADO' || targetStatus === 'FALSO_POSITIVO'
          ? discardJustification
          : actionPlan || resolutionNotes,
      )

      toast({
        title: 'Alerta Atualizado com Sucesso',
        description: `O alerta ${selectedAlert.alert_code} foi atualizado para o status ${targetStatus} e registrado na trilha de auditoria.`,
      })

      setSelectedAlert(null)
      onRefresh()
    } catch (err: any) {
      toast({
        title: 'Erro ao Salvar Tratamento',
        description: err.message || 'Falha na persistência dos dados.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Banner de Princípios do Anti-Ruído e Determinismo */}
      <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#005596]" />
            <h3 className="font-bold text-[#005596] text-sm">
              Motor de Alertas Determinístico & Anti-Ruído Operacional
            </h3>
          </div>
          <p className="text-xs text-slate-700 max-w-3xl leading-relaxed">
            Todos os alertas são calculados matematicamente sobre os dados históricos da CIAFAL (sem
            IA autônoma decidindo criticidade). Cada alerta carrega evidências comprobatórias, valor
            histórico, valor atual, limite disparador e responsável direto pelo tratamento.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsConfigOpen(true)}
          className="text-xs border-[#005596] text-[#005596] hover:bg-blue-50"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
          Configurar Limites
        </Button>
      </div>

      {/* Barra de Filtros dos Alertas */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <Label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Tipo de Alerta
              </Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos os Tipos" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="TODOS">Todos os 10 Tipos</SelectItem>
                  <SelectItem value="QUEDA_AVALIACAO">Queda de Avaliação</SelectItem>
                  <SelectItem value="QTD_RECLAMACOES">Qtd. Reclamações</SelectItem>
                  <SelectItem value="REINCIDENCIA_CATEGORIA">Reincidência de Categoria</SelectItem>
                  <SelectItem value="QUEDA_PONTUALIDADE">Queda de Pontualidade</SelectItem>
                  <SelectItem value="AUMENTO_TEMPO_ROTA">Aumento Tempo de Rota</SelectItem>
                  <SelectItem value="AUMENTO_TEMPO_INTERNO">Aumento Tempo Interno</SelectItem>
                  <SelectItem value="VEICULO_REINCIDENCIA">Veículo com Reincidência</SelectItem>
                  <SelectItem value="MOTORISTA_NOVO">Motorista Novo</SelectItem>
                  <SelectItem value="VEICULO_NOVO">Veículo Novo</SelectItem>
                  <SelectItem value="DIVERGENCIA_SCORE_COMPORTAMENTO">
                    Divergência Score x Recente
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Severidade
              </Label>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todas as Severidades" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="TODAS">Todas as Severidades</SelectItem>
                  <SelectItem value="CRITICO">Crítico</SelectItem>
                  <SelectItem value="IMPORTANTE">Importante</SelectItem>
                  <SelectItem value="ATENCAO">Atenção</SelectItem>
                  <SelectItem value="INFORMATIVO">Informativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Status do Tratamento
              </Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="TODOS">Todos os Status</SelectItem>
                  <SelectItem value="NOVO">Novo</SelectItem>
                  <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
                  <SelectItem value="ACAO_NECESSARIA">Ação Necessária</SelectItem>
                  <SelectItem value="EM_TRATAMENTO">Em Tratamento</SelectItem>
                  <SelectItem value="RESOLVIDO">Resolvido</SelectItem>
                  <SelectItem value="ENCERRADO">Encerrado</SelectItem>
                  <SelectItem value="DESCARTADO">Descartado</SelectItem>
                  <SelectItem value="FALSO_POSITIVO">Falso Positivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Buscar Prestador / Placa / Código
              </Label>
              <Input
                placeholder="Ex.: Antônio, CIA-1A23, ALT-..."
                value={searchTarget}
                onChange={(e) => setSearchTarget(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listagem de Alertas */}
      {filteredAlerts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhum Alerta Encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Não há anomalias operacionais ativas para os filtros selecionados. A operação de
            prestadores segue dentro dos parâmetros configurados.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-3">Código / Tipo</th>
                  <th className="py-3 px-3">Severidade</th>
                  <th className="py-3 px-3">Prestador / Alvo</th>
                  <th className="py-3 px-3">Evidência Factual</th>
                  <th className="py-3 px-3">Histórico x Atual</th>
                  <th className="py-3 px-3">Origem Causa</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Responsável</th>
                  <th className="py-3 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAlerts.map((alt) => (
                  <tr key={alt.alert_code} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 font-mono text-[11px]">
                        {alt.alert_code}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {alt.alert_type.replace(/_/g, ' ')}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {getSeverityBadge(alt.severity)}
                    </td>
                    <td className="py-2.5 px-3">
                      {alt.driver_name && (
                        <div className="font-semibold text-slate-900 flex items-center gap-1">
                          <User className="w-3 h-3 text-[#005596]" />
                          <span>{alt.driver_name}</span>
                        </div>
                      )}
                      {alt.vehicle_plate && (
                        <div className="text-[11px] font-mono text-slate-700 flex items-center gap-1 mt-0.5">
                          <Truck className="w-3 h-3 text-slate-500" />
                          <span>{alt.vehicle_plate}</span>
                        </div>
                      )}
                      {alt.carrier_name && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                          {alt.carrier_name}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 max-w-[280px]">
                      <div className="text-slate-800 line-clamp-2" title={alt.evidence_summary}>
                        {alt.evidence_summary}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Critério: {alt.triggered_criteria}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="text-[11px] text-slate-500">
                        Hist.:{' '}
                        <span className="font-semibold text-slate-700">{alt.historical_value}</span>
                      </div>
                      <div className="text-[11px] text-slate-900">
                        Atual: <span className="font-bold text-rose-700">{alt.current_value}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {alt.internal_external_origin ? (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {alt.internal_external_origin.replace(/_/g, ' ')}
                        </Badge>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Padrão</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{getStatusBadge(alt.status)}</td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                      {alt.responsible_handler_name || 'Não atribuído'}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenTreatment(alt)}
                        className="h-7 text-xs border-slate-200 text-[#005596] hover:bg-sky-50"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Tratar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE TRATAMENTO DE ALERTA COM VISUALIZAÇÃO DE EVIDÊNCIAS E AUDITORIA   */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-white">
          {selectedAlert && (
            <>
              <DialogHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <DialogTitle className="text-lg font-bold text-slate-900">
                        Alerta {selectedAlert.alert_code}
                      </DialogTitle>
                      {getSeverityBadge(selectedAlert.severity)}
                      {getStatusBadge(selectedAlert.status)}
                    </div>
                    <DialogDescription className="text-xs text-slate-500 mt-1">
                      Detectado em {formatDateTime(selectedAlert.detection_date)} • Tipo:{' '}
                      {selectedAlert.alert_type.replace(/_/g, ' ')}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-2 text-xs">
                {/* Evidência e Critério */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#005596]" />
                    Evidência Factual Comprovada
                  </div>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {selectedAlert.evidence_summary}
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 text-slate-600">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Referência Histórica:
                      </span>
                      <strong>{selectedAlert.historical_value}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Medição Recente Disparadora:
                      </span>
                      <strong className="text-rose-700">{selectedAlert.current_value}</strong>
                    </div>
                  </div>
                </div>

                {/* Dados do Prestador e Links de Navegação */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Card className="border-slate-200">
                    <CardHeader className="py-2 px-3 border-b border-slate-100 bg-slate-50">
                      <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#005596]" /> Motorista
                      </span>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="font-bold text-slate-900">
                        {selectedAlert.driver_name || 'Não aplicável'}
                      </div>
                      {selectedAlert.driver_name && onOpenDriver360 && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => onOpenDriver360(selectedAlert.driver_name!)}
                          className="p-0 h-auto text-xs text-[#005596] hover:underline mt-1"
                        >
                          Ver Visão 360º e Score →
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200">
                    <CardHeader className="py-2 px-3 border-b border-slate-100 bg-slate-50">
                      <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-slate-600" /> Veículo / Placa
                      </span>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="font-mono font-bold text-slate-900">
                        {selectedAlert.vehicle_plate || 'Não aplicável'}
                      </div>
                      {selectedAlert.vehicle_plate && onOpenVehicle360 && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => onOpenVehicle360(selectedAlert.vehicle_plate!)}
                          className="p-0 h-auto text-xs text-[#005596] hover:underline mt-1"
                        >
                          Ver Histórico do Veículo →
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200">
                    <CardHeader className="py-2 px-3 border-b border-slate-100 bg-slate-50">
                      <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-600" /> Transportadora
                      </span>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="font-semibold text-slate-900">
                        {selectedAlert.carrier_name || 'CIAFAL Logística'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Itinerário: {selectedAlert.itinerary_code || 'Geral'}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Transportes Relacionados */}
                {selectedAlert.related_transports_json &&
                  selectedAlert.related_transports_json.length > 0 && (
                    <div className="border border-slate-200 rounded-xl p-3 bg-white">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">
                        Transportes Relacionados ({selectedAlert.related_transports_json.length}):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {selectedAlert.related_transports_json.map((ord) => (
                          <Button
                            key={ord}
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenTransportDetail && onOpenTransportDetail(ord)}
                            className="h-7 text-xs font-mono text-[#005596] hover:bg-sky-50"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1" />
                            {ord}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Formulário de Tratamento e Ação */}
                <div className="border-t border-slate-200 pt-3 space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Registro de Tratamento & Ação Corretiva
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">
                        Atualizar Status
                      </Label>
                      <Select
                        value={targetStatus}
                        onValueChange={(val) => setTargetStatus(val as AlertStatus)}
                      >
                        <SelectTrigger className="mt-1 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="NOVO">Novo</SelectItem>
                          <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
                          <SelectItem value="ACAO_NECESSARIA">Ação Necessária</SelectItem>
                          <SelectItem value="EM_TRATAMENTO">Em Tratamento</SelectItem>
                          <SelectItem value="RESOLVIDO">Resolvido</SelectItem>
                          <SelectItem value="ENCERRADO">Encerrado</SelectItem>
                          <SelectItem value="DESCARTADO">Descartado</SelectItem>
                          <SelectItem value="FALSO_POSITIVO">Falso Positivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-slate-700">
                        Prazo para Resolução / Ação
                      </Label>
                      <Input
                        type="date"
                        value={actionDeadline}
                        onChange={(e) => setActionDeadline(e.target.value)}
                        className="mt-1 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Plano de Ação / Parecer Técnico
                    </Label>
                    <Textarea
                      placeholder="Descreva as medidas corretivas acordadas com o prestador ou expedição..."
                      value={actionPlan}
                      onChange={(e) => setActionPlan(e.target.value)}
                      rows={2}
                      className="mt-1 text-xs"
                    />
                  </div>

                  {/* Justificativa Obrigatória para Descarte ou Falso Positivo */}
                  {(targetStatus === 'DESCARTADO' || targetStatus === 'FALSO_POSITIVO') && (
                    <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg">
                      <Label className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Justificativa Obrigatória de Descarte / Falso Positivo *
                      </Label>
                      <Textarea
                        placeholder="Informe a justificativa formal auditável para descartar o alerta (mínimo 10 caracteres)..."
                        value={discardJustification}
                        onChange={(e) => setDiscardJustification(e.target.value)}
                        rows={2}
                        className="mt-1 text-xs border-rose-300"
                        required
                      />
                    </div>
                  )}

                  {/* Trilha de Auditoria */}
                  {selectedAlert.audit_trail_json && selectedAlert.audit_trail_json.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Histórico de Auditoria do Alerta ({selectedAlert.audit_trail_json.length}):
                      </span>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto bg-slate-50 p-2 rounded border border-slate-100">
                        {selectedAlert.audit_trail_json.map((item, idx) => (
                          <div
                            key={idx}
                            className="text-[11px] text-slate-600 border-b border-slate-100 pb-1"
                          >
                            <span className="font-bold text-slate-800">
                              {formatDateTime(item.date)}
                            </span>{' '}
                            • {item.user}: <em>{item.action}</em>
                            {item.notes && (
                              <div className="text-slate-500 italic mt-0.5">{item.notes}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100 flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAlert(null)}
                  disabled={isSaving}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveTreatment}
                  disabled={isSaving}
                  className="bg-[#005596] hover:bg-sky-800 text-white text-xs font-semibold"
                >
                  {isSaving ? 'Gravando...' : 'Salvar Tratamento & Auditoria'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL DE CONFIGURAÇÃO DE LIMITES DO MOTOR DE ALERTAS                      */}
      {/* ========================================================================= */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6 bg-white">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#005596]" />
              Parâmetros e Limiares dos Alertas Inteligentes
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ajuste as regras determinísticas de detecção de anomalias operacionais na malha
              CIAFAL.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">Queda de Avaliação Mínima (%)</Label>
              <Input
                type="number"
                value={config.ratingDropPercentageThreshold}
                onChange={(e) =>
                  setConfig({ ...config, ratingDropPercentageThreshold: Number(e.target.value) })
                }
                className="h-8 text-xs"
              />
              <span className="text-[10px] text-slate-400">Default: 20% de queda recente</span>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">
                Limite de Reclamações no Período
              </Label>
              <Input
                type="number"
                value={config.complaintsThresholdCount}
                onChange={(e) =>
                  setConfig({ ...config, complaintsThresholdCount: Number(e.target.value) })
                }
                className="h-8 text-xs"
              />
              <span className="text-[10px] text-slate-400">Default: 3 reclamações acumuladas</span>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">Janela de Reincidência (Dias)</Label>
              <Input
                type="number"
                value={config.categoryRecurrenceWindowDays}
                onChange={(e) =>
                  setConfig({ ...config, categoryRecurrenceWindowDays: Number(e.target.value) })
                }
                className="h-8 text-xs"
              />
              <span className="text-[10px] text-slate-400">Default: 60 dias de observação</span>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">Limite Tempo Interno (Minutos)</Label>
              <Input
                type="number"
                value={config.internalDwellThresholdMin}
                onChange={(e) =>
                  setConfig({ ...config, internalDwellThresholdMin: Number(e.target.value) })
                }
                className="h-8 text-xs"
              />
              <span className="text-[10px] text-slate-400">Default: 180 min (3 horas totais)</span>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">
                Queda de Pontualidade Mínima (%)
              </Label>
              <Input
                type="number"
                value={config.punctualityDropThresholdPct}
                onChange={(e) =>
                  setConfig({ ...config, punctualityDropThresholdPct: Number(e.target.value) })
                }
                className="h-8 text-xs"
              />
              <span className="text-[10px] text-slate-400">Default: 25 pontos percentuais</span>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">
                Aumento Tempo de Rota Mesmo Par (%)
              </Label>
              <Input
                type="number"
                value={config.routeTimeIncreaseThresholdPct}
                onChange={(e) =>
                  setConfig({ ...config, routeTimeIncreaseThresholdPct: Number(e.target.value) })
                }
                className="h-8 text-xs"
              />
              <span className="text-[10px] text-slate-400">Default: 25% no mesmo itinerário</span>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConfig(DEFAULT_ALERT_RULES)
                toast({ title: 'Parâmetros Restaurados para os Valores Padrão' })
              }}
              className="text-xs"
            >
              Restaurar Padrão
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setIsConfigOpen(false)
                toast({
                  title: 'Parâmetros de Alerta Aplicados',
                  description:
                    'O motor de alertas foi recalibrado com os novos limiares configurados.',
                })
                onRefresh()
              }}
              className="bg-[#005596] hover:bg-sky-800 text-white text-xs font-semibold"
            >
              Confirmar Parâmetros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
