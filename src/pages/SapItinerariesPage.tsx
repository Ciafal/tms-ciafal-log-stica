import React, { useState, useEffect, useMemo } from 'react'
import {
  Route as RouteIcon,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Building,
  Info,
  MapPin,
  Compass,
  Layers,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Clock,
  History,
  FileText,
  Sliders,
  Check,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/ui-custom/PageHeader'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  SapRouteService,
  SyncResultReport,
  ItineraryWithRoutes,
  RouteWithItineraries,
} from '@/services/sapRouteService'
import {
  SapItineraryEntity,
  SapRouteEntity,
  SapItineraryRouteEntity,
  SapRouteSyncLogEntity,
} from '@/domain/rules'

export const SapItinerariesPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'combinations' | 'itineraries' | 'routes'>(
    'combinations',
  )

  const [itineraries, setItineraries] = useState<SapItineraryEntity[]>([])
  const [routes, setRoutes] = useState<SapRouteEntity[]>([])
  const [combinations, setCombinations] = useState<SapItineraryRouteEntity[]>([])
  const [syncLogs, setSyncLogs] = useState<SapRouteSyncLogEntity[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  // Sincronização e Erro Modal
  const [syncResultModal, setSyncResultModal] = useState<SyncResultReport | null>(null)

  // Filtro Global
  const [searchGlobal, setSearchGlobal] = useState('')

  // Filtros Específicos
  const [filterItinerary, setFilterItinerary] = useState('ALL')
  const [filterRoute, setFilterRoute] = useState('ALL')
  const [filterUf, setFilterUf] = useState('ALL')
  const [filterRegion, setFilterRegion] = useState('ALL')
  const [filterOrigin, setFilterOrigin] = useState('ALL')
  const [filterDestination, setFilterDestination] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterHasCombo, setFilterHasCombo] = useState<'ALL' | 'COM' | 'SEM'>('ALL')

  // Modais de Detalhe e Edição de Metadados
  const [detailItinerary, setDetailItinerary] = useState<SapItineraryEntity | null>(null)
  const [detailRoute, setDetailRoute] = useState<SapRouteEntity | null>(null)
  const [detailCombination, setDetailCombination] = useState<SapItineraryRouteEntity | null>(null)

  // Metadados TMS Editáveis - Itinerário
  const [editNotes, setEditNotes] = useState('')
  const [editLeadTimeCalc, setEditLeadTimeCalc] = useState<number | ''>('')
  const [editPriority, setEditPriority] = useState('')
  const [editRestrictions, setEditRestrictions] = useState('')
  const [editOperatingHours, setEditOperatingHours] = useState('')
  const [editLogisticChar, setEditLogisticChar] = useState('')
  const [editPlanningNotes, setEditPlanningNotes] = useState('')
  const [isSavingMeta, setIsSavingMeta] = useState(false)

  // Modal Logs
  const [showLogsModal, setShowLogsModal] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [itinsData, routesData, combosData, logsData] = await Promise.all([
        SapRouteService.getItineraries(),
        SapRouteService.getRoutes(),
        SapRouteService.getItineraryRouteCombinations(),
        SapRouteService.getSyncLogs(15),
      ])
      setItineraries(itinsData)
      setRoutes(routesData)
      setCombinations(combosData)
      setSyncLogs(logsData)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: err?.message || 'Falha ao buscar cadastros SAP.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Executa Sincronização SAP
  const handleSyncSap = async () => {
    setIsSyncing(true)
    try {
      const report = await SapRouteService.syncWithSap(
        user?.email || 'operador@ciafal.logistica',
        user?.name || 'Operador TMS',
      )

      if (report.success) {
        toast({
          title: 'Sincronização Concluída',
          description: `${report.itinerariesProcessed} itinerários, ${report.routesProcessed} rotas e ${report.combinationsProcessed} combinações atualizados.`,
        })
        fetchData()
      } else {
        setSyncResultModal(report)
        toast({
          title: 'Aviso de Sincronização',
          description: 'Não foi possível sincronizar Itinerários & Rotas com o SAP.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      const fallbackReport: SyncResultReport = {
        success: false,
        status: 'ERRO',
        stage: 'Execução RFC',
        technicalMessage: err?.message || 'Erro inesperado na chamada ao servidor.',
        timestamp: new Date().toISOString(),
        itinerariesProcessed: 0,
        routesProcessed: 0,
        combinationsProcessed: 0,
        insertions: 0,
        updates: 0,
        deactivations: 0,
        errorsCount: 1,
      }
      setSyncResultModal(fallbackReport)
      toast({
        title: 'Falha na Sincronização',
        description: 'Não foi possível sincronizar Itinerários & Rotas com o SAP.',
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // Contagem de rotas associadas a cada itinerário
  const itineraryRouteCountMap = useMemo(() => {
    const map = new Map<string, number>()
    combinations.forEach((c) => {
      const code = c.itinerary_sap_code.trim().toUpperCase()
      map.set(code, (map.get(code) || 0) + 1)
    })
    return map
  }, [combinations])

  // Contagem de itinerários associados a cada rota
  const routeItineraryCountMap = useMemo(() => {
    const map = new Map<string, number>()
    combinations.forEach((c) => {
      const code = c.route_sap_code.trim().toUpperCase()
      map.set(code, (map.get(code) || 0) + 1)
    })
    return map
  }, [combinations])

  // Header Indicators (Valores Reais da base sincronizada)
  const stats = useMemo(() => {
    const activeItins = itineraries.filter((i) => i.is_active).length
    const activeRoutes = routes.filter((r) => r.is_active).length
    const activeCombos = combinations.filter((c) => c.is_active).length
    const itinsWithoutRoute = itineraries.filter(
      (i) => (itineraryRouteCountMap.get(i.sap_code.trim().toUpperCase()) || 0) === 0,
    ).length

    return {
      activeItins,
      activeRoutes,
      activeCombos,
      itinsWithoutRoute,
    }
  }, [itineraries, routes, combinations, itineraryRouteCountMap])

  // Listas para filtros dropdown
  const filterOptions = useMemo(() => {
    const ufs = Array.from(new Set(itineraries.map((i) => i.uf).filter(Boolean))).sort()
    const regions = Array.from(new Set(itineraries.map((i) => i.region).filter(Boolean))).sort()
    const origins = Array.from(new Set(combinations.map((c) => c.origin).filter(Boolean))).sort()
    const destinations = Array.from(
      new Set(combinations.map((c) => c.destination).filter(Boolean)),
    ).sort()

    return { ufs, regions, origins, destinations }
  }, [itineraries, combinations])

  // Filtro Combinações (Aba 1)
  const filteredCombinations = useMemo(() => {
    const query = searchGlobal.trim().toLowerCase()
    return combinations.filter((c) => {
      // Global search
      if (query) {
        const match =
          c.itinerary_sap_code.toLowerCase().includes(query) ||
          (c.itinerary_description || '').toLowerCase().includes(query) ||
          c.route_sap_code.toLowerCase().includes(query) ||
          (c.route_description || '').toLowerCase().includes(query) ||
          (c.uf || '').toLowerCase().includes(query) ||
          (c.region || '').toLowerCase().includes(query) ||
          (c.origin || '').toLowerCase().includes(query) ||
          (c.destination || '').toLowerCase().includes(query)
        if (!match) return false
      }

      // Specific filters
      if (filterItinerary !== 'ALL' && c.itinerary_sap_code !== filterItinerary) return false
      if (filterRoute !== 'ALL' && c.route_sap_code !== filterRoute) return false
      if (filterUf !== 'ALL' && c.uf !== filterUf) return false
      if (filterRegion !== 'ALL' && c.region !== filterRegion) return false
      if (filterOrigin !== 'ALL' && c.origin !== filterOrigin) return false
      if (filterDestination !== 'ALL' && c.destination !== filterDestination) return false
      if (filterStatus === 'ATIVO' && !c.is_active) return false
      if (filterStatus === 'INATIVO' && c.is_active) return false

      return true
    })
  }, [
    combinations,
    searchGlobal,
    filterItinerary,
    filterRoute,
    filterUf,
    filterRegion,
    filterOrigin,
    filterDestination,
    filterStatus,
  ])

  // Filtro Itinerários (Aba 2)
  const filteredItineraries = useMemo(() => {
    const query = searchGlobal.trim().toLowerCase()
    return itineraries.filter((i) => {
      const routeCount = itineraryRouteCountMap.get(i.sap_code.trim().toUpperCase()) || 0

      if (query) {
        const match =
          i.sap_code.toLowerCase().includes(query) ||
          i.description.toLowerCase().includes(query) ||
          (i.uf || '').toLowerCase().includes(query) ||
          (i.region || '').toLowerCase().includes(query) ||
          (i.origin || '').toLowerCase().includes(query)
        if (!match) return false
      }

      if (filterItinerary !== 'ALL' && i.sap_code !== filterItinerary) return false
      if (filterUf !== 'ALL' && i.uf !== filterUf) return false
      if (filterRegion !== 'ALL' && i.region !== filterRegion) return false
      if (filterStatus === 'ATIVO' && !i.is_active) return false
      if (filterStatus === 'INATIVO' && i.is_active) return false

      if (filterHasCombo === 'COM' && routeCount === 0) return false
      if (filterHasCombo === 'SEM' && routeCount > 0) return false

      return true
    })
  }, [
    itineraries,
    searchGlobal,
    filterItinerary,
    filterUf,
    filterRegion,
    filterStatus,
    filterHasCombo,
    itineraryRouteCountMap,
  ])

  // Filtro Rotas (Aba 3)
  const filteredRoutes = useMemo(() => {
    const query = searchGlobal.trim().toLowerCase()
    return routes.filter((r) => {
      const itinCount = routeItineraryCountMap.get(r.sap_route_code.trim().toUpperCase()) || 0

      if (query) {
        const match =
          r.sap_route_code.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          (r.uf || '').toLowerCase().includes(query) ||
          (r.region || '').toLowerCase().includes(query) ||
          (r.origin || '').toLowerCase().includes(query) ||
          (r.destination || '').toLowerCase().includes(query)
        if (!match) return false
      }

      if (filterRoute !== 'ALL' && r.sap_route_code !== filterRoute) return false
      if (filterUf !== 'ALL' && r.uf !== filterUf) return false
      if (filterRegion !== 'ALL' && r.region !== filterRegion) return false
      if (filterOrigin !== 'ALL' && r.origin !== filterOrigin) return false
      if (filterDestination !== 'ALL' && r.destination !== filterDestination) return false
      if (filterStatus === 'ATIVO' && !r.is_active) return false
      if (filterStatus === 'INATIVO' && r.is_active) return false

      if (filterHasCombo === 'COM' && itinCount === 0) return false
      if (filterHasCombo === 'SEM' && itinCount > 0) return false

      return true
    })
  }, [
    routes,
    searchGlobal,
    filterRoute,
    filterUf,
    filterRegion,
    filterOrigin,
    filterDestination,
    filterStatus,
    filterHasCombo,
    routeItineraryCountMap,
  ])

  // Handlers para abrir detalhe/edição
  const handleOpenItineraryDetail = (itin: SapItineraryEntity) => {
    setDetailItinerary(itin)
    setEditNotes(itin.operational_notes || '')
    setEditLeadTimeCalc(itin.calculated_lead_time_days || '')
    setEditPriority(itin.logistics_priority || 'NORMAL')
    setEditRestrictions(itin.logistics_restrictions || '')
    setEditOperatingHours(itin.operating_hours || '')
    setEditLogisticChar(itin.logistic_characteristic || '')
    setEditPlanningNotes(itin.planning_notes || '')
  }

  const handleSaveItineraryMetadata = async () => {
    if (!detailItinerary) return
    setIsSavingMeta(true)
    try {
      const ok = await SapRouteService.updateItineraryTmsMetadata(
        detailItinerary.id,
        {
          operational_notes: editNotes,
          calculated_lead_time_days: editLeadTimeCalc === '' ? undefined : Number(editLeadTimeCalc),
          logistics_priority: editPriority,
          logistics_restrictions: editRestrictions,
          operating_hours: editOperatingHours,
          logistic_characteristic: editLogisticChar,
          planning_notes: editPlanningNotes,
        },
        user?.email || 'gerente.carga@ciafal.logistica',
        user?.name || 'Gerente de Carga',
      )

      if (ok) {
        toast({
          title: 'Metadados TMS Atualizados',
          description: `Metadados operacionais do itinerário ${detailItinerary.sap_code} gravados com auditoria.`,
        })
        setDetailItinerary(null)
        fetchData()
      } else {
        toast({
          title: 'Erro',
          description: 'Falha ao atualizar metadados.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao salvar metadados operacionais.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingMeta(false)
    }
  }

  // Rotas associadas ao itinerário selecionado
  const associatedRoutesForSelectedItin = useMemo(() => {
    if (!detailItinerary) return []
    const code = detailItinerary.sap_code.trim().toUpperCase()
    return combinations.filter((c) => c.itinerary_sap_code.trim().toUpperCase() === code)
  }, [detailItinerary, combinations])

  // Itinerários associados à rota selecionada
  const associatedItinerariesForSelectedRoute = useMemo(() => {
    if (!detailRoute) return []
    const code = detailRoute.sap_route_code.trim().toUpperCase()
    return combinations.filter((c) => c.route_sap_code.trim().toUpperCase() === code)
  }, [detailRoute, combinations])

  return (
    <div className="space-y-4">
      {/* PageHeader conforme especificação rigorosa */}
      <PageHeader
        title="Itinerários & Rotas SAP"
        subtitle="Dados mestres e combinações logísticas provenientes do SAP ECC 6.0 utilizados pelo planejamento de cargas do TMS."
        icon={MapPin}
        breadcrumbs={[
          { label: 'TMS CIAFAL', href: '/tms' },
          { label: 'Planejamento Logístico', href: '/tms/itinerarios-sap' },
          { label: 'Itinerários & Rotas' },
        ]}
        badge={
          <Badge className="bg-[#005596] text-white text-[10px] font-bold tracking-wider">
            FONTE OFICIAL SAP
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLogsModal(true)}
              className="text-xs h-8 text-slate-700"
            >
              <History className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Logs de Sync ({syncLogs.length})
            </Button>
            <Button
              onClick={handleSyncSap}
              size="sm"
              className="bg-[#005596] text-white hover:bg-[#004275] text-xs h-8 font-semibold shadow-sm"
              disabled={isSyncing || isLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando SAP...' : 'Sincronizar SAP'}
            </Button>
          </div>
        }
      />

      {/* Item 11: Header Indicators com Dados Reais da Base */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              ITINERÁRIOS ATIVOS
            </div>
            <div className="text-2xl font-black text-[#005596] mt-1 font-mono">
              {stats.activeItins}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Tabela Mestre TVROT</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              ROTAS ATIVAS
            </div>
            <div className="text-2xl font-black text-sky-700 mt-1 font-mono">
              {stats.activeRoutes}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Tabela Mestre TVRO</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              COMBINAÇÕES ATIVAS
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1 font-mono">
              {stats.activeCombos}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Itinerário × Rota no Planejador</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              SEM ROTA ASSOCIADA
            </div>
            <div
              className={`text-2xl font-black mt-1 font-mono ${
                stats.itinsWithoutRoute > 0 ? 'text-amber-600' : 'text-slate-700'
              }`}
            >
              {stats.itinsWithoutRoute}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Requer mapeamento SAP</div>
          </CardContent>
        </Card>
      </div>

      {/* Item 10: Busca Global e Barra de Filtros Alinhada */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-3 space-y-3">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <Input
              placeholder="Pesquisar por itinerário, rota, descrição, UF, região, origem ou destino..."
              value={searchGlobal}
              onChange={(e) => setSearchGlobal(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2 pt-1 border-t border-slate-100 text-xs">
            {/* Filtro UF */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">UF:</label>
              <Select value={filterUf} onValueChange={setFilterUf}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as UFs</SelectItem>
                  {filterOptions.ufs.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Região */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Região:</label>
              <Select value={filterRegion} onValueChange={setFilterRegion}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as Regiões</SelectItem>
                  {filterOptions.regions.map((rg) => (
                    <SelectItem key={rg} value={rg}>
                      {rg}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Origem */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Origem:</label>
              <Select value={filterOrigin} onValueChange={setFilterOrigin}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as Origens</SelectItem>
                  {filterOptions.origins.map((orig) => (
                    <SelectItem key={orig} value={orig}>
                      {orig}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Destino */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Destino:</label>
              <Select value={filterDestination} onValueChange={setFilterDestination}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Destinos</SelectItem>
                  {filterOptions.destinations.map((dest) => (
                    <SelectItem key={dest} value={dest}>
                      {dest}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Status */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Status:</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Status</SelectItem>
                  <SelectItem value="ATIVO">Ativo</SelectItem>
                  <SelectItem value="INATIVO">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Combinação */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Combinação:</label>
              <Select value={filterHasCombo} onValueChange={(val: any) => setFilterHasCombo(val)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  <SelectItem value="COM">Com Combinação</SelectItem>
                  <SelectItem value="SEM">Sem Combinação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Itinerário SAP */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Itinerário:</label>
              <Select value={filterItinerary} onValueChange={setFilterItinerary}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="ALL">Todos os Itinerários</SelectItem>
                  {itineraries.map((it) => (
                    <SelectItem key={it.id} value={it.sap_code}>
                      {it.sap_code} - {it.description.slice(0, 18)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset de Filtros */}
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchGlobal('')
                  setFilterItinerary('ALL')
                  setFilterRoute('ALL')
                  setFilterUf('ALL')
                  setFilterRegion('ALL')
                  setFilterOrigin('ALL')
                  setFilterDestination('ALL')
                  setFilterStatus('ALL')
                  setFilterHasCombo('ALL')
                }}
                className="h-8 text-xs text-slate-500 hover:text-slate-800 w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Item 3: Estrutura com 3 Abas Internas */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-3">
        <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger
              value="combinations"
              className="text-xs font-semibold data-[state=active]:bg-[#005596] data-[state=active]:text-white"
            >
              <Layers className="w-3.5 h-3.5 mr-1.5" />
              Aba 1 — Combinações Itinerário × Rota ({filteredCombinations.length})
            </TabsTrigger>
            <TabsTrigger
              value="itineraries"
              className="text-xs font-semibold data-[state=active]:bg-[#005596] data-[state=active]:text-white"
            >
              <MapPin className="w-3.5 h-3.5 mr-1.5" />
              Aba 2 — Itinerários ({filteredItineraries.length})
            </TabsTrigger>
            <TabsTrigger
              value="routes"
              className="text-xs font-semibold data-[state=active]:bg-[#005596] data-[state=active]:text-white"
            >
              <Compass className="w-3.5 h-3.5 mr-1.5" />
              Aba 3 — Rotas ({filteredRoutes.length})
            </TabsTrigger>
          </TabsList>

          <div className="text-[11px] text-slate-400 pr-3 hidden sm:block">
            SAP = Master Data • TMS = Consumidor & Camada Operacional
          </div>
        </div>

        {/* ABA 1: COMBINAÇÕES ITINERÁRIO × ROTA (DEFAULT) */}
        <TabsContent value="combinations">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">
                  Combinações Logísticas Itinerário × Rota (SAP ECC 6.0)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Cada linha representa uma combinação real homologada no SAP utilizada pelo
                  planejamento de cargas.
                </CardDescription>
              </div>
              <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[10px]">
                {filteredCombinations.length} Combinações Reais
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">Código Itinerário</th>
                      <th className="p-3">Descrição do Itinerário</th>
                      <th className="p-3">Código da Rota</th>
                      <th className="p-3">Descrição da Rota</th>
                      <th className="p-3">UF / Região</th>
                      <th className="p-3">Origem</th>
                      <th className="p-3">Destino / Região Atendida</th>
                      <th className="p-3 text-center">Lead Time</th>
                      <th className="p-3 text-center">Status SAP</th>
                      <th className="p-3 text-center">Status TMS</th>
                      <th className="p-3 text-center">Última Sincronização</th>
                      <th className="p-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredCombinations.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="text-center py-10 text-slate-400">
                          {isLoading
                            ? 'Carregando combinações...'
                            : 'Nenhuma combinação Itinerário × Rota localizada com os filtros atuais.'}
                        </td>
                      </tr>
                    ) : (
                      filteredCombinations.map((combo) => (
                        <tr key={combo.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-[#005596]">
                            {combo.itinerary_sap_code}
                          </td>
                          <td className="p-3 font-medium text-slate-900 max-w-xs truncate">
                            {combo.itinerary_description || '—'}
                          </td>
                          <td className="p-3 font-mono font-bold text-sky-800">
                            {combo.route_sap_code}
                          </td>
                          <td className="p-3 text-slate-800 max-w-xs truncate">
                            {combo.route_description || '—'}
                          </td>
                          <td className="p-3 text-slate-600">
                            <span className="font-semibold text-slate-800">{combo.uf}</span>
                            {combo.region && ` • ${combo.region}`}
                          </td>
                          <td className="p-3 text-slate-600 truncate max-w-[140px]">
                            {combo.origin || 'Matriz Betim/Contagem'}
                          </td>
                          <td className="p-3 text-slate-600 truncate max-w-[160px]">
                            {combo.destination || '—'}
                          </td>
                          <td className="p-3 text-center font-mono">
                            {combo.lead_time_days ? `${combo.lead_time_days}d` : '1d'}
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              className={`text-[9px] font-bold ${
                                combo.status_sap === 'ATIVO'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-rose-500 text-white'
                              }`}
                            >
                              {combo.status_sap || 'ATIVO'}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              className={`text-[9px] font-bold ${
                                combo.is_active
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-slate-400 text-white'
                              }`}
                            >
                              {combo.status_tms || (combo.is_active ? 'ATIVO' : 'INATIVO')}
                            </Badge>
                          </td>
                          <td className="p-3 text-center font-mono text-[11px] text-slate-500">
                            {combo.last_sync_date
                              ? new Date(combo.last_sync_date).toLocaleDateString('pt-BR')
                              : '—'}
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDetailCombination(combo)}
                              className="h-7 text-xs text-[#005596] hover:bg-sky-50"
                            >
                              Detalhes
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 2: ITINERÁRIOS SAP */}
        <TabsContent value="itineraries">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">
                  Itinerários Cadastrados no SAP (Tabela TVROT)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Dados corporativos oficiais do SAP integrados ao TMS com metadados auditados.
                </CardDescription>
              </div>
              <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[10px]">
                {filteredItineraries.length} Itinerários
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">Código SAP</th>
                      <th className="p-3">Descrição Corporativa SAP</th>
                      <th className="p-3">UF</th>
                      <th className="p-3">Região</th>
                      <th className="p-3 text-center">Lead Time Médio</th>
                      <th className="p-3 text-center">Qtd. Rotas Associadas</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Última Sincronização</th>
                      <th className="p-3">Metadados TMS</th>
                      <th className="p-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredItineraries.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-10 text-slate-400">
                          {isLoading ? 'Carregando...' : 'Nenhum itinerário localizado.'}
                        </td>
                      </tr>
                    ) : (
                      filteredItineraries.map((itin) => {
                        const routeCount =
                          itineraryRouteCountMap.get(itin.sap_code.trim().toUpperCase()) || 0
                        return (
                          <tr key={itin.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-[#005596] text-sm">
                              {itin.sap_code}
                            </td>
                            <td className="p-3 font-medium text-slate-900">{itin.description}</td>
                            <td className="p-3 font-semibold text-slate-800">{itin.uf}</td>
                            <td className="p-3 text-slate-600">{itin.region || '—'}</td>
                            <td className="p-3 text-center font-mono">
                              {itin.avg_transit_days ? `${itin.avg_transit_days} dias` : '1 dia'}
                            </td>
                            <td className="p-3 text-center">
                              <Badge
                                className={`text-[10px] font-bold ${
                                  routeCount > 0
                                    ? 'bg-sky-100 text-sky-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {routeCount} {routeCount === 1 ? 'rota' : 'rotas'}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              <Badge
                                className={`text-[9px] font-bold ${
                                  itin.is_active
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-400 text-white'
                                }`}
                              >
                                {itin.is_active ? 'ATIVO NO TMS' : 'INATIVO'}
                              </Badge>
                            </td>
                            <td className="p-3 text-center font-mono text-[11px] text-slate-500">
                              {itin.last_sync_date
                                ? new Date(itin.last_sync_date).toLocaleDateString('pt-BR')
                                : '—'}
                            </td>
                            <td className="p-3 text-slate-600 max-w-xs truncate">
                              {itin.operational_notes || (
                                <span className="text-slate-400 italic">Sem observações</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenItineraryDetail(itin)}
                                className="h-7 text-xs text-[#005596] border-[#005596]/30 hover:bg-sky-50"
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-1" />
                                Detalhes / Metadados
                              </Button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 3: ROTAS SAP */}
        <TabsContent value="routes">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">
                  Rotas Cadastradas no SAP (Tabela TVRO)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Rotas de transporte oficiais do SAP ECC 6.0 e itinerários associados.
                </CardDescription>
              </div>
              <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[10px]">
                {filteredRoutes.length} Rotas
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">Código da Rota SAP</th>
                      <th className="p-3">Descrição da Rota</th>
                      <th className="p-3">Origem</th>
                      <th className="p-3">Destino</th>
                      <th className="p-3">UF / Região</th>
                      <th className="p-3 text-center">Itinerários Associados</th>
                      <th className="p-3 text-center">Lead Time</th>
                      <th className="p-3 text-center">Status SAP</th>
                      <th className="p-3 text-center">Status TMS</th>
                      <th className="p-3 text-center">Última Sincronização</th>
                      <th className="p-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredRoutes.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="text-center py-10 text-slate-400">
                          {isLoading ? 'Carregando...' : 'Nenhuma rota localizada.'}
                        </td>
                      </tr>
                    ) : (
                      filteredRoutes.map((route) => {
                        const itinCount =
                          routeItineraryCountMap.get(route.sap_route_code.trim().toUpperCase()) || 0
                        return (
                          <tr key={route.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-sky-900 text-sm">
                              {route.sap_route_code}
                            </td>
                            <td className="p-3 font-medium text-slate-900">{route.description}</td>
                            <td className="p-3 text-slate-600">{route.origin || 'Matriz Betim'}</td>
                            <td className="p-3 text-slate-600">{route.destination || '—'}</td>
                            <td className="p-3 text-slate-600">
                              <span className="font-semibold text-slate-800">{route.uf}</span>
                              {route.region && ` • ${route.region}`}
                            </td>
                            <td className="p-3 text-center">
                              <Badge
                                className={`text-[10px] font-bold ${
                                  itinCount > 0
                                    ? 'bg-sky-100 text-sky-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {itinCount} {itinCount === 1 ? 'itinerário' : 'itinerários'}
                              </Badge>
                            </td>
                            <td className="p-3 text-center font-mono">
                              {route.lead_time_days ? `${route.lead_time_days}d` : '1d'}
                            </td>
                            <td className="p-3 text-center">
                              <Badge
                                className={`text-[9px] font-bold ${
                                  route.status_sap === 'ATIVO'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-400 text-white'
                                }`}
                              >
                                {route.status_sap || 'ATIVO'}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              <Badge
                                className={`text-[9px] font-bold ${
                                  route.is_active
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-400 text-white'
                                }`}
                              >
                                {route.status_tms || (route.is_active ? 'ATIVO' : 'INATIVO')}
                              </Badge>
                            </td>
                            <td className="p-3 text-center font-mono text-[11px] text-slate-500">
                              {route.last_sync_date
                                ? new Date(route.last_sync_date).toLocaleDateString('pt-BR')
                                : '—'}
                            </td>
                            <td className="p-3 text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDetailRoute(route)}
                                className="h-7 text-xs text-[#005596] hover:bg-sky-50"
                              >
                                Ver Itinerários
                              </Button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL DETALHE ITINERÁRIO (Item 5: Dados SAP x Rotas Associadas x Metadados TMS) */}
      <Dialog open={!!detailItinerary} onOpenChange={(open) => !open && setDetailItinerary(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge className="bg-[#005596] text-white text-[10px]">DADOS MESTRES SAP</Badge>
              <Badge variant="outline" className="text-[10px]">
                Itinerário {detailItinerary?.sap_code}
              </Badge>
            </div>
            <DialogTitle className="text-base font-bold text-slate-900 mt-1">
              Detalhes do Itinerário: {detailItinerary?.description}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Separação estrita: dados do SAP são somente leitura; metadados operacionais do TMS são
              auditados.
            </DialogDescription>
          </DialogHeader>

          {detailItinerary && (
            <div className="space-y-4 text-xs">
              {/* SEÇÃO 1: DADOS SAP (READ-ONLY) */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#005596]" />
                    Seção 1: Dados Oficiais SAP (Somente Leitura)
                  </span>
                  <Badge className="bg-slate-200 text-slate-700 text-[9px]">TVROT • ECC 6.0</Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Código SAP:</span>
                    <strong className="font-mono text-[#005596] text-sm">
                      {detailItinerary.sap_code}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">UF / Região:</span>
                    <span className="font-semibold text-slate-800">
                      {detailItinerary.uf} • {detailItinerary.region || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Lead Time SAP:</span>
                    <span className="font-mono text-slate-800">
                      {detailItinerary.avg_transit_days || 1} dia(s)
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block">
                      Descrição Corporativa SAP:
                    </span>
                    <span className="font-medium text-slate-800">
                      {detailItinerary.description}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Status no SAP:</span>
                    <Badge
                      className={`text-[9px] font-bold ${
                        detailItinerary.is_active
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-400 text-white'
                      }`}
                    >
                      {detailItinerary.is_active ? 'ATIVO NO SAP' : 'INATIVO NO SAP'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: ROTAS ASSOCIADAS */}
              <div className="p-3 rounded-lg bg-sky-50/50 border border-sky-100 space-y-2">
                <div className="flex items-center justify-between border-b border-sky-200 pb-1.5">
                  <span className="font-bold text-sky-950 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-sky-700" />
                    Seção 2: Rotas Associadas a este Itinerário (
                    {associatedRoutesForSelectedItin.length})
                  </span>
                  <span className="text-[10px] text-sky-700">Relacionamentos homologados</span>
                </div>

                {associatedRoutesForSelectedItin.length === 0 ? (
                  <p className="text-slate-500 italic py-2">
                    Nenhuma rota atualmente vinculada a este itinerário. Execute a sincronização SAP
                    para gerar os vínculos homologados.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {associatedRoutesForSelectedItin.map((combo) => (
                      <div
                        key={combo.id}
                        className="bg-white p-2 rounded border border-sky-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono font-bold text-sky-900">
                            {combo.route_sap_code} — {combo.route_description || 'Rota SAP'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Origem: {combo.origin} • Destino: {combo.destination} • Lead Time:{' '}
                            {combo.lead_time_days}d
                          </div>
                        </div>
                        <Badge className="bg-sky-600 text-white text-[9px]">VINCULADA</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SEÇÃO 3: METADADOS TMS (EDITÁVEIS POR PERMISSÃO) */}
              <div className="p-3 rounded-lg bg-amber-50/40 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between border-b border-amber-200 pb-1.5">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Edit2 className="w-4 h-4 text-amber-700" />
                    Seção 3: Metadados Operacionais TMS (Auditados)
                  </span>
                  <Badge className="bg-amber-100 text-amber-800 text-[9px]">
                    NUNCA SOBRESCREVE O SAP
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">
                      Lead Time Operacional Calculado (dias):
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Ex: 2"
                      value={editLeadTimeCalc}
                      onChange={(e) =>
                        setEditLeadTimeCalc(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="text-xs h-8 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">
                      Prioridade Logística no TMS:
                    </label>
                    <Select value={editPriority} onValueChange={setEditPriority}>
                      <SelectTrigger className="h-8 text-xs bg-white">
                        <SelectValue placeholder="Prioridade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CRITICA">Crítica (Prioridade Máxima)</SelectItem>
                        <SelectItem value="ALTA">Alta</SelectItem>
                        <SelectItem value="NORMAL">Normal / Padrão</SelectItem>
                        <SelectItem value="BAIXA">Baixa / Secundária</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">
                      Janela / Horários de Operação:
                    </label>
                    <Input
                      placeholder="Ex: Descargas permitidas das 07h às 17h..."
                      value={editOperatingHours}
                      onChange={(e) => setEditOperatingHours(e.target.value)}
                      className="text-xs h-8 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">
                      Característica Logística Predominante:
                    </label>
                    <Input
                      placeholder="Ex: Rodovia duplicada com pedágio tag..."
                      value={editLogisticChar}
                      onChange={(e) => setEditLogisticChar(e.target.value)}
                      className="text-xs h-8 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">
                    Restrições de Tráfego e Descarga:
                  </label>
                  <Input
                    placeholder="Ex: Restrição de bitrem no centro urbano das 06h às 10h..."
                    value={editRestrictions}
                    onChange={(e) => setEditRestrictions(e.target.value)}
                    className="text-xs h-8 bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">
                    Observações para o Planejador de Cargas:
                  </label>
                  <Textarea
                    placeholder="Orientações específicas para consolidação de cargas e roteirização..."
                    value={editPlanningNotes}
                    onChange={(e) => setEditPlanningNotes(e.target.value)}
                    className="text-xs h-16 bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">
                    Observações Operacionais Gerais (TMS):
                  </label>
                  <Textarea
                    placeholder="Anotações gerais visíveis pela equipe de logística..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="text-xs h-16 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailItinerary(null)}
              className="text-xs"
              disabled={isSavingMeta}
            >
              Fechar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveItineraryMetadata}
              className="bg-[#005596] text-white hover:bg-[#004275] text-xs"
              disabled={isSavingMeta}
            >
              {isSavingMeta ? 'Salvando...' : 'Salvar Metadados Operacionais'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DETALHE ROTA (Item 6: Ver itinerários relacionados) */}
      <Dialog open={!!detailRoute} onOpenChange={(open) => !open && setDetailRoute(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge className="bg-sky-800 text-white text-[10px]">ROTA SAP TVRO</Badge>
              <Badge variant="outline" className="text-[10px]">
                {detailRoute?.sap_route_code}
              </Badge>
            </div>
            <DialogTitle className="text-base font-bold text-slate-900 mt-1">
              Rota SAP: {detailRoute?.description}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Origem: {detailRoute?.origin || 'Matriz'} • Destino: {detailRoute?.destination || '—'}
            </DialogDescription>
          </DialogHeader>

          {detailRoute && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded border space-y-1">
                <div>
                  Código da Rota:{' '}
                  <strong className="font-mono text-sky-900">{detailRoute.sap_route_code}</strong>
                </div>
                <div>
                  UF / Região:{' '}
                  <strong>
                    {detailRoute.uf} • {detailRoute.region || '—'}
                  </strong>
                </div>
                <div>
                  Lead Time da Rota:{' '}
                  <strong className="font-mono">{detailRoute.lead_time_days || 1} dia(s)</strong>
                </div>
                <div>
                  Status no SAP:{' '}
                  <Badge className="bg-emerald-600 text-white text-[9px]">
                    {detailRoute.status_sap || 'ATIVO'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-700 flex items-center justify-between border-b pb-1">
                  <span>
                    Itinerários Associados a esta Rota (
                    {associatedItinerariesForSelectedRoute.length})
                  </span>
                  <span className="text-[10px] text-slate-400">Relação Itinerário × Rota</span>
                </div>

                {associatedItinerariesForSelectedRoute.length === 0 ? (
                  <p className="text-slate-500 italic py-2">
                    Nenhum itinerário associado diretamente a esta rota.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {associatedItinerariesForSelectedRoute.map((c) => (
                      <div
                        key={c.id}
                        className="p-2.5 bg-white border border-slate-200 rounded flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono font-bold text-[#005596]">
                            {c.itinerary_sap_code} — {c.itinerary_description}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Região: {c.region || c.destination} • Lead Time: {c.lead_time_days}d
                          </div>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px]">
                          ATIVO
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailRoute(null)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DETALHE COMBINAÇÃO */}
      <Dialog
        open={!!detailCombination}
        onOpenChange={(open) => !open && setDetailCombination(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-700 text-white text-[10px]">COMBINAÇÃO LOGÍSTICA</Badge>
              <Badge variant="outline" className="font-mono text-[10px]">
                {detailCombination?.technical_key}
              </Badge>
            </div>
            <DialogTitle className="text-base font-bold text-slate-900 mt-1">
              Combinação Itinerário × Rota
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Chave corporativa rastreável no SAP e no Planejador de Cargas.
            </DialogDescription>
          </DialogHeader>

          {detailCombination && (
            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Itinerário:</span>
                  <span className="font-mono font-bold text-[#005596]">
                    {detailCombination.itinerary_sap_code}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Descrição Itinerário:</span>
                  <span className="font-medium text-slate-800">
                    {detailCombination.itinerary_description}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Rota SAP:</span>
                  <span className="font-mono font-bold text-sky-800">
                    {detailCombination.route_sap_code}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Descrição Rota:</span>
                  <span className="font-medium text-slate-800">
                    {detailCombination.route_description}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">UF / Região:</span>
                  <span className="font-semibold text-slate-800">
                    {detailCombination.uf} • {detailCombination.region}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Lead Time:</span>
                  <span className="font-mono text-slate-800">
                    {detailCombination.lead_time_days || 1} dia(s)
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailCombination(null)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL LOGS DE AUDITORIA DE SINCRONIZAÇÃO (Item 14) */}
      <Dialog open={showLogsModal} onOpenChange={setShowLogsModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-[#005596]" />
              Auditoria de Sincronizações com o SAP ECC 6.0
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Histórico imutável de execuções do lote único de Itinerários, Rotas e Combinações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-xs">
            {syncLogs.length === 0 ? (
              <p className="text-slate-400 italic text-center py-6">
                Nenhum log de sincronização registrado até o momento.
              </p>
            ) : (
              syncLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 font-mono text-xs">
                      {new Date(log.sync_timestamp).toLocaleString('pt-BR')}
                    </span>
                    <Badge
                      className={`text-[9px] font-bold ${
                        log.status === 'SUCESSO'
                          ? 'bg-emerald-600 text-white'
                          : log.status === 'SUCESSO_PARCIAL'
                            ? 'bg-amber-600 text-white'
                            : 'bg-rose-600 text-white'
                      }`}
                    >
                      {log.status}
                    </Badge>
                  </div>

                  <div className="text-slate-600 text-[11px] grid grid-cols-2 gap-1">
                    <div>
                      Usuário: <strong>{log.user_name || log.user_email || 'Sistema'}</strong>
                    </div>
                    <div>
                      Origem SAP: <strong>{log.source_sap || 'RFC TVRO/TVROT'}</strong>
                    </div>
                    <div>
                      Itinerários: <strong>{log.itineraries_processed}</strong>
                    </div>
                    <div>
                      Rotas: <strong>{log.routes_processed}</strong>
                    </div>
                    <div>
                      Combinações: <strong>{log.combinations_processed}</strong>
                    </div>
                    <div>
                      Inclusões: <strong>{log.insertions_count}</strong> | Alterações:{' '}
                      <strong>{log.updates_count}</strong> | Erros:{' '}
                      <strong className={log.errors_count > 0 ? 'text-rose-600' : ''}>
                        {log.errors_count}
                      </strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLogsModal(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL TRATAMENTO DE ERRO DE SYNC (Item 8: Mensagem Objetiva com Etapa, Registro, Mensagem Técnica e Retry) */}
      <Dialog open={!!syncResultModal} onOpenChange={(open) => !open && setSyncResultModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              Não foi possível sincronizar Itinerários & Rotas com o SAP.
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Falha na comunicação RFC com o SAP ECC 6.0 ou no processamento dos cadastros mestres.
            </DialogDescription>
          </DialogHeader>

          {syncResultModal && (
            <div className="space-y-2.5 text-xs bg-rose-50/50 p-3 rounded-lg border border-rose-200">
              <div>
                <span className="text-[10px] text-slate-500 block">Etapa Afetada:</span>
                <strong className="text-slate-800 font-semibold">{syncResultModal.stage}</strong>
              </div>

              {syncResultModal.affectedRecord && (
                <div>
                  <span className="text-[10px] text-slate-500 block">Registro Afetado:</span>
                  <span className="font-mono text-slate-800">{syncResultModal.affectedRecord}</span>
                </div>
              )}

              <div>
                <span className="text-[10px] text-slate-500 block">
                  Mensagem Técnica do SAP / Sistema:
                </span>
                <p className="font-mono text-[11px] text-rose-800 bg-white p-2 rounded border border-rose-200 break-words">
                  {syncResultModal.technicalMessage || 'Falha no canal de comunicação SAP.'}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block">Data e Hora:</span>
                <span className="font-mono text-slate-700">
                  {new Date(syncResultModal.timestamp).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSyncResultModal(null)}
              className="text-xs"
            >
              Fechar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSyncResultModal(null)
                handleSyncSap()
              }}
              className="bg-[#005596] text-white hover:bg-[#004275] text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Tentar Novamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
