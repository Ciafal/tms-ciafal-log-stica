import React, { useState, useEffect } from 'react'
import {
  Layers,
  Truck,
  Building,
  Radio,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Activity,
  FileSpreadsheet,
  Package,
  Calendar,
  Sparkles,
  Bot,
  Zap,
  Phone,
  MessageSquare,
  ShieldCheck,
  Send,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { TmsService } from '@/services/tmsService'
import {
  QueueEntryEntity,
  SapSalesOrderEntity,
  OportunidadeComplementoCargaEntity,
} from '@/domain/rules'
import { Link } from 'react-router-dom'

export const TmsDashboard: React.FC = () => {
  const { user } = useAuth()
  const [orders, setOrders] = useState<SapSalesOrderEntity[]>([])
  const [queueEntries, setQueueEntries] = useState<QueueEntryEntity[]>([])
  const [opportunities, setOpportunities] = useState<ComplementOpportunityEntity[]>([])
  const [cargos, setCargos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersData, queueData, oppsData, cargosData] = await Promise.all([
          TmsService.getSapSalesOrders(),
          TmsService.getOperationalQueue(),
          TmsService.getComplementOpportunities(),
          TmsService.getCargos(),
        ])
        setOrders(ordersData || [])
        setQueueEntries(queueData || [])
        setOpportunities(oppsData || [])
        setCargos(cargosData || [])
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])
  const portaDrivers = queueEntries.filter(
    (q) => q.type === 'PORTA' && !['removido', 'bloqueado'].includes(q.status),
  )
  const foraDrivers = queueEntries.filter(
    (q) => q.type === 'FORA' && !['removido', 'bloqueado'].includes(q.status),
  )
  const progDrivers = queueEntries.filter(
    (q) => q.type === 'PROGRAMADO' && !['removido', 'bloqueado'].includes(q.status),
  )

  const totalCapTodayKg = [...portaDrivers, ...foraDrivers].reduce(
    (acc, q) => acc + (q.vehicle_capacity_kg_cached || 0),
    0,
  )
  const totalCapTomorrowKg = progDrivers.reduce(
    (acc, q) => acc + (q.vehicle_capacity_kg_cached || 0),
    0,
  )

  const readyOrders = orders.filter((o) => o.production_status === 'Pronto')
  const inProdOrders = orders.filter((o) => o.production_status === 'Em Produção')
  const uniqueItinerariesWithDemand = Array.from(
    new Set(orders.map((o) => o.itinerary_code).filter(Boolean)),
  ).length
  const activeMontagemCargos = cargos.filter(
    (c) => c.status === 'Em simulação' || c.status === 'Planejada',
  ).length
  const cargosSemVeiculo = cargos.filter(
    (c) => !c.vehicle_plate || c.vehicle_plate === 'Aguardando alocação',
  ).length

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Painel Geral de Transporte & Logística
            </h1>
            <Badge className="bg-[#005596] text-white text-[10px] font-bold">TMS CIAFAL</Badge>
          </div>
          <p className="text-xs text-slate-500">
            Visão unificada: Disponibilidade de Transporte → Planejamento de Cargas → Gestão de
            Fretes → Execução.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link to="/tms/planejador-cargas">
            <Button
              size="sm"
              className="bg-[#005596] hover:bg-sky-700 text-white text-xs font-bold"
            >
              <Package className="w-3.5 h-3.5 mr-1" />
              Abrir Planejador de Cargas
            </Button>
          </Link>
        </div>
      </div>

      {/* SEÇÃO 1: VISÃO HOJE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#005596]" />
            <span>Operação Hoje (Disponibilidade & Montagem)</span>
          </h2>
          <Badge variant="outline" className="text-xs text-slate-500">
            {new Date().toLocaleDateString('pt-BR')}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Card 1: Motoristas PORTA */}
          <Card className="bg-white border-sky-200 shadow-xs">
            <CardContent className="p-3 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Motoristas PORTA
              </span>
              <strong className="text-2xl font-mono text-[#005596] font-black">
                {portaDrivers.length}
              </strong>
              <div className="text-[10px] text-slate-500">Pátio CIAFAL</div>
            </CardContent>
          </Card>

          {/* Card 2: Motoristas FORA */}
          <Card className="bg-white border-emerald-200 shadow-xs">
            <CardContent className="p-3 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Motoristas FORA
              </span>
              <strong className="text-2xl font-mono text-emerald-600 font-black">
                {foraDrivers.length}
              </strong>
              <div className="text-[10px] text-slate-500">Raio ≤ 60km</div>
            </CardContent>
          </Card>

          {/* Card 3: Capacidade Disponível */}
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Capacidade Hoje
              </span>
              <strong className="text-2xl font-mono text-slate-900 font-black">
                {totalCapTodayKg > 0 ? `${Math.round(totalCapTodayKg / 1000)}t` : '0t'}
              </strong>
              <div className="text-[10px] text-slate-500">PORTA + FORA</div>
            </CardContent>
          </Card>

          {/* Card 4: Pedidos Prontos SAP */}
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Pronto no PCP
              </span>
              <strong className="text-2xl font-mono text-sky-700 font-black">
                {readyOrders.length}
              </strong>
              <div className="text-[10px] text-slate-500">Pedidos Liberados</div>
            </CardContent>
          </Card>

          {/* Card 5: Cargas em Montagem */}
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Cargas em Montagem
              </span>
              <strong className="text-2xl font-mono text-slate-800 font-black">
                {activeMontagemCargos}
              </strong>
              <div className="text-[10px] text-slate-500">Planejador Ativo</div>
            </CardContent>
          </Card>

          {/* Card 6: Cargas Sem Veículo */}
          <Card className="bg-white border-amber-200 shadow-xs">
            <CardContent className="p-3 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-700 block">
                Sem Veículo
              </span>
              <strong className="text-2xl font-mono text-amber-600 font-black">
                {cargosSemVeiculo}
              </strong>
              <div className="text-[10px] text-slate-500">Gaps Atendidos</div>
            </CardContent>
          </Card>

          {/* Card 7: Complementos Possíveis */}
          <Card className="bg-white border-purple-200 shadow-xs">
            <CardContent className="p-3 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-purple-700 block">
                Complementos CRM
              </span>
              <strong className="text-2xl font-mono text-purple-600 font-black">
                {opportunities.length}
              </strong>
              <div className="text-[10px] text-slate-500">Oportunidades</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SEÇÃO 2: VISÃO AMANHÃ & FUTURO */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span>Visão Futura (Programação D+1 e Capacidade Declarada)</span>
          </h2>
          <Link
            to="/tms/programacao-futura"
            className="text-xs text-[#005596] hover:underline font-semibold flex items-center gap-1"
          >
            Ver Matriz Completa <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Disponib. Programada
              </span>
              <strong className="text-2xl font-mono text-purple-700 font-black">
                {progDrivers.length}
              </strong>
              <div className="text-[10px] text-slate-500">Veículos Futuros</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Capacidade Futura
              </span>
              <strong className="text-2xl font-mono text-purple-900 font-black">
                {totalCapTomorrowKg > 0 ? `${Math.round(totalCapTomorrowKg / 1000)}t` : '0t'}
              </strong>
              <div className="text-[10px] text-slate-500">Programados</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Em Produção PCP
              </span>
              <strong className="text-2xl font-mono text-sky-700 font-black">
                {inProdOrders.length}
              </strong>
              <div className="text-[10px] text-slate-500">Liberação Prevista</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Gaps Diagnosticados
              </span>
              <strong className="text-2xl font-mono text-emerald-600 font-black">
                Equilibrado
              </strong>
              <div className="text-[10px] text-slate-500">Matriz Estável</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Itinerários com Demanda
              </span>
              <strong className="text-2xl font-mono text-slate-900 font-black">
                {uniqueItinerariesWithDemand}
              </strong>
              <div className="text-[10px] text-slate-500">Rotas SAP</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Alertas Comerciais
              </span>
              <strong className="text-2xl font-mono text-purple-600 font-black">
                {opportunities.length}
              </strong>
              <div className="text-[10px] text-slate-500">CRM 360° Notificado</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SEÇÃO 3: STATUS DAS INTEGRAÇÕES CORPORATIVAS */}
      <div className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-emerald-600" />
          <span>Monitor de Integrações & Sistemas Conectados</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* SAP ECC 6.0 */}
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">SAP ECC 6.0</span>
                <Badge className="bg-[#005596] text-white text-[9px]">qRFC/RFC</Badge>
              </div>
              <p className="text-[10px] text-slate-500">
                System of Record. Sincronização de TVROT e ZSD35.
              </p>
              <div className="text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Base Sincronizada
              </div>
            </CardContent>
          </Card>

          {/* PCP Robotizado */}
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">PCP Robotizado</span>
                <Badge className="bg-blue-600 text-white text-[9px]">Preparado</Badge>
              </div>
              <p className="text-[10px] text-slate-500">
                Data programada de produção e saldo pronto de materiais.
              </p>
              <div className="text-[9px] text-blue-600 font-bold flex items-center gap-1">
                <Activity className="w-3 h-3" /> Integração Preparada
              </div>
            </CardContent>
          </Card>

          {/* CRM 360° */}
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">CRM 360°</span>
                <Badge className="bg-purple-600 text-white text-[9px]">Preparado</Badge>
              </div>
              <p className="text-[10px] text-slate-500">
                Disparo de alertas de complementos de carga aos vendedores.
              </p>
              <div className="text-[9px] text-purple-600 font-bold flex items-center gap-1">
                <Send className="w-3 h-3" /> Alertas Operacionais
              </div>
            </CardContent>
          </Card>

          {/* Telegram */}
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">Telegram Bot</span>
                <Badge className="bg-sky-500 text-white text-[9px]">Mensageria</Badge>
              </div>
              <p className="text-[10px] text-slate-500">
                Canal direto de avisos para motoristas cadastrados.
              </p>
              <div className="text-[9px] text-sky-600 font-bold flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> Adapter Ativo
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp */}
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">WhatsApp API</span>
                <Badge className="bg-emerald-500 text-white text-[9px]">Mensageria</Badge>
              </div>
              <p className="text-[10px] text-slate-500">
                Comunicação com motoristas e pré-cadastros via link público.
              </p>
              <div className="text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                <Phone className="w-3 h-3" /> Adapter Ativo
              </div>
            </CardContent>
          </Card>

          {/* TARGET */}
          <Card className="bg-white border-slate-200 shadow-xs opacity-75">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">TARGET</span>
                <Badge
                  variant="outline"
                  className="text-[9px] text-amber-700 border-amber-400 bg-amber-50"
                >
                  Em desenvolv.
                </Badge>
              </div>
              <p className="text-[10px] text-slate-500">
                Controle de pátio e agendamento de docas operacionais.
              </p>
              <div className="text-[9px] text-slate-400 font-semibold">Fase Posterior</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
