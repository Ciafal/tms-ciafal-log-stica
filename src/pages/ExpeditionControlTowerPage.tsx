import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { tmsService } from '@/services/tmsService'
import {
  Zap,
  Truck,
  RotateCcw,
  AlertTriangle,
  Clock,
  Shield,
  Layers,
  ArrowRight,
  CheckCircle2,
  TrendingDown,
  Warehouse,
  Bot,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const ExpeditionControlTowerPage: React.FC = () => {
  const { user } = useAuth()
  const [expeditions, setExpeditions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const list = await tmsService.getExpeditionTrackings()
      setExpeditions(list)
    } catch {
      setExpeditions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <Zap className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Torre de Controle Operacional — Visão Panorâmica
            </h1>
            <Badge className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-0.5">
              Live Feed
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Monitoramento de veículos em pátio, carregamento, alertas e prioridades da expedição
            CIAFAL.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Atualizar Feed
          </Button>
          <Link to="/tms/expedicao">
            <Button
              size="sm"
              className="bg-[#005596] hover:bg-[#004275] text-white font-bold text-xs gap-1.5 shadow-sm"
            >
              <Truck className="w-3.5 h-3.5" />
              Gestão da Expedição
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid de Cards Grandes da Torre de Controle */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {expeditions.map((item) => {
          const isCritical = item.slaStatus === 'CRITICO_ATRASADO' || item.delayRiskPct > 60

          return (
            <Card
              key={item.cargoId}
              className={`border transition-all shadow-md overflow-hidden ${
                isCritical
                  ? 'border-rose-400 bg-rose-50/30 ring-1 ring-rose-300'
                  : 'border-slate-200 bg-white hover:border-[#005596]'
              }`}
            >
              <div
                className={`h-2 w-full ${
                  isCritical ? 'bg-rose-600 animate-pulse' : 'bg-[#005596]'
                }`}
              />

              <CardContent className="p-5 space-y-4 text-xs">
                {/* Header do Card */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-black text-slate-900 block">{item.cargoId}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      SAP: {item.sapTransportNumber || '1004829102'}
                    </span>
                  </div>
                  <Badge
                    className={`text-xs font-bold ${
                      isCritical ? 'bg-rose-600 text-white' : 'bg-[#005596] text-white'
                    }`}
                  >
                    {item.operationalStatus}
                  </Badge>
                </div>

                {/* Motorista & Rota */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>{item.driverName}</span>
                    <span className="font-mono text-[#005596]">{item.vehiclePlate}</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{item.destinationCities}</p>
                </div>

                {/* Métricas de Tempo & SLA */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Tempo na Etapa
                    </span>
                    <span className="text-lg font-black text-slate-800">
                      {item.currentStageDurationMin} min
                    </span>
                  </div>
                  <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Tempo Total Pátio
                    </span>
                    <span className="text-lg font-black text-slate-800">
                      {item.totalLeadTimeMin} min
                    </span>
                  </div>
                </div>

                {/* WMS & Alerta */}
                <div className="text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Status WMS:</span>
                    <strong className="text-slate-800">
                      {item.wmsStatusDetail || 'Disponível 100%'}
                    </strong>
                  </div>
                  {isCritical && (
                    <div className="p-2 bg-rose-100 text-rose-900 rounded-lg font-semibold border border-rose-200 text-[10px]">
                      Atenção:{' '}
                      {item.delayRootCause || 'Gargalo identificado pela IA no fluxo de doca.'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
export default ExpeditionControlTowerPage
