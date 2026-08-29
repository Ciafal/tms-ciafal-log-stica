import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { FredAiAnalyticsEntity } from '@/domain/fredTrackingEngine'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  BarChart3,
  Bot,
  UserCheck,
  Layers,
  ArrowRight,
} from 'lucide-react'

export const FredAnalyticsPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [analytics, setAnalytics] = useState<FredAiAnalyticsEntity[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadAnalytics = async () => {
    setIsLoading(true)
    try {
      const res = await pb.collection('fred_ai_analytics').getFullList<FredAiAnalyticsEntity>({
        sort: '-created',
      })
      setAnalytics(res)
    } catch (err: any) {
      console.warn('Erro ao carregar análises Fred IA:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#005596] text-white text-xs font-bold uppercase px-2 py-0.5">
              INTELIGÊNCIA & AUDITORIA
            </Badge>
            <Badge
              variant="outline"
              className="text-sky-700 bg-sky-50 border-sky-300 text-xs font-semibold"
            >
              ✨ Fred IA Analytics
            </Badge>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Análise Operacional de Gargalos, Tempos de Descarga e SLAs
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Governança estrita CIAFAL: separação formal entre "Fatos Observados" e "Hipóteses da
            IA".
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadAnalytics}
          disabled={isLoading}
          className="text-xs font-bold border-slate-300"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar Análises
        </Button>
      </div>

      {/* 4 Cards de Métricas IA x Humano */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">
              Acompanhamento 100% IA
            </span>
            <Bot className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-[#005596] mt-1">88.4%</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            Sem necessidade de intervenção humana
          </div>
        </Card>

        <Card className="p-4 border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Intervenção Humana</span>
            <UserCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">11.6%</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Média de 1.2 intervenções por carga crítica
          </div>
        </Card>

        <Card className="p-4 border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">
              Acuracidade do ETA Fred
            </span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">94.2%</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            Desvio médio real: ± 8.4 minutos
          </div>
        </Card>

        <Card className="p-4 border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Resolução Automática</span>
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-600 mt-1">79%</div>
          <div className="text-[11px] text-purple-600 font-semibold mt-0.5">
            Ocorrências resolvidas via Fred IA
          </div>
        </Card>
      </div>

      {/* Relatórios e Análises Estruturadas */}
      <div className="space-y-4">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
          Análises de Desvios Cadastrais e Recomendações
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analytics.map((item) => (
            <Card key={item.id} className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <Badge className="bg-[#005596] text-white text-[10px] font-bold">
                    {item.entity_target}: {item.entity_name}
                  </Badge>
                  <CardTitle className="text-sm font-black text-slate-900 mt-1">
                    {item.analysis_type}
                  </CardTitle>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs font-bold text-sky-700 bg-sky-50 border-sky-300"
                >
                  Confiança: {item.confidence_pct}%
                </Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                {/* Fato Observado */}
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">
                    Fato Observado (Auditado):
                  </div>
                  <div className="font-semibold text-slate-800 mt-0.5">{item.observed_fact}</div>
                </div>

                {/* Hipótese da IA */}
                <div className="p-2.5 rounded bg-sky-50 border border-sky-200">
                  <div className="text-[10px] font-bold uppercase text-sky-800">
                    Hipótese Fred IA:
                  </div>
                  <div className="text-sky-950 mt-0.5">{item.ai_hypothesis}</div>
                </div>

                {/* Sugestão de Parâmetro */}
                {item.master_parameter_suggested_change && (
                  <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-semibold">
                    💡 {item.master_parameter_suggested_change}
                  </div>
                )}

                <div className="text-[10px] text-slate-400 italic">
                  * Não altera cadastro mestre silenciosamente. Exige validação do gestor logístico.
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
export default FredAnalyticsPage
