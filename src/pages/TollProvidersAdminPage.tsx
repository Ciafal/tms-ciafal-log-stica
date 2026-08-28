import React, { useState } from 'react'
import {
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  FileSpreadsheet,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { tollEngine, TollProviderEvaluation } from '@/domain/anttAndTollEngine'

export const TollProvidersAdminPage: React.FC = () => {
  const { toast } = useToast()

  const tollEvaluations: TollProviderEvaluation[] = [
    {
      id: 'ciafal_toll_estimator',
      name: 'CIAFAL Toll Estimator (Concessionárias & ANTT)',
      coverage: 'Nacional (Concessionárias)',
      vehicleCategories: 'Comercial Leve / Pesado / Combinações CVC',
      axleSupport: '2 a 9 eixos com cálculo automático',
      tariffUpdateSource: 'Diário Oficial da União (DOU) & Concessionárias Rodoviárias',
      costEstimate: 'Zero Custo Adicional (Regra Parametrizada)',
      sla: '99.99% (Cálculo em Memória)',
      precision: 'Alta (Praças Georreferenciadas)',
      status: 'Homologado',
    },
    {
      id: 'sem_parar_api',
      name: 'Sem Parar Empresas / Fleet API',
      coverage: 'Nacional (Concessionárias)',
      vehicleCategories: 'Todos os veículos comerciais',
      axleSupport: '2 a 9 eixos com cobrança automática',
      tariffUpdateSource: 'Base Oficial Concessionárias Sem Parar',
      costEstimate: 'Sob Consulta / Por Transação',
      sla: '99.9%',
      precision: 'Exata (Transacional)',
      status: 'Em avaliação',
    },
    {
      id: 'veloe_empresas',
      name: 'Veloe / Alelo Frota API',
      coverage: 'Nacional (Concessionárias)',
      vehicleCategories: 'Veículos pesados e carretas',
      axleSupport: '2 a 9 eixos',
      tariffUpdateSource: 'Base Concessionárias Veloe',
      costEstimate: 'Sob Consulta',
      sla: '99.9%',
      precision: 'Exata',
      status: 'Em avaliação',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Provedores de Pedágios & Tarifação Rodoviária
            </h1>
            <Badge className="bg-emerald-600 text-white text-xs">Custos Rodoviários</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Mapeamento de praças de pedágio por rodovia, custos por número de eixos e homologação de
            fornecedores.
          </p>
        </div>

        <Badge className="bg-emerald-600 text-white font-mono text-xs px-3 py-1">
          TollProvider Desacoplado de RoutingProvider
        </Badge>
      </div>

      {/* Corporate Guidance Banner */}
      <div className="bg-slate-900 text-white p-4 rounded-xl text-xs space-y-2 border border-slate-800 shadow-md">
        <div className="flex items-center space-x-2 text-sky-400 font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>DIRETRIZ ARQUITETURAL DE PEDÁGIOS:</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          O cálculo de pedágio é <strong>estritamente separado do cálculo de rota</strong>. Se o
          provedor de pedágio estiver temporariamente indisponível, o sistema sinaliza
          explicitamente como indisponível sem gerar custos inventados.
        </p>
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {tollEvaluations.map((toll) => (
          <Card
            key={toll.id}
            className="border-slate-200 shadow-sm hover:border-slate-300 transition"
          >
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm font-bold text-slate-900 leading-tight">
                  {toll.name}
                </CardTitle>
                <Badge
                  className={
                    toll.status === 'Homologado'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 text-white'
                  }
                >
                  {toll.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cobertura:</span>
                  <span className="font-semibold">{toll.coverage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Categorias:</span>
                  <span className="font-semibold">{toll.vehicleCategories}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Eixos Suportados:</span>
                  <span className="font-semibold">{toll.axleSupport}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fonte Tarifária:</span>
                  <span className="font-semibold">{toll.tariffUpdateSource}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Precisão:</span>
                  <span className="font-semibold">{toll.precision}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Custo Estimado:</span>
                  <span className="font-semibold">{toll.costEstimate}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
