import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  CollectorTransport,
  CollectorDelivery,
  CollectorDeliveryItem,
  ScannedLotReading,
  ShippingJustificationOption,
  DeliveryJustificationItem,
  parseShipmentBarcode,
  parseProductBarcode,
  validateWeightTolerance,
  formatWeightPtBr,
  formatPercentPtBr,
  padSapNumber,
} from '@/domain/collectorEngine'
import { sapCollectorService } from '@/services/sapCollectorService'
import {
  Scan,
  Barcode,
  Truck,
  Package,
  Layers,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  Building,
  User,
  History,
  FileText,
  Filter,
  Check,
  Zap,
  Info,
  ChevronRight,
  Smartphone,
} from 'lucide-react'
import { CollectorAccessModal } from '@/components/CollectorAccessModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const CollectorPage: React.FC = () => {
  const { user, role } = useAuth()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()

  // Telas da Máquina de Estados do Coletor C72:
  // 1. 'INICIO'
  // 2. 'TRANSPORTE'
  // 3. 'ITENS'
  // 4. 'COLETA'
  // 5. 'CONSULTA'
  // 6. 'HISTORICO'
  // 7. 'FINALIZACAO'
  type CollectorScreen =
    | 'INICIO'
    | 'TRANSPORTE'
    | 'ITENS'
    | 'COLETA'
    | 'CONSULTA'
    | 'HISTORICO'
    | 'FINALIZACAO'

  const [activeScreen, setActiveScreen] = useState<CollectorScreen>('INICIO')
  const [accessModalOpen, setAccessModalOpen] = useState(false)

  // Estado Geral
  const [sapConnected, setSapConnected] = useState(false)
  const [sapStatusMessage, setSapStatusMessage] = useState('Ambiente SAP não conectado.')
  const [operatorMatricula, setOperatorMatricula] = useState('EXP-1044')
  const [operatorPlant, setOperatorPlant] = useState('WSTL')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Dados do Transporte e Remessas
  const [transportInput, setTransportInput] = useState('')
  const [currentTransport, setCurrentTransport] = useState<CollectorTransport | null>(null)
  const [deliveryInput, setDeliveryInput] = useState('')
  const [selectedDelivery, setSelectedDelivery] = useState<CollectorDelivery | null>(null)
  const [selectedItem, setSelectedItem] = useState<CollectorDeliveryItem | null>(null)

  // Leituras e Picking do Item Atual
  const [barcodeInput, setBarcodeInput] = useState('')
  const [lotReadings, setLotReadings] = useState<ScannedLotReading[]>([])
  const [processingBarcode, setProcessingBarcode] = useState(false)

  // Consulta e Histórico
  const [consultationPickings, setConsultationPickings] = useState<any[]>([])
  const [auditEvents, setAuditEvents] = useState<any[]>([])

  // Finalização e Justificativas TVARVC
  const [minPercentage, setMinPercentage] = useState(90)
  const [justificationsList, setJustificationsList] = useState<ShippingJustificationOption[]>([])
  const [divergentItems, setDivergentItems] = useState<DeliveryJustificationItem[]>([])
  const [justificationModalOpen, setJustificationModalOpen] = useState(false)
  const [currentDivergentIndex, setCurrentDivergentIndex] = useState(0)
  const [selectedJustificationCode, setSelectedJustificationCode] = useState('')
  const [justificationNotes, setJustificationNotes] = useState('')

  // Cancelamento
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancellingPicking, setCancellingPicking] = useState<any | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  // Refs de Foco Automático Permanente para o Scanner Laser do C72
  const transportInputRef = useRef<HTMLInputElement>(null)
  const deliveryInputRef = useRef<HTMLInputElement>(null)
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  // 1. Inicializar Operador e Conexão SAP
  useEffect(() => {
    async function init() {
      try {
        const op = await sapCollectorService.validateOperator()
        setSapConnected(op.sapConnected)
        setSapStatusMessage(op.sapStatusMessage)
        setOperatorMatricula(op.matricula)
        setOperatorPlant(op.plant)

        const minPct = await sapCollectorService.getMinimumDeliveryPercentage()
        setMinPercentage(minPct)

        const justs = await sapCollectorService.getShippingJustifications()
        setJustificationsList(justs)

        // Se veio por query param ?tknum=100482901
        const initialTknum = searchParams.get('tknum')
        if (initialTknum) {
          setTransportInput(initialTknum)
          handleLoadTransport(initialTknum)
        }
      } catch (err) {
        console.error('Erro ao inicializar coletor:', err)
      }
    }
    init()
  }, [])

  // Efeito de Foco Automático por Tela
  useEffect(() => {
    if (activeScreen === 'INICIO') {
      setTimeout(() => transportInputRef.current?.focus(), 150)
    } else if (activeScreen === 'TRANSPORTE') {
      setTimeout(() => deliveryInputRef.current?.focus(), 150)
    } else if (activeScreen === 'COLETA') {
      setTimeout(() => barcodeInputRef.current?.focus(), 150)
    }
  }, [activeScreen])

  // Feedback Háptico no Chainway C72
  const triggerHaptic = (success: boolean) => {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      if (success) {
        navigator.vibrate(80) // Vibração curta de sucesso
      } else {
        navigator.vibrate([100, 50, 200]) // Padrão de erro
      }
    }
  }

  // ==========================================
  // ETAPA 1: VALIDAR / CARREGAR TRANSPORTE
  // ==========================================
  const handleLoadTransport = async (forcedTknum?: string) => {
    const rawValue = forcedTknum || transportInput
    if (!rawValue || !rawValue.trim()) {
      toast({
        title: 'Transporte inválido',
        description: 'Transporte informado inválido.',
        variant: 'destructive',
      })
      triggerHaptic(false)
      transportInputRef.current?.focus()
      return
    }

    // Parser de remessa/transporte
    const parsed = parseShipmentBarcode(rawValue)
    const targetTknum = parsed.transportNumber || rawValue.replace(/\D/g, '')

    setLoading(true)
    try {
      const transport = await sapCollectorService.getTransport(targetTknum)
      setCurrentTransport(transport)
      setActiveScreen('TRANSPORTE')
      toast({
        title: 'Transporte Localizado',
        description: `Transporte Nº ${transport.transportNumber} carregado com ${transport.deliveriesCount} remessa(s).`,
        className: 'bg-[#005596] text-white',
      })
      triggerHaptic(true)
    } catch (err: any) {
      toast({
        title: 'Validação de Transporte',
        description: err?.message || 'Transporte informado inválido.',
        variant: 'destructive',
      })
      triggerHaptic(false)
      transportInputRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // ETAPA 2: INICIAR CARREGAMENTO NO SAP
  // ==========================================
  const handleStartLoading = async () => {
    if (!currentTransport) return
    setActionLoading(true)
    try {
      const res = await sapCollectorService.startLoading(currentTransport.transportNumber)
      toast({
        title: 'Carregamento Iniciado',
        description: res.message || 'Carregamento iniciado com sucesso.',
        className: 'bg-emerald-600 text-white',
      })
      triggerHaptic(true)
      // Recarregar transporte atualizado
      const updated = await sapCollectorService.getTransport(currentTransport.transportNumber)
      setCurrentTransport(updated)
      deliveryInputRef.current?.focus()
    } catch (err: any) {
      toast({
        title: 'Erro ao iniciar no SAP',
        description: err?.message || 'Falha na transação VT02N_INICIO.',
        variant: 'destructive',
      })
      triggerHaptic(false)
    } finally {
      setActionLoading(false)
    }
  }

  // ==========================================
  // ETAPA 3: LER / VALIDAR REMESSA
  // ==========================================
  const handleScanDelivery = async () => {
    if (!deliveryInput.trim() || !currentTransport) return

    const parsed = parseShipmentBarcode(deliveryInput)
    const deliveryNum = parsed.deliveryNumber || deliveryInput.replace(/\D/g, '')

    if (!deliveryNum) {
      toast({
        title: 'Código Não Reconhecido',
        description: 'Código da remessa não reconhecido.',
        variant: 'destructive',
      })
      triggerHaptic(false)
      deliveryInputRef.current?.focus()
      return
    }

    setLoading(true)
    try {
      const delivery = await sapCollectorService.getDelivery(
        deliveryNum,
        currentTransport.transportNumber,
      )
      setSelectedDelivery(delivery)
      setDeliveryInput('')
      setActiveScreen('ITENS')
      triggerHaptic(true)
    } catch (err: any) {
      toast({
        title: 'Validação da Remessa',
        description: err?.message || 'Remessa inválida.',
        variant: 'destructive',
      })
      triggerHaptic(false)
      setDeliveryInput('')
      deliveryInputRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // ETAPA 4: SELECIONAR ITEM E ABRIR COLETA
  // ==========================================
  const handleSelectItem = async (item: CollectorDeliveryItem) => {
    setSelectedItem(item)
    // Carregar leituras já confirmadas para este item
    try {
      const existingPickings = await sapCollectorService.getPickingList(
        currentTransport?.transportNumber,
        selectedDelivery?.deliveryNumber,
      )
      const itemPickings = existingPickings.filter(
        (p) => p.posnr === item.itemNumber && p.status === 'CONFIRMADO',
      )
      const mapped: ScannedLotReading[] = itemPickings.map((p) => ({
        id: p.id,
        rawBarcode: `${String(p.weight_kg).padStart(4, '0')}${p.charg}${p.matnr}`,
        material: p.matnr,
        batch: p.charg,
        weightKg: p.weight_kg,
        status: 'CONFIRMADO_SAP',
        message: `OT ${p.tanum} confirmada no SAP.`,
        transferOrderNumber: p.tanum,
        timestamp: p.created,
        deliveryNumber: p.vbeln,
        itemNumber: p.posnr,
        storageBin: p.vlpla,
        operatorMatricula: p.operator_matricula,
      }))
      setLotReadings(mapped)
    } catch (_) {
      setLotReadings([])
    }
    setActiveScreen('COLETA')
    setBarcodeInput('')
  }

  // ==========================================
  // ETAPA 5: LEITURA E PICKING DO LOTE (ETIQUETA)
  // ==========================================
  const handleScanBarcode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const rawBarcode = barcodeInput.trim()
    if (!rawBarcode || !currentTransport || !selectedDelivery || !selectedItem) return

    setProcessingBarcode(true)
    setBarcodeInput('') // Limpa imediatamente para não travar leituras em lote do C72

    // 1. Parsing da etiqueta do aço
    const parsed = parseProductBarcode(rawBarcode)
    if (!parsed.valid) {
      triggerHaptic(false)
      setLotReadings((prev) => [
        {
          id: `err-${Date.now()}`,
          rawBarcode,
          material: '',
          batch: '',
          weightKg: 0,
          status: 'ERRO',
          message: parsed.validationMessage || 'Cod. de barras inválido.',
          timestamp: new Date().toISOString(),
          deliveryNumber: selectedDelivery.deliveryNumber,
          itemNumber: selectedItem.itemNumber,
        },
        ...prev,
      ])
      setProcessingBarcode(false)
      barcodeInputRef.current?.focus()
      return
    }

    // 2. Validação de Material (MAKT)
    const cleanExpected = selectedItem.materialCode.replace(/^0+/, '')
    const cleanScanned = parsed.material.replace(/^0+/, '')
    if (cleanExpected !== cleanScanned && !parsed.material.includes(cleanExpected)) {
      triggerHaptic(false)
      setLotReadings((prev) => [
        {
          id: `err-${Date.now()}`,
          rawBarcode,
          material: parsed.material,
          batch: parsed.batch,
          weightKg: parsed.weightKg,
          status: 'ERRO',
          message: 'Material lido diferente do item da remessa.',
          timestamp: new Date().toISOString(),
          deliveryNumber: selectedDelivery.deliveryNumber,
          itemNumber: selectedItem.itemNumber,
        },
        ...prev,
      ])
      setProcessingBarcode(false)
      barcodeInputRef.current?.focus()
      return
    }

    // 3. Validação de Duplicidade Local
    const alreadyScanned = lotReadings.some(
      (r) =>
        r.material === parsed.material &&
        (r.batch === parsed.batch || r.batch === parsed.batchNormalized) &&
        r.status === 'CONFIRMADO_SAP',
    )
    if (alreadyScanned) {
      triggerHaptic(false)
      setLotReadings((prev) => [
        {
          id: `err-${Date.now()}`,
          rawBarcode,
          material: parsed.material,
          batch: parsed.batch,
          weightKg: parsed.weightKg,
          status: 'ERRO',
          message: 'Lote já coletado para este item da remessa.',
          timestamp: new Date().toISOString(),
          deliveryNumber: selectedDelivery.deliveryNumber,
          itemNumber: selectedItem.itemNumber,
        },
        ...prev,
      ])
      setProcessingBarcode(false)
      barcodeInputRef.current?.focus()
      return
    }

    // 4. Validação de Tolerância de Peso (máx 30% acima do previsto)
    const currentItemCollected = lotReadings
      .filter((r) => r.status === 'CONFIRMADO_SAP')
      .reduce((sum, r) => sum + r.weightKg, 0)
    const tol = validateWeightTolerance(
      selectedItem.plannedWeightKg,
      currentItemCollected,
      parsed.weightKg,
      30,
    )
    if (!tol.valid) {
      triggerHaptic(false)
      setLotReadings((prev) => [
        {
          id: `err-${Date.now()}`,
          rawBarcode,
          material: parsed.material,
          batch: parsed.batch,
          weightKg: parsed.weightKg,
          status: 'ERRO',
          message: tol.message || 'Peso da coleta excede 30% da tolerância.',
          timestamp: new Date().toISOString(),
          deliveryNumber: selectedDelivery.deliveryNumber,
          itemNumber: selectedItem.itemNumber,
        },
        ...prev,
      ])
      setProcessingBarcode(false)
      barcodeInputRef.current?.focus()
      return
    }

    // 5. Adicionar como AGUARDANDO_CONFIRMACAO
    const tempId = `reading-${Date.now()}`
    const pendingReading: ScannedLotReading = {
      id: tempId,
      rawBarcode,
      material: parsed.material,
      batch: parsed.batch,
      weightKg: parsed.weightKg,
      status: 'AGUARDANDO_CONFIRMACAO',
      message: 'Processando no SAP...',
      timestamp: new Date().toISOString(),
      deliveryNumber: selectedDelivery.deliveryNumber,
      itemNumber: selectedItem.itemNumber,
      storageBin: 'DP34-01',
      operatorMatricula,
    }

    setLotReadings((prev) => [pendingReading, ...prev])

    // 6. Chamada Transacional SAP: L_TO_CREATE_DN
    try {
      const res = await sapCollectorService.createPicking({
        transport: currentTransport.transportNumber,
        delivery: selectedDelivery.deliveryNumber,
        deliveryItem: selectedItem.itemNumber,
        material: parsed.material,
        batch: parsed.batch,
        quantity: parsed.weightKg,
        unit: 'KG',
        warehouseNumber: 'E01',
        sourceStorageType: '920',
        sourceBin: 'DP34-01',
        operatorMatricula,
        operatorName: user?.name,
        materialDescription: selectedItem.materialDescription,
        customerCode: selectedDelivery.customerCode,
        customerName: selectedDelivery.customerName,
      })

      if (res.success) {
        triggerHaptic(true)
        // Atualizar leitura com status CONFIRMADO_SAP
        setLotReadings((prev) =>
          prev.map((r) =>
            r.id === tempId
              ? {
                  ...r,
                  status: 'CONFIRMADO_SAP',
                  transferOrderNumber: res.transferOrderNumber,
                  message: `OT ${res.transferOrderNumber} confirmada no SAP.`,
                }
              : r,
          ),
        )

        // Atualizar saldo do item localmente
        const newCollected = currentItemCollected + parsed.weightKg
        const newPct =
          selectedItem.plannedWeightKg > 0
            ? (newCollected / selectedItem.plannedWeightKg) * 100
            : 100
        setSelectedItem((prev) =>
          prev
            ? {
                ...prev,
                collectedWeightKg: newCollected,
                balanceKg: Math.max(0, prev.plannedWeightKg - newCollected),
                batchesCount: prev.batchesCount + 1,
                percentage: Math.min(100, Math.round(newPct * 10) / 10),
                status: newPct >= 90 ? 'CONCLUIDO' : 'PARCIAL',
              }
            : null,
        )

        // Atualizar remessa local
        setSelectedDelivery((prev) => {
          if (!prev) return null
          const updatedItems = prev.items.map((i) =>
            i.itemNumber === selectedItem.itemNumber
              ? {
                  ...i,
                  collectedWeightKg: newCollected,
                  balanceKg: Math.max(0, i.plannedWeightKg - newCollected),
                  batchesCount: i.batchesCount + 1,
                  percentage: Math.min(100, Math.round(newPct * 10) / 10),
                  status: newPct >= 90 ? ('CONCLUIDO' as const) : ('PARCIAL' as const),
                }
              : i,
          )
          const totCollected = updatedItems.reduce((s, it) => s + it.collectedWeightKg, 0)
          const totPlanned = updatedItems.reduce((s, it) => s + it.plannedWeightKg, 0)
          const dPct = totPlanned > 0 ? (totCollected / totPlanned) * 100 : 0
          return {
            ...prev,
            items: updatedItems,
            collectedWeightKg: totCollected,
            percentageLoaded: Math.min(100, Math.round(dPct * 10) / 10),
          }
        })
      } else {
        triggerHaptic(false)
        setLotReadings((prev) =>
          prev.map((r) =>
            r.id === tempId
              ? {
                  ...r,
                  status: 'ERRO',
                  message: res.message || 'Falha ao confirmar no SAP.',
                }
              : r,
          ),
        )
      }
    } catch (err: any) {
      triggerHaptic(false)
      setLotReadings((prev) =>
        prev.map((r) =>
          r.id === tempId
            ? {
                ...r,
                status: 'ERRO',
                message:
                  err?.message ||
                  'Não foi possível confirmar o resultado da operação no SAP. Verifique o status antes de tentar novamente.',
              }
            : r,
        ),
      )
    } finally {
      setProcessingBarcode(false)
      barcodeInputRef.current?.focus()
    }
  }

  // ==========================================
  // ETAPA 6: CONSULTA E AUDITORIA
  // ==========================================
  const handleOpenConsultation = async () => {
    setLoading(true)
    try {
      const list = await sapCollectorService.getPickingList(currentTransport?.transportNumber)
      setConsultationPickings(list)
      setActiveScreen('CONSULTA')
    } catch (e) {
      toast({ title: 'Erro na consulta', description: 'Falha ao carregar lista de picking.' })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAuditHistory = async () => {
    setLoading(true)
    try {
      const records = await sapCollectorService.getPickingList(currentTransport?.transportNumber)
      setAuditEvents(records)
      setActiveScreen('HISTORICO')
    } catch (_) {
      setAuditEvents([])
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // ETAPA 7: CANCELAMENTO DE PICKING (MOV 999)
  // ==========================================
  const handleConfirmCancelPicking = async () => {
    if (!cancellingPicking || !cancelReason.trim()) {
      toast({
        title: 'Justificativa Obrigatória',
        description: 'Informe o motivo do cancelamento.',
        variant: 'destructive',
      })
      return
    }

    setActionLoading(true)
    try {
      const res = await sapCollectorService.cancelPicking(cancellingPicking.id, cancelReason)
      toast({
        title: 'Coleta Cancelada',
        description: res.message || 'Coleta cancelada com sucesso no SAP (Movimento 999).',
        className: 'bg-rose-600 text-white',
      })
      setCancelModalOpen(false)
      setCancellingPicking(null)
      setCancelReason('')
      // Recarregar lista
      await handleOpenConsultation()
    } catch (err: any) {
      toast({
        title: 'Erro ao cancelar',
        description: err?.message || 'Falha na movimentação reversa do SAP.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // ==========================================
  // ETAPA 8: FINALIZAÇÃO E AJUSTES DE REMESSA
  // ==========================================
  const handleCheckFinalization = async () => {
    if (!currentTransport) return
    setLoading(true)

    try {
      // 1. Recarregar transporte e remessas atualizadas
      const t = await sapCollectorService.getTransport(currentTransport.transportNumber)
      setCurrentTransport(t)

      // 2. Analisar todos os itens de todas as remessas em relação à TVARVC Z_MIN%_REMESSA
      const divergent: DeliveryJustificationItem[] = []
      t.deliveries.forEach((del) => {
        del.items.forEach((it) => {
          const belowMin = it.percentage < minPercentage
          if (belowMin) {
            divergent.push({
              tknum: t.transportNumber,
              vbeln: del.deliveryNumber,
              posnr: it.itemNumber,
              materialCode: it.materialCode,
              materialDescription: it.materialDescription,
              plannedWeightKg: it.plannedWeightKg,
              collectedWeightKg: it.collectedWeightKg,
              percentage: it.percentage,
              belowMinimum: true,
            })
          }
        })
      })

      setDivergentItems(divergent)
      setActiveScreen('FINALIZACAO')

      // Se houver itens divergentes, abrir popup obrigatório
      if (divergent.length > 0) {
        setCurrentDivergentIndex(0)
        setSelectedJustificationCode(justificationsList[0]?.code || 'FALTA_SALDO_DP34')
        setJustificationNotes('')
        setJustificationModalOpen(true)
      }
    } catch (err: any) {
      toast({
        title: 'Erro na análise de finalização',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveJustification = () => {
    if (!selectedJustificationCode) {
      toast({
        title: 'Seleção Obrigatória',
        description: 'Selecione uma justificativa da tabela TVARVC Z_EXPEDICAO.',
        variant: 'destructive',
      })
      return
    }

    setDivergentItems((prev) =>
      prev.map((item, idx) =>
        idx === currentDivergentIndex
          ? {
              ...item,
              justificationCode: selectedJustificationCode,
              justificationNotes: justificationNotes,
            }
          : item,
      ),
    )

    // Se ainda houver itens divergentes sem justificativa, passa para o próximo
    if (currentDivergentIndex + 1 < divergentItems.length) {
      setCurrentDivergentIndex(currentDivergentIndex + 1)
      setSelectedJustificationCode(justificationsList[0]?.code || 'FALTA_SALDO_DP34')
      setJustificationNotes('')
    } else {
      setJustificationModalOpen(false)
      toast({
        title: 'Justificativas Registradas',
        description: 'Todas as divergências foram justificadas conforme regra TVARVC.',
        className: 'bg-sky-600 text-white',
      })
    }
  }

  const handleExecuteFinishLoading = async () => {
    if (!currentTransport) return

    // Checagem se todos os itens abaixo do mínimo foram justificados
    const pendingJustification = divergentItems.some((d) => !d.justificationCode)
    if (pendingJustification) {
      toast({
        title: 'Justificativa Pendente',
        description:
          'Todos os itens abaixo do percentual mínimo de coleta devem ser justificados antes de finalizar.',
        variant: 'destructive',
      })
      setCurrentDivergentIndex(divergentItems.findIndex((d) => !d.justificationCode))
      setJustificationModalOpen(true)
      return
    }

    setActionLoading(true)
    try {
      const res = await sapCollectorService.finishLoading(
        currentTransport.transportNumber,
        divergentItems,
      )
      toast({
        title: 'Carregamento Finalizado',
        description: res.message || 'Carregamento finalizado com sucesso.',
        className: 'bg-emerald-600 text-white',
      })
      triggerHaptic(true)
      // Voltar à tela inicial
      setActiveScreen('INICIO')
      setTransportInput('')
      setCurrentTransport(null)
      setSelectedDelivery(null)
      setSelectedItem(null)
    } catch (err: any) {
      toast({
        title: 'Erro ao finalizar no SAP',
        description: err?.message || 'Falha ao executar ZF_VT02N_FIM.',
        variant: 'destructive',
      })
      triggerHaptic(false)
    } finally {
      setActionLoading(false)
    }
  }

  // ==========================================
  // RENDERIZAÇÃO: MOBILE-FIRST CHAINWAY C72
  // ==========================================
  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pb-12 select-none">
      {/* Banner de Status da Conexão SAP */}
      <div
        className={`px-3.5 py-2 rounded-xl text-xs flex items-center justify-between border ${
          sapConnected
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
            : 'bg-amber-50 text-amber-900 border-amber-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${sapConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}
          />
          <span className="font-bold">
            {sapConnected ? 'SAP ECC 6.0 Conectado' : 'Ambiente SAP não conectado.'}
          </span>
          <span className="opacity-75 hidden sm:inline">
            (RFC Destination / ZWMT001 / Depósito DP34)
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] bg-white border-current font-mono">
          Centro {operatorPlant} • Matrícula {operatorMatricula}
        </Badge>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TELA 1: INÍCIO (IDENTIFICAR OPERADOR & TRANSPORTE)    */}
      {/* ---------------------------------------------------- */}
      {activeScreen === 'INICIO' && (
        <Card className="border-slate-300 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-[#005596] text-white p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <Scan className="w-6 h-6 text-sky-200 shrink-0" />
                <div>
                  <CardTitle className="text-lg font-black tracking-tight leading-tight">
                    COLETOR DE EXPEDIÇÃO
                  </CardTitle>
                  <p className="text-[11px] text-sky-100 font-medium">
                    Chainway C72 • Transação SAP ZWMT001
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAccessModalOpen(true)}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30 h-8 px-2.5 text-xs font-bold gap-1.5 shadow-none"
                  title="Abrir no Coletor Chainway C72 (Link e QR Code)"
                >
                  <Smartphone className="w-3.5 h-3.5 text-sky-200" />
                  <span>Abrir no Coletor</span>
                </Button>
                <Badge className="bg-white/20 text-white text-[10px] font-bold shrink-0">
                  Linha EXP • DP34
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-6">
            {/* Bloco Operador Logado */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#005596] text-white flex items-center justify-center font-black text-sm">
                  {user?.name?.substring(0, 2).toUpperCase() || 'OP'}
                </div>
                <div>
                  <div className="font-extrabold text-slate-900">{user?.name || 'Operador'}</div>
                  <div className="text-[11px] text-slate-500">
                    Matrícula SAP: <strong>{operatorMatricula}</strong> • Centro:{' '}
                    <strong>{operatorPlant}</strong>
                  </div>
                </div>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">Ativo</Badge>
            </div>

            {/* Campo Grande de Leitura / Digitação de Transporte */}
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Barcode className="w-5 h-5 text-[#005596]" />
                Número do Transporte (TKNUM):
              </label>

              <div className="relative">
                <Input
                  ref={transportInputRef}
                  value={transportInput}
                  onChange={(e) => setTransportInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLoadTransport()
                  }}
                  placeholder="Escaneie ou digite o transporte (ex: 100482901)..."
                  className="h-14 text-lg font-mono font-black tracking-wider pl-4 pr-12 rounded-xl border-2 border-slate-400 focus:border-[#005596] bg-slate-50"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleLoadTransport()}
                  className="absolute right-2 top-2 bottom-2 px-3 bg-[#005596] hover:bg-[#004275] text-white rounded-lg flex items-center justify-center transition"
                  title="Buscar Transporte"
                >
                  <Scan className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Pressione o gatilho laser do C72 ou digite o código de 10 dígitos.
              </p>
            </div>

            {/* Botões Grandes de Ação Mobile */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTransportInput('')
                  transportInputRef.current?.focus()
                }}
                className="h-14 text-sm font-bold border-slate-300 text-slate-700"
              >
                Limpar
              </Button>
              <Button
                type="button"
                onClick={() => handleLoadTransport()}
                disabled={loading}
                className="h-14 text-base font-black bg-[#005596] hover:bg-[#004275] text-white shadow-md gap-2"
              >
                {loading ? 'Validando...' : 'Iniciar Carregamento'}
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------------------------------------------------- */}
      {/* TELA 2: TELA DO TRANSPORTE (CABEÇALHO & REMESSAS)    */}
      {/* ---------------------------------------------------- */}
      {activeScreen === 'TRANSPORTE' && currentTransport && (
        <div className="space-y-4">
          {/* Cabeçalho do Transporte */}
          <Card className="border-slate-300 shadow-sm bg-white overflow-hidden">
            <div className="bg-[#005596] text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveScreen('INICIO')}
                  className="text-white hover:bg-white/20 p-1.5 h-8 w-8"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <div className="text-[10px] text-sky-200 uppercase font-bold tracking-wider">
                    Transporte SAP
                  </div>
                  <div className="text-xl font-mono font-black leading-tight">
                    Nº {currentTransport.transportNumber}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <Badge className="bg-emerald-500 text-white font-mono text-xs font-bold">
                  {formatPercentPtBr(currentTransport.percentageLoaded)}
                </Badge>
                <div className="text-[10px] text-sky-200 mt-0.5">Carregado</div>
              </div>
            </div>

            <CardContent className="p-3.5 space-y-3 text-xs">
              {/* Grid de Indicadores */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Capacidade</div>
                  <div className="font-mono font-black text-slate-900 text-sm">
                    {formatWeightPtBr(currentTransport.capacityKg)}
                  </div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Planejado</div>
                  <div className="font-mono font-black text-slate-900 text-sm">
                    {formatWeightPtBr(currentTransport.plannedWeightKg)}
                  </div>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="text-[10px] text-emerald-700 font-bold uppercase">Coletado</div>
                  <div className="font-mono font-black text-emerald-800 text-sm">
                    {formatWeightPtBr(currentTransport.collectedWeightKg)}
                  </div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Remessas</div>
                  <div className="font-mono font-black text-slate-900 text-sm">
                    {currentTransport.deliveriesCompleted} / {currentTransport.deliveriesCount}
                  </div>
                </div>
              </div>

              {/* Campo Permanente de Leitura de Remessa */}
              <div className="space-y-1.5 pt-1">
                <label className="font-bold text-slate-800 text-xs uppercase flex items-center justify-between">
                  <span>Leia a Remessa (VBELN):</span>
                  <span className="text-slate-400 font-normal">Foco contínuo</span>
                </label>
                <div className="relative">
                  <Input
                    ref={deliveryInputRef}
                    value={deliveryInput}
                    onChange={(e) => setDeliveryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleScanDelivery()
                    }}
                    placeholder="Escaneie a remessa (ex: 800014520)..."
                    className="h-13 text-base font-mono font-bold tracking-wider rounded-xl border-2 border-slate-400 focus:border-[#005596] bg-slate-50 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => handleScanDelivery()}
                    className="absolute right-2 top-2 bottom-2 px-3 bg-[#005596] text-white rounded-lg flex items-center justify-center"
                  >
                    <Scan className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Remessas do Transporte */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wide">
                Remessas Vinculadas ({currentTransport.deliveries.length}):
              </span>
              <span className="text-[11px] text-slate-500">Toque para abrir itens</span>
            </div>

            <div className="space-y-2">
              {currentTransport.deliveries.map((del) => (
                <div
                  key={del.deliveryNumber}
                  onClick={() => {
                    setSelectedDelivery(del)
                    setActiveScreen('ITENS')
                  }}
                  className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-center justify-between ${
                    del.status === 'CONCLUIDO'
                      ? 'bg-emerald-50/70 border-emerald-400'
                      : del.status === 'PARCIAL'
                        ? 'bg-amber-50/70 border-amber-400'
                        : 'bg-white border-slate-200 hover:border-[#005596]'
                  }`}
                >
                  <div className="space-y-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-slate-900">
                        Remessa Nº {del.deliveryNumber}
                      </span>
                      <Badge
                        className={`text-[9px] font-bold ${
                          del.status === 'CONCLUIDO'
                            ? 'bg-emerald-600 text-white'
                            : del.status === 'PARCIAL'
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {del.status === 'CONCLUIDO'
                          ? 'Concluída'
                          : del.status === 'PARCIAL'
                            ? 'Parcial'
                            : 'Pendente'}
                      </Badge>
                    </div>
                    <div className="text-xs font-bold text-slate-700 truncate">
                      {del.customerName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Previsto: <strong>{formatWeightPtBr(del.plannedWeightKg)}</strong> • Coletado:{' '}
                      <strong className="text-emerald-700">
                        {formatWeightPtBr(del.collectedWeightKg)}
                      </strong>{' '}
                      ({formatPercentPtBr(del.percentageLoaded)})
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Barra Fixa de Ações no Rodapé Mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <Button
              type="button"
              onClick={handleStartLoading}
              disabled={actionLoading}
              className="h-12 bg-[#005596] hover:bg-[#004275] text-white font-bold text-xs gap-1.5"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              Iniciar Coleta
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleOpenConsultation}
              className="h-12 border-slate-300 text-slate-800 font-bold text-xs gap-1.5"
            >
              <FileText className="w-4 h-4 text-slate-600" />
              Consultar Coleta
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleOpenAuditHistory}
              className="h-12 border-slate-300 text-slate-800 font-bold text-xs gap-1.5"
            >
              <History className="w-4 h-4 text-slate-600" />
              Histórico
            </Button>

            <Button
              type="button"
              onClick={handleCheckFinalization}
              className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Finalizar Carga
            </Button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TELA 3: TELA DOS ITENS DA REMESSA                    */}
      {/* ---------------------------------------------------- */}
      {activeScreen === 'ITENS' && selectedDelivery && (
        <div className="space-y-4">
          <Card className="border-slate-300 shadow-sm bg-white overflow-hidden">
            <div className="bg-[#005596] text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveScreen('TRANSPORTE')}
                  className="text-white hover:bg-white/20 p-1.5 h-8 w-8"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <div className="text-[10px] text-sky-200 uppercase font-bold tracking-wider">
                    Remessa Selecionada
                  </div>
                  <div className="text-xl font-mono font-black leading-tight">
                    Nº {selectedDelivery.deliveryNumber}
                  </div>
                </div>
              </div>

              <Badge className="bg-white/20 text-white font-mono text-xs">
                {selectedDelivery.items.length} Itens
              </Badge>
            </div>

            <CardContent className="p-3 text-xs bg-slate-50 border-t border-slate-200">
              <div className="font-bold text-slate-800">{selectedDelivery.customerName}</div>
              <div className="text-slate-500 text-[11px] mt-0.5">
                Código: {selectedDelivery.customerCode} • Transporte:{' '}
                {selectedDelivery.transportNumber}
              </div>
            </CardContent>
          </Card>

          {/* Cards Grandes por Item Principal (LIPS-UECHA vazio) */}
          <div className="space-y-3">
            {selectedDelivery.items.map((item) => {
              const isDone = item.status === 'CONCLUIDO'
              return (
                <div
                  key={item.itemNumber}
                  className={`p-4 rounded-xl border-2 transition space-y-3 ${
                    isDone
                      ? 'bg-emerald-50/60 border-emerald-400'
                      : item.status === 'PARCIAL'
                        ? 'bg-amber-50/60 border-amber-400'
                        : 'bg-white border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono font-bold text-xs bg-white">
                          Item {item.itemNumber}
                        </Badge>
                        <span className="font-mono font-black text-sm text-[#005596]">
                          {item.materialCode}
                        </span>
                      </div>
                      <div className="font-bold text-slate-800 text-xs leading-snug">
                        {item.materialDescription}
                      </div>
                    </div>

                    <Badge
                      className={`text-[10px] font-bold ${
                        isDone
                          ? 'bg-emerald-600 text-white'
                          : item.status === 'PARCIAL'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.status}
                    </Badge>
                  </div>

                  {/* Detalhes de Pesos e Saldo */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">
                        Programado
                      </div>
                      <div className="font-mono font-black text-slate-800">
                        {formatWeightPtBr(item.plannedWeightKg)}
                      </div>
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <div className="text-[10px] text-emerald-700 font-bold uppercase">
                        Coletado
                      </div>
                      <div className="font-mono font-black text-emerald-800">
                        {formatWeightPtBr(item.collectedWeightKg)}
                      </div>
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <div className="text-[10px] text-rose-700 font-bold uppercase">Saldo</div>
                      <div className="font-mono font-black text-rose-800">
                        {formatWeightPtBr(item.balanceKg)}
                      </div>
                    </div>
                  </div>

                  {/* Rodapé do Card com Botão Coletar */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500 font-semibold">
                      Lotes coletados: <strong>{item.batchesCount}</strong>
                    </span>

                    <Button
                      type="button"
                      disabled={isDone}
                      onClick={() => handleSelectItem(item)}
                      className={`h-11 px-6 font-black text-xs gap-1.5 ${
                        isDone
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-[#005596] hover:bg-[#004275] text-white shadow-sm'
                      }`}
                    >
                      <Scan className="w-4 h-4" />
                      {isDone ? 'Concluído' : 'Coletar Item'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TELA 4: TELA DE COLETA DO ITEM (LEITOR DE ETIQUETA) */}
      {/* ---------------------------------------------------- */}
      {activeScreen === 'COLETA' && selectedDelivery && selectedItem && (
        <div className="space-y-4">
          {/* Cabeçalho Fixo do Item */}
          <Card className="border-slate-300 shadow-sm bg-white overflow-hidden sticky top-16 z-30">
            <div className="bg-[#005596] text-white p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveScreen('ITENS')}
                  className="text-white hover:bg-white/20 p-1.5 h-8 w-8"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <div className="text-[10px] text-sky-200 font-bold uppercase">
                    Remessa {selectedDelivery.deliveryNumber} • Item {selectedItem.itemNumber}
                  </div>
                  <div className="font-mono font-black text-base leading-tight">
                    {selectedItem.materialCode}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono font-black text-emerald-300 text-sm">
                  {formatWeightPtBr(selectedItem.collectedWeightKg)}
                </div>
                <div className="text-[10px] text-sky-200">
                  Saldo: {formatWeightPtBr(selectedItem.balanceKg)}
                </div>
              </div>
            </div>

            {/* Campo Grande de Leitura de Etiqueta com Foco Permanente */}
            <CardContent className="p-3 bg-slate-50 space-y-2">
              <form onSubmit={handleScanBarcode} className="relative">
                <Input
                  ref={barcodeInputRef}
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="LEIA A ETIQUETA DO AÇO (Foco Contínuo)..."
                  className="h-14 text-base font-mono font-black rounded-xl border-2 border-slate-500 focus:border-[#005596] bg-white pr-14"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={processingBarcode}
                  className="absolute right-2 top-2 bottom-2 px-3 bg-[#005596] hover:bg-[#004275] text-white rounded-lg flex items-center justify-center"
                >
                  {processingBarcode ? (
                    <RotateCcw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Scan className="w-5 h-5" />
                  )}
                </button>
              </form>

              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span>Estrutura: PPPP + LOTE + MATERIAL (Mín. 25 chars)</span>
                <span className="font-bold text-[#005596]">Depósito: DP34</span>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Leituras Realizadas (Status 🟡 Validando / 🟢 Confirmado / 🔴 Erro) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                Histórico de Leituras Deste Item ({lotReadings.length}):
              </span>
              <span className="text-[11px] text-slate-500">Mais recentes primeiro</span>
            </div>

            {lotReadings.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs">
                Aguardando leitura da primeira etiqueta de vergalhão/tela...
              </div>
            ) : (
              <div className="space-y-2">
                {lotReadings.map((reading) => {
                  const isSuccess = reading.status === 'CONFIRMADO_SAP'
                  const isPending = reading.status === 'AGUARDANDO_CONFIRMACAO'
                  const isError = reading.status === 'ERRO'

                  return (
                    <div
                      key={reading.id}
                      className={`p-3 rounded-xl border-2 flex items-start justify-between gap-3 text-xs transition ${
                        isSuccess
                          ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950'
                          : isPending
                            ? 'bg-amber-50/80 border-amber-400 text-amber-950'
                            : 'bg-rose-50/80 border-rose-400 text-rose-950'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {isSuccess ? '🟢' : isPending ? '🟡' : '🔴'}
                          </span>
                          <span className="font-mono font-black text-sm">
                            Lote: {reading.batch || '—'}
                          </span>
                          <Badge variant="outline" className="font-mono text-[10px] bg-white">
                            {formatWeightPtBr(reading.weightKg)}
                          </Badge>
                        </div>

                        <div className="font-medium text-slate-700">{reading.message}</div>

                        <div className="text-[10px] text-slate-500 font-mono">
                          Código lido: {reading.rawBarcode}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {reading.transferOrderNumber && (
                          <Badge className="bg-[#005596] text-white font-mono text-[9px]">
                            {reading.transferOrderNumber}
                          </Badge>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1">
                          {reading.timestamp.split('T')[1]?.substring(0, 8) || ''}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TELA 5: CONSULTA DE COLETAS (ZF_BUSCAR_PICKING)      */}
      {/* ---------------------------------------------------- */}
      {activeScreen === 'CONSULTA' && (
        <Card className="border-slate-300 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-[#005596] text-white p-3.5 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setActiveScreen('TRANSPORTE')}
                className="text-white hover:bg-white/20 p-1.5 h-8 w-8"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <CardTitle className="text-base font-black">
                CONSULTA DE PICKING (ZF_BUSCAR_PICKING)
              </CardTitle>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenConsultation}
              className="text-xs h-7 text-white border-white/30 bg-white/10"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Atualizar
            </Button>
          </CardHeader>

          <CardContent className="p-4 space-y-3 text-xs">
            {consultationPickings.length === 0 ? (
              <div className="text-center p-8 text-slate-500">
                Nenhum picking registrado para o transporte atual.
              </div>
            ) : (
              <div className="space-y-2">
                {consultationPickings.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900">
                          OT {p.tanum} • Remessa {p.vbeln}
                        </span>
                        <Badge
                          className={`text-[9px] ${
                            p.status === 'CONFIRMADO'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {p.status}
                        </Badge>
                      </div>
                      <div className="text-slate-600">
                        Material: <strong>{p.matnr}</strong> • Lote: <strong>{p.charg}</strong> •
                        Peso: <strong>{formatWeightPtBr(p.weight_kg)}</strong>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Origem: {p.vlpla} (DP34) → Destino: {p.nltyp}/{p.nlpla} • Operador:{' '}
                        {p.operator_matricula}
                      </div>
                    </div>

                    {/* Botão de Cancelamento para perfil Supervisor */}
                    {p.status === 'CONFIRMADO' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setCancellingPicking(p)
                          setCancelReason('')
                          setCancelModalOpen(true)
                        }}
                        className="h-8 text-xs font-bold"
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---------------------------------------------------- */}
      {/* TELA 6: HISTÓRICO & AUDITORIA                        */}
      {/* ---------------------------------------------------- */}
      {activeScreen === 'HISTORICO' && (
        <Card className="border-slate-300 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-[#005596] text-white p-3.5 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setActiveScreen('TRANSPORTE')}
                className="text-white hover:bg-white/20 p-1.5 h-8 w-8"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <CardTitle className="text-base font-black">
                TRILHA DE AUDITORIA (ZMMT011 / EVENTOS)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="space-y-2">
              {auditEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-900">
                      OT: {evt.tanum} • Remessa: {evt.vbeln} (Item {evt.posnr})
                    </div>
                    <div className="text-slate-600">
                      Material: {evt.matnr} • Lote: {evt.charg} • Peso:{' '}
                      {formatWeightPtBr(evt.weight_kg)}
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {evt.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------------------------------------------------- */}
      {/* TELA 7: TELA DE FINALIZAÇÃO DO CARREGAMENTO          */}
      {/* ---------------------------------------------------- */}
      {activeScreen === 'FINALIZACAO' && currentTransport && (
        <div className="space-y-4">
          <Card className="border-slate-300 shadow-sm bg-white overflow-hidden">
            <div className="bg-[#005596] text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveScreen('TRANSPORTE')}
                  className="text-white hover:bg-white/20 p-1.5 h-8 w-8"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <div className="text-[10px] text-sky-200 uppercase font-bold">
                    Resumo de Carregamento
                  </div>
                  <div className="text-lg font-mono font-black">
                    Finalização do Transporte {currentTransport.transportNumber}
                  </div>
                </div>
              </div>

              <Badge className="bg-emerald-500 text-white font-mono text-xs">
                Mínimo TVARVC: {minPercentage}%
              </Badge>
            </div>

            <CardContent className="p-4 space-y-4 text-xs">
              {/* Quadro de Divergências */}
              {divergentItems.length > 0 ? (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    Itens Abaixo do Percentual Mínimo de Coleta ({minPercentage}%):
                  </div>
                  <div className="space-y-1.5">
                    {divergentItems.map((div, idx) => (
                      <div
                        key={`${div.vbeln}-${div.posnr}`}
                        className="p-2.5 bg-white rounded-lg border border-amber-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-800">
                            Remessa {div.vbeln} • Item {div.posnr} ({div.materialCode})
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Coletado: {formatWeightPtBr(div.collectedWeightKg)} de{' '}
                            {formatWeightPtBr(div.plannedWeightKg)} (
                            <strong className="text-amber-700">
                              {formatPercentPtBr(div.percentage)}
                            </strong>
                            )
                          </div>
                          {div.justificationCode && (
                            <div className="text-emerald-700 font-bold text-[10px] mt-0.5">
                              Justificativa TVARVC: {div.justificationCode}
                            </div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCurrentDivergentIndex(idx)
                            setSelectedJustificationCode(
                              div.justificationCode || justificationsList[0]?.code || '',
                            )
                            setJustificationNotes(div.justificationNotes || '')
                            setJustificationModalOpen(true)
                          }}
                          className="h-7 text-xs font-bold border-amber-400 text-amber-900"
                        >
                          {div.justificationCode ? 'Editar Justif.' : 'Justificar'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-300 text-emerald-900 flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Todos os itens atingiram ou superaram a meta mínima de carregamento (
                  {minPercentage}%).
                </div>
              )}

              {/* Botão de Finalização Efetiva */}
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleExecuteFinishLoading}
                  disabled={actionLoading}
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-lg gap-2"
                >
                  {actionLoading ? (
                    <RotateCcw className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  {actionLoading
                    ? 'Processando BAPI e VT02N...'
                    : 'Confirmar e Finalizar Carregamento (SAP)'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL OBRIGATÓRIO: JUSTIFICATIVA TVARVC Z_EXPEDICAO  */}
      {/* ---------------------------------------------------- */}
      <Dialog open={justificationModalOpen} onOpenChange={setJustificationModalOpen}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Justificativa Obrigatória de Expedição
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              {divergentItems[currentDivergentIndex] && (
                <span>
                  O Item {divergentItems[currentDivergentIndex].posnr} da remessa{' '}
                  {divergentItems[currentDivergentIndex].vbeln} está abaixo de {minPercentage}% do
                  mínimo de coleta (
                  {formatPercentPtBr(divergentItems[currentDivergentIndex].percentage)}).
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="font-bold text-slate-800 text-xs">
              Motivo Aceito pelo SAP (Tabela TVARVC Z_EXPEDICAO):
            </label>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {justificationsList.map((just) => (
                <label
                  key={just.code}
                  className={`p-2.5 rounded-lg border flex items-center gap-2.5 cursor-pointer text-xs ${
                    selectedJustificationCode === just.code
                      ? 'bg-sky-50 border-[#005596] text-[#005596] font-bold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="justification"
                    value={just.code}
                    checked={selectedJustificationCode === just.code}
                    onChange={() => setSelectedJustificationCode(just.code)}
                    className="text-[#005596]"
                  />
                  <span>{just.label}</span>
                </label>
              ))}
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 text-xs">Observações Operacionais:</label>
              <Input
                value={justificationNotes}
                onChange={(e) => setJustificationNotes(e.target.value)}
                placeholder="Observações complementares..."
                className="h-10 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setJustificationModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveJustification}
              className="bg-[#005596] text-white font-bold"
            >
              Confirmar Justificativa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------- */}
      {/* MODAL: CANCELAMENTO DE PICKING (MOVIMENTO 999)       */}
      {/* ---------------------------------------------------- */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-rose-700 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              Cancelar Coleta no SAP (Movimento 999)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Esta ação registrará o estorno no SAP e o evento ZMMT011 TIPO=4 (CANCELADO).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                OT: <strong>{cancellingPicking?.tanum}</strong> • Remessa:{' '}
                <strong>{cancellingPicking?.vbeln}</strong>
              </div>
              <div>
                Material: <strong>{cancellingPicking?.matnr}</strong> • Lote:{' '}
                <strong>{cancellingPicking?.charg}</strong>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-800 text-xs">
                Justificativa Obrigatória do Cancelamento:
              </label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Informe o motivo do cancelamento..."
                className="h-10 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setCancelModalOpen(false)}>
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmCancelPicking}
              disabled={actionLoading}
              className="font-bold"
            >
              Confirmar Estorno SAP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Acesso Direto / QR Code para o Chainway C72 */}
      <CollectorAccessModal open={accessModalOpen} onOpenChange={setAccessModalOpen} />
    </div>
  )
}

export default CollectorPage
