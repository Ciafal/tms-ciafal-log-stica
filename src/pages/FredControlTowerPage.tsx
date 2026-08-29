import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import {
  FredTransportEntity,
  FredOccurrenceEntity,
  formatLocationFreshness,
  calculateEtaClassification,
} from '@/domain/fredTrackingEngine'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  Truck,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Phone,
  MessageSquare,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Navigation,
  ExternalLink,
  Bot,
  UserCheck,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Radio,
  FileText,
  AlertOctagon,
} from 'lucide-react'

export const FredControlTowerPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [transports, setTransports] = useState<FredTransportEntity[]>([])
  const [occurrences, setOccurrences] = useState<FredOccurrenceEntity[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedTransport, setSelectedTransport] = useState<FredTransportEntity | null>(null)

  // Carregar transportes ativos do Fred
  const loadData = async () => {
    setIsLoading(true)
    try {
      const [transportsRes, occurrencesRes] = await Promise.all([
        pb.collection('fred_transports').getFullList<FredTransportEntity>({
          sort: '-created',
        }),
        pb.collection('fred_occurrences').getFullList<FredOccurrenceEntity>({
          sort: '-created',
        }),
      ])

      setTransports(transportsRes)
      setOccurrences(occurrencesRes)
      if (transportsRes.length > 0 && !selectedTransport) {
        setSelectedTransport(transportsRes[0])
      }
    } catch (err: any) {
      console.warn('Erro ao carregar dados do Fred:', err)
      // Se não houver retorno por restrição de rede, manter estado anterior
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Métricas da Torre de Controle Fred
  const inRouteCount = transports.filter(
    (t) => t.trip_status === 'EM_ROTA' || t.trip_status === 'EM_DESCARGA',
  ).length
  const totalDeliveriesToday = transports.reduce(
    (acc, t) => acc + (t.total_deliveries_count || 0),
    0,
  )
  const completedDeliveriesToday = transports.reduce(
    (acc, t) => acc + (t.completed_deliveries_count || 0),
    0,
  )
  const atRiskCount = transports.filter((t) => t.overall_eta_status === 'RISCO_ATRASO').length
  const delayedCount = transports.filter((t) => t.overall_eta_status === 'ATRASADO').length
  const activeOccurrencesCount = occurrences.filter(
    (o) => o.status === 'ABERTA' || o.status === 'EM_TRATAMENTO',
  ).length
  const staleGpsCount = transports.filter((t) => {
    const fresh = formatLocationFreshness(t.last_location_updated_at)
    return fresh.isStale && t.trip_status === 'EM_ROTA'
  }).length

  // Filtro de lista
  const filteredTransports = transports.filter((t) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      !term ||
      t.sap_transport_number.toLowerCase().includes(term) ||
      t.driver_name.toLowerCase().includes(term) ||
      t.vehicle_plate.toLowerCase().includes(term) ||
      (t.destination_summary && t.destination_summary.toLowerCase().includes(term))

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'EM_ROTA' &&
        (t.trip_status === 'EM_ROTA' || t.trip_status === 'EM_DESCARGA')) ||
      (statusFilter === 'RISCO' && t.overall_eta_status === 'RISCO_ATRASO') ||
      (statusFilter === 'ATRASADO' && t.overall_eta_status === 'ATRASADO') ||
      (statusFilter === 'CONCLUIDO' && t.trip_status === 'ENCERRADO')

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-5">
      {/* Header Operacional CIAFAL */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#005596] text-white text-xs font-bold uppercase px-2 py-0.5">
              TORRE DE CONTROLE — FRED
            </Badge>
            <Badge
              variant="outline"
              className="text-emerald-700 bg-emerald-50 border-emerald-300 text-xs font-semibold"
            >
              <Radio className="w-3 h-3 mr-1 animate-pulse text-emerald-600" />
              Monitoramento Ativo
            </Badge>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Acompanhamento Operacional de Viagens e Entregas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Agente Fred proativo: localização contínua, projeção de ETA, gestão de ocorrências e
            integração com SAP e CRM 360º.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="text-xs font-bold border-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Link to="/tms/agente-fred">
            <Button
              size="sm"
              className="bg-[#005596] hover:bg-[#004275] text-white text-xs font-bold shadow-sm"
            >
              <Bot className="w-3.5 h-3.5 mr-1.5" />
              Conversar com Fred
            </Button>
          </Link>
        </div>
      </div>

      {/* 8 Cards de KPIs Operacionais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="p-3 border-slate-200 bg-white">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Em Viagem</div>
          <div className="text-xl font-black text-[#005596] mt-0.5">{inRouteCount}</div>
          <div className="text-[9px] text-slate-400">veículos ativos</div>
        </Card>

        <Card className="p-3 border-slate-200 bg-white">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Entregas Previstas</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">{totalDeliveriesToday}</div>
          <div className="text-[9px] text-slate-400">paradas hoje</div>
        </Card>

        <Card className="p-3 border-slate-200 bg-white">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Realizadas</div>
          <div className="text-xl font-black text-emerald-600 mt-0.5">
            {completedDeliveriesToday}
          </div>
          <div className="text-[9px] text-emerald-600 font-semibold">
            {totalDeliveriesToday > 0
              ? Math.round((completedDeliveriesToday / totalDeliveriesToday) * 100)
              : 0}
            % concluído
          </div>
        </Card>

        <Card className="p-3 border-slate-200 bg-white">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Em Risco</div>
          <div className="text-xl font-black text-amber-600 mt-0.5">{atRiskCount}</div>
          <div className="text-[9px] text-amber-600 font-semibold">+10 a 30m</div>
        </Card>

        <Card className="p-3 border-slate-200 bg-white">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Atrasados</div>
          <div className="text-xl font-black text-rose-600 mt-0.5">{delayedCount}</div>
          <div className="text-[9px] text-rose-600 font-semibold">&gt; 30m / janela</div>
        </Card>

        <Card className="p-3 border-slate-200 bg-white">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Intercorrências</div>
          <div className="text-xl font-black text-purple-600 mt-0.5">{activeOccurrencesCount}</div>
          <div className="text-[9px] text-purple-600 font-semibold">em tratamento</div>
        </Card>

        <Card className="p-3 border-slate-200 bg-white">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Sinal GPS Antigo</div>
          <div className="text-xl font-black text-slate-700 mt-0.5">{staleGpsCount}</div>
          <div className="text-[9px] text-slate-400">&gt; 30 min s/ sinal</div>
        </Card>

        <Card className="p-3 border-slate-200 bg-white">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Atuação IA</div>
          <div className="text-xl font-black text-sky-600 mt-0.5">88%</div>
          <div className="text-[9px] text-sky-600 font-semibold">Fred autônomo</div>
        </Card>
      </div>

      {/* Filtros e Barra de Busca */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <Input
            placeholder="Buscar por Transporte SAP (123456), Motorista, Placa ou Cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 text-xs font-semibold">
              <SelectValue placeholder="Filtrar por Situação" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="ALL">Todos os Transportes</SelectItem>
              <SelectItem value="EM_ROTA">Em Rota / Deslocamento</SelectItem>
              <SelectItem value="RISCO">🟡 Risco de Atraso</SelectItem>
              <SelectItem value="ATRASADO">🔴 Atrasados</SelectItem>
              <SelectItem value="CONCLUIDO">🔵 Concluídos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid Principal: Lista de Transportes (Esquerda) + Detalhe 360 / Mapa (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Lista de Transportes (4 colunas no desktop) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Transportes Monitorados ({filteredTransports.length})
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Chave SAP</span>
          </div>

          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {filteredTransports.map((t) => {
              const freshness = formatLocationFreshness(t.last_location_updated_at)
              const isSelected = selectedTransport?.sap_transport_number === t.sap_transport_number

              return (
                <div
                  key={t.id || t.sap_transport_number}
                  onClick={() => setSelectedTransport(t)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50/70 border-[#005596] shadow-sm ring-1 ring-[#005596]'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm text-[#005596]">
                          SAP {t.sap_transport_number}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] font-bold font-mono px-1.5 py-0 bg-slate-50"
                        >
                          {t.vehicle_plate}
                        </Badge>
                        {t.active_actor === 'HUMANO' ? (
                          <Badge className="bg-amber-600 text-white text-[8px] px-1 py-0 font-bold">
                            HUMANO ASSUMIU
                          </Badge>
                        ) : (
                          <Badge className="bg-sky-600 text-white text-[8px] px-1 py-0 font-bold">
                            FRED IA
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">{t.driver_name}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[280px]">
                        Destino: {t.destination_summary || 'Itinerário Definido'}
                      </div>
                    </div>

                    <div className="text-right">
                      {t.overall_eta_status === 'DENTRO_PREVISTO' && (
                        <Badge className="bg-emerald-600 text-white text-[9px] font-bold">
                          🟢 No Prazo
                        </Badge>
                      )}
                      {t.overall_eta_status === 'RISCO_ATRASO' && (
                        <Badge className="bg-amber-500 text-white text-[9px] font-bold">
                          🟡 Risco (+{t.delay_minutes_current}m)
                        </Badge>
                      )}
                      {t.overall_eta_status === 'ATRASADO' && (
                        <Badge className="bg-rose-600 text-white text-[9px] font-bold">
                          🔴 Atrasado (+{t.delay_minutes_current}m)
                        </Badge>
                      )}
                      {t.overall_eta_status === 'CONCLUIDO' && (
                        <Badge className="bg-blue-600 text-white text-[9px] font-bold">
                          🔵 Entregue
                        </Badge>
                      )}
                      {t.overall_eta_status === 'AGUARDANDO' && (
                        <Badge className="bg-slate-200 text-slate-700 text-[9px] font-bold">
                          ⚪ Aguardando
                        </Badge>
                      )}

                      <div className="text-[10px] text-slate-500 font-semibold mt-1">
                        {t.completed_deliveries_count || 0} / {t.total_deliveries_count || 0}{' '}
                        entregas
                      </div>
                    </div>
                  </div>

                  {/* Última Localização com Freshness Honesta */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1 text-slate-600 truncate max-w-[240px]">
                      <MapPin className="w-3.5 h-3.5 text-[#005596] flex-shrink-0" />
                      <span className="truncate">
                        {t.last_location_name || 'Origem CIAFAL Matriz'}
                      </span>
                    </div>

                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${freshness.indicatorColor}`}
                    >
                      {freshness.isStale ? '⚠️ Sinal Antigo' : '🟢 GPS Online'}
                    </span>
                  </div>
                </div>
              )
            })}

            {filteredTransports.length === 0 && (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                Nenhum transporte encontrado com os filtros aplicados.
              </div>
            )}
          </div>
        </div>

        {/* Visão 360 do Transporte Selecionado (7 colunas) */}
        <div className="lg:col-span-7">
          {selectedTransport ? (
            <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
              <CardHeader className="p-4 bg-slate-900 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-sky-400 uppercase tracking-wide">
                        Visão 360º de Viagem
                      </span>
                      <Badge className="bg-[#005596] text-white text-[10px] font-bold">
                        SAP {selectedTransport.sap_transport_number}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-black text-white mt-0.5 flex items-center gap-2">
                      <span>{selectedTransport.driver_name}</span>
                      <span className="text-xs text-slate-400 font-mono font-normal">
                        ({selectedTransport.vehicle_plate} •{' '}
                        {selectedTransport.vehicle_type || 'Carreta'})
                      </span>
                    </CardTitle>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link to={`/tms/transporte/${selectedTransport.sap_transport_number}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Abrir Painel Completo
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Próxima Parada</span>
                    <span className="font-bold text-slate-100 truncate block">
                      {selectedTransport.current_next_stop_name || 'Comercial ABC Metais'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Previsão (ETA)</span>
                    <span className="font-bold text-amber-400">
                      {selectedTransport.current_next_stop_eta
                        ? new Date(selectedTransport.current_next_stop_eta).toLocaleTimeString(
                            'pt-BR',
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                            },
                          )
                        : '15:18'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Situação</span>
                    <span className="font-bold text-slate-200">
                      {selectedTransport.trip_status === 'EM_ROTA'
                        ? '🚚 Em Rota'
                        : selectedTransport.trip_status}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Condução</span>
                    <span className="font-bold text-sky-400">
                      {selectedTransport.active_actor === 'FRED_IA' ? '🤖 Fred IA' : '👤 Humano'}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Indicador Temporal de Localização (LGPD & Freshness) */}
                <div className="p-3 rounded-lg border bg-slate-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-[#005596]" />
                    <span className="font-bold text-slate-800">
                      {selectedTransport.last_location_name || 'Rodovia BR-381 km 530'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {
                      formatLocationFreshness(selectedTransport.last_location_updated_at)
                        .formattedText
                    }
                  </div>
                </div>

                {/* Mapa Operacional Integrado (Simulação Vetorial Interativa) */}
                <div className="relative h-64 bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col justify-between p-4 text-white">
                  <div className="flex items-center justify-between z-10">
                    <Badge className="bg-slate-800/90 text-sky-400 border border-slate-700 text-[10px]">
                      🗺️ Rota: Matriz CIAFAL → Divinópolis → Betim → BH
                    </Badge>
                    <Badge className="bg-emerald-600/90 text-white text-[10px]">
                      GPS Ativo via WhatsApp Celular
                    </Badge>
                  </div>

                  {/* Simulação visual do mapa e traçado */}
                  <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#005596_1px,transparent_1px)] [background-size:16px_16px]" />
                  <div className="absolute top-1/2 left-8 right-8 h-1 bg-sky-500/50 rounded transform -translate-y-1/2" />

                  {/* Pontos da rota */}
                  <div className="relative z-10 flex items-center justify-between px-4">
                    <div className="text-center">
                      <div className="w-7 h-7 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center text-[10px] font-bold mx-auto shadow-md">
                        ✓
                      </div>
                      <span className="text-[10px] text-slate-300 mt-1 block">CIAFAL</span>
                    </div>

                    <div className="text-center">
                      <div className="w-7 h-7 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center text-[10px] font-bold mx-auto shadow-md">
                        ✓
                      </div>
                      <span className="text-[10px] text-slate-300 mt-1 block">Itaúna</span>
                    </div>

                    <div className="text-center">
                      <div className="w-8 h-8 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center text-xs font-bold mx-auto shadow-lg animate-bounce">
                        🚚
                      </div>
                      <span className="text-[10px] font-bold text-amber-300 mt-1 block">
                        Divinópolis (Atual)
                      </span>
                    </div>

                    <div className="text-center">
                      <div className="w-7 h-7 rounded-full bg-slate-700 border-2 border-slate-500 flex items-center justify-center text-[10px] font-bold mx-auto shadow-md">
                        3
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">Betim (ABC)</span>
                    </div>

                    <div className="text-center">
                      <div className="w-7 h-7 rounded-full bg-slate-700 border-2 border-slate-500 flex items-center justify-center text-[10px] font-bold mx-auto shadow-md">
                        4
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        BH (Minas Perfis)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 z-10 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                    <span>
                      Distância restante: <strong>142 km</strong>
                    </span>
                    <span>
                      Tempo estimado: <strong>2h 15m</strong>
                    </span>
                    <span>
                      Status: <strong className="text-amber-400">🟡 +18m (Obras BR-381)</strong>
                    </span>
                  </div>
                </div>

                {/* Ações Rápidas */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  <Link
                    to={`/tms/transporte/${selectedTransport.sap_transport_number}?tab=conversa`}
                  >
                    <Button
                      size="sm"
                      className="bg-[#005596] hover:bg-[#004275] text-white text-xs font-bold"
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                      Falar com Motorista
                    </Button>
                  </Link>

                  <Link
                    to={`/tms/transporte/${selectedTransport.sap_transport_number}?tab=ocorrencias`}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-bold text-purple-700 border-purple-200 hover:bg-purple-50"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                      Registrar Ocorrência
                    </Button>
                  </Link>

                  <Link
                    to={`/tms/transporte/${selectedTransport.sap_transport_number}?tab=timeline`}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-bold border-slate-300"
                    >
                      <Clock className="w-3.5 h-3.5 mr-1.5" />
                      Ver Linha do Tempo
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-96 flex items-center justify-center bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">
              Selecione um transporte para ver os detalhes da viagem.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default FredControlTowerPage
