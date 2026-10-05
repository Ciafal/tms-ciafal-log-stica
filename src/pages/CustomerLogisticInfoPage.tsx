import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CustomerLogisticInfoEntity, RestrictionLevel } from '@/domain/customerLogisticInfoEngine'
import { customerLogisticInfoService } from '@/services/customerLogisticInfoService'
import { CustomerLogisticDetailModal } from '@/components/CustomerLogisticDetailModal'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/ui-custom/PageHeader'
import { LoadingState } from '@/components/ui-custom/FeedbackStates'
import {
  Users,
  AlertOctagon,
  CalendarCheck,
  Truck,
  Clock,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  Building,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react'

export const CustomerLogisticInfoPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [customers, setCustomers] = useState<CustomerLogisticInfoEntity[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [syncing, setSyncing] = useState<boolean>(false)
  const [lastSyncText, setLastSyncText] = useState<string>('')
  const [sapConfig, setSapConfig] = useState<{ rfc: string; table: string }>({
    rfc: 'Z_RFC_TMS_INFO_CLIENTE',
    table: 'ZTMS_INFO_CLIENTE',
  })

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUf, setSelectedUf] = useState<string>('ALL')
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL')
  const [selectedScheduling, setSelectedScheduling] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [selectedVehicle, setSelectedVehicle] = useState<string>('ALL')

  // Modal de Detalhes em 10 abas
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerLogisticInfoEntity | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Perfis autorizados a sincronizar com SAP RFC
  const canSyncSap = useMemo(() => {
    if (!user) return false
    const allowed = [
      'admin_master',
      'admin_tms',
      'gestor_logistica',
      'gerente_carga',
      'operador_logistica',
    ]
    return allowed.includes(user.role)
  }, [user])

  // Carregar dados
  const loadData = async (force = false) => {
    setLoading(true)
    try {
      const [list, cfg] = await Promise.all([
        customerLogisticInfoService.getAllCustomers(force),
        customerLogisticInfoService.getSapConfig(),
      ])
      setCustomers(list)
      setSapConfig({ rfc: cfg.rfc, table: cfg.table })
      if (cfg.lastSync) {
        setLastSyncText(new Date(cfg.lastSync).toLocaleString('pt-BR'))
      } else {
        setLastSyncText(new Date().toLocaleString('pt-BR'))
      }
    } catch (err) {
      toast({
        title: 'Aviso',
        description: 'Usando cache local HUB de informações logísticas de clientes.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Sincronização SAP ECC RFC
  const handleSyncSap = async () => {
    if (!canSyncSap) {
      toast({
        variant: 'destructive',
        title: 'Acesso Restrito',
        description: 'Seu perfil não tem permissão para acionar sincronização direta SAP ECC.',
      })
      return
    }

    setSyncing(true)
    try {
      const res = await customerLogisticInfoService.triggerSapSync()
      if (res.success) {
        setLastSyncText(new Date(res.lastSyncDate).toLocaleString('pt-BR'))
        toast({
          title: 'Sincronização SAP Concluída',
          description: `${res.message} (${res.recordsCount} registros atualizados via ${res.rfc})`,
        })
        await loadData(true)
      } else {
        toast({
          title: 'Aviso de Sincronização',
          description: res.message,
        })
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro de Comunicação',
        description:
          'Não foi possível atualizar as informações logísticas no SAP. Os últimos dados sincronizados continuam disponíveis.',
      })
    } finally {
      setSyncing(false)
    }
  }

  // Estatísticas dos Cards Superiores
  const stats = useMemo(() => {
    const total = customers.length
    const critical = customers.filter((c) => c.highest_restriction_level === 'CRITICA').length
    const scheduling = customers.filter(
      (c) => c.scheduling_restrictions_json?.requiresScheduling,
    ).length
    const vehicleRestricted = customers.filter(
      (c) =>
        (c.vehicle_restrictions_json?.forbiddenVehicleTypes &&
          c.vehicle_restrictions_json.forbiddenVehicleTypes.length > 0) ||
        !!c.vehicle_restrictions_json?.mandatoryVehicleType,
    ).length

    const now = Date.now()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    const expired = customers.filter(
      (c) => c.valid_to && new Date(c.valid_to).getTime() < now,
    ).length
    const expiringSoon = customers.filter((c) => {
      if (!c.valid_to) return false
      const exp = new Date(c.valid_to).getTime()
      return exp >= now && exp - now <= thirtyDays
    }).length

    return { total, critical, scheduling, vehicleRestricted, expired, expiringSoon }
  }, [customers])

  // Filtros aplicados
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Texto: busca por cliente, código SAP, CNPJ, cidade ou itinerário
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase()
        const matches =
          c.customer_name.toLowerCase().includes(s) ||
          c.customer_code.toLowerCase().includes(s) ||
          c.ship_to_code.toLowerCase().includes(s) ||
          c.ship_to_name.toLowerCase().includes(s) ||
          (c.cnpj && c.cnpj.includes(s)) ||
          c.delivery_city.toLowerCase().includes(s) ||
          (c.itinerary_code && c.itinerary_code.toLowerCase().includes(s))
        if (!matches) return false
      }

      // UF
      if (selectedUf !== 'ALL' && c.delivery_uf !== selectedUf) {
        return false
      }

      // Nível de Restrição
      if (selectedLevel !== 'ALL' && c.highest_restriction_level !== selectedLevel) {
        return false
      }

      // Agendamento
      if (selectedScheduling === 'SIM' && !c.scheduling_restrictions_json?.requiresScheduling) {
        return false
      }
      if (selectedScheduling === 'NAO' && c.scheduling_restrictions_json?.requiresScheduling) {
        return false
      }

      // Status
      if (selectedStatus === 'ATIVO' && !c.is_active) return false
      if (selectedStatus === 'INATIVO' && c.is_active) return false

      // Veículo
      if (selectedVehicle !== 'ALL') {
        const forbidden = c.vehicle_restrictions_json?.forbiddenVehicleTypes || []
        const allowed = c.vehicle_restrictions_json?.allowedVehicleTypes || []
        const mand = c.vehicle_restrictions_json?.mandatoryVehicleType || ''
        const hasVehicleRule =
          forbidden.some((v) => v.toLowerCase().includes(selectedVehicle.toLowerCase())) ||
          allowed.some((v) => v.toLowerCase().includes(selectedVehicle.toLowerCase())) ||
          mand.toLowerCase().includes(selectedVehicle.toLowerCase())
        if (!hasVehicleRule) return false
      }

      return true
    })
  }, [
    customers,
    searchTerm,
    selectedUf,
    selectedLevel,
    selectedScheduling,
    selectedStatus,
    selectedVehicle,
  ])

  const distinctUfs = useMemo(() => {
    return Array.from(new Set(customers.map((c) => c.delivery_uf).filter(Boolean))).sort()
  }, [customers])

  const renderLevelBadge = (level: RestrictionLevel) => {
    switch (level) {
      case 'CRITICA':
        return (
          <Badge variant="destructive" className="bg-red-600 text-white font-medium text-[11px]">
            CRÍTICA
          </Badge>
        )
      case 'RESTRITIVA':
        return <Badge className="bg-amber-600 text-white font-medium text-[11px]">RESTRITIVA</Badge>
      case 'ALERTA':
        return (
          <Badge className="bg-yellow-500 text-slate-900 font-medium text-[11px]">ALERTA</Badge>
        )
      case 'INFORMATIVA':
      default:
        return (
          <Badge variant="outline" className="border-blue-300 text-[#002F6C] text-[11px]">
            INFORMATIVA
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Informações Logísticas de Clientes"
        subtitle={`Inteligência e restrições logísticas por cliente/recebedor • Origem: SAP RFC (${sapConfig.rfc} / ${sapConfig.table})`}
        icon={Users}
        breadcrumbs={[
          { label: 'TMS CIAFAL', href: '/tms' },
          { label: 'Cadastros & Regras', href: '/tms/informacoes-clientes' },
          { label: 'Informações Logísticas de Clientes' },
        ]}
        badge={
          <Badge className="bg-[#005596] text-white text-xs font-bold px-2.5 py-0.5">
            Base Corporativa SAP ECC
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block">
                Última sincronização SAP:
              </span>
              <span className="text-xs font-semibold text-slate-800">
                {lastSyncText || 'Aguardando...'}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncSap}
              disabled={syncing || !canSyncSap}
              className="border-[#002F6C] text-[#002F6C] hover:bg-blue-50 text-xs font-semibold"
              title={
                !canSyncSap
                  ? 'Apenas gestores autorizados podem sincronizar com o SAP'
                  : 'Atualizar restrições via RFC'
              }
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando RFC...' : 'Atualizar informações SAP'}
            </Button>
          </div>
        }
      />

      {/* 6 Cards Superiores Conforme Requisito 14 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-l-4 border-l-[#002F6C] bg-white shadow-sm">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Total Clientes
              <Users className="h-3.5 w-3.5 text-[#002F6C]" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold text-slate-900">{stats.total}</div>
            <p className="text-[10px] text-muted-foreground">Com ficha logística ativa</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-600 bg-white shadow-sm">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Restrições Críticas
              <AlertOctagon className="h-3.5 w-3.5 text-red-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold text-red-600">{stats.critical}</div>
            <p className="text-[10px] text-muted-foreground">Bloqueio determinístico</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 bg-white shadow-sm">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Exigem Agendamento
              <CalendarCheck className="h-3.5 w-3.5 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold text-amber-700">{stats.scheduling}</div>
            <p className="text-[10px] text-muted-foreground">Janela mandatória</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600 bg-white shadow-sm">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Restrição de Veículo
              <Truck className="h-3.5 w-3.5 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold text-slate-900">{stats.vehicleRestricted}</div>
            <p className="text-[10px] text-muted-foreground">Tipo/PBT específico</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 bg-white shadow-sm">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Próx. Vencimento
              <Clock className="h-3.5 w-3.5 text-orange-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold text-orange-600">{stats.expiringSoon}</div>
            <p className="text-[10px] text-muted-foreground">Vencem em até 30 dias</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-400 bg-white shadow-sm">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Fichas Vencidas
              <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold text-slate-600">{stats.expired}</div>
            <p className="text-[10px] text-muted-foreground">Necessitam revisão SAP</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="bg-white shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Busca textual */}
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, código SAP, CNPJ, cidade, itinerário..."
                className="pl-8 text-xs h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtro UF */}
            <div>
              <Select value={selectedUf} onValueChange={setSelectedUf}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as UFs</SelectItem>
                  {distinctUfs.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nível de Restrição */}
            <div>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Nível de Regra" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Níveis</SelectItem>
                  <SelectItem value="CRITICA">CRÍTICA</SelectItem>
                  <SelectItem value="RESTRITIVA">RESTRITIVA</SelectItem>
                  <SelectItem value="ALERTA">ALERTA</SelectItem>
                  <SelectItem value="INFORMATIVA">INFORMATIVA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Exige Agendamento */}
            <div>
              <Select value={selectedScheduling} onValueChange={setSelectedScheduling}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Agendamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Agendamento (Todos)</SelectItem>
                  <SelectItem value="SIM">Exige Agendamento</SelectItem>
                  <SelectItem value="NAO">Sem Agendamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Veículo */}
            <div>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Tipo de Veículo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Qualquer Veículo</SelectItem>
                  <SelectItem value="LS">Carreta LS</SelectItem>
                  <SelectItem value="Convencional">Carreta Convencional</SelectItem>
                  <SelectItem value="Bitrem">Bitrem</SelectItem>
                  <SelectItem value="Truck">Truck</SelectItem>
                  <SelectItem value="Toco">Toco</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid Corporativa */}
      <Card className="bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-bold text-slate-700">
                  Cliente / Recebedor
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Cidade / UF</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Itinerário</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Agendamento</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Veículo</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Descarga</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Restrições Chave</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Nível</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Atualização</TableHead>
                <TableHead className="text-xs font-bold text-right text-slate-700">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-10 text-xs text-muted-foreground"
                  >
                    Carregando base de clientes SAP...
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-10 text-xs text-muted-foreground"
                  >
                    Nenhum cliente localizado com os filtros informados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((c) => {
                  const sch = c.scheduling_restrictions_json
                  const veh = c.vehicle_restrictions_json
                  const dis = c.discharge_restrictions_json
                  const mat = c.material_restrictions_json
                  const load = c.load_formation_restrictions_json

                  return (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                      onClick={() => {
                        setSelectedCustomer(c)
                        setModalOpen(true)
                      }}
                    >
                      {/* Cliente / Recebedor */}
                      <TableCell className="text-xs py-3">
                        <div className="font-semibold text-slate-900">{c.customer_name}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-blue-700 font-medium">
                            SAP {c.customer_code}
                          </span>
                          <span>•</span>
                          <span>Rec: {c.ship_to_code}</span>
                        </div>
                      </TableCell>

                      {/* Cidade / UF */}
                      <TableCell className="text-xs py-3">
                        <span className="font-medium text-slate-800">{c.delivery_city}</span>
                        <span className="text-slate-500 ml-1">/ {c.delivery_uf}</span>
                      </TableCell>

                      {/* Itinerário */}
                      <TableCell className="text-xs py-3 font-mono">
                        <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50">
                          {c.itinerary_code || 'Geral'}
                        </Badge>
                      </TableCell>

                      {/* Agendamento */}
                      <TableCell className="text-xs py-3">
                        {sch?.requiresScheduling ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium text-[11px]">
                            <CalendarCheck className="h-3 w-3" />
                            {sch.mandatoryBeforeDeparture ? 'Obrig. Pré-saída' : 'Janela'}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Ordem Chegada</span>
                        )}
                      </TableCell>

                      {/* Veículo */}
                      <TableCell className="text-xs py-3">
                        <div className="text-[11px] text-slate-700">
                          {veh?.mandatoryVehicleType ? (
                            <strong className="text-blue-700">{veh.mandatoryVehicleType}</strong>
                          ) : veh?.forbiddenVehicleTypes && veh.forbiddenVehicleTypes.length > 0 ? (
                            <span className="text-red-600">
                              Restrição ({veh.forbiddenVehicleTypes.length})
                            </span>
                          ) : (
                            <span className="text-slate-500">Livre</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Descarga */}
                      <TableCell className="text-xs py-3 text-[11px] text-slate-700">
                        {dis?.dischargeType || 'Padrão'}
                      </TableCell>

                      {/* Restrições Chave */}
                      <TableCell className="text-xs py-3">
                        <div
                          className="text-[11px] text-slate-700 line-clamp-1 max-w-[220px]"
                          title={c.observations || ''}
                        >
                          {load?.maxTotalWeightTons ? `Máx. ${load.maxTotalWeightTons}t • ` : ''}
                          {mat?.maxLengthM ? `Comp. máx ${mat.maxLengthM}m • ` : ''}
                          {c.observations || 'Sem restrições adicionais'}
                        </div>
                      </TableCell>

                      {/* Nível */}
                      <TableCell className="text-xs py-3">
                        {renderLevelBadge(c.highest_restriction_level)}
                      </TableCell>

                      {/* Atualização */}
                      <TableCell className="text-xs py-3 text-[11px] text-slate-500">
                        {c.updated ? new Date(c.updated).toLocaleDateString('pt-BR') : 'Hoje'}
                      </TableCell>

                      {/* Ação */}
                      <TableCell className="text-xs py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-[#002F6C] font-semibold hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedCustomer(c)
                            setModalOpen(true)
                          }}
                        >
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal com as 10 abas corporativas */}
      <CustomerLogisticDetailModal
        customer={selectedCustomer}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setSelectedCustomer(null)
        }}
      />
    </div>
  )
}
export default CustomerLogisticInfoPage
