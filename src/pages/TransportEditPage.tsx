import React, { useState, useEffect, useMemo } from 'react'
import { PageHeader } from '@/components/ui-custom/PageHeader'
import { RegionConsulta } from '@/components/ui-custom/RegionConsulta'
import { FeedbackStates } from '@/components/ui-custom/FeedbackStates'
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
import { TransportSyncBadge } from '@/components/transport/TransportSyncBadge'
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

  // Estados dos filtros
  const [transportNumber, setTransportNumber] = useState('')
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
  const pageSize = 10

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
  const handleSearch = async () => {
    setLoading(true)
    try {
      const filters: TransportFilterParams = {
        transport_number: transportNumber || undefined,
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
    handleSearch()
  }

  useEffect(() => {
    handleSearch()
  }, [])

  // Paginação
  const paginatedTransports = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return transports.slice(start, start + pageSize)
  }, [transports, currentPage])

  const totalPages = Math.ceil(transports.length / pageSize) || 1

  const userRole = user?.role || 'operador_logistica'
  const canEditTransportPerm = permissions?.canEditTransport ?? true

  return (
    <div className="space-y-6">
      {/* 1. CABEÇALHO PADRÃO CIAFAL */}
      <PageHeader
        title="Editar Transporte"
        subtitle="Módulo TMS > Cadastro | Governança Oficial e Integração SAP (VT02N / BAPI_SHIPMENT_CHANGE)"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
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
            <Input
              placeholder="Ex: TR-10001 ou 00900001"
              value={transportNumber}
              onChange={(e) => setTransportNumber(e.target.value)}
              className="text-xs bg-white font-mono"
            />
          </div>

          {/* Número da Remessa */}
          <div>
            <Label className="text-[11px] font-semibold text-gray-700">
              Nº da Remessa (SAP Delivery)
            </Label>
            <Input
              placeholder="Ex: 10040001"
              value={deliveryNumber}
              onChange={(e) => setDeliveryNumber(e.target.value)}
              className="text-xs bg-white font-mono"
            />
          </div>

          {/* Pedido SAP */}
          <div>
            <Label className="text-[11px] font-semibold text-gray-700">Pedido SAP</Label>
            <Input
              placeholder="Ex: 4500001"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="text-xs bg-white font-mono"
            />
          </div>

          {/* Cliente */}
          <div>
            <Label className="text-[11px] font-semibold text-gray-700">
              Cliente / Destinatário
            </Label>
            <Input
              placeholder="Razão social ou nome fantasia..."
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="text-xs bg-white"
            />
          </div>

          {/* CNPJ do Cliente */}
          <div>
            <Label className="text-[11px] font-semibold text-gray-700">CNPJ do Cliente</Label>
            <Input
              placeholder="00.000.000/0000-00"
              value={customerCnpj}
              onChange={(e) => setCustomerCnpj(e.target.value)}
              className="text-xs bg-white font-mono"
            />
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
            <Input
              placeholder="Nome do condutor..."
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              className="text-xs bg-white"
            />
          </div>

          {/* Placa */}
          <div>
            <Label className="text-[11px] font-semibold text-gray-700">
              Placa (Cavalo ou Carreta)
            </Label>
            <Input
              placeholder="ABC-1234 ou ABC1D23"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              className="text-xs bg-white font-mono"
            />
          </div>

          {/* Itinerário */}
          <div>
            <Label className="text-[11px] font-semibold text-gray-700">Itinerário SAP</Label>
            <Input
              placeholder="Código ou descrição..."
              value={itinerary}
              onChange={(e) => setItinerary(e.target.value)}
              className="text-xs bg-white"
            />
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
                <SelectItem value="Planejado">Planejado</SelectItem>
                <SelectItem value="Frete aceito">Frete aceito</SelectItem>
                <SelectItem value="Veículo convocado">Veículo convocado</SelectItem>
                <SelectItem value="Veículo na portaria">Veículo na portaria</SelectItem>
                <SelectItem value="Em carregamento">Em carregamento</SelectItem>
                <SelectItem value="Faturado">Faturado</SelectItem>
                <SelectItem value="Em trânsito">Em trânsito</SelectItem>
                <SelectItem value="Entregue">Entregue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Usuário Responsável / Última Alteração */}
          <div>
            <Label className="text-[11px] font-semibold text-gray-700">
              Usuário da Última Alteração
            </Label>
            <Input
              placeholder="Nome ou e-mail..."
              value={responsibleUser}
              onChange={(e) => setResponsibleUser(e.target.value)}
              className="text-xs bg-white"
            />
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
          <span className="text-[11px] text-muted-foreground">
            Ações disponíveis: Visualizar | Editar | Histórico
          </span>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30 sticky top-0">
                <TableRow className="text-xs">
                  <TableHead className="font-semibold text-gray-800">Transporte</TableHead>
                  <TableHead className="font-semibold text-gray-800">Remessa</TableHead>
                  <TableHead className="font-semibold text-gray-800">Pedido</TableHead>
                  <TableHead className="font-semibold text-gray-800">Cliente</TableHead>
                  <TableHead className="font-semibold text-gray-800">Transportadora</TableHead>
                  <TableHead className="font-semibold text-gray-800">Motorista</TableHead>
                  <TableHead className="font-semibold text-gray-800">Veículo / Placa</TableHead>
                  <TableHead className="font-semibold text-gray-800">Itinerário</TableHead>
                  <TableHead className="font-semibold text-gray-800 text-right">Peso</TableHead>
                  <TableHead className="font-semibold text-gray-800">Data Prevista</TableHead>
                  <TableHead className="font-semibold text-gray-800">Status</TableHead>
                  <TableHead className="font-semibold text-gray-800">Origem</TableHead>
                  <TableHead className="font-semibold text-gray-800">Última Alteração</TableHead>
                  <TableHead className="font-semibold text-gray-800">Usuário</TableHead>
                  <TableHead className="font-semibold text-gray-800 text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransports.map((item) => {
                  const statusRule = evaluateStatusRules(item.status, userRole)
                  const canEditThis = canEditTransportPerm && statusRule.canEdit

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/20 text-xs">
                      {/* Transporte */}
                      <TableCell className="font-mono font-bold text-gray-900">
                        <div>{item.transport_number}</div>
                        {item.sap_transport_number && item.sap_transport_number !== '—' && (
                          <div className="text-[10px] text-primary font-semibold">
                            SAP: {item.sap_transport_number}
                          </div>
                        )}
                      </TableCell>

                      {/* Remessa */}
                      <TableCell className="font-mono text-gray-700">
                        {item.delivery_number}
                      </TableCell>

                      {/* Pedido */}
                      <TableCell className="font-mono text-gray-600">
                        {item.order_number || '—'}
                      </TableCell>

                      {/* Cliente */}
                      <TableCell className="max-w-[150px] truncate" title={item.customer_summary}>
                        <div className="font-medium text-gray-800 truncate">
                          {item.customer_summary}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {item.destination_city} - {item.destination_uf}
                        </div>
                      </TableCell>

                      {/* Transportadora */}
                      <TableCell className="max-w-[140px] truncate" title={item.carrier_name}>
                        {item.carrier_name}
                      </TableCell>

                      {/* Motorista */}
                      <TableCell className="max-w-[130px] truncate" title={item.driver_name}>
                        {item.driver_name}
                      </TableCell>

                      {/* Veículo / Placa */}
                      <TableCell className="font-mono">
                        <span className="font-bold text-gray-900">{item.vehicle_plate}</span>
                        {item.trailer_plate && (
                          <span className="text-muted-foreground block text-[10px]">
                            {item.trailer_plate}
                          </span>
                        )}
                      </TableCell>

                      {/* Itinerário */}
                      <TableCell
                        className="max-w-[140px] truncate"
                        title={item.itinerary_description}
                      >
                        <span className="font-mono text-[11px] font-semibold text-primary block">
                          {item.itinerary_code}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {item.itinerary_description}
                        </span>
                      </TableCell>

                      {/* Peso */}
                      <TableCell className="text-right font-mono font-semibold">
                        {item.total_weight_kg.toLocaleString('pt-BR')} kg
                      </TableCell>

                      {/* Data Prevista */}
                      <TableCell>
                        <div>
                          {new Date(item.scheduled_loading_date).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {item.scheduled_loading_time}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary">
                            {item.status}
                          </span>
                          <div>
                            <TransportSyncBadge status={item.sap_sync_status} showText={false} />
                          </div>
                        </div>
                      </TableCell>

                      {/* Origem */}
                      <TableCell className="text-[11px] text-muted-foreground max-w-[100px] truncate">
                        {item.origin_system_source.includes('SAP') ? 'SAP VT01N' : 'HUB CIAFAL'}
                      </TableCell>

                      {/* Última Alteração */}
                      <TableCell className="text-[11px] text-muted-foreground font-mono">
                        {new Date(item.last_modified_at).toLocaleDateString('pt-BR')}
                      </TableCell>

                      {/* Usuário */}
                      <TableCell
                        className="text-[11px] max-w-[120px] truncate text-gray-700"
                        title={item.last_modified_by}
                      >
                        {item.last_modified_by}
                      </TableCell>

                      {/* Ações (Visualizar | Editar | Histórico) */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setViewRecord(item)}
                            className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                            title="Visualizar detalhes do transporte"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Visualizar
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canEditThis}
                            onClick={() => setEditingTransportId(item.id)}
                            className="h-7 px-2 text-xs text-gray-800 border-gray-300 hover:bg-muted"
                            title={
                              canEditThis
                                ? 'Editar dados logísticos e remessas'
                                : 'Edição restrita para este status ou perfil'
                            }
                          >
                            <Edit className="h-3.5 w-3.5 mr-1 text-primary" />
                            Editar
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setHistoryModalState({
                                open: true,
                                transportNumber: item.transport_number,
                                sapTransportNumber: item.sap_transport_number,
                                transportId: item.id,
                              })
                            }
                            className="h-7 px-2 text-xs text-gray-600 hover:bg-muted"
                            title="Consultar histórico cronológico de auditoria"
                          >
                            <History className="h-3.5 w-3.5 mr-1" />
                            Histórico
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* PAGINAÇÃO */}
        <div className="p-3 border-t bg-muted/10 flex items-center justify-between text-xs">
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
