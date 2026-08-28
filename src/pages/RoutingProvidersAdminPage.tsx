import React, { useState } from 'react'
import {
  Navigation,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  MapPin,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  routingServiceManager,
  RoutingProviderFeatureEvaluation,
  RoutingHomologationStatus,
} from '@/domain/routingAdapters'

export const RoutingProvidersAdminPage: React.FC = () => {
  const { toast } = useToast()
  const [activeProviderId, setActiveProviderId] = useState(routingServiceManager.activeId)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  const providersEvaluations: RoutingProviderFeatureEvaluation[] = [
    {
      id: 'google_maps',
      name: 'Google Maps Platform',
      coverageBrazil: 'Disponível',
      heavyVehicleRouting: 'Disponível',
      truckRestrictions: 'Disponível',
      alternativeRoutes: 'Disponível',
      geocodingPrecision: 'Disponível',
      distanceMatrix: 'Disponível',
      realTimeTraffic: 'Disponível',
      costEstimate: 'USD 5.00 / 1k req',
      slaPct: '99.9%',
      requestLimit: '100 req/s',
      supportLevel: 'Enterprise Google Cloud',
      tollSupport: 'Disponível',
      lgpdCompliance: 'Disponível',
      externalDataTransfer: 'Sim',
      homologationStatus: 'Homologado',
    },
    {
      id: 'here_maps',
      name: 'HERE Technologies (Truck Routing)',
      coverageBrazil: 'Disponível',
      heavyVehicleRouting: 'Disponível',
      truckRestrictions: 'Disponível',
      alternativeRoutes: 'Disponível',
      geocodingPrecision: 'Disponível',
      distanceMatrix: 'Disponível',
      realTimeTraffic: 'Disponível',
      costEstimate: 'EUR 4.50 / 1k req',
      slaPct: '99.9%',
      requestLimit: '80 req/s',
      supportLevel: 'Dedicated Account',
      tollSupport: 'Disponível',
      lgpdCompliance: 'Disponível',
      externalDataTransfer: 'Sim',
      homologationStatus: 'POC',
    },
    {
      id: 'mapbox',
      name: 'Mapbox Directions',
      coverageBrazil: 'Disponível',
      heavyVehicleRouting: 'A confirmar',
      truckRestrictions: 'A confirmar',
      alternativeRoutes: 'Disponível',
      geocodingPrecision: 'Disponível',
      distanceMatrix: 'Disponível',
      realTimeTraffic: 'Disponível',
      costEstimate: 'USD 4.00 / 1k req',
      slaPct: '99.9%',
      requestLimit: '60 req/s',
      supportLevel: 'Standard Support',
      tollSupport: 'Não disponível',
      lgpdCompliance: 'Disponível',
      externalDataTransfer: 'Sim',
      homologationStatus: 'Em avaliação',
    },
    {
      id: 'osrm_osm',
      name: 'OSRM / OpenStreetMap (Self-Hosted)',
      coverageBrazil: 'Disponível',
      heavyVehicleRouting: 'Não disponível',
      truckRestrictions: 'Não disponível',
      alternativeRoutes: 'Disponível',
      geocodingPrecision: 'A confirmar',
      distanceMatrix: 'Disponível',
      realTimeTraffic: 'Não disponível',
      costEstimate: 'Zero Licença (Infra Própria)',
      slaPct: 'Infra Interna CIAFAL',
      requestLimit: 'Ilimitado Local',
      supportLevel: 'Equipe Interna TI',
      tollSupport: 'Não disponível',
      lgpdCompliance: 'Disponível',
      externalDataTransfer: 'Não',
      homologationStatus: 'Em avaliação',
    },
  ]

  const handleSelectActiveProvider = (provId: string, status: RoutingHomologationStatus) => {
    if (status !== 'Homologado') {
      toast({
        variant: 'destructive',
        title: 'Provedor Não Homologado',
        description: `O provedor selecionado está com status "${status}". Somente provedores HOMOLOGADOS podem ser ativados para cálculo oficial de produção.`,
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

  const handleTestRoute = async () => {
    setIsTesting(true)
    try {
      const origin = {
        latitude: -23.5505,
        longitude: -46.6333,
        name: 'CIAFAL Matriz (São Paulo/SP)',
      }
      const destinations = [
        {
          orderIndex: 1,
          customerCode: 'CLI-MG-01',
          customerName: 'Metalúrgica Betim (Destino Teste Conhecido)',
          address: {
            rawAddress: 'Av. das Indústrias, 1000',
            city: 'Betim',
            uf: 'MG',
            latitude: -19.9678,
            longitude: -44.1985,
            precision: 'ROOFTOP' as const,
            confidencePct: 95,
            providerUsed: routingServiceManager.getActiveAdapter().name,
            isCached: false,
            timestamp: new Date().toISOString(),
            status: 'VALIDADO' as const,
          },
          weightKg: 25000,
        },
      ]

      const route = await routingServiceManager.calculate(origin, destinations)
      const expectedDistKm = 575
      const diffKm = Math.abs(route.totalDistanceKm - expectedDistKm)
      const isApproved = diffKm <= 35 // Tolerância de até 35km

      setTestResult({
        provider: route.providerName,
        origin: 'CIAFAL Matriz (São Paulo/SP)',
        destination: 'Betim/MG (Destino Conhecido)',
        expectedDistKm,
        calculatedDistKm: route.totalDistanceKm,
        differenceKm: Math.round(diffKm * 10) / 10,
        durationMinutes: route.totalDurationMinutes,
        isApproved,
        timestamp: new Date().toISOString(),
      })

      toast({
        title: 'Teste de Rota Executado',
        description: `Distância calculada: ${route.totalDistanceKm} km (Diferença: ${Math.round(diffKm)} km). Status: ${isApproved ? 'Aprovado' : 'Reprovado'}.`,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha no Teste de Rota',
        description: err?.message || 'Erro ao calcular rota de teste.',
      })
    } finally {
      setIsTesting(false)
    }
  }

  const getStatusBadge = (status: RoutingHomologationStatus) => {
    switch (status) {
      case 'Homologado':
        return <Badge className="bg-emerald-600 text-white">Homologado</Badge>
      case 'POC':
        return <Badge className="bg-sky-600 text-white">POC / Piloto</Badge>
      case 'Em avaliação':
        return <Badge className="bg-amber-500 text-white">Em avaliação</Badge>
      case 'Rejeitado':
        return <Badge className="bg-rose-600 text-white">Rejeitado</Badge>
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
              Provedores de Rota & Roteirização Pesada
            </h1>
            <Badge className="bg-[#005596] text-white text-xs">Administração de Rotas</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Matriz de avaliação, conformidade LGPD, restrição para caminhões e homologação de
            provedores.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Badge className="bg-emerald-600 text-white font-mono text-xs">
            Ativo: {routingServiceManager.getActiveAdapter().name}
          </Badge>
          <Button
            size="sm"
            onClick={handleTestRoute}
            disabled={isTesting}
            className="text-xs bg-[#005596] hover:bg-[#004070] gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            Testar Rota (CIAFAL → Betim/MG)
          </Button>
        </div>
      </div>

      {/* Corporate Rule Banner */}
      <div className="bg-slate-900 text-white p-4 rounded-xl text-xs space-y-2 border border-slate-800 shadow-md">
        <div className="flex items-center space-x-2 text-sky-400 font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>DIRETRIZ DE HOMOLOGAÇÃO DE PROVEDORES DE ROTA:</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          O TMS desacopla o domínio logístico via <code>RoutingProviderAdapter</code>. O sistema{' '}
          <strong>NÃO escolhe provedor automaticamente</strong>. Somente provedores formalmente com
          status <strong>"HOMOLOGADO"</strong> podem ser utilizados na geração de rotas produtivas.
          O OSRM/OpenStreetMap possui características distintas (sem trânsito e sem cálculo
          específico de peso/eixos nativo) e é avaliado com critérios próprios.
        </p>
      </div>

      {/* Test Result Alert if executed */}
      {testResult && (
        <div
          className={`border rounded-xl p-4 text-xs space-y-2 ${testResult.isApproved ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'}`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Resultado do Teste de Qualidade da Rota ({testResult.provider})
            </span>
            <Badge
              className={
                testResult.isApproved ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }
            >
              {testResult.isApproved ? 'APROVADO' : 'REPROVADO'}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] pt-1">
            <div>Origem: {testResult.origin}</div>
            <div>Destino: {testResult.destination}</div>
            <div>Distância Esperada: {testResult.expectedDistKm} km</div>
            <div>
              Distância Calculada: {testResult.calculatedDistKm} km (Dif: {testResult.differenceKm}{' '}
              km)
            </div>
          </div>
          <p className="text-[11px] opacity-90">
            * Este teste é executado em memória e NÃO é gravado como rota oficial até homologação
            formal.
          </p>
        </div>
      )}

      {/* Comparative Cards Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {providersEvaluations.map((p) => {
          const isSelected = activeProviderId === p.id
          return (
            <Card
              key={p.id}
              className={`border-2 transition-all ${isSelected ? 'border-[#005596] bg-sky-50/40 shadow-md' : 'border-slate-200'}`}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-900 leading-tight">
                    {p.name}
                  </CardTitle>
                  {getStatusBadge(p.homologationStatus)}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2 text-xs">
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Caminhões Pesados:</span>
                    <span className="font-semibold">{p.heavyVehicleRouting}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Restrições de Peso:</span>
                    <span className="font-semibold">{p.truckRestrictions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Trânsito em Tempo Real:</span>
                    <span className="font-semibold">{p.realTimeTraffic}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Aderência LGPD:</span>
                    <span className="font-semibold">{p.lgpdCompliance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Envio Dados Externos:</span>
                    <span className="font-semibold">{p.externalDataTransfer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Custo Estimado:</span>
                    <span className="font-semibold">{p.costEstimate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">SLA Contratual:</span>
                    <span className="font-semibold">{p.slaPct}</span>
                  </div>
                </div>

                <Button
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  className={`w-full mt-2 text-xs ${isSelected ? 'bg-[#005596]' : ''}`}
                  onClick={() => handleSelectActiveProvider(p.id, p.homologationStatus)}
                >
                  {isSelected ? 'Provedor Ativo' : 'Ativar Provedor'}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
