import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  TransportEditableRecord,
  StandardizedEditReason,
  FieldComparison,
  RemessaRelated,
  evaluateStatusRules,
  computeFieldComparisons,
  detectCriticalChanges,
} from '@/domain/transportEditEngine'
import { TransportSyncBadge } from './TransportSyncBadge'
import { TransportChangeConfirmationModal } from './TransportChangeConfirmationModal'
import { transportEditService } from '@/services/transportEditService'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  Truck,
  FileText,
  Boxes,
  ShieldCheck,
  AlertTriangle,
  History,
  Save,
  X,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react'

interface TransportEditModalProps {
  open: boolean
  onClose: () => void
  transportId: string
  onSaveSuccess: () => void
  onOpenHistory: (trNum: string, sapNum: string, id: string) => void
}

export const TransportEditModal: React.FC<TransportEditModalProps> = ({
  open,
  onClose,
  transportId,
  onSaveSuccess,
  onOpenHistory,
}) => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [originalRecord, setOriginalRecord] = useState<TransportEditableRecord | null>(null)

  // Estados dos formulários por bloco
  const [carrierName, setCarrierName] = useState('')
  const [driverName, setDriverName] = useState('')
  const [driverCpf, setDriverCpf] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [trailerPlate, setTrailerPlate] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [itineraryCode, setItineraryCode] = useState('')
  const [itineraryDescription, setItineraryDescription] = useState('')
  const [routeCode, setRouteCode] = useState('')
  const [scheduledLoadingDate, setScheduledLoadingDate] = useState('')
  const [scheduledLoadingTime, setScheduledLoadingTime] = useState('')
  const [scheduledDeliveryDate, setScheduledDeliveryDate] = useState('')
  const [totalWeightKg, setTotalWeightKg] = useState(0)
  const [dischargesCount, setDischargesCount] = useState(1)
  const [logisticsNotes, setLogisticsNotes] = useState('')
  const [remessas, setRemessas] = useState<RemessaRelated[]>([])

  // Modal de confirmação
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<FieldComparison[]>([])
  const [selectedReason, setSelectedReason] = useState<StandardizedEditReason | ''>('')
  const [customReasonDesc, setCustomReasonDesc] = useState('')
  const [justification, setJustification] = useState('')

  // Sucesso detalhado
  const [successInfo, setSuccessInfo] = useState<{
    open: boolean
    transport_number: string
    sap_transport_number: string
    audit_ids: string[]
    sync_status: string
    changes_count: number
  } | null>(null)

  // Erro de Concorrência
  const [concurrencyConflict, setConcurrencyConflict] = useState<any | null>(null)

  // Carregar dados completos do transporte
  const loadTransportData = async () => {
    if (!transportId || !open) return
    setLoading(true)
    setConcurrencyConflict(null)
    try {
      const data = await transportEditService.getTransportById(transportId)
      if (data) {
        setOriginalRecord(data)
        setCarrierName(data.carrier_name)
        setDriverName(data.driver_name)
        setDriverCpf(data.driver_cpf || '')
        setVehiclePlate(data.vehicle_plate)
        setTrailerPlate(data.trailer_plate || '')
        setVehicleType(data.vehicle_type)
        setItineraryCode(data.itinerary_code)
        setItineraryDescription(data.itinerary_description)
        setRouteCode(data.route_code || '')
        setScheduledLoadingDate(data.scheduled_loading_date)
        setScheduledLoadingTime(data.scheduled_loading_time)
        setScheduledDeliveryDate(data.scheduled_delivery_date)
        setTotalWeightKg(data.total_weight_kg)
        setDischargesCount(data.discharges_count)
        setLogisticsNotes(data.logistics_notes || '')
        setRemessas(JSON.parse(JSON.stringify(data.remessas)))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && transportId) {
      loadTransportData()
      setSuccessInfo(null)
    }
  }, [open, transportId])

  if (!open) return null

  const userRole = user?.role || 'operador_logistica'
  const statusRules = originalRecord
    ? evaluateStatusRules(originalRecord.status, userRole)
    : {
        canEdit: false,
        blockedReasons: [],
        warningMessages: [],
        allowedFields: [],
        readOnlyFields: [],
        isCriticalStatus: false,
      }

  // Permissões granulares do usuário
  const canEditGeneral = permissions?.canEditTransport ?? true
  const canChangeCarrierPerm = permissions?.canChangeCarrier ?? true
  const canChangeDriverPerm = permissions?.canChangeDriver ?? true
  const canChangeVehiclePerm = permissions?.canChangeVehicle ?? true
  const canChangeRoutePerm = permissions?.canChangeRoute ?? true
  const canChangeSchedulePerm = permissions?.canChangeSchedule ?? true
  const canEditRemessaPerm = permissions?.canEditRemessa ?? true
  const canAddRemessaPerm = permissions?.canAddRemessa ?? true
  const canRemoveRemessaPerm = permissions?.canRemoveRemessa ?? true

  // Verificação de campos bloqueados por status
  const isCarrierReadOnly =
    !canChangeCarrierPerm || statusRules.readOnlyFields.includes('carrier_name')
  const isDriverReadOnly =
    !canChangeDriverPerm || statusRules.readOnlyFields.includes('driver_name')
  const isVehicleReadOnly =
    !canChangeVehiclePerm || statusRules.readOnlyFields.includes('vehicle_plate')
  const isRouteReadOnly =
    !canChangeRoutePerm || statusRules.readOnlyFields.includes('itinerary_code')
  const isScheduleReadOnly =
    !canChangeSchedulePerm || statusRules.readOnlyFields.includes('scheduled_loading_date')
  const isRemessasReadOnly = !canEditRemessaPerm || statusRules.readOnlyFields.includes('remessas')

  // Manipulação de sequência de remessas
  const handleMoveRemessa = (index: number, direction: 'up' | 'down') => {
    if (isRemessasReadOnly) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= remessas.length) return

    const newRemessas = [...remessas]
    const temp = newRemessas[index]
    newRemessas[index] = newRemessas[targetIndex]
    newRemessas[targetIndex] = temp

    // Reordenar sequence
    newRemessas.forEach((r, idx) => {
      r.sequence = idx + 1
    })

    setRemessas(newRemessas)
  }

  // Remoção de remessa permitida
  const handleRemoveRemessa = (index: number) => {
    if (!canRemoveRemessaPerm || isRemessasReadOnly) {
      toast({
        title: 'Operação não permitida',
        description:
          'Você não tem permissão para retirar remessas ou o transporte está em status bloqueado.',
        variant: 'destructive',
      })
      return
    }

    if (remessas.length <= 1) {
      toast({
        title: 'Bloqueio de Integridade',
        description:
          'Um transporte precisa ter no mínimo 1 remessa associada. Não é permitido remover a última remessa.',
        variant: 'destructive',
      })
      return
    }

    const removed = remessas[index]
    const updated = remessas.filter((_, idx) => idx !== index)
    // Atualizar sequências e peso
    const newWeight = updated.reduce((sum, r) => sum + r.weight_kg, 0)
    updated.forEach((r, idx) => {
      r.sequence = idx + 1
    })

    setRemessas(updated)
    setTotalWeightKg(newWeight)
    setDischargesCount(updated.length)

    toast({
      title: 'Remessa retirada da carga',
      description: `Remessa ${removed.delivery_number} foi marcada para exclusão do transporte.`,
    })
  }

  // Inclusão simulada de remessa disponível (respeitando integridade SAP)
  const handleAddRemessaModal = () => {
    if (!canAddRemessaPerm || isRemessasReadOnly) {
      toast({
        title: 'Permissão negada',
        description: 'Seu perfil não autoriza inclusão de remessas neste transporte.',
        variant: 'destructive',
      })
      return
    }

    const newDeliveryNumber = (10048000 + Math.floor(Math.random() * 9000)).toString()
    const newOrderNumber = (4508000 + Math.floor(Math.random() * 9000)).toString()
    const addedWeight = 8500

    const newRemessa: RemessaRelated = {
      delivery_number: newDeliveryNumber,
      order_number: newOrderNumber,
      sequence: remessas.length + 1,
      customer_code: 'CLI-5540',
      customer_name: 'CIAFAL Distribuidora Regional Sul',
      customer_cnpj: '45.123.456/0008-12',
      destination_city: 'Juiz de Fora',
      destination_uf: 'MG',
      weight_kg: addedWeight,
      weight_ton: 8.5,
      credit_status: 'LIBERADO',
      status: originalRecord?.status || 'Planejado',
      can_remove: true,
      can_edit_sequence: true,
      items: [
        {
          item_number: '000010',
          material_code: 'BARRA-CHATA-2X14',
          material_description: 'Barra Chata Laminada 2x1/4 6m',
          quantity: addedWeight,
          unit: 'KG',
          weight_kg: addedWeight,
        },
      ],
    }

    const updated = [...remessas, newRemessa]
    setRemessas(updated)
    setTotalWeightKg((prev) => prev + addedWeight)
    setDischargesCount(updated.length)

    toast({
      title: 'Remessa adicionada',
      description: `Remessa ${newDeliveryNumber} inserida na carga. Justifique a inclusão ao salvar.`,
    })
  }

  // Iniciar fluxo de salvamento (Item 4: NUNCA salva imediatamente)
  const handleTriggerSave = () => {
    if (!originalRecord) return

    if (!canEditGeneral || !statusRules.canEdit) {
      toast({
        title: 'Operação Bloqueada',
        description: statusRules.blockedReasons.join(' ') || 'Alteração não permitida.',
        variant: 'destructive',
      })
      return
    }

    // Calcular diferenças
    const modified: Partial<TransportEditableRecord> = {
      carrier_name: carrierName,
      driver_name: driverName,
      driver_cpf: driverCpf,
      vehicle_plate: vehiclePlate,
      trailer_plate: trailerPlate,
      vehicle_type: vehicleType,
      itinerary_code: itineraryCode,
      itinerary_description: itineraryDescription,
      route_code: routeCode,
      scheduled_loading_date: scheduledLoadingDate,
      scheduled_loading_time: scheduledLoadingTime,
      scheduled_delivery_date: scheduledDeliveryDate,
      total_weight_kg: totalWeightKg,
      total_weight_ton: Number((totalWeightKg / 1000).toFixed(2)),
      discharges_count: dischargesCount,
      logistics_notes: logisticsNotes,
      remessas: remessas,
    }

    const diffs = computeFieldComparisons(originalRecord, modified)

    if (diffs.length === 0) {
      toast({
        title: 'Nenhuma alteração detectada',
        description: 'Você não modificou nenhum campo do transporte.',
      })
      return
    }

    setPendingChanges(diffs)
    setSelectedReason('')
    setCustomReasonDesc('')
    setJustification('')
    setConfirmModalOpen(true)
  }

  // Confirmação final após motivo e justificativa
  const handleConfirmSave = async () => {
    if (!originalRecord) return

    setSubmitting(true)
    try {
      const modified: Partial<TransportEditableRecord> = {
        carrier_name: carrierName,
        driver_name: driverName,
        driver_cpf: driverCpf,
        vehicle_plate: vehiclePlate,
        trailer_plate: trailerPlate,
        vehicle_type: vehicleType,
        itinerary_code: itineraryCode,
        itinerary_description: itineraryDescription,
        route_code: routeCode,
        scheduled_loading_date: scheduledLoadingDate,
        scheduled_loading_time: scheduledLoadingTime,
        scheduled_delivery_date: scheduledDeliveryDate,
        total_weight_kg: totalWeightKg,
        total_weight_ton: Number((totalWeightKg / 1000).toFixed(2)),
        discharges_count: dischargesCount,
        logistics_notes: logisticsNotes,
        remessas: remessas,
      }

      const res = await transportEditService.saveTransportChanges({
        transport_id: originalRecord.id,
        original_record: originalRecord,
        modified_fields: modified,
        reason: selectedReason,
        custom_reason_description: customReasonDesc,
        justification: justification,
        current_user: {
          name: user?.name || 'Operador HUB CIAFAL',
          email: user?.email || 'operador@ciafal.com.br',
          role: userRole,
        },
      })

      if (!res.success) {
        if (res.conflict) {
          setConfirmModalOpen(false)
          setConcurrencyConflict(res.conflict)
          toast({
            title: 'Conflito de Concorrência',
            description: 'Este transporte foi alterado por outro usuário.',
            variant: 'destructive',
          })
          return
        }

        if (res.sap_error_detail) {
          setConfirmModalOpen(false)
          toast({
            title: 'Não foi possível concluir a alteração do transporte.',
            description: `Código SAP: ${res.sap_error_detail.error_code} - ${res.sap_error_detail.message}. ${res.sap_error_detail.suggested_action}`,
            variant: 'destructive',
          })
          return
        }
      }

      // Sucesso na gravação
      setConfirmModalOpen(false)
      setSuccessInfo({
        open: true,
        transport_number: originalRecord.transport_number,
        sap_transport_number: res.sap_transport_number,
        audit_ids: res.audit_log_ids,
        sync_status: res.sap_sync_status,
        changes_count: res.changes_count,
      })

      toast({
        title: 'Transporte atualizado com sucesso.',
        description: `${res.changes_count} campo(s) auditado(s) e gravado(s). Status: ${res.sap_sync_status}`,
      })

      onSaveSuccess()
    } catch (err: any) {
      toast({
        title: 'Falha ao salvar transporte',
        description: err.message || 'Erro inesperado na gravação.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const criticalCheck = originalRecord
    ? detectCriticalChanges(pendingChanges, originalRecord)
    : { isCritical: false, reasons: [], requiresApproval: false }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && !submitting && onClose()}>
        <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col overflow-hidden p-0">
          {/* HEADER DA TELA DE EDIÇÃO */}
          <DialogHeader className="bg-primary/5 p-4 border-b shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Truck className="h-6 w-6 text-primary" />
                <div>
                  <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    Editar Transporte
                    <span className="text-sm font-semibold text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">
                      {originalRecord?.transport_number}
                    </span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Origem: {originalRecord?.origin_system_source} | Versão:{' '}
                    {originalRecord?.sync_version}
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {originalRecord && (
                  <>
                    <TransportSyncBadge status={originalRecord.sap_sync_status} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onOpenHistory(
                          originalRecord.transport_number,
                          originalRecord.sap_transport_number,
                          originalRecord.id,
                        )
                      }
                      className="text-xs h-8 bg-white"
                    >
                      <History className="h-3.5 w-3.5 mr-1 text-primary" />
                      Histórico
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* AVISOS DE STATUS OPERACIONAL */}
            {statusRules.warningMessages.length > 0 && (
              <div className="mt-3 space-y-1">
                {statusRules.warningMessages.map((w, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 text-[11px] text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* AVISO DE CONFLITO DE CONCORRÊNCIA */}
            {concurrencyConflict && (
              <Alert className="mt-3 bg-rose-50 border-rose-300 text-rose-900">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <AlertTitle className="font-bold text-rose-900">
                  Conflito de Concorrência Detectado
                </AlertTitle>
                <AlertDescription className="text-xs mt-1">
                  Este transporte foi alterado por outro usuário (
                  <strong>{concurrencyConflict.last_user}</strong>) após a abertura desta tela.
                  Motivo registrado: "{concurrencyConflict.last_reason}".
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={loadTransportData}
                      className="h-7 text-xs bg-white text-rose-900 border-rose-300"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Atualizar dados agora
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </DialogHeader>

          {/* CORPO MODAL EM TABS OU SEÇÕES */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {loading ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                Carregando dados do transporte...
              </div>
            ) : originalRecord ? (
              <Tabs defaultValue="logistics" className="w-full">
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="identification" className="text-xs flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    1. Identificação (Leitura)
                  </TabsTrigger>
                  <TabsTrigger value="logistics" className="text-xs flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5" />
                    2. Dados Logísticos (Editáveis)
                  </TabsTrigger>
                  <TabsTrigger value="remessas" className="text-xs flex items-center gap-1">
                    <Boxes className="h-3.5 w-3.5" />
                    3. Remessas Relacionadas ({remessas.length})
                  </TabsTrigger>
                </TabsList>

                {/* BLOCO 1: IDENTIFICAÇÃO (SOMENTE LEITURA CONFORME ITEM 3) */}
                <TabsContent value="identification" className="space-y-4">
                  <div className="bg-muted/15 border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-xs font-bold text-gray-800">
                        Parâmetros Estruturais Oficiais (Somente Leitura)
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Integrados do SAP VT01N / BAPI_SHIPMENT_CREATE
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <Label className="text-muted-foreground text-[11px]">
                          Número do Transporte (HUB)
                        </Label>
                        <Input
                          value={originalRecord.transport_number}
                          readOnly
                          className="bg-muted/40 font-mono font-bold text-gray-800 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-[11px]">
                          Número do Transporte SAP
                        </Label>
                        <Input
                          value={originalRecord.sap_transport_number}
                          readOnly
                          className="bg-muted/40 font-mono font-bold text-primary text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-[11px]">
                          Número da Remessa Principal
                        </Label>
                        <Input
                          value={originalRecord.delivery_number}
                          readOnly
                          className="bg-muted/40 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-[11px]">Empresa</Label>
                        <Input
                          value={`${originalRecord.company_code} - ${originalRecord.company_name}`}
                          readOnly
                          className="bg-muted/40 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-[11px]">
                          Centro de Expedição
                        </Label>
                        <Input
                          value={`${originalRecord.plant_code} - ${originalRecord.plant_name}`}
                          readOnly
                          className="bg-muted/40 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-[11px]">Data de Criação</Label>
                        <Input
                          value={new Date(originalRecord.creation_date).toLocaleDateString('pt-BR')}
                          readOnly
                          className="bg-muted/40 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-[11px]">
                          Status Operacional Atual
                        </Label>
                        <Input
                          value={originalRecord.status}
                          readOnly
                          className="bg-muted/40 font-bold text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-[11px]">
                          Origem do Registro
                        </Label>
                        <Input
                          value={originalRecord.origin_system_source}
                          readOnly
                          className="bg-muted/40 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-[11px]">
                          Última Alteração
                        </Label>
                        <Input
                          value={`${new Date(originalRecord.last_modified_at).toLocaleString('pt-BR')} por ${
                            originalRecord.last_modified_by
                          }`}
                          readOnly
                          className="bg-muted/40 text-xs truncate"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* BLOCO 2: DADOS LOGÍSTICOS (EDITÁVEIS CONFORME REGRAS) */}
                <TabsContent value="logistics" className="space-y-4">
                  <div className="bg-white border rounded-lg p-4 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-xs font-bold text-gray-800">
                        Dados Operacionais e de Despacho
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Permissões e bloqueios aplicados dinamicamente
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {/* Transportadora */}
                      <div>
                        <Label className="text-[11px] font-semibold text-gray-700">
                          Transportadora{' '}
                          {isCarrierReadOnly && (
                            <span className="text-rose-600">* (Bloqueado)</span>
                          )}
                        </Label>
                        <Input
                          value={carrierName}
                          onChange={(e) => setCarrierName(e.target.value)}
                          disabled={isCarrierReadOnly}
                          className={`text-xs ${isCarrierReadOnly ? 'bg-muted/40' : 'bg-white'}`}
                        />
                      </div>

                      {/* Motorista */}
                      <div>
                        <Label className="text-[11px] font-semibold text-gray-700">
                          Nome do Motorista{' '}
                          {isDriverReadOnly && <span className="text-rose-600">* (Bloqueado)</span>}
                        </Label>
                        <Input
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          disabled={isDriverReadOnly}
                          className={`text-xs ${isDriverReadOnly ? 'bg-muted/40' : 'bg-white'}`}
                        />
                      </div>

                      {/* CPF do Motorista */}
                      <div>
                        <Label className="text-[11px] font-semibold text-gray-700">
                          CPF do Motorista
                        </Label>
                        <Input
                          value={driverCpf}
                          onChange={(e) => setDriverCpf(e.target.value)}
                          disabled={isDriverReadOnly}
                          placeholder="000.000.000-00"
                          className={`text-xs ${isDriverReadOnly ? 'bg-muted/40' : 'bg-white'}`}
                        />
                      </div>

                      {/* Placa do Cavalo */}
                      <div>
                        <Label className="text-[11px] font-semibold text-gray-700">
                          Placa do Cavalo{' '}
                          {isVehicleReadOnly && (
                            <span className="text-rose-600">* (Bloqueado)</span>
                          )}
                        </Label>
                        <Input
                          value={vehiclePlate}
                          onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                          disabled={isVehicleReadOnly}
                          className={`text-xs font-mono font-bold ${
                            isVehicleReadOnly ? 'bg-muted/40' : 'bg-white'
                          }`}
                        />
                      </div>

                      {/* Placa da Carreta */}
                      <div>
                        <Label className="text-[11px] font-semibold text-gray-700">
                          Placa da Carreta
                        </Label>
                        <Input
                          value={trailerPlate}
                          onChange={(e) => setTrailerPlate(e.target.value.toUpperCase())}
                          disabled={isVehicleReadOnly}
                          className={`text-xs font-mono ${isVehicleReadOnly ? 'bg-muted/40' : 'bg-white'}`}
                        />
                      </div>

                      {/* Tipo de Veículo */}
                      <div>
                        <Label className="text-[11px] font-semibold text-gray-700">
                          Tipo de Veículo
                        </Label>
                        <Input
                          value={vehicleType}
                          onChange={(e) => setVehicleType(e.target.value)}
                          disabled={isVehicleReadOnly}
                          className={`text-xs ${isVehicleReadOnly ? 'bg-muted/40' : 'bg-white'}`}
                        />
                      </div>

                      {/* Itinerário Código */}
                      <div>
                        <Label className="text-[11px] font-semibold text-gray-700">
                          Código do Itinerário{' '}
                          {isRouteReadOnly && <span className="text-rose-600">* (Bloqueado)</span>}
                        </Label>
                        <Input
                          value={itineraryCode}
                          onChange={(e) => setItineraryCode(e.target.value)}
                          disabled={isRouteReadOnly}
                          className={`text-xs font-mono ${isRouteReadOnly ? 'bg-muted/40' : 'bg-white'}`}
                        />
                      </div>

                      {/* Itinerário Descrição */}
                      <div>
                        <Label className="text-[11px] font-semibold text-gray-700">
                          Descrição do Itinerário
                        </Label>
                        <Input
                          value={itineraryDescription}
                          onChange={(e) => setItineraryDescription(e.target.value)}
                          disabled={isRouteReadOnly}
                          className={`text-xs ${isRouteReadOnly ? 'bg-muted/40' : 'bg-white'}`}
                        />
                      </div>

                      {/* Rota */}
                      <div>
                        <Label className="text-[11px] font-semibold text-gray-700">
                          Código da Rota
                        </Label>
                        <Input
                          value={routeCode}
                          onChange={(e) => setRouteCode(e.target.value)}
                          disabled={isRouteReadOnly}
                          className={`text-xs ${isRouteReadOnly ? 'bg-muted/40' : 'bg-white'}`}
                        />
                      </div>

                      {/* Data Prevista Carregamento */}
                      <div>
                        <Label className="text-[11px] font-semibold text-gray-700">
                          Data Prevista Carregamento
                        </Label>
                        <Input
                          type="date"
                          value={scheduledLoadingDate}
                          onChange={(e) => setScheduledLoadingDate(e.target.value)}
                          disabled={isScheduleReadOnly}
                          className={`text-xs ${isScheduleReadOnly ? 'bg-muted/40' : 'bg-white'}`}
                        />
                      </div>

                      {/* Horário Previsto */}
                      <div>
                        <Label className="text-[11px] font-semibold text-gray-700">
                          Horário Previsto
                        </Label>
                        <Input
                          type="time"
                          value={scheduledLoadingTime}
                          onChange={(e) => setScheduledLoadingTime(e.target.value)}
                          disabled={isScheduleReadOnly}
                          className={`text-xs ${isScheduleReadOnly ? 'bg-muted/40' : 'bg-white'}`}
                        />
                      </div>

                      {/* Data Prevista de Entrega */}
                      <div>
                        <Label className="text-[11px] font-semibold text-gray-700">
                          Data Prevista de Entrega
                        </Label>
                        <Input
                          type="date"
                          value={scheduledDeliveryDate}
                          onChange={(e) => setScheduledDeliveryDate(e.target.value)}
                          disabled={isScheduleReadOnly}
                          className={`text-xs ${isScheduleReadOnly ? 'bg-muted/40' : 'bg-white'}`}
                        />
                      </div>

                      {/* Peso da Carga (KG) */}
                      <div>
                        <Label className="text-[11px] font-semibold text-gray-700">
                          Peso Total (kg)
                        </Label>
                        <Input
                          type="number"
                          value={totalWeightKg}
                          onChange={(e) => setTotalWeightKg(Number(e.target.value))}
                          disabled={statusRules.readOnlyFields.includes('total_weight_kg')}
                          className="text-xs bg-white font-mono font-semibold"
                        />
                      </div>

                      {/* Quantidade de Descargas */}
                      <div>
                        <Label className="text-[11px] font-semibold text-gray-700">
                          Qtd. Descargas
                        </Label>
                        <Input
                          type="number"
                          value={dischargesCount}
                          onChange={(e) => setDischargesCount(Number(e.target.value))}
                          className="text-xs bg-white"
                        />
                      </div>

                      {/* Cidade / UF Destino */}
                      <div>
                        <Label className="text-[11px] font-semibold text-gray-700">
                          Destino Principal
                        </Label>
                        <Input
                          value={`${originalRecord.destination_city} / ${originalRecord.destination_uf}`}
                          readOnly
                          className="text-xs bg-muted/40"
                        />
                      </div>
                    </div>

                    {/* Observações Logísticas */}
                    <div>
                      <Label className="text-[11px] font-semibold text-gray-700">
                        Observações Logísticas Operacionais
                      </Label>
                      <Textarea
                        rows={2}
                        value={logisticsNotes}
                        onChange={(e) => setLogisticsNotes(e.target.value)}
                        placeholder="Orientações específicas de carregamento, amarração de carga ou janelas do cliente..."
                        className="text-xs resize-none bg-white mt-1"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* BLOCO 3: DADOS DAS REMESSAS (CONFORME ITEM 3) */}
                <TabsContent value="remessas" className="space-y-4">
                  <div className="bg-white border rounded-lg p-4 space-y-3 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                      <div>
                        <span className="text-xs font-bold text-gray-800">
                          Remessas e Pedidos SAP Associados ({remessas.length})
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Sequência de descarga, clientes, pedidos e composição de itens. Dados
                          críticos de faturamento possuem bloqueio conforme regras do SAP.
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAddRemessaModal}
                        disabled={!canAddRemessaPerm || isRemessasReadOnly}
                        className="text-xs h-8 text-primary border-primary/30"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Incluir Remessa
                      </Button>
                    </div>

                    <div className="border rounded-md overflow-hidden bg-white">
                      <Table>
                        <TableHeader className="bg-muted/40">
                          <TableRow>
                            <TableHead className="w-16 text-center text-xs">Seq.</TableHead>
                            <TableHead className="text-xs">Remessa / Pedido</TableHead>
                            <TableHead className="text-xs">Cliente / Destino</TableHead>
                            <TableHead className="text-right text-xs">Peso (kg)</TableHead>
                            <TableHead className="text-center text-xs">Itens</TableHead>
                            <TableHead className="text-center text-xs">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {remessas.map((rem, idx) => (
                            <TableRow key={rem.delivery_number} className="hover:bg-muted/20">
                              <TableCell className="text-center font-bold text-xs">
                                <div className="flex items-center justify-center gap-1">
                                  <span>{rem.sequence}º</span>
                                  {!isRemessasReadOnly && (
                                    <div className="flex flex-col">
                                      <button
                                        type="button"
                                        disabled={idx === 0}
                                        onClick={() => handleMoveRemessa(idx, 'up')}
                                        className="p-0.5 hover:text-primary disabled:opacity-20"
                                      >
                                        <ArrowUp className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={idx === remessas.length - 1}
                                        onClick={() => handleMoveRemessa(idx, 'down')}
                                        className="p-0.5 hover:text-primary disabled:opacity-20"
                                      >
                                        <ArrowDown className="h-3 w-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs">
                                <div className="font-mono font-bold text-gray-900">
                                  Remessa: {rem.delivery_number}
                                </div>
                                <div className="font-mono text-muted-foreground text-[11px]">
                                  Pedido: {rem.order_number}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs">
                                <div className="font-semibold text-gray-800">
                                  {rem.customer_name}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {rem.destination_city} - {rem.destination_uf}{' '}
                                  {rem.customer_cnpj && `(CNPJ: ${rem.customer_cnpj})`}
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-xs font-mono font-semibold">
                                {rem.weight_kg.toLocaleString('pt-BR')} kg
                              </TableCell>
                              <TableCell className="text-center text-xs">
                                <span className="bg-muted px-2 py-0.5 rounded text-[11px] font-medium">
                                  {rem.items ? rem.items.length : 1} item(ns)
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={
                                    !canRemoveRemessaPerm ||
                                    isRemessasReadOnly ||
                                    remessas.length <= 1
                                  }
                                  onClick={() => handleRemoveRemessa(idx)}
                                  className="h-7 w-7 p-0 text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                                  title="Retirar remessa do transporte"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Detalhamento dos itens da primeira remessa */}
                    {remessas[0]?.items && remessas[0].items.length > 0 && (
                      <div className="bg-muted/15 border rounded p-2.5 text-xs">
                        <span className="font-semibold text-gray-700 block mb-1">
                          Itens Faturados / Planejados na Remessa {remessas[0].delivery_number}:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {remessas[0].items.map((it, i) => (
                            <div key={i} className="bg-white p-2 border rounded text-[11px]">
                              <div className="font-bold text-gray-800">
                                {it.material_description}
                              </div>
                              <div className="text-muted-foreground font-mono">
                                Cód: {it.material_code} | Qtd: {it.quantity} {it.unit} (
                                {it.weight_kg} kg)
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            ) : null}
          </div>

          {/* RODAPÉ COM BOTÕES */}
          <DialogFooter className="bg-muted/20 p-4 border-t flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={submitting}
                className="text-xs"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Fechar
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleTriggerSave}
                disabled={submitting || !statusRules.canEdit || !canEditGeneral}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Salvar alterações
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POPUP DE CONFIRMAÇÃO COM MOTIVO OBRIGATÓRIO E ANTES / DEPOIS */}
      <TransportChangeConfirmationModal
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmSave}
        changes={pendingChanges}
        selectedReason={selectedReason}
        setSelectedReason={setSelectedReason}
        customReasonDesc={customReasonDesc}
        setCustomReasonDesc={setCustomReasonDesc}
        justification={justification}
        setJustification={setJustification}
        isSubmitting={submitting}
        requiresApproval={criticalCheck.requiresApproval}
        approvalReasons={criticalCheck.reasons}
      />

      {/* MODAL DE SUCESSO DETALHADO (ITEM 17) */}
      {successInfo && (
        <Dialog open={successInfo.open} onOpenChange={() => setSuccessInfo(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <DialogTitle className="text-lg">Transporte atualizado com sucesso.</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                A alteração foi devidamente validada, auditada na base permanente e processada
                conforme a governança.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-muted/20 border rounded-lg p-3 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Número do Transporte:</span>
                <span className="font-mono font-bold">{successInfo.transport_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Transporte SAP:</span>
                <span className="font-mono font-semibold text-primary">
                  {successInfo.sap_transport_number || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Campos alterados:</span>
                <span className="font-bold">{successInfo.changes_count} campo(s)</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Status de Sincronização SAP:</span>
                <TransportSyncBadge status={successInfo.sync_status} />
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">ID do Registro de Auditoria:</span>
                <span className="font-mono text-[11px] text-gray-700 truncate max-w-[200px]">
                  {successInfo.audit_ids[0] || 'REG-AUDIT-OK'}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                className="w-full text-xs bg-primary text-white"
                onClick={() => setSuccessInfo(null)}
              >
                Concluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
