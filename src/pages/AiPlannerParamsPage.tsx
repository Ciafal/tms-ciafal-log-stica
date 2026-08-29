import React, { useState, useEffect } from 'react'
import {
  Sliders,
  Sparkles,
  Clock,
  ShieldCheck,
  Save,
  RefreshCw,
  Layers,
  Database,
  Activity,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'

export const AiPlannerParamsPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Parâmetros de Execução Programada
  const [morningSchedule, setMorningSchedule] = useState('07:30')
  const [midShiftSchedule, setMidShiftSchedule] = useState('12:30')
  const [eveningSchedule, setEveningSchedule] = useState('17:00')
  const [autoTriggerEvents, setAutoTriggerEvents] = useState(true)

  // Pesos do Score Multicritério (0 a 100)
  const [weightOccupancy, setWeightOccupancy] = useState(40)
  const [weightOverdue, setWeightOverdue] = useState(20)
  const [weightPortaDriver, setWeightPortaDriver] = useState(15)
  const [weightProfit, setWeightProfit] = useState(15)
  const [weightRoute, setWeightRoute] = useState(10)

  // Faixas de Atraso
  const [bucket1To3, setBucket1To3] = useState(5)
  const [bucket4To7, setBucket4To7] = useState(10)
  const [bucket8To15, setBucket8To15] = useState(15)
  const [bucketGt15, setBucketGt15] = useState(20)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await TmsService.logAudit({
        user_name: user?.name || 'Administrador',
        action_type: 'AI_PLANNER_PARAMETERS_UPDATED',
        target_entity: 'system_parameters',
        target_id: 'AI_PLANNER_CONFIG',
        details: {
          schedules: {
            morning: morningSchedule,
            midShift: midShiftSchedule,
            evening: eveningSchedule,
          },
          weights: { weightOccupancy, weightOverdue, weightPortaDriver, weightProfit, weightRoute },
          buckets: { bucket1To3, bucket4To7, bucket8To15, bucketGt15 },
        },
      })
      toast({
        title: 'Parâmetros do Planejador IA Atualizados',
        description: 'Novos pesos e horários de execução programada foram salvos e auditados.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar parâmetros',
        description: err?.message || 'Falha ao gravar.',
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
              Parâmetros do Planejador IA
            </h1>
            <Badge className="bg-purple-700 text-white text-[10px] font-bold">
              GOVERNANÇA & REGRAS
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Configure as rotinas automáticas de execução, gatilhos de eventos e os pesos
            multicritério do motor de recomendação.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          size="sm"
          className="bg-[#005596] text-white text-xs h-8"
        >
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {isSaving ? 'Salvando...' : 'Salvar Parâmetros'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Execuções Programadas & Gatilhos */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="p-3.5 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#005596]" />
              Horários de Execução Automática & Replanejamento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500">
                  Início do Dia
                </label>
                <Input
                  type="time"
                  value={morningSchedule}
                  onChange={(e) => setMorningSchedule(e.target.value)}
                  className="h-8 text-xs font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500">
                  Meio do Turno
                </label>
                <Input
                  type="time"
                  value={midShiftSchedule}
                  onChange={(e) => setMidShiftSchedule(e.target.value)}
                  className="h-8 text-xs font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500">
                  Final do Dia
                </label>
                <Input
                  type="time"
                  value={eveningSchedule}
                  onChange={(e) => setEveningSchedule(e.target.value)}
                  className="h-8 text-xs font-mono mt-1"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-sky-50 border border-sky-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-900">Gatilhos Operacionais de Reanálise</span>
                <Badge className="bg-sky-600 text-white text-[9px]">ATIVO</Badge>
              </div>
              <p className="text-[11px] text-sky-800">
                Dispara nova análise automaticamente aos eventos: novo pedido SAP; alteração de
                saldo; mudança de crédito; alteração no DP34; adiantamento/atraso PCP; entrada de
                motorista PORTA; cancelamento de carga.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Pesos do Score Multicritério */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="p-3.5 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-purple-700" />
              Pesos do Score Multicritério (Soma = 100)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Ocupação Física do Veículo (%)</span>
                <Input
                  type="number"
                  value={weightOccupancy}
                  onChange={(e) => setWeightOccupancy(Number(e.target.value))}
                  className="h-7 w-20 text-xs font-mono text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <span>Priorização de Pedidos Atrasados</span>
                <Input
                  type="number"
                  value={weightOverdue}
                  onChange={(e) => setWeightOverdue(Number(e.target.value))}
                  className="h-7 w-20 text-xs font-mono text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <span>Bônus Motorista na PORTA</span>
                <Input
                  type="number"
                  value={weightPortaDriver}
                  onChange={(e) => setWeightPortaDriver(Number(e.target.value))}
                  className="h-7 w-20 text-xs font-mono text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <span>Resultado Econômico Previsto</span>
                <Input
                  type="number"
                  value={weightProfit}
                  onChange={(e) => setWeightProfit(Number(e.target.value))}
                  className="h-7 w-20 text-xs font-mono text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <span>Eficiência de Rota / Desvios</span>
                <Input
                  type="number"
                  value={weightRoute}
                  onChange={(e) => setWeightRoute(Number(e.target.value))}
                  className="h-7 w-20 text-xs font-mono text-right"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Faixas de Atraso de Pedidos (Buckets) */}
        <Card className="bg-white border-slate-200 shadow-sm md:col-span-2">
          <CardHeader className="p-3.5 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-700" />
              Faixas de Atraso e Incremento no Score Operacional
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500">
                1 a 3 Dias de Atraso
              </label>
              <Input
                type="number"
                value={bucket1To3}
                onChange={(e) => setBucket1To3(Number(e.target.value))}
                className="h-8 text-xs font-mono mt-1"
              />
              <div className="text-[10px] text-slate-400 mt-1">+5 pontos de bônus</div>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500">
                4 a 7 Dias de Atraso
              </label>
              <Input
                type="number"
                value={bucket4To7}
                onChange={(e) => setBucket4To7(Number(e.target.value))}
                className="h-8 text-xs font-mono mt-1"
              />
              <div className="text-[10px] text-slate-400 mt-1">+10 pontos de bônus</div>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500">
                8 a 15 Dias de Atraso
              </label>
              <Input
                type="number"
                value={bucket8To15}
                onChange={(e) => setBucket8To15(Number(e.target.value))}
                className="h-8 text-xs font-mono mt-1"
              />
              <div className="text-[10px] text-slate-400 mt-1">+15 pontos de bônus</div>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500">
                &gt; 15 Dias de Atraso
              </label>
              <Input
                type="number"
                value={bucketGt15}
                onChange={(e) => setBucketGt15(Number(e.target.value))}
                className="h-8 text-xs font-mono mt-1"
              />
              <div className="text-[10px] text-slate-400 mt-1">
                +20 pontos de bônus (Prioridade Crítica)
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default AiPlannerParamsPage
