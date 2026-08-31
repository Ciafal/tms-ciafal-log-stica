import React, { useState, useEffect } from 'react'
import {
  Layers,
  Truck,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Box,
  ArrowDown,
  ArrowRight,
  ShieldCheck,
  Building2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import { generateWmsLoadingMap, WmsVehicleLoadingLayout } from '@/domain/wmsEngine'

export const WmsLoadingMapPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [cargos, setCargos] = useState<any[]>([])
  const [selectedCargoId, setSelectedCargoId] = useState<string>('')
  const [loadingLayout, setLoadingLayout] = useState<WmsVehicleLoadingLayout | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCargos = async () => {
      setLoading(true)
      try {
        const list = await TmsService.getCargos()
        setCargos(list || [])
        if (list && list.length > 0) {
          setSelectedCargoId(list[0].id)
        }
      } catch (err: any) {
        toast({
          title: 'Aviso WMS',
          description: 'Aguardando sincronização de cargas.',
        })
      } finally {
        setLoading(false)
      }
    }
    loadCargos()
  }, [])

  useEffect(() => {
    if (!selectedCargoId) {
      setLoadingLayout(null)
      return
    }
    const cargo = cargos.find((c) => c.id === selectedCargoId)
    if (!cargo) {
      setLoadingLayout(null)
      return
    }

    const payloadOrders = Array.isArray(cargo.orders_payload) ? cargo.orders_payload : []
    const mappedOrders = payloadOrders.map((o: any, idx: number) => ({
      id: o.id || `ORD-${idx + 1}`,
      order_number: o.order_number || `PED-${idx + 1}`,
      customer_code: o.customer_code || 'CLI-001',
      customer_name: o.customer_name || 'Cliente',
      destination_city: o.destination_city || 'Destino',
      uf: o.uf || 'SP',
      material: o.material || 'Material Aço',
      material_description: o.material_description || o.material || 'Material Laminado',
      weight_kg: o.weight_kg || 10000,
      plant: '1000',
      storage_location: 'DP34',
      wms_address: 'DP34-DOCA-01',
      distance_km: 150,
    }))

    const layout = generateWmsLoadingMap({
      cargoId: cargo.id,
      vehiclePlate: cargo.vehicle_plate || 'SEM PLACA',
      vehicleType: cargo.vehicle_type || 'Carreta Padrão',
      itineraryCode: cargo.itinerary_code || 'ITIN-GERAL',
      capacityKg: cargo.vehicle_capacity_kg || 28000,
      orders: mappedOrders,
      wmsConfigured: false,
    })
    setLoadingLayout(layout)
  }, [selectedCargoId, cargos])

  const handleSaveApproval = async () => {
    if (!loadingLayout) return
    setIsSaving(true)
    try {
      await TmsService.saveWmsLoadingMap({
        cargo_id: loadingLayout.cargoId,
        vehicle_plate: loadingLayout.vehiclePlate,
        vehicle_type: loadingLayout.vehicleType,
        itinerary_code: loadingLayout.itineraryCode,
        status: loadingLayout.hasConflicts ? 'CONFLITO_IDENTIFICADO' : 'CONFERIDO',
        has_sidercentro: loadingLayout.items.some((i) => i.isSidercentro),
        has_perfil_pesado_l2: loadingLayout.items.some((i) => i.isPerfilPesadoL2),
        has_conflict: loadingLayout.hasConflicts,
        conflict_description: loadingLayout.conflictNotes.join('; '),
        loading_sequence_json: loadingLayout.items,
        internal_picking_sequence_json: loadingLayout.pickingSequence,
        wms_integration_status: loadingLayout.wmsIntegrationStatus,
        approved_by_user: user?.name || 'Operador Logístico',
      })
      toast({
        title: 'Mapa de Carregamento Registrado',
        description: 'Sequência de separação e carregamento aprovada para a doca de expedição.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar mapa WMS',
        description: err?.message || 'Falha ao salvar no banco.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              WMS & Mapa de Carregamento Físico
            </h1>
            <Badge className="bg-[#005596] text-white text-[10px] font-bold">
              EXPEDIÇÃO & DOCAS
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Integração com HUB WMS corporativo: sequência de descarga, prioridades Sidercentro/L2 e
            roteiro interno de coleta.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {cargos.length > 0 && (
            <Select value={selectedCargoId} onValueChange={setSelectedCargoId}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Selecione a carga" />
              </SelectTrigger>
              <SelectContent>
                {cargos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.id} — {c.scenario_name || c.itinerary_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Badge
            variant="outline"
            className="text-[10px] border-amber-400 text-amber-800 bg-amber-50 font-mono"
          >
            HUB WMS: AGUARDANDO CONFIGURAÇÃO
          </Badge>
          <Button
            onClick={handleSaveApproval}
            disabled={isSaving || !loadingLayout}
            size="sm"
            className="bg-[#005596] text-white text-xs h-8"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Aprovar Mapa
          </Button>
        </div>
      </div>

      {!loadingLayout ? (
        <Card className="p-12 text-center border-dashed">
          <Box className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">
            Nenhuma carga operacional selecionada para montagem de mapa WMS
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Gere ou aprove uma carga no Planejador/Roteirizador para visualizar a sequência de
            carregamento físico e docas de expedição.
          </p>
        </Card>
      ) : (
        <>
          {/* Card Resumo do Veículo e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  Carga & Veículo
                </div>
                <div className="text-sm font-black text-slate-900 font-mono mt-0.5">
                  {loadingLayout.cargoId}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Placa: <strong>{loadingLayout.vehiclePlate}</strong> • {loadingLayout.vehicleType}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  Peso Total Carregado
                </div>
                <div className="text-sm font-black text-slate-900 font-mono mt-0.5">
                  {(loadingLayout.totalWeightKg / 1000).toFixed(2)} t /{' '}
                  {(loadingLayout.capacityKg / 1000).toFixed(0)} t
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                  Ocupação:{' '}
                  {((loadingLayout.totalWeightKg / loadingLayout.capacityKg) * 100).toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  Exceções de Carregamento
                </div>
                <div className="flex gap-1 mt-1">
                  <Badge className="bg-blue-700 text-white text-[9px]">SIDERCENTRO (DS11)</Badge>
                  <Badge className="bg-indigo-700 text-white text-[9px]">PERFIL L2</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  Status de Conflito
                </div>
                <div className="mt-1">
                  {loadingLayout.hasConflicts ? (
                    <Badge className="bg-rose-600 text-white text-[10px] flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Conflito Físico Detectado
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-600 text-white text-[10px] flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Sequência Válida & Segura
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Diagrama Visual do Veículo (Representação de Carregamento no Caminhão) */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-3.5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-slate-700" />
                  Representação Física da Carroceria (Fundo ➔ Traseira / Ordem de Saída)
                </CardTitle>
                <div className="text-[10px] text-slate-500 font-mono">
                  1º a Entrar (Fundo) ➔ Último a Entrar (Traseira)
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-2 border-dashed border-slate-300 p-4 rounded-xl bg-slate-50/70">
                {loadingLayout.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white rounded-lg border-2 border-slate-200 shadow-sm space-y-2 relative"
                  >
                    <div className="flex justify-between items-start">
                      <Badge className="bg-slate-900 text-white text-[10px] font-mono">
                        Posição #{item.loadingSequenceOrder} (Entra {item.loadingSequenceOrder}º)
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[9px] border-blue-600 text-blue-700 font-bold"
                      >
                        Entrega #{item.deliverySequenceOrder} ({item.destinationCity})
                      </Badge>
                    </div>

                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        {item.materialDescription}
                      </div>
                      <div className="text-[11px] text-slate-500">{item.customerName}</div>
                    </div>

                    <div className="flex justify-between text-[11px] font-mono pt-1 border-t border-slate-100">
                      <span className="text-slate-600">
                        Peso: {(item.weightKg / 1000).toFixed(1)} t
                      </span>
                      <span className="text-[#005596] font-bold">
                        {item.plant} / {item.storageLocation}
                      </span>
                    </div>

                    {item.specialHandlingFlag && (
                      <Badge className="bg-amber-600 text-white text-[8px] w-full justify-center">
                        {item.specialHandlingFlag}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Roteiro Interno de Coleta e Separação (Picking Sequence) */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-3.5 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
                <Box className="w-4 h-4 text-[#005596]" />
                Roteiro Interno de Coleta & Movimentação (WMS Picking Sequence)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
                  <tr>
                    <th className="p-2.5">Passo</th>
                    <th className="p-2.5">Centro / Depósito</th>
                    <th className="p-2.5">Endereço Físico WMS</th>
                    <th className="p-2.5">Material</th>
                    <th className="p-2.5 text-right">Peso (kg)</th>
                    <th className="p-2.5">Justificativa de Prioridade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {loadingLayout.pickingSequence.map((step) => (
                    <tr key={step.stepNumber} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">Passo {step.stepNumber}</td>
                      <td className="p-2.5 font-bold text-[#005596]">
                        {step.plant} / {step.storageLocation}
                      </td>
                      <td className="p-2.5 text-slate-700 bg-slate-50 rounded">
                        {step.wmsPhysicalAddress}
                      </td>
                      <td className="p-2.5 font-sans font-medium text-slate-900">
                        {step.materialDescription}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {step.weightKg.toLocaleString('pt-BR')} kg
                      </td>
                      <td className="p-2.5 font-sans text-slate-600 text-[10px]">
                        {step.priorityReason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
export default WmsLoadingMapPage
