import React from 'react'
import {
  Filter,
  RotateCcw,
  Search,
  Building2,
  Calendar,
  Truck,
  User,
  Hash,
  MapPin,
  Route,
  Activity,
  AlertOctagon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TowerGlobalFilters } from '@/domain/controlTowerConsolidatedEngine'

interface TowerFilterBarProps {
  filters: TowerGlobalFilters
  onChange: (filters: TowerGlobalFilters) => void
  onReset: () => void
  availableOptions: {
    companies: string[]
    plants: string[]
    carriers: string[]
    drivers: string[]
    plates: string[]
    customers: string[]
    ufs: string[]
    routes: string[]
    vehicleTypes: string[]
    statuses: { value: string; label: string }[]
  }
}

export const TowerFilterBar: React.FC<TowerFilterBarProps> = ({
  filters,
  onChange,
  onReset,
  availableOptions,
}) => {
  const handleFieldChange = (key: keyof TowerGlobalFilters, value: string) => {
    onChange({
      ...filters,
      [key]: value,
    })
  }

  const isFiltered =
    filters.company !== 'TODAS' ||
    filters.plant !== 'TODOS' ||
    filters.period !== 'TODOS' ||
    filters.carrier !== 'TODAS' ||
    filters.driver !== 'TODOS' ||
    filters.plate !== 'TODAS' ||
    filters.customer !== 'TODOS' ||
    filters.uf !== 'TODAS' ||
    filters.route !== 'TODAS' ||
    filters.vehicleType !== 'TODOS' ||
    filters.status !== 'TODOS' ||
    filters.slaStatus !== 'TODOS' ||
    filters.hasIntercurrence !== 'TODOS' ||
    filters.searchTerm !== ''

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3.5">
      {/* Top row: search + quick indicator */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={filters.searchTerm}
            onChange={(e) => handleFieldChange('searchTerm', e.target.value)}
            placeholder="Pesquisar por transporte, SAP, cliente, placa, motorista, transportadora ou rota..."
            className="pl-9 bg-slate-50 border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus-visible:ring-[#005596]"
          />
        </div>

        <div className="flex items-center gap-2">
          {isFiltered && (
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
              Filtros ativos
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={!isFiltered}
            className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100 gap-1.5 font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Limpar filtros
          </Button>
        </div>
      </div>

      {/* Grid de Seletores Globais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
        {/* Empresa */}
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
            Empresa
          </label>
          <Select
            value={filters.company}
            onValueChange={(val) => handleFieldChange('company', val)}
          >
            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas as empresas</SelectItem>
              {availableOptions.companies.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Centro / Planta */}
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
            Centro / Planta
          </label>
          <Select value={filters.plant} onValueChange={(val) => handleFieldChange('plant', val)}>
            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Centro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os centros</SelectItem>
              {availableOptions.plants.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Período */}
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
            Período
          </label>
          <Select
            value={filters.period}
            onValueChange={(val: any) => handleFieldChange('period', val)}
          >
            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200 font-semibold text-[#005596]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os períodos</SelectItem>
              <SelectItem value="HOJE">Hoje</SelectItem>
              <SelectItem value="ONTEM">Ontem</SelectItem>
              <SelectItem value="SEMANA">Esta Semana</SelectItem>
              <SelectItem value="MES">Mês Atual</SelectItem>
              <SelectItem value="YTD">YTD (Ano até a data)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transportadora */}
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
            Transportadora
          </label>
          <Select
            value={filters.carrier}
            onValueChange={(val) => handleFieldChange('carrier', val)}
          >
            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Transportadora" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas</SelectItem>
              {availableOptions.carriers.map((car) => (
                <SelectItem key={car} value={car}>
                  {car}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Motorista */}
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
            Motorista
          </label>
          <Select value={filters.driver} onValueChange={(val) => handleFieldChange('driver', val)}>
            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Motorista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os motoristas</SelectItem>
              {availableOptions.drivers.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Placa */}
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Placa</label>
          <Select value={filters.plate} onValueChange={(val) => handleFieldChange('plate', val)}>
            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200 font-mono">
              <SelectValue placeholder="Placa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas as placas</SelectItem>
              {availableOptions.plates.map((pl) => (
                <SelectItem key={pl} value={pl}>
                  {pl}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cliente */}
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
            Cliente
          </label>
          <Select
            value={filters.customer}
            onValueChange={(val) => handleFieldChange('customer', val)}
          >
            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os clientes</SelectItem>
              {availableOptions.customers.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* UF */}
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
            UF Destino
          </label>
          <Select value={filters.uf} onValueChange={(val) => handleFieldChange('uf', val)}>
            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200 font-bold">
              <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas UFs</SelectItem>
              {availableOptions.ufs.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Rota */}
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
            Rota / Itinerário
          </label>
          <Select value={filters.route} onValueChange={(val) => handleFieldChange('route', val)}>
            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Rota" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas as rotas</SelectItem>
              {availableOptions.routes.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tipo de Veículo */}
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
            Tipo de Veículo
          </label>
          <Select
            value={filters.vehicleType}
            onValueChange={(val) => handleFieldChange('vehicleType', val)}
          >
            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Tipo Veículo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os tipos</SelectItem>
              {availableOptions.vehicleTypes.map((vt) => (
                <SelectItem key={vt} value={vt}>
                  {vt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status / Etapa */}
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
            Status Operacional
          </label>
          <Select value={filters.status} onValueChange={(val) => handleFieldChange('status', val)}>
            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os status</SelectItem>
              {availableOptions.statuses.map((st) => (
                <SelectItem key={st.value} value={st.value}>
                  {st.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Situação SLA */}
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
            Situação SLA
          </label>
          <Select
            value={filters.slaStatus}
            onValueChange={(val) => handleFieldChange('slaStatus', val)}
          >
            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200 font-semibold">
              <SelectValue placeholder="SLA" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os SLAs</SelectItem>
              <SelectItem value="NORMAL">🟢 No Prazo / Normal</SelectItem>
              <SelectItem value="ATENCAO">🟡 Em Atenção</SelectItem>
              <SelectItem value="CRITICO">🔴 Crítico</SelectItem>
              <SelectItem value="ATRASADO">🔴 Atrasado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Com / Sem Intercorrência */}
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
            Intercorrência
          </label>
          <Select
            value={filters.hasIntercurrence}
            onValueChange={(val: any) => handleFieldChange('hasIntercurrence', val)}
          >
            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Intercorrência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todas</SelectItem>
              <SelectItem value="COM">⚠️ Com Intercorrência</SelectItem>
              <SelectItem value="SEM">✅ Sem Intercorrência</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
