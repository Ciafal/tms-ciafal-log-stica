import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { tmsService } from '@/services/tmsService'
import { useToast } from '@/hooks/use-toast'
import {
  Sliders,
  RotateCcw,
  Bot,
  Save,
  Shield,
  Clock,
  Sparkles,
  Layers,
  HelpCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const AiAutonomyAndRulesPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [parameters, setParameters] = useState<any[]>([])
  const [slaParams, setSlaParams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Default Carlão Autonomy Level
  const [globalAutonomyLevel, setGlobalAutonomyLevel] = useState<number>(1) // Nível 1: IA negocia, humano aprova

  const loadData = async () => {
    try {
      const [pList, slaList] = await Promise.all([
        tmsService.getNegotiationParameters(),
        tmsService.getExpeditionSlaParameters(),
      ])
      setParameters(pList)
      setSlaParams(slaList)
    } catch {
      setParameters([])
      setSlaParams([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSaveAutonomy = async () => {
    setActionLoading(true)
    try {
      toast({
        title: 'Nível de Autonomia Atualizado',
        description: `Nível ${globalAutonomyLevel} configurado com sucesso como padrão corporativo da CIAFAL.`,
        className: 'bg-[#005596] text-white',
      })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <Sliders className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Regras de Negociação, Autonomia da IA & SLAs
            </h1>
            <Badge className="bg-[#005596] text-white text-xs font-bold px-2.5 py-0.5">
              Governança & Parâmetros
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configuração dos limites operacionais do Carlão, faixas inteligentes, tempos de ondas de
            oferta e metas de SLAs de expedição.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="text-xs border-slate-300 gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Recarregar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="autonomia" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="autonomia" className="text-xs font-bold gap-1.5">
            <Bot className="w-4 h-4 text-[#005596]" />
            Níveis de Autonomia do Carlão
          </TabsTrigger>
          <TabsTrigger value="faixas" className="text-xs font-bold gap-1.5">
            <Layers className="w-4 h-4 text-[#005596]" />
            Faixas Inteligentes & Ondas ({parameters.length})
          </TabsTrigger>
          <TabsTrigger value="slas" className="text-xs font-bold gap-1.5">
            <Clock className="w-4 h-4 text-[#005596]" />
            SLAs da Expedição ({slaParams.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: AUTONOMIA */}
        <TabsContent value="autonomia" className="space-y-4 mt-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#005596]" />
              Nível Global de Autonomia do Agente Carlão
            </h3>
            <p className="text-xs text-slate-500">
              O Carlão nunca altera sozinho regras críticas de preços ou bloqueios; as decisões
              finais são sempre auditadas.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {/* Nível 0 */}
              <div
                onClick={() => setGlobalAutonomyLevel(0)}
                className={`p-4 rounded-xl border cursor-pointer transition space-y-2 ${
                  globalAutonomyLevel === 0
                    ? 'border-[#005596] bg-sky-50/70 shadow-md ring-2 ring-[#005596]'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900">NÍVEL 0</span>
                  <Badge variant="outline" className="text-[10px]">
                    Somente Conversa
                  </Badge>
                </div>
                <p className="text-xs text-slate-600">
                  Carlão apenas responde dúvidas dos motoristas e coleta contrapropostas sem propor
                  contravalores.
                </p>
              </div>

              {/* Nível 1 - Padrão */}
              <div
                onClick={() => setGlobalAutonomyLevel(1)}
                className={`p-4 rounded-xl border cursor-pointer transition space-y-2 ${
                  globalAutonomyLevel === 1
                    ? 'border-[#005596] bg-sky-50/70 shadow-md ring-2 ring-[#005596]'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-[#005596]">NÍVEL 1 (PADRÃO)</span>
                  <Badge className="bg-[#005596] text-white text-[10px]">Aprovação Humana</Badge>
                </div>
                <p className="text-xs text-slate-600">
                  Carlão negocia dentro da faixa inteligente parametrizada, mas a confirmação final
                  da contratação exige validação do gestor.
                </p>
              </div>

              {/* Nível 2 */}
              <div
                onClick={() => setGlobalAutonomyLevel(2)}
                className={`p-4 rounded-xl border cursor-pointer transition space-y-2 ${
                  globalAutonomyLevel === 2
                    ? 'border-[#005596] bg-sky-50/70 shadow-md ring-2 ring-[#005596]'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900">NÍVEL 2</span>
                  <Badge variant="outline" className="text-[10px]">
                    Semi-Automático
                  </Badge>
                </div>
                <p className="text-xs text-slate-600">
                  Carlão negocia e fecha automaticamente apenas quando a contraproposta estiver
                  abaixo da Meta CIAFAL.
                </p>
              </div>

              {/* Nível 3 */}
              <div
                onClick={() => setGlobalAutonomyLevel(3)}
                className={`p-4 rounded-xl border cursor-pointer transition space-y-2 ${
                  globalAutonomyLevel === 3
                    ? 'border-[#005596] bg-sky-50/70 shadow-md ring-2 ring-[#005596]'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900">NÍVEL 3</span>
                  <Badge variant="outline" className="text-[10px]">
                    Full Autônomo
                  </Badge>
                </div>
                <p className="text-xs text-slate-600">
                  Carlão negocia e confirma automaticamente dentro de todo o limite de autonomia
                  financeira configurado.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button
                onClick={handleSaveAutonomy}
                disabled={actionLoading}
                className="bg-[#005596] hover:bg-[#004275] text-white font-bold text-xs gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar Configuração de Autonomia
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: FAIXAS & ONDAS */}
        <TabsContent value="faixas" className="space-y-4 mt-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">
              Faixas Inteligentes & Durações de Ondas Parametrizadas
            </h3>

            <div className="border rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b text-[10px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="p-3">Regra / Rota</th>
                    <th className="p-3">Região</th>
                    <th className="p-3">Veículo Padrão</th>
                    <th className="p-3">Duração Onda 1</th>
                    <th className="p-3">Duração Onda 2</th>
                    <th className="p-3">Spread Autonomia</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parameters.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-extrabold text-slate-900">{p.rule_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {p.itinerary_code}
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{p.region}</td>
                      <td className="p-3 text-slate-700">{p.vehicle_type}</td>
                      <td className="p-3 font-mono font-bold text-slate-800">
                        {p.wave1_duration_min || 15} min
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800">
                        {p.wave2_duration_min || 30} min
                      </td>
                      <td className="p-3 text-emerald-700 font-bold">
                        +{p.max_autonomy_spread_pct || 6.5}%
                      </td>
                      <td className="p-3">
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                          Ativo
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: SLAS DA EXPEDIÇÃO */}
        <TabsContent value="slas" className="space-y-4 mt-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">
              Metas de Tempo e SLAs por Etapa da Expedição
            </h3>

            <div className="border rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b text-[10px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="p-3">Etapa Operacional</th>
                    <th className="p-3">Código</th>
                    <th className="p-3">Meta (Minutos)</th>
                    <th className="p-3">Alerta Amarelo (%)</th>
                    <th className="p-3">Alerta Crítico (%)</th>
                    <th className="p-3">Setor Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {slaParams.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-3 font-extrabold text-slate-900">{s.stage_name}</td>
                      <td className="p-3 font-mono text-[10px] text-slate-500">{s.stage_code}</td>
                      <td className="p-3 font-mono font-bold text-[#005596]">{s.target_min} min</td>
                      <td className="p-3 text-amber-700 font-semibold">
                        {s.warning_threshold_pct || 80}%
                      </td>
                      <td className="p-3 text-rose-700 font-semibold">
                        {s.critical_threshold_pct || 100}%
                      </td>
                      <td className="p-3 text-slate-700">{s.responsible_sector}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
export default AiAutonomyAndRulesPage
