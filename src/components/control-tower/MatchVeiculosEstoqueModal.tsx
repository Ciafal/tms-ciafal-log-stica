import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  Truck,
  Sparkles,
  ArrowRight,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react'
import type { VehicleLoadMatch } from '@/domain/vehicleLoadMatchingEngine'
import { useNavigate } from 'react-router-dom'
import { TmsService } from '@/services/tmsService'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface MatchVeiculosEstoqueModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  matches: VehicleLoadMatch[]
}

export const MatchVeiculosEstoqueModal: React.FC<MatchVeiculosEstoqueModalProps> = ({
  open,
  onOpenChange,
  matches,
}) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItinerary, setSelectedItinerary] = useState<string>('ALL')
  const [selectedMatch, setSelectedMatch] = useState<VehicleLoadMatch | null>(null)

  // Itinerários disponíveis nos matches
  const itineraries = useMemo(() => {
    const set = new Set(matches.map((m) => m.candidateLoad.itineraryCode).filter(Boolean))
    return Array.from(set).sort()
  }, [matches])

  // Filtragem
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      const itinCode = m.candidateLoad.itineraryCode
      if (selectedItinerary !== 'ALL' && itinCode !== selectedItinerary) {
        return false
      }
      if (!searchTerm) return true
      const q = searchTerm.toLowerCase()
      return (
        m.vehiclePlate.toLowerCase().includes(q) ||
        m.driverName.toLowerCase().includes(q) ||
        itinCode.toLowerCase().includes(q) ||
        m.candidateLoad.orders.some(
          (o) =>
            o.customer_name.toLowerCase().includes(q) ||
            o.order_number.toLowerCase().includes(q) ||
            (o.material && o.material.toLowerCase().includes(q)),
        )
      )
    })
  }, [matches, searchTerm, selectedItinerary])

  // Totais
  const totals = useMemo(() => {
    const uniqueVehicles = new Set(filteredMatches.map((m) => m.vehiclePlate)).size
    const potentialTons = filteredMatches.reduce(
      (sum, m) => sum + (m.candidateLoad.totalWeightKg || 0) / 1000,
      0,
    )
    const avgScore =
      filteredMatches.length > 0
        ? Math.round(
            filteredMatches.reduce((sum, m) => sum + m.score.totalScore, 0) /
              filteredMatches.length,
          )
        : 0
    return {
      matchesCount: filteredMatches.length,
      uniqueVehicles,
      potentialTons: Math.round(potentialTons * 100) / 100,
      avgScore,
    }
  }, [filteredMatches])

  // Ação de envio para o Planejador de Cargas (Item 6 dos requisitos)
  const handleSendToLoadPlanner = async (match: VehicleLoadMatch) => {
    try {
      // Registrar em log de auditoria
      await TmsService.logAudit({
        user_name: user?.name || 'Operador Logística',
        user_email: user?.email || 'operador.tms@ciafal.com.br',
        action: 'ENVIAR_MATCH_PARA_PLANEJADOR',
        resource: 'vehicle_load_matches',
        resource_id: match.matchId,
        payload: {
          match_id: match.matchId,
          vehicle_plate: match.vehiclePlate,
          driver_name: match.driverName,
          itinerary: match.candidateLoad.itineraryCode,
          score: match.score.totalScore,
          orders_count: match.candidateLoad.orders.length,
          total_weight_kg: match.candidateLoad.totalWeightKg,
          occupancy_pct: match.occupancyPct,
        },
      })

      // Armazenar no sessionStorage como fallback para reloads
      sessionStorage.setItem('TMS_INJECTED_MATCH_SUGGESTION', JSON.stringify(match))

      toast({
        title: 'Sugestão Enviada ao Planejador de Cargas',
        description: `Carga sugerida para o veículo ${match.vehiclePlate} (${match.candidateLoad.itineraryCode}) pronta para revisão e aprovação.`,
      })

      onOpenChange(false)

      // Navegar para o Planejador com estado pronto
      navigate('/tms/planejador-cargas', {
        state: {
          injectedMatch: match,
          fromOperacaoHoje: true,
          timestamp: Date.now(),
        },
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao encaminhar sugestão',
        description: err?.message || 'Falha ao conectar com o Planejador.',
        variant: 'destructive',
      })
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white">
          <DialogHeader className="p-4 sm:p-5 border-b border-slate-200 bg-emerald-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                    <Truck className="w-4 h-4" />
                  </div>
                  <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Oportunidades de Montagem: Veículos × Estoque
                  </DialogTitle>
                  <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold text-[10px]">
                    Disponibilidade Imediata · Score Multicritério
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-slate-600">
                  Cruzamento automático de veículos disponíveis (PORTA / FORA / PROGRAMADO),
                  carteira comercialmente liberada, estoque físico expedível, itinerário SAP e
                  compatibilidade de capacidade.
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/tms/planejador-cargas')}
                  className="text-xs h-8 border-emerald-300 text-emerald-900 hover:bg-emerald-100 font-semibold"
                >
                  <Layers className="w-3.5 h-3.5 mr-1.5" />
                  Ir ao Planejador Completo
                </Button>
              </div>
            </div>

            {/* Badges de Métricas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <div className="p-2 bg-white rounded-lg border border-emerald-200 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Matches Viáveis
                </span>
                <span className="text-base font-extrabold text-emerald-900 font-mono">
                  {totals.matchesCount} sugestões
                </span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-emerald-200 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Veículos Aptos
                </span>
                <span className="text-base font-extrabold text-emerald-900 font-mono">
                  {totals.uniqueVehicles} veículos
                </span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-emerald-200 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Tonelagem Potencial
                </span>
                <span className="text-base font-extrabold text-emerald-900 font-mono">
                  {totals.potentialTons.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t
                </span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-emerald-200 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Score Médio de Aderência
                </span>
                <span className="text-base font-extrabold text-[#005596] font-mono">
                  {totals.avgScore} / 100 pts
                </span>
              </div>
            </div>
          </DialogHeader>

          {/* Filtros */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Buscar por placa, motorista, rota, cliente, material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-white"
              />
            </div>

            <select
              aria-label="Filtrar por itinerário SAP"
              value={selectedItinerary}
              onChange={(e) => setSelectedItinerary(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-300 text-xs bg-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">Todos os Itinerários ({itineraries.length})</option>
              {itineraries.map((it) => (
                <option key={it} value={it}>
                  {it}
                </option>
              ))}
            </select>
          </div>

          {/* Tabela de Oportunidades com colunas requeridas (Item 6) */}
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-slate-100 sticky top-0 z-10 text-[11px]">
                <TableRow>
                  <TableHead className="font-bold text-slate-700 text-center">Score</TableHead>
                  <TableHead className="font-bold text-slate-700">Veículo & Motorista</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right">Capacidade</TableHead>
                  <TableHead className="font-bold text-slate-700">Itinerário</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Clientes</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right">
                    Estoque Elegível
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-right">
                    Carga Sugerida
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Ocupação</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {filteredMatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                      Nenhuma oportunidade de match imediato encontrada com os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMatches.map((match) => {
                    const score = match.score.totalScore
                    const loadTon = match.candidateLoad.totalWeightKg / 1000
                    const capTon = match.vehicleCapacityKg / 1000
                    const elegivelTon = match.candidateLoad.orders.reduce(
                      (s, o) => s + (o.weight_kg || 0) / 1000,
                      0,
                    )

                    return (
                      <TableRow key={match.matchId} className="hover:bg-emerald-50/40">
                        <TableCell className="text-center">
                          <Badge
                            className={`font-mono font-bold text-xs ${
                              score >= 85
                                ? 'bg-emerald-600 text-white'
                                : score >= 70
                                  ? 'bg-[#005596] text-white'
                                  : 'bg-amber-500 text-white'
                            }`}
                          >
                            {score} pts
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                            {match.vehiclePlate}
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1 py-0 ${
                                match.queueVehicle.type === 'PORTA'
                                  ? 'border-emerald-500 text-emerald-700'
                                  : 'border-slate-300 text-slate-600'
                              }`}
                            >
                              {match.queueVehicle.type}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-slate-600 line-clamp-1">
                            {match.driverName} · {match.vehicleType}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-slate-700">
                          {capTon.toFixed(1)} t
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px] border-slate-300"
                          >
                            {match.candidateLoad.itineraryCode}
                          </Badge>
                          <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                            {match.candidateLoad.destinationCity}/
                            {match.candidateLoad.destinationUf}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-slate-700">
                          {match.candidateLoad.customersCount}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-slate-600">
                          {elegivelTon.toFixed(1)} t
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-800">
                          {loadTon.toFixed(2)} t
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`font-mono font-bold text-xs ${
                              match.occupancyPct >= 90
                                ? 'text-emerald-700'
                                : match.occupancyPct >= 75
                                  ? 'text-[#005596]'
                                  : 'text-amber-700'
                            }`}
                          >
                            {match.occupancyPct.toFixed(0)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedMatch(match)}
                              className="text-[10px] h-7 px-2 font-bold border-slate-300 hover:bg-slate-100"
                            >
                              Ver Carga Sugerida
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSendToLoadPlanner(match)}
                              className="text-[10px] h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              title="Enviar ao Planejador de Cargas para revisão"
                            >
                              <ArrowRight className="w-3 h-3 mr-1" />
                              Planejador
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between sm:justify-between">
            <span className="text-xs text-slate-500">
              Mostrando {filteredMatches.length} de {matches.length} oportunidades viáveis
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhado "VER CARGA SUGERIDA" (Item 6 & 7 dos requisitos) */}
      {selectedMatch && (
        <Dialog open={!!selectedMatch} onOpenChange={(open) => !open && setSelectedMatch(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white">
            <DialogHeader className="p-4 bg-slate-900 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <Truck className="w-5 h-5 text-emerald-400" />
                    Carga Sugerida · Veículo {selectedMatch.vehiclePlate} (
                    {selectedMatch.vehicleType})
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-300">
                    Motorista: {selectedMatch.driverName} · Fila: {selectedMatch.queueVehicle.type}{' '}
                    · Itinerário: {selectedMatch.candidateLoad.itineraryCode}
                  </DialogDescription>
                </div>
                <div className="text-right">
                  <Badge className="bg-emerald-500 text-white font-mono text-sm px-2.5 py-1">
                    Score: {selectedMatch.score.totalScore} pts
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-auto p-4 space-y-4 text-xs">
              {/* Resumo Operacional */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Peso Total Carga
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 font-mono">
                    {(selectedMatch.candidateLoad.totalWeightKg / 1000).toFixed(2)} t
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Capacidade: {(selectedMatch.vehicleCapacityKg / 1000).toFixed(1)} t
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Ocupação do Veículo
                  </span>
                  <span className="text-sm font-extrabold text-emerald-700 font-mono">
                    {selectedMatch.occupancyPct.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-500 block">Aproveitamento otimizado</span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Clientes & Descargas
                  </span>
                  <span className="text-sm font-extrabold text-[#005596] font-mono">
                    {selectedMatch.candidateLoad.customersCount} cliente(s)
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {selectedMatch.candidateLoad.dischargesCount} descarga(s)
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Frete Estimado (ANTT)
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 font-mono">
                    {selectedMatch.totalSuggestedFreight.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Piso ANTT: R$ {selectedMatch.anttFloorValue.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Justificativa do Match & Score Multicritério */}
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#005596]">
                  <Sparkles className="w-4 h-4" />
                  Justificativa e Análise do Score (0–100)
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {selectedMatch.score.explanations?.join(' · ') ||
                    `Match de alta aderência com capacidade de ${(selectedMatch.vehicleCapacityKg / 1000).toFixed(1)}t, ocupação de ${selectedMatch.occupancyPct.toFixed(0)}% e itinerário ${selectedMatch.candidateLoad.itineraryCode}.`}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <span className="text-slate-500 block">Aderência Itinerário</span>
                    <strong className="text-slate-800">
                      {selectedMatch.score.itineraryAdherencePoints} pts
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <span className="text-slate-500 block">Aproveitamento Ocupação</span>
                    <strong className="text-slate-800">
                      {selectedMatch.score.occupancyPoints} pts
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <span className="text-slate-500 block">Prontidão Estoque/Crédito</span>
                    <strong className="text-slate-800">
                      {selectedMatch.score.readinessPoints} pts
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <span className="text-slate-500 block">Poucas Descargas</span>
                    <strong className="text-slate-800">
                      {selectedMatch.score.dischargesPoints} pts
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <span className="text-slate-500 block">
                      Tempo Fila ({selectedMatch.queueVehicle.type})
                    </span>
                    <strong className="text-slate-800">
                      {selectedMatch.score.queueWaitPoints} pts
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <span className="text-slate-500 block">Eficiência de Custo</span>
                    <strong className="text-slate-800">
                      {selectedMatch.score.costEfficiencyPoints} pts
                    </strong>
                  </div>
                </div>
              </div>

              {/* Tabela de Pedidos da Carga Sugerida */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-600" />
                  Pedidos Componentes da Carga (Sequência Sugerida)
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-100 text-[11px]">
                      <TableRow>
                        <TableHead className="font-bold">Seq.</TableHead>
                        <TableHead className="font-bold">Pedido SAP</TableHead>
                        <TableHead className="font-bold">Cliente</TableHead>
                        <TableHead className="font-bold">Cidade/UF</TableHead>
                        <TableHead className="font-bold">Material</TableHead>
                        <TableHead className="font-bold text-right">Peso (t)</TableHead>
                        <TableHead className="font-bold">Descarga</TableHead>
                        <TableHead className="font-bold">Crédito</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {selectedMatch.candidateLoad.orders.map((ord, idx) => (
                        <TableRow key={ord.id}>
                          <TableCell className="font-mono font-bold text-slate-700">
                            #{idx + 1}
                          </TableCell>
                          <TableCell className="font-mono font-bold text-[#005596]">
                            {ord.order_number}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-slate-800">{ord.customer_name}</div>
                            <div className="text-[10px] text-slate-500">
                              Cód: {ord.customer_code}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-[11px]">
                            {ord.destination_city}/{ord.uf}
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-[11px]">{ord.material}</div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                              {ord.material_description}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {(ord.weight_kg / 1000).toFixed(2)} t
                          </TableCell>
                          <TableCell className="text-[11px] text-slate-600">
                            {ord.discharge_type || 'Livre'}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Liberado
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <DialogFooter className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between sm:justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMatch(null)}
                className="text-xs h-8"
              >
                Voltar à Lista
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const m = selectedMatch
                  setSelectedMatch(null)
                  handleSendToLoadPlanner(m)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-bold"
              >
                <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                ENVIAR PARA PLANEJADOR DE CARGAS
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
