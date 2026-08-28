import React, { useState } from 'react'
import {
  Navigation,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sliders,
  Award,
  Layers,
  MapPin,
  Clock,
  DollarSign,
  Truck,
  Check,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { routingServiceManager } from '@/domain/routingAdapters'

export type RoutingHomologationStatus =
  | 'Não avaliado'
  | 'Em POC'
  | 'Tecnicamente aprovado'
  | 'Reprovado'
  | 'Homologado CIAFAL'

export interface ProviderPocSpec {
  id: string
  name: string
  truckRouting: 'Disponível' | 'Parcial' | 'Não disponível' | 'A confirmar'
  truckRestrictions: 'Disponível' | 'Parcial' | 'Não disponível' | 'A confirmar'
  geocoding: 'Disponível' | 'Parcial' | 'Não disponível' | 'A confirmar'
  distanceMatrix: 'Disponível' | 'Parcial' | 'Não disponível' | 'A confirmar'
  realTimeTraffic: 'Disponível' | 'Parcial' | 'Não disponível' | 'A confirmar'
  nativeTolls: 'Disponível' | 'Parcial' | 'Não disponível' | 'A confirmar'
  alternativeRoutes: 'Disponível' | 'Parcial' | 'Não disponível' | 'A confirmar'
  brazilCoverage: 'Excelente' | 'Boa' | 'Média' | 'A confirmar'
  sla: '99.9%' | '99.5%' | 'Sem SLA formal' | 'A confirmar'
  costLevel: 'Alto' | 'Médio' | 'Baixo (Zero Licença)'
  stableApi: 'Sim' | 'A confirmar'
  homologationStatus: RoutingHomologationStatus
  lgpdCompliance: 'Disponível' | 'A confirmar'
}

export const RoutingProvidersAdminPage: React.FC = () => {
  const { toast } = useToast()
  const [activeProviderId, setActiveProviderId] = useState<string>(
    routingServiceManager.getActiveAdapter().id,
  )
  const [isTesting, setIsTesting] = useState(false)
  const [selectedRouteId, setSelectedRouteId] = useState<string>('BH')

  // Pesos configuráveis do score (Sprint 4.2: default da diretriz)
  const [weights, setWeights] = useState({
    truckRouting: 25,
    brazilCoverage: 20,
    tollSupport: 15,
    geocoding: 10,
    cost: 10,
    sla: 10,
    performance: 10,
  })

  // Rotas padrão oficiais de homologação conceitual (Item 21)
  const benchmarkRoutes = [
    {
      id: 'BH',
      name: 'CIAFAL Matriz → Grande BH (Betim/MG)',
      origin: { lat: -23.5505, lng: -46.6333, name: 'CIAFAL Matriz (São Paulo/SP)' },
      destination: { lat: -19.9678, lng: -44.1985, city: 'Betim', uf: 'MG' },
      expectedDistanceKm: 575,
      expectedDurationMinutes: 450,
      expectedTollsCount: 8,
    },
    {
      id: 'SP_INTERIOR',
      name: 'CIAFAL Matriz → Interior SP (Campinas/SP)',
      origin: { lat: -23.5505, lng: -46.6333, name: 'CIAFAL Matriz (São Paulo/SP)' },
      destination: { lat: -22.9099, lng: -47.0626, city: 'Campinas', uf: 'SP' },
      expectedDistanceKm: 98,
      expectedDurationMinutes: 85,
      expectedTollsCount: 3,
    },
    {
      id: 'RJ',
      name: 'CIAFAL Matriz → Rio de Janeiro (Duque de Caxias/RJ)',
      origin: { lat: -23.5505, lng: -46.6333, name: 'CIAFAL Matriz (São Paulo/SP)' },
      destination: { lat: -22.7856, lng: -43.3117, city: 'Duque de Caxias', uf: 'RJ' },
      expectedDistanceKm: 435,
      expectedDurationMinutes: 360,
      expectedTollsCount: 5,
    },
    {
      id: 'CENTRO_OESTE_MG',
      name: 'CIAFAL Matriz → Centro-Oeste MG (Divinópolis/MG)',
      origin: { lat: -23.5505, lng: -46.6333, name: 'CIAFAL Matriz (São Paulo/SP)' },
      destination: { lat: -20.1439, lng: -44.8917, city: 'Divinópolis', uf: 'MG' },
      expectedDistanceKm: 510,
      expectedDurationMinutes: 410,
      expectedTollsCount: 6,
    },
    {
      id: 'SUL_MG',
      name: 'CIAFAL Matriz → Sul MG (Pouso Alegre/MG)',
      origin: { lat: -23.5505, lng: -46.6333, name: 'CIAFAL Matriz (São Paulo/SP)' },
      destination: { lat: -22.2301, lng: -45.9364, city: 'Pouso Alegre', uf: 'MG' },
      expectedDistanceKm: 205,
      expectedDurationMinutes: 165,
      expectedTollsCount: 3,
    },
  ]

  // Provedores avaliáveis (Google Maps, HERE, Mapbox, OSRM/OpenStreetMap)
  const [providers, setProviders] = useState<ProviderPocSpec[]>([
    {
      id: 'google_maps',
      name: 'Google Maps Platform (Routes API)',
      truckRouting: 'Parcial', // Não possui restrição de peso/altura fina no Brasil
      truckRestrictions: 'A confirmar',
      geocoding: 'Disponível',
      distanceMatrix: 'Disponível',
      realTimeTraffic: 'Disponível',
      nativeTolls: 'Disponível',
      alternativeRoutes: 'Disponível',
      brazilCoverage: 'Excelente',
      sla: '99.9%',
      costLevel: 'Alto',
      stableApi: 'Sim',
      homologationStatus: 'Homologado CIAFAL',
      lgpdCompliance: 'Disponível',
    },
    {
      id: 'here_technologies',
      name: 'HERE Technologies (HERE Truck Routing)',
      truckRouting: 'Disponível', // Foco forte em logística pesada
      truckRestrictions: 'Disponível',
      geocoding: 'Disponível',
      distanceMatrix: 'Disponível',
      realTimeTraffic: 'Disponível',
      nativeTolls: 'Disponível',
      alternativeRoutes: 'Disponível',
      brazilCoverage: 'Boa',
      sla: '99.9%',
      costLevel: 'Médio',
      stableApi: 'Sim',
      homologationStatus: 'Em POC',
      lgpdCompliance: 'Disponível',
    },
    {
      id: 'mapbox',
      name: 'Mapbox (Directions & Matrix API)',
      truckRouting: 'Parcial',
      truckRestrictions: 'A confirmar',
      geocoding: 'Disponível',
      distanceMatrix: 'Disponível',
      realTimeTraffic: 'Disponível',
      nativeTolls: 'Não disponível',
      alternativeRoutes: 'Disponível',
      brazilCoverage: 'Boa',
      sla: '99.9%',
      costLevel: 'Médio',
      stableApi: 'Sim',
      homologationStatus: 'Em POC',
      lgpdCompliance: 'Disponível',
    },
    {
      id: 'osrm_osm',
      name: 'OSRM / OpenStreetMap (Self-Hosted)',
      truckRouting: 'Não disponível',
      truckRestrictions: 'Não disponível',
      geocoding: 'A confirmar',
      distanceMatrix: 'Disponível',
      realTimeTraffic: 'Não disponível',
      nativeTolls: 'Não disponível',
      alternativeRoutes: 'Disponível',
      brazilCoverage: 'Média',
      sla: 'Sem SLA formal',
      costLevel: 'Baixo (Zero Licença)',
      stableApi: 'Sim',
      homologationStatus: 'Em POC',
      lgpdCompliance: 'Disponível',
    },
  ])

  // Registro de execuções de testes do POC por provedor
  const [testRecords, setTestRecords] = useState<any[]>([
    {
      id: 'poc-run-01',
      providerId: 'google_maps',
      providerName: 'Google Maps Platform',
      routeId: 'BH',
      routeName: 'CIAFAL Matriz → Grande BH (Betim/MG)',
      calculatedKm: 576.4,
      durationMinutes: 442,
      tollIdentified: true,
      tollValueEst: 142.5,
      responseTimeMs: 340,
      isValidRoute: true,
      evaluator: 'Engenharia Logística TMS',
      notes: 'Traçado de alta fidelidade pela Rodovia Fernão Dias (BR-381). Sem incidentes.',
      executedAt: new Date().toISOString(),
    },
  ])

  // Cálculo de Score Ponderado
  const calculateScore = (p: ProviderPocSpec) => {
    let score = 0
    // Truck routing (peso)
    if (p.truckRouting === 'Disponível') score += weights.truckRouting
    else if (p.truckRouting === 'Parcial') score += weights.truckRouting * 0.6
    else if (p.truckRouting === 'A confirmar') score += weights.truckRouting * 0.3

    // Cobertura Brasil
    if (p.brazilCoverage === 'Excelente') score += weights.brazilCoverage
    else if (p.brazilCoverage === 'Boa') score += weights.brazilCoverage * 0.75
    else if (p.brazilCoverage === 'Média') score += weights.brazilCoverage * 0.5

    // Suporte a pedágio nativo
    if (p.nativeTolls === 'Disponível') score += weights.tollSupport
    else if (p.nativeTolls === 'Parcial') score += weights.tollSupport * 0.5

    // Geocoding
    if (p.geocoding === 'Disponível') score += weights.geocoding
    else if (p.geocoding === 'A confirmar') score += weights.geocoding * 0.4

    // Custo
    if (p.costLevel === 'Baixo (Zero Licença)') score += weights.cost
    else if (p.costLevel === 'Médio') score += weights.cost * 0.7
    else score += weights.cost * 0.4

    // SLA
    if (p.sla === '99.9%') score += weights.sla
    else if (p.sla === '99.5%') score += weights.sla * 0.7

    // Performance / Estabilidade
    if (p.stableApi === 'Sim') score += weights.performance

    return Math.round(score)
  }

  const handleSelectActiveProvider = (provId: string, status: RoutingHomologationStatus) => {
    if (status !== 'Homologado CIAFAL') {
      toast({
        variant: 'destructive',
        title: 'Provedor Não Homologado',
        description: `O provedor selecionado está com status "${status}". Somente provedores com status "HOMOLOGADO CIAFAL" podem ser ativados em produção.`,
      })
      return
    }
    routingServiceManager.setActiveProvider(provId)
    setActiveProviderId(provId)
    toast({
      title: 'Provedor Ativo Atualizado',
      description: `O provedor ${routingServiceManager.getActiveAdapter().name} agora é o provedor ativo de roteirização.`,
    })
  }

  const handleRunPocTest = async (providerId: string) => {
    setIsTesting(true)
    const benchmark = benchmarkRoutes.find((r) => r.id === selectedRouteId) || benchmarkRoutes[0]
    const prov = providers.find((p) => p.id === providerId)

    try {
      const startTime = performance.now()
      // Simula / calcula rota com o adapter
      const origin = {
        latitude: benchmark.origin.lat,
        longitude: benchmark.origin.lng,
        name: benchmark.origin.name,
      }
      const destinations = [
        {
          orderIndex: 1,
          customerCode: 'CLI-POC-01',
          customerName: `Destino Homologação ${benchmark.destination.city}`,
          address: {
            rawAddress: 'Área Industrial',
            city: benchmark.destination.city,
            uf: benchmark.destination.uf,
            latitude: benchmark.destination.lat,
            longitude: benchmark.destination.lng,
            precision: 'ROOFTOP' as const,
            confidencePct: 95,
            providerUsed: prov?.name || providerId,
            isCached: false,
            timestamp: new Date().toISOString(),
            status: 'VALIDADO' as const,
          },
          weightKg: 25000,
        },
      ]

      const routeResult = await routingServiceManager.calculate(origin, destinations)
      const endTime = performance.now()
      const responseTimeMs = Math.round(endTime - startTime)

      const diffKm = Math.abs(routeResult.totalDistanceKm - benchmark.expectedDistanceKm)
      const isValidRoute = diffKm <= 40 // Tolerância de até 40km na rota pesada

      const newRecord = {
        id: `poc-run-${Date.now().toString().slice(-4)}`,
        providerId,
        providerName: prov?.name || providerId,
        routeId: benchmark.id,
        routeName: benchmark.name,
        calculatedKm: routeResult.totalDistanceKm,
        durationMinutes: routeResult.totalDurationMinutes,
        tollIdentified: prov?.nativeTolls === 'Disponível',
        tollValueEst:
          prov?.nativeTolls === 'Disponível' ? Math.round(routeResult.totalDistanceKm * 0.25) : 0,
        responseTimeMs,
        isValidRoute,
        evaluator: 'Auditor Técnico TMS CIAFAL',
        notes: `Execução de teste comparativo. Diferença de ${Math.round(diffKm)} km em relação ao referencial (${benchmark.expectedDistanceKm} km).`,
        executedAt: new Date().toISOString(),
      }

      setTestRecords((prev) => [newRecord, ...prev])

      toast({
        title: 'Teste de POC Executado',
        description: `Resultado para ${prov?.name}: ${routeResult.totalDistanceKm} km (${responseTimeMs}ms). Rota ${isValidRoute ? 'VÁLIDA' : 'FORA DA TOLERÂNCIA'}.`,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha no Teste de POC',
        description: err?.message || 'Erro ao processar rota de teste.',
      })
    } finally {
      setIsTesting(false)
    }
  }

  const getStatusBadge = (status: RoutingHomologationStatus) => {
    switch (status) {
      case 'Homologado CIAFAL':
        return <Badge className="bg-emerald-600 text-white font-bold">HOMOLOGADO CIAFAL</Badge>
      case 'Tecnicamente aprovado':
        return <Badge className="bg-blue-600 text-white">Tecnicamente Aprovado</Badge>
      case 'Em POC':
        return <Badge className="bg-sky-600 text-white">Em POC / Avaliação</Badge>
      case 'Não avaliado':
        return <Badge className="bg-slate-400 text-white">Não avaliado</Badge>
      case 'Reprovado':
        return <Badge className="bg-rose-600 text-white">Reprovado</Badge>
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <Navigation className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              POC Comparativo de Providers de Rota & Roteirização Pesada
            </h1>
            <Badge className="bg-[#005596] text-white text-xs">Sprint 4.2</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Matriz de decisão multicritério com pesos configuráveis, rotas padrão de homologação e
            separação de TollProvider.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Badge className="bg-emerald-600 text-white font-mono text-xs">
            Ativo: {routingServiceManager.getActiveAdapter().name}
          </Badge>
        </div>
      </div>

      {/* Corporate Guidance Banner */}
      <div className="bg-slate-900 text-white p-4 rounded-xl text-xs space-y-2 border border-slate-800 shadow-md">
        <div className="flex items-center space-x-2 text-sky-400 font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>DIRETRIZES MANDATÓRIAS DO POC DE ROTAS & TRANSPORTE PESADO:</span>
        </div>
        <ul className="text-slate-300 list-disc list-inside space-y-1">
          <li>
            <strong>Decisão Humana Soberana:</strong> O sistema calcula o score ponderado
            automaticamente, mas a decisão final é exclusivamente humana.
          </li>
          <li>
            <strong>Sem Capability Fictícia:</strong> Onde não houver evidência técnica confirmada
            para caminhões pesados, o item é mantido como <em>"A confirmar"</em>.
          </li>
          <li>
            <strong>Apenas Homologados em Produção:</strong> Somente provedores com status formal{' '}
            <strong>"HOMOLOGADO CIAFAL"</strong> podem ser ativados em ambiente produtivo.
          </li>
        </ul>
      </div>

      <Tabs defaultValue="matriz" className="w-full">
        <TabsList className="bg-slate-200/80 p-1">
          <TabsTrigger value="matriz" className="text-xs font-semibold">
            1. Matriz Comparativa & Scores (11 Critérios)
          </TabsTrigger>
          <TabsTrigger value="rotas" className="text-xs font-semibold">
            2. Rotas Padrão de Homologação (5 Destinos)
          </TabsTrigger>
          <TabsTrigger value="execucao" className="text-xs font-semibold">
            3. Registro de Testes do POC ({testRecords.length})
          </TabsTrigger>
          <TabsTrigger value="pesos" className="text-xs font-semibold">
            4. Pesos & Parâmetros de Avaliação
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: MATRIZ COMPARATIVA E CARDS */}
        <TabsContent value="matriz" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {providers.map((p) => {
              const score = calculateScore(p)
              const isSelected = activeProviderId === p.id

              return (
                <Card
                  key={p.id}
                  className={`border-2 transition flex flex-col justify-between ${
                    isSelected ? 'border-[#005596] bg-sky-50/30 shadow-md' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <CardHeader className="p-4 pb-2 bg-slate-50/50 border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-slate-400 font-bold uppercase">
                          {p.id}
                        </span>
                        {getStatusBadge(p.homologationStatus)}
                      </div>
                      <CardTitle className="text-sm font-bold text-slate-900 mt-1">
                        {p.name}
                      </CardTitle>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-slate-500 font-semibold">
                          Score Ponderado:
                        </span>
                        <Badge className="bg-slate-900 text-white font-mono text-xs font-black">
                          {score} / 100 pts
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Truck Routing:</span>
                        <span
                          className={`font-semibold ${p.truckRouting === 'Disponível' ? 'text-emerald-700' : 'text-slate-700'}`}
                        >
                          {p.truckRouting}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Restrições Pesado:</span>
                        <span className="font-semibold text-slate-700">{p.truckRestrictions}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Geocoding:</span>
                        <span className="font-semibold text-slate-700">{p.geocoding}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Matriz Distância:</span>
                        <span className="font-semibold text-slate-700">{p.distanceMatrix}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Trânsito Real:</span>
                        <span className="font-semibold text-slate-700">{p.realTimeTraffic}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Pedágio Nativo:</span>
                        <span className="font-semibold text-slate-700">{p.nativeTolls}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Rotas Alternativas:</span>
                        <span className="font-semibold text-slate-700">{p.alternativeRoutes}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Cobertura Brasil:</span>
                        <span className="font-semibold text-slate-700">{p.brazilCoverage}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">SLA Contratual:</span>
                        <span className="font-semibold text-slate-700">{p.sla}</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span className="text-slate-500">Nível de Custo:</span>
                        <span className="font-semibold text-slate-700">{p.costLevel}</span>
                      </div>
                    </CardContent>
                  </div>

                  <div className="p-4 pt-0 space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs gap-1"
                      disabled={isTesting}
                      onClick={() => handleRunPocTest(p.id)}
                    >
                      <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                      Executar Teste POC
                    </Button>
                    <Button
                      variant={isSelected ? 'default' : 'secondary'}
                      size="sm"
                      className={`w-full text-xs ${isSelected ? 'bg-[#005596]' : ''}`}
                      onClick={() => handleSelectActiveProvider(p.id, p.homologationStatus)}
                    >
                      {isSelected ? '✓ Provedor Ativo' : 'Definir como Ativo'}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* TAB 2: ROTAS PADRÃO DE HOMOLOGAÇÃO */}
        <TabsContent value="rotas" className="space-y-4 mt-4">
          <Card className="border-slate-200">
            <CardHeader className="p-4 bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                Rotas Oficiais de Benchmark e Calibração
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Traçados pré-definidos para comparar distância, tempo de trânsito e praças de
                pedágio entre os provedores.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-200">
                {benchmarkRoutes.map((r) => (
                  <div
                    key={r.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 cursor-pointer ${
                      selectedRouteId === r.id ? 'bg-sky-50/60' : ''
                    }`}
                    onClick={() => setSelectedRouteId(r.id)}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-[#005596]">{r.id}</span>
                        <h4 className="font-bold text-slate-900 text-sm">{r.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Origem: {r.origin.name} → Destino: {r.destination.city}/{r.destination.uf}
                      </p>
                    </div>

                    <div className="flex items-center space-x-4 text-xs font-mono">
                      <div className="bg-slate-100 px-2.5 py-1 rounded">
                        <span className="text-slate-500">Distância: </span>
                        <strong>{r.expectedDistanceKm} km</strong>
                      </div>
                      <div className="bg-slate-100 px-2.5 py-1 rounded">
                        <span className="text-slate-500">Duração: </span>
                        <strong>
                          {Math.round(r.expectedDurationMinutes / 60)}h{' '}
                          {r.expectedDurationMinutes % 60}m
                        </strong>
                      </div>
                      <div className="bg-slate-100 px-2.5 py-1 rounded">
                        <span className="text-slate-500">Praças: </span>
                        <strong>{r.expectedTollsCount}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: REGISTRO DE TESTES */}
        <TabsContent value="execucao" className="space-y-4 mt-4">
          <Card className="border-slate-200">
            <CardHeader className="p-4 bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                Histórico de Execuções e Testes Comparativos
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Registros com telemetria de latência, tolerância de traçado e validação por usuário
                técnico.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase">
                      <th className="p-3">Data/Hora</th>
                      <th className="p-3">Provedor</th>
                      <th className="p-3">Rota Avaliada</th>
                      <th className="p-3">Distância (km)</th>
                      <th className="p-3">Tempo Resposta</th>
                      <th className="p-3">Pedágio</th>
                      <th className="p-3">Resultado</th>
                      <th className="p-3">Avaliador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {testRecords.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-500">
                          {new Date(t.executedAt).toLocaleTimeString()}
                        </td>
                        <td className="p-3 font-sans font-bold text-slate-900">{t.providerName}</td>
                        <td className="p-3 font-sans text-slate-700">{t.routeName}</td>
                        <td className="p-3 font-bold text-[#005596]">{t.calculatedKm} km</td>
                        <td className="p-3 text-slate-600">{t.responseTimeMs} ms</td>
                        <td className="p-3 text-slate-700 font-sans">
                          {t.tollIdentified ? `R$ ${t.tollValueEst}` : 'Não fornecido'}
                        </td>
                        <td className="p-3">
                          <Badge
                            className={
                              t.isValidRoute
                                ? 'bg-emerald-600 text-white'
                                : 'bg-rose-600 text-white'
                            }
                          >
                            {t.isValidRoute ? 'VÁLIDA' : 'DESVIO EXCESSIVO'}
                          </Badge>
                        </td>
                        <td className="p-3 font-sans text-slate-500">{t.evaluator}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: CONFIGURAÇÃO DE PESOS */}
        <TabsContent value="pesos" className="space-y-4 mt-4">
          <Card className="border-slate-200">
            <CardHeader className="p-4 bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                Ponderação Multicritério do Score de Roteirização
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Ajuste a importância relativa dos critérios. A soma recomendada é 100%.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Truck Routing / Peso Pesado (%):
                  </label>
                  <Input
                    type="number"
                    value={weights.truckRouting}
                    onChange={(e) =>
                      setWeights({ ...weights, truckRouting: Number(e.target.value) })
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Cobertura da Malha Brasil (%):
                  </label>
                  <Input
                    type="number"
                    value={weights.brazilCoverage}
                    onChange={(e) =>
                      setWeights({ ...weights, brazilCoverage: Number(e.target.value) })
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pedágio Nativo (%):</label>
                  <Input
                    type="number"
                    value={weights.tollSupport}
                    onChange={(e) =>
                      setWeights({ ...weights, tollSupport: Number(e.target.value) })
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Precisão Geocoding (%):
                  </label>
                  <Input
                    type="number"
                    value={weights.geocoding}
                    onChange={(e) => setWeights({ ...weights, geocoding: Number(e.target.value) })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Custo por Transação (%):
                  </label>
                  <Input
                    type="number"
                    value={weights.cost}
                    onChange={(e) => setWeights({ ...weights, cost: Number(e.target.value) })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    SLA & Disponibilidade (%):
                  </label>
                  <Input
                    type="number"
                    value={weights.sla}
                    onChange={(e) => setWeights({ ...weights, sla: Number(e.target.value) })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Performance / Latência (%):
                  </label>
                  <Input
                    type="number"
                    value={weights.performance}
                    onChange={(e) =>
                      setWeights({ ...weights, performance: Number(e.target.value) })
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <span className="font-bold text-slate-900">
                  Soma Total dos Pesos: {Object.values(weights).reduce((a, b) => a + b, 0)}%
                </span>
                <Button
                  size="sm"
                  onClick={() =>
                    toast({
                      title: 'Pesos Atualizados',
                      description:
                        'Scores recalculados com sucesso com a nova matriz de ponderação.',
                    })
                  }
                  className="bg-[#005596] text-xs h-8"
                >
                  Salvar Parâmetros
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
export default RoutingProvidersAdminPage
