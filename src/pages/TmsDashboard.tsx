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
import { KpiCard, IntegrationCard, SectionHeader } from '@/components/ui-custom'
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
  const [opportunities, setOpportunities] = useState<OportunidadeComplementoCargaEntity[]>([])
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
        <SectionHeader
          title="Operação Hoje (Disponibilidade & Montagem)"
          icon={Calendar}
          iconColor="text-[#005596]"
          badge={new Date().toLocaleDateString('pt-BR')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {/* Card 1: Motoristas PORTA */}
          <KpiCard
            title="Motoristas PORTA"
            value={portaDrivers.length}
            description="Pátio CIAFAL"
            variant="highlight"
            status="Presente"
            statusColor="blue"
          />

          {/* Card 2: Motoristas FORA */}
          <KpiCard
            title="Motoristas FORA"
            value={foraDrivers.length}
            description="Raio ≤ 60 km"
            variant="success"
            status="Em raio"
            statusColor="emerald"
          />

          {/* Card 3: Capacidade Disponível */}
          <KpiCard
            title="Capacidade Hoje"
            value={
              totalCapTodayKg > 0
                ? (totalCapTodayKg / 1000).toLocaleString('pt-BR', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 1,
                  })
                : '0'
            }
            unit="t"
            description="PORTA + FORA"
            variant="default"
          />

          {/* Card 4: Pedidos Prontos SAP */}
          <KpiCard
            title="Pronto no PCP"
            value={readyOrders.length}
            description="Pedidos Liberados"
            variant="sky"
            status="Liberados"
            statusColor="sky"
          />

          {/* Card 5: Cargas em Montagem */}
          <KpiCard
            title="Cargas em Montagem"
            value={activeMontagemCargos}
            description="Planejador Ativo"
            variant="default"
          />

          {/* Card 6: Cargas Sem Veículo */}
          <KpiCard
            title="Sem Veículo"
            value={cargosSemVeiculo}
            description="Aguardando Veículo"
            variant="warning"
            status={cargosSemVeiculo > 0 ? 'Atenção' : 'Normal'}
            statusColor={cargosSemVeiculo > 0 ? 'amber' : 'emerald'}
          />

          {/* Card 7: Complementos Possíveis */}
          <KpiCard
            title="Complementos CRM"
            value={opportunities.length}
            description="Oportunidades"
            variant="purple"
            status="Avisados"
            statusColor="purple"
          />
        </div>
      </div>

      {/* SEÇÃO 2: VISÃO AMANHÃ & FUTURO */}
      <div className="space-y-3">
        <SectionHeader
          title="Visão Futura (Programação D+1 e Capacidade Declarada)"
          icon={TrendingUp}
          iconColor="text-purple-600"
          action={
            <Link
              to="/tms/programacao-futura"
              className="text-xs text-[#005596] hover:underline font-semibold flex items-center gap-1 shrink-0"
            >
              Ver Matriz Completa <ArrowRight className="w-3 h-3" />
            </Link>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Card 1: Disponibilidade Programada */}
          <KpiCard
            title="Disponibilidade Programada"
            value={progDrivers.length}
            description="Veículos Futuros"
            variant="purple"
          />

          {/* Card 2: Capacidade Futura */}
          <KpiCard
            title="Capacidade Futura"
            value={
              totalCapTomorrowKg > 0
                ? (totalCapTomorrowKg / 1000).toLocaleString('pt-BR', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 1,
                  })
                : '0'
            }
            unit="t"
            description="Programados D+1"
            variant="purple"
          />

          {/* Card 3: Em Produção PCP */}
          <KpiCard
            title="Em Produção PCP"
            value={inProdOrders.length}
            description="Liberação Prevista"
            variant="sky"
          />

          {/* Card 4: GAPS DIAGNOSTICADOS (Corrigido com texto e layout seguros) */}
          <KpiCard
            title="Gaps Diagnosticados"
            value="Equilibrado"
            description="Matriz Estável"
            variant="success"
            status="Normal"
            statusColor="emerald"
            tooltip="Balanço entre demanda SAP e oferta de veículos equilibrado no período."
          />

          {/* Card 5: Itinerários com Demanda */}
          <KpiCard
            title="Itinerários com Demanda"
            value={uniqueItinerariesWithDemand}
            description="Rotas Ativas SAP"
            variant="default"
          />

          {/* Card 6: Alertas Comerciais */}
          <KpiCard
            title="Alertas Comerciais"
            value={opportunities.length}
            description="CRM 360° Notificado"
            variant="purple"
          />
        </div>
      </div>

      {/* SEÇÃO 3: STATUS DAS INTEGRAÇÕES CORPORATIVAS */}
      <div className="space-y-3">
        <SectionHeader
          title="Monitor de Integrações & Sistemas Conectados"
          icon={Activity}
          iconColor="text-emerald-600"
          action={
            <Link
              to="/tms/monitor-integracoes"
              className="text-xs text-[#005596] hover:underline font-semibold flex items-center gap-1 shrink-0"
            >
              Ver Central de Integrações <ArrowRight className="w-3 h-3" />
            </Link>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* SAP ECC 6.0 */}
          <IntegrationCard
            systemName="SAP ECC 6.0"
            integrationType="qRFC / RFC"
            typeBadgeColor="bg-[#005596] text-white"
            description="System of Record oficial. Sincronização de TVROT e ZSD35."
            status="Conectado"
            statusLabel="Sincronizado"
            statusDetails="TVROT / ZSD35"
          />

          {/* PCP Robotizado */}
          <IntegrationCard
            systemName="PCP Robotizado"
            integrationType="Preparado"
            typeBadgeColor="bg-blue-600 text-white"
            description="Data programada de produção e saldo pronto de materiais."
            status="Preparado"
            statusLabel="Preparado"
            statusDetails="MB52 + PCP"
          />

          {/* CRM 360° */}
          <IntegrationCard
            systemName="CRM 360°"
            integrationType="Preparado"
            typeBadgeColor="bg-purple-600 text-white"
            description="Disparo de alertas de complementos de carga aos vendedores."
            status="Preparado"
            statusLabel="Alertas Ativos"
            statusDetails="CRM Loop"
          />

          {/* Telegram */}
          <IntegrationCard
            systemName="Telegram Bot"
            integrationType="Mensageria"
            typeBadgeColor="bg-sky-500 text-white"
            description="Canal direto de avisos para motoristas cadastrados."
            status="Conectado"
            statusLabel="Adapter Ativo"
            statusDetails="Bot API"
          />

          {/* WhatsApp */}
          <IntegrationCard
            systemName="WhatsApp API"
            integrationType="Mensageria"
            typeBadgeColor="bg-emerald-600 text-white"
            description="Comunicação com motoristas e pré-cadastros via link público."
            status="Conectado"
            statusLabel="Adapter Ativo"
            statusDetails="Link Público"
          />

          {/* TARGET */}
          <IntegrationCard
            systemName="TARGET"
            integrationType="Em desenvolv."
            typeBadgeColor="bg-amber-100 text-amber-800 border-amber-300 border"
            description="Controle de pátio e agendamento de docas operacionais."
            status="Atenção"
            statusLabel="Em desenvolv."
            statusDetails="Fase Posterior"
            disabled
          />
        </div>
      </div>
    </div>
  )
}
