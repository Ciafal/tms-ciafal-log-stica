import React, { useState } from 'react'
import {
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Layers,
  FileCheck,
  HelpCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface ReconciliationItem {
  id: string
  sapOrderNumber: string
  tmsOrderNumber: string
  sapStatus: string
  tmsStatus: string
  sapWeightTon: number
  tmsWeightTon: number
  differenceKg: number
  status: 'Divergente' | 'Conciliado' | 'Em Análise'
  divergenceReason: string
}

export const SapReconciliationPage: React.FC = () => {
  const { toast } = useToast()
  const [isReconciling, setIsReconciling] = useState(false)

  const reconciliationItems: ReconciliationItem[] = [
    {
      id: 'REC-DIV-01',
      sapOrderNumber: 'PED-45008919',
      tmsOrderNumber: 'TMS-ORD-109',
      sapStatus: 'Em Aberto (ZSD35)',
      tmsStatus: 'Planejado em Carga',
      sapWeightTon: 12.0,
      tmsWeightTon: 10.5,
      differenceKg: 1500,
      status: 'Divergente',
      divergenceReason:
        'Faturamento parcial no SAP de 1.500 KG ainda não refletido na carga do TMS. Sincronização delta necessária.',
    },
    {
      id: 'REC-DIV-02',
      sapOrderNumber: 'PED-45008922',
      tmsOrderNumber: 'TMS-ORD-112',
      sapStatus: 'Bloqueado por Crédito (VBUK/KNKK)',
      tmsStatus: 'Aguardando Simulação',
      sapWeightTon: 24.0,
      tmsWeightTon: 24.0,
      differenceKg: 0,
      status: 'Divergente',
      divergenceReason:
        'Cliente bloqueado financeiramente no SAP. TMS não pode aprovar fechamento de carga.',
    },
    {
      id: 'REC-OK-01',
      sapOrderNumber: 'PED-45008912',
      tmsOrderNumber: 'TMS-ORD-101',
      sapStatus: 'Em Aberto',
      tmsStatus: 'Planejado',
      sapWeightTon: 45.0,
      tmsWeightTon: 45.0,
      differenceKg: 0,
      status: 'Conciliado',
      divergenceReason: 'Valores e pesos perfeitamente conciliados.',
    },
  ]

  const handleRunReconciliation = () => {
    setIsReconciling(true)
    setTimeout(() => {
      setIsReconciling(false)
      toast({
        title: 'Reconciliação Concluída',
        description:
          'Carteira SAP (1.530 registros) vs Carteira TMS (1.528 registros) → 2 registros divergentes identificados.',
      })
    }, 600)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <ArrowRightLeft className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Reconciliação Bidirecional: SAP ECC x TMS CIAFAL
            </h1>
            <Badge className="bg-[#005596] text-white text-xs">Conferência & Integridade</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Auditoria comparativa entre a base oficial do ERP SAP e o estado das cargas e pedidos no
            TMS.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            size="sm"
            onClick={handleRunReconciliation}
            disabled={isReconciling}
            className="text-xs bg-[#005596] hover:bg-[#004070] gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />
            Executar Reconciliação Geral
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase">
              Carteira Total SAP (ZSD35)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-slate-900">1.530 itens</div>
            <div className="text-xs text-slate-500 mt-1">Base oficial ERP</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase">
              Carteira Sincronizada TMS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-blue-600">1.528 itens</div>
            <div className="text-xs text-slate-500 mt-1">Memória operacional do TMS</div>
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-rose-50/40">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-rose-800 uppercase">
              Registros Divergentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-rose-600">2 divergências</div>
            <div className="text-xs text-rose-700 mt-1">Exigem ajuste ou sincronização delta</div>
          </CardContent>
        </Card>
      </div>

      {/* Divergences Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="p-4 pb-3 bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900">
            Relatório Detalhado de Divergências & Conciliações
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Conferência de pesos, status de crédito e divisões de remessa entre SAP e TMS.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <th className="p-3">ID</th>
                  <th className="p-3">Pedido SAP</th>
                  <th className="p-3">Pedido TMS</th>
                  <th className="p-3">Status SAP</th>
                  <th className="p-3">Status TMS</th>
                  <th className="p-3">Peso SAP</th>
                  <th className="p-3">Peso TMS</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Motivo da Divergência / Resolução</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px]">
                {reconciliationItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-800">{item.id}</td>
                    <td className="p-3 font-mono text-slate-800">{item.sapOrderNumber}</td>
                    <td className="p-3 font-mono text-blue-700">{item.tmsOrderNumber}</td>
                    <td className="p-3 text-slate-700">{item.sapStatus}</td>
                    <td className="p-3 text-slate-700">{item.tmsStatus}</td>
                    <td className="p-3 font-mono">{item.sapWeightTon.toFixed(1)} TON</td>
                    <td className="p-3 font-mono">{item.tmsWeightTon.toFixed(1)} TON</td>
                    <td className="p-3">
                      <Badge
                        className={
                          item.status === 'Conciliado'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-600 text-white'
                        }
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-600 text-[10px]">{item.divergenceReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
