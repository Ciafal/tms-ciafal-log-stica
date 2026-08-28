import React, { useState } from 'react'
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Hash,
  Download,
  Calendar,
  Layers,
  Lock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  anttEngine,
  ANTT_OFFICIAL_VERSIONS,
  OfficialAnttRateVersion,
} from '@/domain/anttAndTollEngine'

export const AnttOfficialSourcePage: React.FC = () => {
  const { toast } = useToast()
  const versions = anttEngine.getAllVersions()
  const activeVersion = anttEngine.getActiveVersion()

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <FileText className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              ANTT — Fonte Oficial, Vigência & Auditoria Regulatória
            </h1>
            <Badge className="bg-[#005596] text-white text-xs">Piso Mínimo Regulatório</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Resoluções ANTT nº 5.867/2019, Portarias SUROC, vigências, coeficientes CCD/CC e hashes
            criptográficos auditáveis.
          </p>
        </div>

        <Badge className="bg-emerald-600 text-white font-mono text-xs px-3 py-1">
          Versão Ativa: {activeVersion.version}
        </Badge>
      </div>

      {/* Mandatory Governance Alert */}
      <div className="bg-slate-900 text-white p-4 rounded-xl text-xs space-y-2 border border-slate-800 shadow-md">
        <div className="flex items-center space-x-2 text-sky-400 font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>DIRETRIZ DE ENGENHARIA — REGRA DE CÁLCULO OFICIAL vs SIMULAÇÃO:</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          O motor de cálculo do piso mínimo é{' '}
          <strong>estritamente desacoplado da fonte de dados</strong>. Se uma versão oficial não
          estiver formalmente cadastrada e homologada, o sistema classifica a cotação exclusivamente
          como <strong>"CÁLCULO DE REFERÊNCIA (SIMULAÇÃO)"</strong> e{' '}
          <strong>BLOQUEIA A ABERTURA DE OFERTAS PRODUTIVAS</strong> caso a política da CIAFAL exija
          conformidade regulatória plena com a tabela ANTT.
        </p>
      </div>

      {/* Official Versions Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
          <CardTitle className="text-base font-bold text-slate-900">
            Versões Cadastradas da Tabela de Coeficientes ANTT
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Histórico auditável de resoluções oficiais publicadas no Diário Oficial da União (DOU).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <th className="p-3">Versão</th>
                  <th className="p-3">Resolução / Portaria</th>
                  <th className="p-3">Fonte Oficial</th>
                  <th className="p-3">Vigência Início</th>
                  <th className="p-3">Vigência Fim</th>
                  <th className="p-3">Custo Fixo Base</th>
                  <th className="p-3">Hash de Integridade</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                {versions.map((ver) => (
                  <tr key={ver.version} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{ver.version}</td>
                    <td className="p-3 font-sans text-slate-700">{ver.resolutionNumber}</td>
                    <td className="p-3 text-slate-600 font-sans">{ver.source}</td>
                    <td className="p-3 text-slate-600 font-sans">
                      {new Date(ver.effectiveDateStart).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-3 text-slate-600 font-sans">
                      {ver.effectiveDateEnd
                        ? new Date(ver.effectiveDateEnd).toLocaleDateString('pt-BR')
                        : 'Vigente'}
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      R$ {ver.fixedCostBase.toFixed(2)}
                    </td>
                    <td className="p-3 text-sky-800 text-[10px]">{ver.hash}</td>
                    <td className="p-3 font-sans">
                      {ver.isActive ? (
                        <Badge className="bg-emerald-600 text-white text-[10px]">VIGENTE</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500 text-[10px]">
                          HISTÓRICO
                        </Badge>
                      )}
                    </td>
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
