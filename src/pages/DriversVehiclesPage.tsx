import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Truck,
  Search,
  User,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Building,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/ui-custom/PageHeader'
import { SapZsd004Record, Zsd004DataSourceMode, Zsd004AuditSummary } from '@/domain/zsd004Engine'
import { zsd004Datasource } from '@/domain/zsd004Datasource'
import { Zsd004DetailModal } from '@/components/Zsd004DetailModal'

export const DriversVehiclesPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  // Estado da Lista e Metadados
  const [records, setRecords] = useState<SapZsd004Record[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [sourceMode, setSourceMode] = useState<Zsd004DataSourceMode>('MHTML_TEMP')
  const [lastSyncDate, setLastSyncDate] = useState<string>('')
  const [lastAudit, setLastAudit] = useState<Zsd004AuditSummary | null>(null)

  // Métricas do Topo
  const [metrics, setMetrics] = useState({
    totalVehicles: 0,
    approvedCount: 0,
    blockedCount: 0,
    uninformedCount: 0,
    incompleteCount: 0,
    uniqueDriversCount: 0,
    uniqueOwnersCount: 0,
  })

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlant, setSelectedPlant] = useState('WSTL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [selectedUf, setSelectedUf] = useState('ALL')
  const [selectedIntegrity, setSelectedIntegrity] = useState('ALL')
  const [hasTrailerFilter, setHasTrailerFilter] = useState<'ALL' | 'SIM' | 'NAO'>('ALL')
  const [hasAnttFilter, setHasAnttFilter] = useState<'ALL' | 'SIM' | 'NAO'>('ALL')

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const perPage = 25

  // Modal de Detalhes
  const [selectedRecord, setSelectedRecord] = useState<SapZsd004Record | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Status de conexão SAP/RFC
  const [isSapUnavailable, setIsSapUnavailable] = useState(false)

  // Carregar Dados e Métricas
  const loadData = async (page = 1) => {
    setIsLoading(true)
    try {
      const modeInfo = await zsd004Datasource.getActiveMode()
      setSourceMode(modeInfo.mode)
      setLastSyncDate(modeInfo.lastSyncDate)

      const m = await zsd004Datasource.getMetrics()
      setMetrics(m)

      const res = await zsd004Datasource.getRecords({
        page,
        perPage,
        plant: selectedPlant === 'ALL' ? undefined : selectedPlant,
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        uf: selectedUf === 'ALL' ? undefined : selectedUf,
        integrityStatus: selectedIntegrity === 'ALL' ? undefined : selectedIntegrity,
        searchTerm,
        hasTrailer: hasTrailerFilter === 'ALL' ? null : hasTrailerFilter === 'SIM',
        hasAntt: hasAnttFilter === 'ALL' ? null : hasAnttFilter === 'SIM',
      })

      setRecords(res.items)
      setTotalItems(res.totalItems)
      setCurrentPage(res.page)
      setTotalPages(res.totalPages || 1)
      setIsSapUnavailable(false)
    } catch (err) {
      console.error('Falha ao carregar registros ZSD004:', err)
      setIsSapUnavailable(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData(1)
  }, [
    selectedPlant,
    selectedStatus,
    selectedUf,
    selectedIntegrity,
    hasTrailerFilter,
    hasAnttFilter,
  ])

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      loadData(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm])

  // Executar Sincronização ("Atualizar Dados")
  const handleSync = async () => {
    setIsSyncing(true)
    toast({
      title: 'Atualizando dados da ZSD004...',
      description: 'Executando validação de estrutura e normalização dos dados SAP.',
    })

    try {
      const result = await zsd004Datasource.syncZSD004(user?.email || 'admin@ciafal.logistica')
      if (result.success) {
        setLastAudit(result.audit)
        toast({
          title: 'Dados atualizados com sucesso.',
          description: result.message,
        })
        loadData(currentPage)
      } else {
        setIsSapUnavailable(true)
        toast({
          variant: 'destructive',
          title: 'SAP temporariamente indisponível.',
          description: `Exibindo dados da última sincronização realizada em ${formatDateDisplay(
            lastSyncDate,
          )}.`,
        })
      }
    } catch (err: any) {
      setIsSapUnavailable(true)
      toast({
        variant: 'destructive',
        title: 'Falha na sincronização.',
        description: err?.message || 'Erro ao sincronizar.',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return 'Não registrado'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  // Mascaramento LGPD por perfil
  const maskDocumentDisplay = (doc?: string) => {
    if (!doc || doc === 'Não informado no SAP') return doc || 'Não informado'
    const clean = doc.replace(/\D/g, '')
    if (permissions.canViewFullSensitiveData) {
      if (clean.length === 11) {
        return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`
      }
      if (clean.length === 14) {
        return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(
          8,
          12,
        )}-${clean.slice(12)}`
      }
      return doc
    }
    // Mascarado para perfil operacional
    if (clean.length === 11) {
      return `***.***.***-${clean.slice(-2)}`
    }
    if (clean.length === 14) {
      return `**.***.***/****-${clean.slice(-2)}`
    }
    return '***.***.***-**'
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header Padronizado */}
      <PageHeader
        title="Motoristas & Veículos Cadastrados"
        subtitle="Espelho operacional fiel da tabela SAP ZSD004 (Centro: WSTL)."
        icon={Truck}
        badge={<Badge className="bg-[#005596] text-white text-xs">SAP ZSD004</Badge>}
        breadcrumbs={[
          { label: 'TMS CIAFAL', href: '/tms' },
          { label: 'Cadastros Mestres' },
          { label: 'Motoristas & Veículos' },
        ]}
        meta={
          <div className="text-right hidden sm:block mr-2">
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
              Última sincronização:
            </span>
            <span className="text-xs font-semibold text-slate-700">
              {formatDateDisplay(lastSyncDate)}
            </span>
          </div>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="text-xs text-slate-700 border-slate-300 gap-1.5 hover:bg-blue-50 hover:text-[#005596] hover:border-blue-200 transition-colors h-9"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#005596]' : ''}`}
            />
            {isSyncing ? 'Atualizando...' : 'Atualizar Dados'}
          </Button>
        }
        className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm mb-0"
      />

      {/* Alerta de SAP/RFC Indisponível (Sem tela em branco) */}
      {isSapUnavailable && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <strong>SAP temporariamente indisponível.</strong> Exibindo dados da última
              sincronização realizada em {formatDateDisplay(lastSyncDate)}.
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            className="text-xs border-amber-300 text-amber-900 bg-white hover:bg-amber-100"
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Cards Compactos no Topo */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Veículos */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Veículos</span>
              <Truck className="w-4 h-4 text-[#005596]" />
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono">
              {metrics.totalVehicles.toLocaleString('pt-BR')}
            </div>
            <div className="text-[10px] text-slate-400">Base SAP ZSD004</div>
          </CardContent>
        </Card>

        {/* Aprovados */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Aprovados</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-emerald-600 font-mono">
              {metrics.approvedCount.toLocaleString('pt-BR')}
            </div>
            <div className="text-[10px] text-emerald-700 font-medium">Status 'A' (Ativos)</div>
          </CardContent>
        </Card>

        {/* Bloqueados */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Bloqueados</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-xl font-bold text-rose-600 font-mono">
              {metrics.blockedCount.toLocaleString('pt-BR')}
            </div>
            <div className="text-[10px] text-rose-700 font-medium">Status 'B' (Restritos)</div>
          </CardContent>
        </Card>

        {/* Cadastros Incompletos */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Incompletos</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-amber-600 font-mono">
              {metrics.incompleteCount.toLocaleString('pt-BR')}
            </div>
            <div className="text-[10px] text-amber-700 font-medium">Requerem validação</div>
          </CardContent>
        </Card>

        {/* Motoristas Identificados */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Motoristas</span>
              <User className="w-4 h-4 text-[#005596]" />
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono">
              {metrics.uniqueDriversCount.toLocaleString('pt-BR')}
            </div>
            <div className="text-[10px] text-slate-400">CPFs Únicos</div>
          </CardContent>
        </Card>

        {/* Transportadores / Proprietários */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Proprietários</span>
              <Building className="w-4 h-4 text-[#005596]" />
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono">
              {metrics.uniqueOwnersCount.toLocaleString('pt-BR')}
            </div>
            <div className="text-[10px] text-slate-400">PJ / PF Únicos</div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Busca Compacta */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        {/* Linha de Busca Principal */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Pesquisar por placa, motorista, CPF/CNPJ, proprietário, Renavam ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-xs h-9 bg-slate-50 border-slate-200 focus:bg-white"
          />
        </div>

        {/* Filtros Compactos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 pt-1 text-xs">
          {/* Centro */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Centro
            </label>
            <Select value={selectedPlant} onValueChange={setSelectedPlant}>
              <SelectTrigger className="h-8 text-xs bg-slate-50">
                <SelectValue placeholder="Centro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WSTL">WSTL (Padrão)</SelectItem>
                <SelectItem value="ALL">Todos os Centros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Status SAP
            </label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-8 text-xs bg-slate-50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="A">Aprovados (A)</SelectItem>
                <SelectItem value="B">Bloqueados (B)</SelectItem>
                <SelectItem value="NAO_INFORMADO">Não Informado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* UF */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              UF Veículo
            </label>
            <Select value={selectedUf} onValueChange={setSelectedUf}>
              <SelectTrigger className="h-8 text-xs bg-slate-50">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as UFs</SelectItem>
                <SelectItem value="SP">SP</SelectItem>
                <SelectItem value="MG">MG</SelectItem>
                <SelectItem value="RJ">RJ</SelectItem>
                <SelectItem value="ES">ES</SelectItem>
                <SelectItem value="PR">PR</SelectItem>
                <SelectItem value="SC">SC</SelectItem>
                <SelectItem value="RS">RS</SelectItem>
                <SelectItem value="GO">GO</SelectItem>
                <SelectItem value="BA">BA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Situação Cadastral */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Qualidade Dado
            </label>
            <Select value={selectedIntegrity} onValueChange={setSelectedIntegrity}>
              <SelectTrigger className="h-8 text-xs bg-slate-50">
                <SelectValue placeholder="Integridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as Situações</SelectItem>
                <SelectItem value="integro">Completo / Íntegro</SelectItem>
                <SelectItem value="incompleto">Incompleto</SelectItem>
                <SelectItem value="inconsistente">Dado a Validar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Possui Carreta */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Possui Carreta
            </label>
            <Select value={hasTrailerFilter} onValueChange={(val: any) => setHasTrailerFilter(val)}>
              <SelectTrigger className="h-8 text-xs bg-slate-50">
                <SelectValue placeholder="Carreta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="SIM">Sim</SelectItem>
                <SelectItem value="NAO">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Possui ANTT */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Possui ANTT
            </label>
            <Select value={hasAnttFilter} onValueChange={(val: any) => setHasAnttFilter(val)}>
              <SelectTrigger className="h-8 text-xs bg-slate-50">
                <SelectValue placeholder="ANTT" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="SIM">Sim</SelectItem>
                <SelectItem value="NAO">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Limpar Filtros */}
          <div className="flex items-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setSelectedPlant('WSTL')
                setSelectedStatus('ALL')
                setSelectedUf('ALL')
                setSelectedIntegrity('ALL')
                setHasTrailerFilter('ALL')
                setHasAnttFilter('ALL')
              }}
              className="h-8 text-xs text-slate-500 w-full hover:bg-slate-100"
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Grid Principal Objetiva com Paginação e Virtualização */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-3 w-28">Status</th>
                <th className="py-3 px-3">Placa</th>
                <th className="py-3 px-3">Veículo</th>
                <th className="py-3 px-3">Motorista</th>
                <th className="py-3 px-3">CPF/Documento</th>
                <th className="py-3 px-3">Proprietário / Transportador</th>
                <th className="py-3 px-3">Carreta</th>
                <th className="py-3 px-3">Tipo Veículo</th>
                <th className="py-3 px-3">Carroceria</th>
                <th className="py-3 px-3">Capacidade</th>
                <th className="py-3 px-3">Cidade / UF</th>
                <th className="py-3 px-3">Último Frete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#005596]" />
                    Carregando registros da ZSD004...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    Nenhum registro encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                records.map((r, idx) => {
                  const isBlocked = r.status === 'B'
                  const isApproved = r.status === 'A'

                  return (
                    <tr
                      key={r.id || r.technical_key || idx}
                      onClick={() => {
                        setSelectedRecord(r)
                        setIsModalOpen(true)
                      }}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      {/* Status */}
                      <td className="py-2.5 px-3">
                        {isBlocked ? (
                          <Badge className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] px-2 py-0.5">
                            BLOQUEADO
                          </Badge>
                        ) : isApproved ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-2 py-0.5">
                            APROVADO
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-2 py-0.5">
                            NÃO INFORMADO
                          </Badge>
                        )}
                      </td>

                      {/* Placa */}
                      <td className="py-2.5 px-3 font-mono font-bold text-[#005596]">{r.plate}</td>

                      {/* Veículo */}
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {r.vehicle_brand_model || r.vehicle_model || 'Não informado'}
                      </td>

                      {/* Motorista */}
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{r.driver_name}</td>

                      {/* CPF/Documento */}
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {maskDocumentDisplay(r.driver_cpf)}
                      </td>

                      {/* Proprietário */}
                      <td
                        className="py-2.5 px-3 text-slate-600 max-w-[180px] truncate"
                        title={r.owner_name}
                      >
                        {r.owner_name}
                      </td>

                      {/* Carreta */}
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {r.trailer_plate !== 'Não informado no SAP' ? r.trailer_plate : '—'}
                      </td>

                      {/* Tipo Veículo */}
                      <td className="py-2.5 px-3 text-slate-600">{r.vehicle_type}</td>

                      {/* Carroceria */}
                      <td className="py-2.5 px-3 text-slate-600">{r.body_type}</td>

                      {/* Capacidade */}
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">
                        {r.capacity_kg ? `${r.capacity_kg.toLocaleString('pt-BR')} kg` : '—'}
                      </td>

                      {/* Cidade/UF */}
                      <td className="py-2.5 px-3 text-slate-600">
                        {r.vehicle_city && r.vehicle_city !== 'Não informado no SAP'
                          ? `${r.vehicle_city}/${r.vehicle_region}`
                          : '—'}
                      </td>

                      {/* Último Frete */}
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {r.last_freight_date && r.last_freight_date !== 'Não informado no SAP'
                          ? r.last_freight_date
                          : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Barra de Paginação */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Exibindo <strong>{records.length}</strong> de <strong>{totalItems}</strong> registros
            cadastrados na ZSD004
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => loadData(currentPage - 1)}
              className="h-8 text-xs px-2 gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </Button>

            <span className="text-xs font-semibold px-2">
              Página {currentPage} de {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => loadData(currentPage + 1)}
              className="h-8 text-xs px-2 gap-1"
            >
              Próxima <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes Completo em 7 Abas */}
      <Zsd004DetailModal
        record={selectedRecord}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedRecord(null)
        }}
        canViewFullSensitiveData={permissions.canViewFullSensitiveData}
      />
    </div>
  )
}
