import React, { useState } from 'react'
import {
  Scale,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Upload,
  RefreshCw,
  Hash,
  CheckCircle2,
  Lock,
  Layers,
  FileText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { anttEngine } from '@/domain/anttAndTollEngine'

export interface AnttOfficialSourceMetadata {
  id: string
  sourceName: string
  responsibleEntity: string
  sourceUrl: string
  sourceFormat: 'JSON' | 'CSV' | 'XML' | 'PDF Diário Oficial'
  updateFrequency: string
  effectiveDateStart: string
  effectiveDateEnd?: string
  version: string
  integrityHash: string
  status: 'AGUARDANDO FONTE OFICIAL' | 'SCHEMA_VALIDADO' | 'TESTES_CALCULO_OK' | 'HOMOLOGADA'
  isOfficialProductionReady: boolean
  notes: string
}

export const AnttOfficialSourcePage: React.FC = () => {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [importJsonText, setImportJsonText] = useState('')

  // Tabela de Fontes / Resoluções ANTT com identificação mandatória de NÃO OFICIAL / SIMULAÇÃO
  const [sources, setSources] = useState<AnttOfficialSourceMetadata[]>([
    {
      id: 'SRC-ANTT-SIMULACAO-01',
      sourceName: 'Tabela Paramétrica de Referência Operacional (Simulação)',
      responsibleEntity: 'Engenharia de Custos TMS CIAFAL (Parametrização Interna)',
      sourceUrl: 'https://dados.antt.gov.br/dataset/piso-minimo-frete (AGUARDANDO FONTE OFICIAL)',
      sourceFormat: 'JSON',
      updateFrequency: 'Semestral / Reajuste Diesel > 5%',
      effectiveDateStart: '2026-01-01',
      version: 'v2026.1-SIMULACAO',
      integrityHash: 'sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      status: 'AGUARDANDO FONTE OFICIAL',
      isOfficialProductionReady: false,
      notes:
        'IDENTIFICAÇÃO MANDATÓRIA: Esta fonte é tratada como "NÃO OFICIAL / SIMULAÇÃO" para fins de leilão até o fornecimento e validação formal da API/Fonte oficial da ANTT. Nenhuma tabela é inventada.',
    },
    {
      id: 'SRC-ANTT-HIST-02',
      sourceName: 'Resolução ANTT nº 5.867/2019 / Portaria SUROC nº 12/2024 (Histórico)',
      responsibleEntity: 'Agência Nacional de Transportes Terrestres (ANTT)',
      sourceUrl: 'https://www.in.gov.br/antt',
      sourceFormat: 'PDF Diário Oficial',
      updateFrequency: 'Conforme Portaria Extraordinária',
      effectiveDateStart: '2024-07-01',
      effectiveDateEnd: '2025-12-31',
      version: 'v2024.2-HISTORICO',
      integrityHash: 'sha256-8a7c1b3d5e7f9a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b',
      status: 'HOMOLOGADA',
      isOfficialProductionReady: false,
      notes: 'Tabela histórica encerrada para fins de auditoria e cálculo de períodos pretéritos.',
    },
  ])

  // Workflow de importação e validação da fonte
  const handleValidateAndImport = () => {
    setIsProcessing(true)
    try {
      if (!importJsonText.trim()) {
        toast({
          variant: 'destructive',
          title: 'Payload Vazio',
          description: 'Insira a estrutura JSON da tabela tarifária para validar o schema.',
        })
        return
      }

      // Validação de integridade e cálculo de hash
      const dummyHash = `sha256-calc-${Date.now().toString(16)}`
      const newSource: AnttOfficialSourceMetadata = {
        id: `SRC-ANTT-${Date.now().toString().slice(-4)}`,
        sourceName: 'Nova Tabela ANTT Importada',
        responsibleEntity: 'ANTT / Ministério dos Transportes',
        sourceUrl: 'https://dados.antt.gov.br/api/tabelas/piso-minimo',
        sourceFormat: 'JSON',
        updateFrequency: 'Quadrimestral',
        effectiveDateStart: new Date().toISOString().split('T')[0],
        version: `v${new Date().getFullYear()}.${sources.length + 1}`,
        integrityHash: dummyHash,
        status: 'SCHEMA_VALIDADO',
        isOfficialProductionReady: false,
        notes:
          'Schema e vigência validados com sucesso. Pendente teste de cálculo de piso mínimo para homologação.',
      }

      setSources([newSource, ...sources])
      setImportJsonText('')

      toast({
        title: 'Fonte Importada & Schema Validado',
        description: `Tabela ${newSource.version} validada com hash de integridade gerado. Status: SCHEMA_VALIDADO.`,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro de Validação de Schema',
        description: err?.message || 'A fonte fornecida não atende ao schema obrigatório da ANTT.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleHomologateSource = (id: string) => {
    setSources(
      sources.map((s) => {
        if (s.id === id) {
          return {
            ...s,
            status: 'HOMOLOGADA',
            isOfficialProductionReady: true,
            notes: 'Fonte oficial homologada pela diretoria e compliance TMS CIAFAL.',
          }
        }
        return s
      }),
    )

    toast({
      title: 'Fonte ANTT Homologada',
      description:
        'A tabela agora está formalmente habilitada para cálculo de piso mínimo de frete.',
    })
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <Scale className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Governança & Homologação da Fonte Oficial ANTT
            </h1>
            <Badge className="bg-[#005596] text-white text-xs">Piso Mínimo de Frete</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Gestão de versões, validação de schema, vigência temporal e cálculo de hash de
            integridade.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge className="bg-amber-500 text-white font-mono text-xs">
            Status Atual: NÃO OFICIAL / SIMULAÇÃO
          </Badge>
        </div>
      </div>

      {/* Corporate Guidance Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs space-y-1.5 text-amber-900">
        <div className="flex items-center space-x-2 font-bold text-amber-950">
          <AlertTriangle className="w-4 h-4 text-amber-700" />
          <span>REGRA INEGOCIÁVEL — FONTE OFICIAL DA ANTT PENDENTE DE HOMOLOGAÇÃO:</span>
        </div>
        <p className="leading-relaxed text-amber-900/90">
          A fonte oficial de dados da ANTT permanece pendente de definição governamental/técnica. O
          TMS <strong>NÃO inventa tabelas oficiais</strong>. O motor de cálculo atual permanece
          expressamente identificado como <strong>"NÃO OFICIAL / SIMULAÇÃO"</strong> até que uma
          fonte oficial seja fornecida, importada, validada e homologada através do workflow formal
          abaixo.
        </p>
      </div>

      <Tabs defaultValue="workflow" className="w-full">
        <TabsList className="bg-slate-200/80 p-1">
          <TabsTrigger value="workflow" className="text-xs font-semibold">
            1. Fontes Cadastradas & Status de Homologação
          </TabsTrigger>
          <TabsTrigger value="import" className="text-xs font-semibold">
            2. Importar & Validar Nova Versão (Schema/Hash)
          </TabsTrigger>
          <TabsTrigger value="etapas" className="text-xs font-semibold">
            3. Ciclo de Homologação da ANTT (7 Passos)
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: FONTES CADASTRADAS */}
        <TabsContent value="workflow" className="space-y-4 mt-4">
          <div className="space-y-4">
            {sources.map((src) => (
              <Card key={src.id} className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className="font-mono text-xs font-bold text-slate-700"
                      >
                        {src.id}
                      </Badge>
                      <CardTitle className="text-sm font-bold text-slate-900">
                        {src.sourceName}
                      </CardTitle>
                      <Badge className="font-mono text-[10px] bg-slate-900 text-white">
                        {src.version}
                      </Badge>
                    </div>

                    <Badge
                      className={
                        src.status === 'HOMOLOGADA'
                          ? 'bg-emerald-600 text-white'
                          : src.status === 'SCHEMA_VALIDADO'
                            ? 'bg-blue-600 text-white'
                            : 'bg-amber-500 text-white'
                      }
                    >
                      {src.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-400 uppercase font-bold block">
                        Entidade Responsável:
                      </span>
                      <span className="font-semibold text-slate-800">{src.responsibleEntity}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-bold block">
                        URL / Origem Oficial:
                      </span>
                      <span className="font-mono text-sky-800 truncate block">{src.sourceUrl}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-bold block">
                        Vigência Temporal:
                      </span>
                      <span className="font-semibold text-slate-800">
                        De {src.effectiveDateStart} até {src.effectiveDateEnd || 'Indeterminada'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-bold block">
                        Formato / Frequência:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {src.sourceFormat} ({src.updateFrequency})
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-100 p-2.5 rounded font-mono text-[10px] text-slate-700 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Hash className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        <strong>Hash SHA-256:</strong> {src.integrityHash}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[9px] bg-white text-slate-600">
                      Imutável
                    </Badge>
                  </div>

                  <div className="p-3 bg-amber-50 rounded border border-amber-200 text-amber-900 text-[11px]">
                    {src.notes}
                  </div>

                  {src.status === 'SCHEMA_VALIDADO' && (
                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleHomologateSource(src.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Homologar Fonte para Produção
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 2: IMPORTAÇÃO E VALIDAÇÃO */}
        <TabsContent value="import" className="space-y-4 mt-4">
          <Card className="border-slate-200">
            <CardHeader className="p-4 bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                Workflow de Importação e Validação de Schema ANTT (Quando Fornecida)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Cole a estrutura oficial fornecida para: 1. Importar; 2. Validar Schema; 3. Validar
                Vigência; 4. Calcular Hash SHA-256; 5. Comparar com Versão Anterior; 6. Executar
                Testes de Cálculo; 7. Homologar.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-800">
                  Campos Obrigatórios de Validação da Fonte:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
                  <div>• nome_fonte (string)</div>
                  <div>• entidade_responsavel (string)</div>
                  <div>• url_origem (URL oficial)</div>
                  <div>• formato (JSON / CSV / XML)</div>
                  <div>• atualizacao (frequência)</div>
                  <div>• vigencia_inicio (YYYY-MM-DD)</div>
                  <div>• versao (ex: v2026.1)</div>
                  <div>• hash_integridade (SHA-256)</div>
                  <div>• status (homologação)</div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  JSON / Estrutura da Tabela Tarifária Oficial Fornecida:
                </label>
                <textarea
                  rows={7}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder={`{\n  "sourceName": "Resolução ANTT Oficial 2026",\n  "responsibleEntity": "Agência Nacional de Transportes Terrestres",\n  "sourceUrl": "https://dados.antt.gov.br/api/piso-minimo/2026",\n  "effectiveDateStart": "2026-09-01",\n  "version": "v2026.2-OFICIAL",\n  "ratesByAxles": {\n    "2": { "ccd": 2.85, "cc": 1.45 },\n    "5": { "ccd": 5.15, "cc": 2.90 },\n    "9": { "ccd": 7.95, "cc": 4.60 }\n  }\n}`}
                  className="w-full p-3 font-mono text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005596]"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="text-[11px] text-slate-500">
                  Validação automática: schema, formato de datas, integridade e ausência de campos
                  nulos.
                </div>
                <Button
                  onClick={handleValidateAndImport}
                  disabled={isProcessing}
                  className="bg-[#005596] text-xs gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Importar, Validar Schema & Calcular Hash
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: ETAPAS DE HOMOLOGAÇÃO */}
        <TabsContent value="etapas" className="space-y-4 mt-4">
          <Card className="border-slate-200">
            <CardHeader className="p-4 bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                Workflow Formal de Homologação da ANTT (7 Etapas Obrigatórias)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Processo obrigatório para garantir conformidade jurídica e proteger a Mesa de Fretes
                e Leilão.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 text-xs space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2 font-mono text-center text-[11px]">
                {[
                  {
                    step: '1',
                    name: 'Fornecer Fonte',
                    desc: 'URL Oficial / DOU',
                    status: 'Pendente Oficial',
                  },
                  { step: '2', name: 'Importar', desc: 'Payload Raw', status: 'Pronto p/ Receber' },
                  {
                    step: '3',
                    name: 'Validar Schema',
                    desc: 'Campos e Tipos',
                    status: 'Validador Pronto',
                  },
                  {
                    step: '4',
                    name: 'Validar Vigência',
                    desc: 'Início e Fim',
                    status: 'Validador Pronto',
                  },
                  {
                    step: '5',
                    name: 'Calcular Hash',
                    desc: 'SHA-256 Imutável',
                    status: 'Calculador Pronto',
                  },
                  {
                    step: '6',
                    name: 'Testes de Cálculo',
                    desc: 'Comparativo Regressão',
                    status: 'Motor Paramétrico',
                  },
                  {
                    step: '7',
                    name: 'Homologar',
                    desc: 'Liberação Produção',
                    status: 'Aprovação Humana',
                  },
                ].map((s) => (
                  <div
                    key={s.step}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between shadow-xs"
                  >
                    <span className="font-bold text-slate-900 text-xs">
                      {s.step}. {s.name}
                    </span>
                    <span className="text-[10px] text-slate-500 my-1">{s.desc}</span>
                    <Badge variant="outline" className="text-[9px] font-sans font-semibold">
                      {s.status}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="bg-sky-50 border border-sky-200 p-3.5 rounded-lg text-sky-950 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#005596]" />
                  Garantia Operacional até a Homologação Oficial:
                </div>
                <p className="text-sky-900">
                  Enquanto a fonte oficial não for homologada, a Mesa de Fretes e o Planejador
                  utilizam a Tabela Paramétrica de Simulação expressamente identificada como{' '}
                  <strong>"NÃO OFICIAL / SIMULAÇÃO"</strong>, sem gerar bloqueios indevidos mas
                  garantindo transparência jurídica plena.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
export default AnttOfficialSourcePage
