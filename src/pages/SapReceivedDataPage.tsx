import React, { useState } from 'react'
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Lock,
  EyeOff,
  Database,
  ArrowRightLeft,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

interface SapReceivedDataRecord {
  id: string
  fluxo: string
  sapCode: string
  maskedDescription: string
  quantity: string
  weight: string
  receivedAt: string
  status: 'Novo' | 'Atualizado' | 'Rejeitado' | 'Inconsistência'
  notes: string
}

export const SapReceivedDataPage: React.FC = () => {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFluxo, setSelectedFluxo] = useState('todos')

  const receivedRecords: SapReceivedDataRecord[] = [
    {
      id: 'REC-001',
      fluxo: 'Carteira (ZSD35)',
      sapCode: 'PED-45008912',
      maskedDescription: 'PERFIL I 200X200 MM (Cliente: Construtora A***)',
      quantity: '45.000 KG',
      weight: '45.0 TON',
      receivedAt: 'Hoje, 15:42',
      status: 'Novo',
      notes: 'Importado com sucesso via RFC ZSD35. Endereço WE mapeado.',
    },
    {
      id: 'REC-002',
      fluxo: 'Carteira (ZSD35)',
      sapCode: 'PED-45008913',
      maskedDescription: 'TUBO ESTRUTURAL 150X150 (Cliente: Metalúrgica B***)',
      quantity: '28.000 KG',
      weight: '28.0 TON',
      receivedAt: 'Hoje, 15:42',
      status: 'Atualizado',
      notes: 'Saldo residual recalculado após faturamento parcial.',
    },
    {
      id: 'REC-003',
      fluxo: 'Motoristas/Veículos (ZSD004V_V2)',
      sapCode: 'MOT-***.***.892-01',
      maskedDescription: 'Motorista: Carlos *** | Placa: ABC-*** | Cavalo Mecânico',
      quantity: '1 VEÍC',
      weight: '32.0 TON CAP',
      receivedAt: 'Hoje, 15:30',
      status: 'Novo',
      notes: 'Registro cadastral validado com chave CPF + Placa.',
    },
    {
      id: 'REC-004',
      fluxo: 'Itinerários (TVROT)',
      sapCode: 'ROU-SP01',
      maskedDescription: 'ROTA GRANDE SP & VALE DO PARAÍBA',
      quantity: '1 ROTA',
      weight: '120 KM',
      receivedAt: 'Hoje, 12:00',
      status: 'Novo',
      notes: 'Itinerário standard TVROT sincronizado.',
    },
    {
      id: 'REC-005',
      fluxo: 'Carteira (ZSD35)',
      sapCode: 'PED-45008919',
      maskedDescription: 'CANTONEIRA DE ACO (Cliente: Industria C***)',
      quantity: '12.000 KG',
      weight: '12.0 TON',
      receivedAt: 'Hoje, 15:42',
      status: 'Inconsistência',
      notes: 'Aviso: Texto livre STXH/STXL contém menção a endereço divergente do Ship-to oficial.',
    },
  ]

  const filtered = receivedRecords.filter((r) => {
    const matchesSearch =
      r.sapCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.maskedDescription.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFluxo = selectedFluxo === 'todos' || r.fluxo.includes(selectedFluxo)
    return matchesSearch && matchesFluxo
  })

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <Database className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              SAP ECC — Amostra Segura de Dados Recebidos
            </h1>
            <Badge className="bg-[#005596] text-white text-xs">Observabilidade & Auditoria</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Visualização de payload mascarado de acordo com a LGPD: dados pessoais e dados fiscais
            sensíveis ocultos.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Badge className="bg-emerald-600 text-white font-mono text-xs">
            Última Sincronização: Há 4 min
          </Badge>
        </div>
      </div>

      {/* Security & Masking Banner */}
      <div className="bg-slate-900 text-white p-4 rounded-xl text-xs space-y-2 border border-slate-800 shadow-md">
        <div className="flex items-center space-x-2 text-sky-400 font-bold">
          <EyeOff className="w-4 h-4" />
          <span>CONFORMIDADE LGPD & MINIMIZAÇÃO DE DADOS:</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          Os dados extraídos do SAP ECC são submetidos a{' '}
          <strong>máscara estrita de CPF, CNPJ, dados bancários e nomes completos</strong>. As
          informações apresentadas nesta interface destinam-se exclusivamente à conferência de
          volume, integridade estrutural e validação de reconciliação de itens.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block">Total Registros Lidos</span>
          <span className="text-2xl font-black text-slate-900">1.530</span>
          <span className="text-[11px] text-emerald-600 block mt-1">Sincronização Ativa</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block">Novos Itens (Hoje)</span>
          <span className="text-2xl font-black text-blue-600">142</span>
          <span className="text-[11px] text-slate-500 block mt-1">Carga Incremental</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block">Itens Atualizados</span>
          <span className="text-2xl font-black text-amber-600">89</span>
          <span className="text-[11px] text-slate-500 block mt-1">Saldos & Status</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block">
            Inconsistências Detectadas
          </span>
          <span className="text-2xl font-black text-rose-600">2</span>
          <span className="text-[11px] text-rose-600 block mt-1">Reconciliação Pendente</span>
        </div>
      </div>

      {/* Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="p-4 pb-3 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Amostra de Registros Recebidos
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Registros mais recentes processados pelo barramento SAP.
            </CardDescription>
          </div>

          <div className="flex items-center space-x-2">
            <Input
              placeholder="Filtrar por código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 text-xs w-64"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <th className="p-3">ID Registro</th>
                  <th className="p-3">Fluxo SAP</th>
                  <th className="p-3">Código SAP</th>
                  <th className="p-3">Descrição Mascarada (LGPD)</th>
                  <th className="p-3">Qtd / Peso</th>
                  <th className="p-3">Recebido Em</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Observações Técnicas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px]">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-800">{r.id}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] bg-slate-50">
                        {r.fluxo}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono text-slate-700">{r.sapCode}</td>
                    <td className="p-3 font-semibold text-slate-900">{r.maskedDescription}</td>
                    <td className="p-3 font-mono text-slate-700">{r.weight}</td>
                    <td className="p-3 text-slate-500">{r.receivedAt}</td>
                    <td className="p-3">
                      <Badge
                        className={
                          r.status === 'Novo'
                            ? 'bg-blue-600 text-white'
                            : r.status === 'Atualizado'
                              ? 'bg-emerald-600 text-white'
                              : r.status === 'Inconsistência'
                                ? 'bg-rose-600 text-white'
                                : 'bg-amber-600 text-white'
                        }
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-600 text-[10px]">{r.notes}</td>
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
