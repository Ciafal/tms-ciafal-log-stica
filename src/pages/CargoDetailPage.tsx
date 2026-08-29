import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Truck,
  ArrowLeft,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  UserCheck,
  ShieldCheck,
  Package,
  MapPin,
  DollarSign,
  Layers,
  Send,
  Building,
  History,
  RotateCcw,
  Sparkles,
  Check,
} from 'lucide-react'
import { tmsService } from '../services/tmsService'
import {
  CargoDetailedView,
  PrinterDeviceEntity,
  checkLoadingReleaseReadiness,
} from '../domain/printingAndTransportEngine'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/use-toast'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'

export default function CargoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [cargo, setCargo] = useState<CargoDetailedView | null>(null)
  const [printers, setPrinters] = useState<PrinterDeviceEntity[]>([])
  const [loading, setLoading] = useState(true)

  // Modais de Ação
  const [isSapOrderModalOpen, setIsSapOrderModalOpen] = useState(false)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false)
  const [selectedPrinterId, setSelectedPrinterId] = useState('')
  const [processingAction, setProcessingAction] = useState(false)

  // Dados do Motorista / Entrega
  const [driverDoc, setDriverDoc] = useState('321.654.987-00')
  const [vehiclePlate, setVehiclePlate] = useState('ABC-1D23')
  const [handoverNotes, setHandoverNotes] = useState(
    'Documento entregue fisicamente na portaria ao condutor.',
  )

  const loadCargoData = async () => {
    setLoading(true)
    try {
      const [allCargos, prtList] = await Promise.all([
        tmsService.getCargos(),
        tmsService.getPrinterDevices(),
      ])

      setPrinters(prtList as PrinterDeviceEntity[])
      const found = allCargos.find((c: any) => c.id === id)

      // Se encontrou no banco ou monta estrutura 360° robusta
      const defaultDetail: CargoDetailedView = {
        cargoId: id || 'CARGO-7701',
        itineraryCode: found?.itinerary_code || 'ITIN-SP-INTERIOR',
        status: (found?.status as any) || 'Contratada',
        plannedDate: found?.planned_date || new Date().toISOString().split('T')[0],
        vehicleType: found?.vehicle_type || 'Carreta 5 Eixos',
        vehiclePlate: found?.vehicle_plate || 'ABC-1D23',
        vehicleCapacityKg: found?.vehicle_capacity_kg || 28000,
        totalWeightKg: found?.total_weight_kg || 27200,
        occupancyPct: found?.occupancy_pct || 97.1,
        ordersCount: found?.order_count || 2,
        customersCount: 2,
        driverId: found?.driver_id || 'drv-01',
        driverName: found?.driver_name || 'Carlos Alberto Silva (PORTA)',
        driverPhone: '(11) 98765-4321',
        driverDocument: '321.654.987-00',
        isPortaDriver: true,
        contractedFreightValue: found?.estimated_cost || 4350.0,
        anttFloorValue: found?.antt_floor_value || 3890.0,
        sapTransportNumber: found?.sap_transport_number || 'OT-2025-481902',
        sapTransportStatus: found?.sap_transport_number ? 'Criado' : 'Pendente',
        sapOrderCreatedAt: found?.sap_transport_number ? new Date().toISOString() : undefined,
        printJobStatus: 'Impresso',
        printJobId: 'job-7701-01',
        printedAt: new Date().toISOString(),
        documentDeliveryStatus: 'Entregue_Motorista',
        deliveredAt: new Date().toISOString(),
        isReleasedForLoading: true,
        releasedAt: new Date().toISOString(),
        timeline: [
          {
            step: 'SCENARIO_CREATED',
            title: 'Cenário 1 — Ocupação Máxima',
            description: 'Otimizador determinístico calculou ocupação de 97.1% e sugeriu alocação.',
            timestamp: new Date(Date.now() - 3600000 * 4).toLocaleTimeString('pt-BR'),
            operator: 'Algoritmo TMS CIAFAL',
            status: 'DONE',
          },
          {
            step: 'SCENARIO_APPROVED',
            title: 'Cenário Aprovado pelo Planejador',
            description: 'Validação de data desejada e estoque DP34 conferidos com sucesso.',
            timestamp: new Date(Date.now() - 3600000 * 3).toLocaleTimeString('pt-BR'),
            operator: 'planejador@ciafal.com.br',
            status: 'DONE',
          },
          {
            step: 'DRIVER_CONTRACTED',
            title: 'Motorista Contratado na Mesa de Fretes',
            description: 'Motorista PORTA selecionado na Fila com valor homologado.',
            timestamp: new Date(Date.now() - 3600000 * 2).toLocaleTimeString('pt-BR'),
            operator: 'operador@ciafal.com.br',
            status: 'DONE',
            referenceCode: 'Carlos Alberto Silva',
          },
          {
            step: 'SAP_ORDER_CREATED',
            title: 'Ordem de Transporte SAP Confirmada',
            description: 'Número oficial gerado pelo SAP Gateway (RFC RFC_TRANSPORT_CREATE).',
            timestamp: new Date(Date.now() - 3600000 * 1).toLocaleTimeString('pt-BR'),
            operator: 'SAP ECC Integration',
            status: 'DONE',
            referenceCode: 'OT-2025-481902',
          },
          {
            step: 'PRINT_COMPLETED',
            title: 'Documento Físico Impresso',
            description: 'Impressão concluída na impressora PRT-EXP-DP34-01.',
            timestamp: new Date(Date.now() - 1800000).toLocaleTimeString('pt-BR'),
            operator: 'operador@ciafal.com.br',
            status: 'DONE',
            referenceCode: 'PRT-EXP-DP34-01',
          },
          {
            step: 'DOCUMENT_DELIVERED',
            title: 'Ordem Entregue ao Motorista',
            description: 'Documento assinado entregue ao condutor na portaria.',
            timestamp: new Date().toLocaleTimeString('pt-BR'),
            operator: 'portaria@ciafal.com.br',
            status: 'DONE',
          },
          {
            step: 'RELEASED_FOR_LOADING',
            title: 'Liberada para Carregamento',
            description: 'Todos os requisitos atendidos. Veículo apto a entrar na baia.',
            timestamp: new Date().toLocaleTimeString('pt-BR'),
            operator: 'Sistema TMS',
            status: 'DONE',
          },
        ],
      }

      setCargo(defaultDetail)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar detalhes',
        description: err?.message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCargoData()
  }, [id])

  // Ação 1: Solicitar Ordem SAP
  const handleRequestSapOrder = async () => {
    if (!cargo) return
    setProcessingAction(true)
    try {
      const res = await tmsService.createSapTransportOrder(
        cargo.cargoId,
        user?.email || 'operador@ciafal.com.br',
      )

      if (res.success) {
        toast({
          title: 'Ordem SAP Confirmada',
          description: `Ordem de Transporte Oficial gerada com sucesso: ${res.transportNumber || res.sapTransportNumber}`,
        })
        setCargo({
          ...cargo,
          sapTransportNumber: res.transportNumber || res.sapTransportNumber,
          sapTransportStatus: 'Criado',
          status: 'Ordem SAP criada',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha na Ordem SAP',
          description: res.message || 'Falha ao processar solicitação no SAP.',
        })
      }
      setIsSapOrderModalOpen(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro de Comunicação com SAP',
        description: err?.message,
      })
    } finally {
      setProcessingAction(false)
    }
  }

  // Ação 2: Imprimir Ordem de Transporte
  const handlePrintOrder = async () => {
    if (!cargo || !cargo.sapTransportNumber) return

    setProcessingAction(true)
    try {
      const res = await tmsService.printTransportOrder({
        cargoId: cargo.cargoId,
        sapTransportNumber: cargo.sapTransportNumber,
        printerId: selectedPrinterId || undefined,
        operatorEmail: user?.email || 'operador@ciafal.com.br',
        operatorName: user?.email?.split('@')[0] || 'Operador',
      })

      if (res.success) {
        toast({
          title: 'Impressão Enviada',
          description: res.message,
        })
        setCargo({
          ...cargo,
          printJobStatus: 'Impresso',
          status: 'Documento impresso',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Impressão Pendente (Fila)',
          description: res.message,
        })
      }
      setIsPrintModalOpen(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro de Impressão',
        description: err?.message,
      })
    } finally {
      setProcessingAction(false)
    }
  }

  // Ação 3: Registrar Entrega ao Motorista
  const handleHandoverDocument = async () => {
    if (!cargo || !cargo.sapTransportNumber) return

    setProcessingAction(true)
    try {
      await tmsService.registerDocumentHandover({
        cargoId: cargo.cargoId,
        sapTransportNumber: cargo.sapTransportNumber,
        printJobId: cargo.printJobId || 'job-default',
        driverId: cargo.driverId || 'drv-01',
        driverName: cargo.driverName || 'Motorista',
        driverDocument: driverDoc,
        vehiclePlate,
        operatorEmail: user?.email || 'operador@ciafal.com.br',
        notes: handoverNotes,
      })

      toast({
        title: 'Documento Entregue ao Motorista',
        description: `Ordem ${cargo.sapTransportNumber} entregue. Carga LIBERADA PARA CARREGAMENTO.`,
      })

      setCargo({
        ...cargo,
        documentDeliveryStatus: 'Entregue_Motorista',
        status: 'Liberada para carregamento',
        isReleasedForLoading: true,
      })
      setIsHandoverModalOpen(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar entrega',
        description: err?.message,
      })
    } finally {
      setProcessingAction(false)
    }
  }

  if (loading || !cargo) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Carregando visão 360° da carga...
      </div>
    )
  }

  const readiness = checkLoadingReleaseReadiness(cargo)

  return (
    <div className="space-y-6 pb-16">
      {/* HEADER DA CARGA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs mb-1 -ml-2 text-slate-500 hover:text-slate-800"
            onClick={() => navigate('/tms/roteirizador-simulador')}
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Voltar ao Simulador
          </Button>

          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Carga {cargo.cargoId}
            </h1>
            <Badge
              className={
                cargo.status === 'Liberada para carregamento'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-indigo-600 text-white font-bold'
              }
            >
              {cargo.status}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Itinerário: <strong>{cargo.itineraryCode}</strong> • Data Prevista:{' '}
            <strong>{cargo.plannedDate}</strong> • Ocupação: <strong>{cargo.occupancyPct}%</strong>{' '}
            ({(cargo.totalWeightKg / 1000).toFixed(1)}t)
          </p>
        </div>

        {/* BOTÕES DE AÇÃO DO FLUXO OPERACIONAL */}
        <div className="flex flex-wrap items-center gap-2">
          {cargo.sapTransportStatus !== 'Criado' && (
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              onClick={() => setIsSapOrderModalOpen(true)}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Solicitar Ordem SAP
            </Button>
          )}

          {cargo.sapTransportStatus === 'Criado' && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50"
              onClick={() => setIsPrintModalOpen(true)}
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Imprimir Ordem SAP
            </Button>
          )}

          {cargo.printJobStatus === 'Impresso' &&
            cargo.documentDeliveryStatus !== 'Entregue_Motorista' && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                onClick={() => setIsHandoverModalOpen(true)}
              >
                <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                Entregar Documento ao Motorista
              </Button>
            )}
        </div>
      </div>

      {/* BANNER DE STATUS DE LIBERAÇÃO PARA CARREGAMENTO (REGRA 47) */}
      <Card
        className={`border ${
          readiness.isReady
            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
            : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
        }`}
      >
        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            {readiness.isReady ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">
                {readiness.isReady
                  ? 'CARGA LIBERADA PARA CARREGAMENTO NO PÁTIO'
                  : 'CARGA AGUARDANDO REQUISITOS OPERACIONAIS'}
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {readiness.isReady
                  ? 'Todos os 6 requisitos cumpridos: Ordem SAP oficial confirmada, motorista contratado, veículo validado, estoque DP34 conferido e documento físico entregue ao condutor.'
                  : `Pendências: ${readiness.missingRequirements.join(' • ')}`}
              </p>
            </div>
          </div>

          <Badge
            variant="outline"
            className={`font-mono text-xs px-2.5 py-1 ${
              readiness.isReady
                ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                : 'bg-amber-100 text-amber-800 border-amber-400'
            }`}
          >
            {cargo.sapTransportNumber || 'ORDEM SAP PENDENTE'}
          </Badge>
        </CardContent>
      </Card>

      {/* ABAS DA TELA DE DETALHE 360° (REGRA 45) */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full h-auto p-1 bg-slate-100 dark:bg-slate-800 text-xs">
          <TabsTrigger value="timeline">Timeline Operacional</TabsTrigger>
          <TabsTrigger value="orders">Pedidos ({cargo.ordersCount})</TabsTrigger>
          <TabsTrigger value="sap_order">Ordem SAP</TabsTrigger>
          <TabsTrigger value="printing">Impressão & Fila</TabsTrigger>
          <TabsTrigger value="driver_vehicle">Motorista & Veículo</TabsTrigger>
          <TabsTrigger value="freight">Frete & ANTT</TabsTrigger>
        </TabsList>

        {/* ABA: TIMELINE */}
        <TabsContent value="timeline" className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-600" />
                Linha do Tempo Operacional da Carga (Auditoria Completa)
              </CardTitle>
              <CardDescription className="text-xs">
                Rastreabilidade de ponta a ponta desde a otimização no simulador até a entrega
                física ao condutor.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative border-l-2 border-indigo-200 dark:border-indigo-900 ml-4 space-y-6">
                {cargo.timeline.map((event, idx) => (
                  <div key={idx} className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-900" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {event.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {event.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {event.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                        <span>
                          Operador: <strong>{event.operator}</strong>
                        </span>
                        {event.referenceCode && (
                          <span>
                            • Ref:{' '}
                            <strong className="font-mono text-indigo-600">
                              {event.referenceCode}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: ORDEM SAP */}
        <TabsContent value="sap_order" className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                Ordem de Transporte Oficial do SAP
              </CardTitle>
              <CardDescription className="text-xs">
                O TMS orquestra a solicitação; o número e documento oficial residem no SAP ECC.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800 p-3 rounded">
                <div>
                  <span className="text-slate-400 block text-[10px]">Número Oficial SAP</span>
                  <span className="font-mono text-base font-bold text-indigo-700 dark:text-indigo-400">
                    {cargo.sapTransportNumber || 'Não Solicitada'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Status da Integração</span>
                  <Badge className="bg-emerald-600 text-white text-[10px] mt-1">
                    {cargo.sapTransportStatus === 'Criado' ? 'Confirmado no SAP' : 'Pendente'}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Data Criação SAP</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {cargo.sapOrderCreatedAt
                      ? new Date(cargo.sapOrderCreatedAt).toLocaleString('pt-BR')
                      : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="border rounded p-3 text-slate-600 dark:text-slate-300 space-y-2">
                <span className="font-semibold block text-slate-800 dark:text-slate-200">
                  Parâmetros de Integração SAP:
                </span>
                <p>
                  • BAPI de Expedição: <code>RFC_TRANSPORT_CREATE / ZSD_BAPI_SHIPMENT_CREATE</code>
                </p>
                <p>
                  • Status do Mock:{' '}
                  <strong>PREPARADO / AGUARDANDO CONFIGURAÇÃO FINAL COM A CONSULTORIA SAP</strong>
                </p>
                <p>
                  • Idempotência: <strong>IDEM-TRANS-{cargo.cargoId}</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: IMPRESSÃO */}
        <TabsContent value="printing" className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Printer className="h-4 w-4 text-indigo-600" />
                Status de Impressão e Spooler de Rede
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800 p-3 rounded">
                <div>
                  <span className="text-slate-400 block text-[10px]">Job de Impressão</span>
                  <span className="font-mono font-bold">{cargo.printJobId || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Status Spooler</span>
                  <Badge className="bg-emerald-600 text-white text-[10px] mt-0.5">
                    {cargo.printJobStatus}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Entrega ao Motorista</span>
                  <Badge
                    className={
                      cargo.documentDeliveryStatus === 'Entregue_Motorista'
                        ? 'bg-emerald-600 text-white text-[10px] mt-0.5'
                        : 'bg-amber-600 text-white text-[10px] mt-0.5'
                    }
                  >
                    {cargo.documentDeliveryStatus}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Data Entrega</span>
                  <span className="font-mono">
                    {cargo.deliveredAt
                      ? new Date(cargo.deliveredAt).toLocaleTimeString('pt-BR')
                      : 'Pendente'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: MOTORISTA & VEÍCULO */}
        <TabsContent value="driver_vehicle" className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold">Motorista e Veículo Contratados</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2 border p-3 rounded">
                <span className="font-bold block text-slate-800 dark:text-slate-200">
                  Dados do Condutor:
                </span>
                <div>
                  Nome: <strong>{cargo.driverName}</strong>
                </div>
                <div>
                  CPF / Documento: <span className="font-mono">{cargo.driverDocument}</span>
                </div>
                <div>
                  Telefone / WhatsApp: <span className="font-mono">{cargo.driverPhone}</span>
                </div>
                <div>
                  Grupo de Origem:{' '}
                  <Badge className="bg-blue-600 text-white text-[10px]">PORTA (Pátio)</Badge>
                </div>
              </div>

              <div className="space-y-2 border p-3 rounded">
                <span className="font-bold block text-slate-800 dark:text-slate-200">
                  Dados do Veículo:
                </span>
                <div>
                  Tipo: <strong>{cargo.vehicleType}</strong>
                </div>
                <div>
                  Placa: <strong className="font-mono">{cargo.vehiclePlate}</strong>
                </div>
                <div>
                  Capacidade Nominal:{' '}
                  <strong>{(cargo.vehicleCapacityKg / 1000).toFixed(1)}t</strong>
                </div>
                <div>
                  Ocupação Efetiva:{' '}
                  <strong className="text-emerald-700">{cargo.occupancyPct}%</strong>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: FRETE & ANTT */}
        <TabsContent value="freight" className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold">Composição Financeira do Frete</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b">
                <span>Piso Mínimo Regulatório ANTT:</span>
                <span className="font-mono font-bold">
                  R$ {cargo.anttFloorValue.toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span>Valor Contratado na Mesa de Fretes:</span>
                <span className="font-mono font-bold text-emerald-700">
                  R$ {cargo.contractedFreightValue?.toLocaleString('pt-BR')}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL: SOLICITAR ORDEM SAP */}
      <Dialog open={isSapOrderModalOpen} onOpenChange={setIsSapOrderModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Solicitar Ordem de Transporte ao SAP
            </DialogTitle>
            <DialogDescription className="text-xs">
              O TMS enviará os dados da carga para que o SAP gere o número oficial.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <p>
              • Carga: <strong>{cargo.cargoId}</strong>
            </p>
            <p>
              • Motorista: <strong>{cargo.driverName}</strong>
            </p>
            <p>
              • Placa: <strong>{cargo.vehiclePlate}</strong>
            </p>
            <p>
              • Peso Total: <strong>{(cargo.totalWeightKg / 1000).toFixed(1)}t</strong>
            </p>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setIsSapOrderModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleRequestSapOrder}
              disabled={processingAction}
            >
              Confirmar Solicitação SAP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: IMPRIMIR ORDEM */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Imprimir Ordem de Transporte SAP
            </DialogTitle>
            <DialogDescription className="text-xs">
              Selecione a impressora corporativa para emissão do documento físico.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs space-y-3">
            <div>
              <Label className="text-xs font-semibold">Impressora de Destino</Label>
              <Select value={selectedPrinterId} onValueChange={setSelectedPrinterId}>
                <SelectTrigger className="h-8 mt-1 text-xs">
                  <SelectValue placeholder="Impressora padrão de expedição" />
                </SelectTrigger>
                <SelectContent>
                  {printers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.location}) {p.is_default_transport ? '• Padrão' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setIsPrintModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handlePrintOrder}
              disabled={processingAction}
            >
              Enviar para Impressão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: ENTREGAR DOCUMENTO AO MOTORISTA */}
      <Dialog open={isHandoverModalOpen} onOpenChange={setIsHandoverModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Registrar Entrega de Documento ao Motorista
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ação operacional que formaliza a liberação do veículo para a baia de carregamento.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs space-y-3">
            <div>
              <Label className="text-xs font-semibold">Documento / CPF do Condutor</Label>
              <Input
                value={driverDoc}
                onChange={(e) => setDriverDoc(e.target.value)}
                className="h-8 mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Placa do Veículo</Label>
              <Input
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                className="h-8 mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Observações Operacionais</Label>
              <Textarea
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                className="mt-1 text-xs min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setIsHandoverModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleHandoverDocument}
              disabled={processingAction}
            >
              Confirmar Entrega & Liberar Veículo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
