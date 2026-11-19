import { TransportResults } from '@/components/transport/TransportResults'
import { SapTransportFilter } from '@/components/transport/SapTransportFilter'
import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui-custom/PageHeader'
import { RegionConsulta } from '@/components/ui-custom/RegionConsulta'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui-custom/FeedbackStates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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
  TransportOperationalStatus,
  evaluateStatusRules,
} from '@/domain/transportEditEngine'
import { transportEditService, TransportFilterParams } from '@/services/transportEditService'
import { TransportStatusBadge } from '@/components/transport/TransportStatusBadge'
import { TransportEditModal } from '@/components/transport/TransportEditModal'
import { TransportHistoryModal } from '@/components/transport/TransportHistoryModal'
import { TransportViewModal } from '@/components/transport/TransportViewModal'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  Truck,
  Search,
  Filter,
  RotateCcw,
  Eye,
  Edit,
  History,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react'

export default function TransportEditPage() {
  const { user, permissions } = useAuth()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()

  const initialTransportQuery = searchParams.get('transporte') || ''

  // Estados dos filtros
  const [transportNumber, setTransportNumber] = useState(initialTransportQuery)
  const [deliveryNumber, setDeliveryNumber] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [customer, setCustomer] = useState('')
  const [customerCnpj, setCustomerCnpj] = useState('')
  const [carrier, setCarrier] = useState('')
  const [driver, setDriver] = useState('')
  const [plate, setPlate] = useState('')
  const [itinerary, setItinerary] = useState('')
  const [status, setStatus] = useState('TODOS')
  const [plantOrCompany, setPlantOrCompany] = useState('')
  const [responsibleUser, setResponsibleUser] = useState('')
  const [partialText, setPartialText] = useState('')

  // Dados da tabela
  const [transports, setTransports] = useState<TransportEditableRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 50

  // Modais
  const [viewRecord, setViewRecord] = useState<TransportEditableRecord | null>(null)
  const [editingTransportId, setEditingTransportId] = useState<string | null>(null)
  const [historyModalState, setHistoryModalState] = useState<{
    open: boolean
    transportNumber: string
    sapTransportNumber: string
    transportId: string
  }>({
    open: false,
    transportNumber: '',
    sapTransportNumber: '',
    transportId: '',
  })

  // Consulta
  const handleSearch = async (overrideNumber?: string, limpar = false) => {
    setLoading(true)
    try {
      const activeTransportNum = overrideNumber !== undefined ? overrideNumber : transportNumber
      const filters: TransportFilterParams = limpar ? {} : {
        transport_number: activeTransportNum || undefined,
        delivery_number: deliveryNumber || undefined,
        order_number: orderNumber || undefined,
        customer: customer || undefined,
        customer_cnpj: customerCnpj || undefined,
        carrier: carrier || undefined,
        driver: driver || undefined,
        plate: plate || undefined,
        itinerary: itinerary || undefined,
        status: status !== 'TODOS' ? status : undefined,
        plant_or_company: plantOrCompany || undefined,
        responsible_user: responsibleUser || undefined,
        partial_text: partialText || undefined,
      }

      const results = await transportEditService.searchTransports(filters)
      setTransports(results)
      setCurrentPage(1)
    } catch (err: any) {
      toast({
        title: 'Erro na consulta',
        description: err.message || 'Falha ao buscar transportes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClearFilters = () => {
    setTransportNumber('')
    setDeliveryNumber('')
    setOrderNumber('')
    setCustomer('')
    setCustomerCnpj('')
    setCarrier('')
    setDriver('')
    setPlate('')
    setItinerary('')
    setStatus('TODOS')
    setPlantOrCompany('')
    setResponsibleUser('')
    setPartialText('')
    handleSearch(undefined,true)
  }

  useEffect(() => {
    if (initialTransportQuery) {
      setTransportNumber(initialTransportQuery)
      handleSearch(initialTransportQuery)
    } else {
      handleSearch()
    }
  }, [initialTransportQuery])

  // Paginação
  const paginatedTransports = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return transports.slice(start, start + pageSize)
  }, [transports, currentPage])

  const totalPages = Math.ceil(transports.length / pageSize) || 1

  const userRole = user?.role || 'operador_logistica'
  const canEditTransportPerm = permissions?.canEditTransport ?? true

  return (
    <div className="min-w-0 w-full space-y-4">
      {/* 1. CABEÇALHO PADRÃO CIAFAL */}
      <PageHeader
        title="Cockpit de Edição e Governança de Transportes"
        subtitle="Módulo TMS | Governança Oficial e Integração SAP (VT02N / BAPI_SHIPMENT_CHANGE)"
        breadcrumbs={[
          { label: 'TMS CIAFAL', href: '/tms' },
          { label: 'Operações & Transporte', href: '/tms/transportes' },
          { label: 'Edição de Transporte' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-primary/5 text-primary border-primary/20 text-xs"
            >
              <Shield className="h-3 w-3 mr-1" />
              Auditoria Imutável Ativa
            </Badge>
          </div>
        }
      />

      {/* 2. REGIÃO DE CONSULTA COM FILTROS ESPECÍFICOS (ITEM 2) */}
      <RegionConsulta
        title="Filtros de Pesquisa de Transportes"
        subtitle="Consulte por identificadores oficiais SAP, dados de remessa, destinatários ou dados logísticos operacionais."
        totalCount={transports.length}
        filteredCount={transports.length}
        onSearch={handleSearch}
        onClear={handleClearFilters}
        isSearching={loading}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
          {/* Busca Rápida Parcial */}
          <div className="sm:col-span-2">
            <Label className="text-[11px] font-semibold text-gray-700">
              Pesquisa Parcial Rápida
            </Label>
            <Input
              placeholder="Digite número, motorista, placa, cliente, itinerário..."
              value={partialText}
              onChange={(e) => setPartialText(e.target.value)}
              className="text-xs bg-white"
            />
          </div>

          {/* Número do Transporte */}
          <div>
            <Label className="text-[11px] font-semibold text-gray-700">
              Nº do Transporte (HUB / SAP)
            </Label>
            <SapTransportFilter campo="transport_number" titulo="Nº do Transporte (HUB / SAP)" value={transportNumber} onChange={setTransportNumber} />
          </div>

          {/* Número da Remessa */}
          <div>
            <Label className="text-[11px] font-semibold text-gray-700">
              Nº da Remessa (SAP Delivery)
            </Label>
            <SapTransportFilter campo="delivery_number" titulo="Nº da Remessa (SAP Delivery)" value={deliveryNumber} onChange={setDeliveryNumber} />
          </div>

          {/* Pedido SAP */}
          <div>
            <Label className="text-[11px] font-semibold text-gray-700">Pedido SAP</Label>
            <SapTransportFilter campo="order_number" titulo="Pedido SAP" value={orderNumber} onChange={setOrderNumber} />
          </div>

          {/* Cliente */}
          <div>
            <Label className="text-[11px] font-semibold text-gray-700">
              Cliente / Destinatário
            </Label>
            <SapTransportFilter campo="customer" titulo="Cliente / Destinatário" value={customer} onChange={setCustomer} />
          </div>

          {/* CNPJ do Cliente */}
          <div>
            <Label className="text-[11px] font-semibold text-gray-700">CNPJ do Cliente</Label>
            <SapTransportFilter campo="customer_cnpj" titulo="CNPJ do Cliente" value={customerCnpj} onChange={setCustomerCnpj} />
          </div>

          {/* Transportadora */}
          <div>
            <Label className="text-[11px] font-semibold text-gray-700">Transportadora</Label>
            <Input
              placeholder="Nome da transportadora..."
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="text-xs bg-white"
            />
          </div>

          {/* Motorista */}
          <div>
            <Label className="text-[11px] font-semibold text-gray-700">Motorista</Label>
            <SapTransportFilter campo="driver" titulo="Motorista" value={driver} onChange={setDriver} />
          </div>

          {/* Placa */}
          <div>
            <Label className="text-[11px] font-semibold text-gray-700">
              Placa (Cavalo ou Carreta)
            </Label>
            <SapTransportFilter campo="plate" titulo="Placa (Cavalo ou Carreta)" value={plate} onChange={setPlate} />
          </div>

          {/* Itinerário */}
          <div>
            <Label className="text-[11px] font-semibold text-gray-700">Itinerário SAP</Label>
            <SapTransportFilter campo="itinerary" titulo="Itinerário SAP" value={itinerary} onChange={setItinerary} />
          </div>

          {/* Status Operacional */}
          <div>
            <Label className="text-[11px] font-semibold text-gray-700">Status Operacional</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="text-xs bg-white">
                <SelectValue placeholder="Selecione o status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Status</SelectItem>
                <SelectItem value="Planejado"><TransportStatusBadge status="Planejado" /></SelectItem>
                <SelectItem value="Frete aceito"><TransportStatusBadge status="Frete aceito" /></SelectItem>
                <SelectItem value="Veículo convocado"><TransportStatusBadge status="Veículo convocado" /></SelectItem>
                <SelectItem value="Veículo na portaria"><TransportStatusBadge status="Veículo na portaria" /></SelectItem>
                <SelectItem value="Em carregamento"><TransportStatusBadge status="Em carregamento" /></SelectItem>
                <SelectItem value="Faturado"><TransportStatusBadge status="Faturado" /></SelectItem>
                <SelectItem value="Em trânsito"><TransportStatusBadge status="Em trânsito" /></SelectItem>
                <SelectItem value="Entregue"><TransportStatusBadge status="Entregue" /></SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Usuário Responsável / Última Alteração */}
          <div>
            <Label className="text-[11px] font-semibold text-gray-700">
              Usuário SAP
            </Label>
            <SapTransportFilter campo="responsible_user" titulo="Usuário SAP" value={responsibleUser} onChange={setResponsibleUser} />
          </div>
        </div>
      </RegionConsulta>

      {/* 3. TABELA DE RESULTADOS (ITEM 2) */}
      <div className="bg-white border rounded-lg shadow-xs overflow-hidden">
        <div className="p-3 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              Transportes Cadastrados no HUB CIAFAL ({transports.length})
            </h3>
          </div>

        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            <Clock className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            Carregando transportes e dados operacionais...
          </div>
        ) : transports.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            Nenhum transporte encontrado para os filtros informados.
          </div>
        ) : (
          <TransportResults items={paginatedTransports}
            canEdit={item=>canEditTransportPerm && evaluateStatusRules(item.status,userRole).canEdit}
            onView={setViewRecord} onEdit={item=>setEditingTransportId(item.id)}
            onHistory={item=>setHistoryModalState({open:true,transportNumber:item.transport_number,sapTransportNumber:item.sap_transport_number,transportId:item.id})}
          />
        )}

        {/* PAGINAÇÃO */}
        <div className="p-3 border-t bg-muted/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-muted-foreground">
            Mostrando página {currentPage} de {totalPages} ({transports.length} registros)
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="h-7 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="h-7 text-xs"
            >
              Próxima
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 4. MODAL DE VISUALIZAÇÃO */}
      <TransportViewModal
        open={!!viewRecord}
        onClose={() => setViewRecord(null)}
        transport={viewRecord}
        onOpenEdit={(id) => setEditingTransportId(id)}
        onOpenHistory={(trNum, sapNum, id) =>
          setHistoryModalState({
            open: true,
            transportNumber: trNum,
            sapTransportNumber: sapNum,
            transportId: id,
          })
        }
      />

      {/* 5. MODAL DE EDIÇÃO EM 3 BLOCOS COM GOVERNANÇA RÍGIDA */}
      {editingTransportId && (
        <TransportEditModal
          open={!!editingTransportId}
          onClose={() => setEditingTransportId(null)}
          transportId={editingTransportId}
          onSaveSuccess={() => {
            handleSearch()
          }}
          onOpenHistory={(trNum, sapNum, id) =>
            setHistoryModalState({
              open: true,
              transportNumber: trNum,
              sapTransportNumber: sapNum,
              transportId: id,
            })
          }
        />
      )}

      {/* 6. MODAL DE HISTÓRICO CRONOLÓGICO DE AUDITORIA */}
      <TransportHistoryModal
        open={historyModalState.open}
        onClose={() => setHistoryModalState((prev) => ({ ...prev, open: false }))}
        transportNumber={historyModalState.transportNumber}
        sapTransportNumber={historyModalState.sapTransportNumber}
        transportId={historyModalState.transportId}
      />
    </div>
  )
}
