import React, { useState, useEffect } from 'react'
import {
  Server,
  Layers,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import { exportToCsv, exportToXlsxXml, triggerPrintPdf } from '@/lib/exportUtils'
import { Link } from 'react-router-dom'

export const SapIntegrationReadinessPage: React.FC = () => {
  const { toast } = useToast()
  const [blueprintItems, setBlueprintItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFluxo, setSelectedFluxo] = useState<string>('todos')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const list = await TmsService.getSapBlueprintMappings()
      setBlueprintItems(list)
      setLoading(false)
    }
    loadData()
  }, [])

  // 7 Fluxos Obrigatórios da Sprint 4.2
  const sapFlows = [
    {
      id: 'CARTEIRA',
      title: 'Carteira de Pedidos (ZSD35)',
      sapSource: 'ZSD35 (Transação) / RFC a confirmar',
      status: 'BLOQUEADA' as const,
      statusLabel: 'BLOQUEADA (Aguardando RFC Z)',
      badgeColor: 'bg-amber-500',
      reason: 'Objeto técnico RFC não disponibilizado pela consultoria ABAP.',
      interfacesCount: 1,
      impact: 'Alimenta o Planejador de Cargas com saldos e pedidos abertos.',
      nextStep:
        'Consultoria SAP confirmar se reutilizará Function Module do programa ZSD35 ou criará RFC Z.',
    },
    {
      id: 'VEICULOS',
      title: 'Motoristas e Veículos (ZSD004V_V2)',
      sapSource: 'ZSD004V_V2 (Database View SD)',
      status: 'PREPARADA' as const,
      statusLabel: 'PREPARADA (Confirmada funcionalmente)',
      badgeColor: 'bg-blue-600',
      reason: 'Estrutura de dados validada funcionalmente. Requer wrapper RFC para polling.',
      interfacesCount: 1,
      impact: 'Cadastro mestre de motoristas, CNH, placas e limites de capacidade.',
      nextStep: 'Consultoria SAP homologar wrapper RFC sobre a view ZSD004V_V2 com paginação.',
    },
    {
      id: 'CLIENTES',
      title: 'Cadastro Mestre de Clientes & Ship-to (KNA1/VBPA)',
      sapSource: 'KNA1 / VBPA / BAPI_CUSTOMER_GETDETAIL2',
      status: 'HOMOLOGADA' as const,
      statusLabel: 'HOMOLOGADA (Standard SAP)',
      badgeColor: 'bg-emerald-600',
      reason: 'Estrutura Standard SAP ECC 6.0 homologada para geocodificação.',
      interfacesCount: 1,
      impact: 'Endereços oficiais de entrega para georreferenciamento e cálculo de rotas.',
      nextStep: 'Sincronizar carga inicial de clientes ativos.',
    },
    {
      id: 'ITINERARIOS',
      title: 'Itinerários Oficiais de Entrega (TVROT)',
      sapSource: 'TVROT (Tabela de Customizing SD)',
      status: 'HOMOLOGADA' as const,
      statusLabel: 'HOMOLOGADA (Standard SAP)',
      badgeColor: 'bg-emerald-600',
      reason: 'Tabela standard de rotas sincronizada via RFC_READ_TABLE.',
      interfacesCount: 1,
      impact: 'Agrupamento operacional de destinos (SP, MG, RJ, etc.).',
      nextStep: 'Validar rotas customizadas em produção.',
    },
    {
      id: 'ESTOQUE',
      title: 'Estoque Físico & Disponível (MARD/MB52)',
      sapSource: 'BAPI_MATERIAL_AVAILABILITY / MARD',
      status: 'PREPARADA' as const,
      statusLabel: 'PREPARADA (BAPI Standard Testada)',
      badgeColor: 'bg-blue-600',
      reason: 'Contrato técnico pronto para validação de saldo livre de expedição.',
      interfacesCount: 1,
      impact: 'Verificação prévia de disponibilidade antes de fechar a carga.',
      nextStep: 'Definir centros e depósitos de expedição elegíveis.',
    },
    {
      id: 'CREDITO',
      title: 'Validação Financeira de Crédito (KNKK/BAPI_CREDIT_CHECK)',
      sapSource: 'BAPI_CREDIT_CHECK / KNKK',
      status: 'HOMOLOGADA' as const,
      statusLabel: 'HOMOLOGADA (Validação em R$)',
      badgeColor: 'bg-emerald-600',
      reason: 'Análise de crédito estritamente financeira (R$) homologada no gateway.',
      interfacesCount: 1,
      impact: 'Bloqueio de simulações para clientes com limite excedido.',
      nextStep: 'Operação regular em DEV/QAS.',
    },
    {
      id: 'TRANSPORTE',
      title: 'Criação e Retorno de Transporte (VT01N/VT02N)',
      sapSource: 'BAPI_SHIPMENT_CREATE / SHPMNT05',
      status: 'BLOQUEADA' as const,
      statusLabel: 'BLOQUEADA (SAP_WRITE_ENABLED = false)',
      badgeColor: 'bg-amber-500',
      reason: 'Modo READ-ONLY ativo por segurança até homologação formal da consultoria em QAS.',
      interfacesCount: 2,
      impact: 'Geração do número oficial de transporte SAP (TKNUM) pós-leilão.',
      nextStep: 'Testes de criação e rollback em ambiente QAS antes da liberação de escrita.',
    },
  ]

  const stats = {
    total: blueprintItems.length,
    confirmadas: blueprintItems.filter(
      (b) =>
        b.status === 'Standard SAP' ||
        b.status === 'Confirmado tecnicamente' ||
        b.status === 'Confirmado funcionalmente',
    ).length,
    aConfirmar: blueprintItems.filter(
      (b) => b.status?.includes('A CONFIRMAR') || b.status === 'A confirmar no Blueprint',
    ).length,
    rfcExistente: blueprintItems.filter(
      (b) => b.rfc_bapi_idoc?.includes('BAPI') || b.rfc_bapi_idoc?.includes('READ_TEXT'),
    ).length,
    rfcADesenvolver: blueprintItems.filter(
      (b) => b.status === 'RFC a desenvolver' || b.status?.includes('ZSD35'),
    ).length,
    homologadas: blueprintItems.filter(
      (b) => b.status === 'Standard SAP' || b.status === 'Homologado',
    ).length,
    bloqueadas: blueprintItems.filter((b) => b.id === 'BP-08' || b.id === 'BP-01').length,
  }

  const handleExportBlueprint = (format: 'CSV' | 'XLSX' | 'PDF') => {
    const versionStr = 'v0.4 (Sprint 4.2)'
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `CIAFAL_Blueprint_SAP_TMS_${versionStr.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}`

    const headers = [
      'ID',
      'Processo TMS',
      'Módulo TMS',
      'Origem Funcional',
      'Tipo Objeto',
      'Tabela/View/Transação',
      'Objeto SAP Conhecido',
      'Campo SAP',
      'Descrição do Campo SAP',
      'Campo TMS',
      'Direção',
      'Frequência',
      'Chave de Negócio',
      'Volume Esperado',
      'Mecanismo de Delta',
      'Tipo Integração Recomendado',
      'RFC / BAPI / IDoc',
      'Status Técnico',
      'Responsável',
      'Pendência Técnica',
      'Observações',
    ]

    const rows = blueprintItems.map((b) => [
      b.id,
      b.process_name,
      b.tms_module || 'TMS Geral',
      b.origin_system || 'SAP ECC 6.0',
      b.object_type || 'N/D',
      b.table_or_view || 'N/D',
      b.sap_object || 'N/D',
      b.sap_field || 'N/D',
      b.sap_field_description || 'N/D',
      b.tms_field || 'N/D',
      b.direction || 'SAP→TMS',
      b.frequency || 'N/D',
      b.business_key || 'N/D',
      b.expected_volume || 'N/D',
      b.delta_mechanism || 'N/D',
      b.recommended_integration_type || 'N/D',
      b.rfc_bapi_idoc || 'N/D',
      b.technical_status || b.status || 'N/D',
      b.responsible || 'Consultoria SAP / TI CIAFAL',
      b.pending_item || 'N/D',
      b.notes || '',
    ])

    if (format === 'CSV') {
      exportToCsv(filename, headers, rows)
      toast({
        title: 'Blueprint CSV Exportado',
        description: `Arquivo ${filename}.csv gerado com sucesso contendo ${rows.length} interfaces mapeadas.`,
      })
    } else if (format === 'XLSX') {
      exportToXlsxXml(filename, 'Blueprint SAP-TMS', headers, rows)
      toast({
        title: 'Blueprint XLSX Exportado',
        description: `Arquivo ${filename}.xls gerado com formatação e estilos oficiais para a consultoria.`,
      })
    } else {
      triggerPrintPdf(`CIAFAL - Blueprint SAP-TMS ${versionStr}`)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <Server className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              SAP Integration Readiness & Blueprint Técnico
            </h1>
            <Badge className="bg-[#005596] text-white text-xs">Blueprint SAP-TMS v0.4</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Matriz técnica de prontidão por fluxo e artefato completo campo a campo para envio à
            consultoria SAP.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportBlueprint('CSV')}
            className="text-xs border-slate-300 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportBlueprint('XLSX')}
            className="text-xs border-slate-300 gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Exportar XLSX
          </Button>
          <Button
            size="sm"
            onClick={() => handleExportBlueprint('PDF')}
            className="text-xs bg-[#005596] hover:bg-[#004070] gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Imprimir / Salvar PDF
          </Button>
        </div>
      </div>

      {/* Corporate Guidance Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs space-y-1.5 text-amber-900">
        <div className="flex items-center space-x-2 font-bold text-amber-950">
          <AlertTriangle className="w-4 h-4 text-amber-700" />
          <span>REGRA INEGOCIÁVEL — OBJETO FUNCIONAL ≠ OBJETO DE INTEGRAÇÃO TÉCNICA:</span>
        </div>
        <p className="leading-relaxed text-amber-900/90">
          A existência da transação <strong>ZSD35 (Carteira)</strong> ou da view{' '}
          <strong>ZSD004V_V2 (Motoristas/Veículos)</strong> não implica que exista RFC
          correspondente pronta para chamada. O sistema separa rigorosamente "Origem Funcional" de
          "Objeto Técnico de Integração". Interfaces não confirmadas são registradas formalmente
          como <strong className="text-amber-950">"A CONFIRMAR COM CONSULTORIA SAP"</strong> sem
          inventar chamadas fictícias.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="border-slate-200">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] text-slate-500 font-bold uppercase">
              Total Itens
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-black text-slate-900">{stats.total}</div>
            <span className="text-[10px] text-slate-400">interfaces mapeadas</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] text-emerald-700 font-bold uppercase">
              Confirmadas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-black text-emerald-600">{stats.confirmadas}</div>
            <span className="text-[10px] text-slate-400">funcional/técnico</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] text-amber-700 font-bold uppercase">
              A Confirmar
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-black text-amber-600">{stats.aConfirmar}</div>
            <span className="text-[10px] text-slate-400">com consultoria</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] text-sky-700 font-bold uppercase">
              RFC Existente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-black text-sky-600">{stats.rfcExistente}</div>
            <span className="text-[10px] text-slate-400">BAPIs/FMs padrão</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] text-indigo-700 font-bold uppercase">
              RFC a Desenvolver
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-black text-indigo-600">{stats.rfcADesenvolver}</div>
            <span className="text-[10px] text-slate-400">escopo ABAP</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] text-teal-700 font-bold uppercase">
              Homologadas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-black text-teal-600">{stats.homologadas}</div>
            <span className="text-[10px] text-slate-400">contratos estáveis</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] text-rose-700 font-bold uppercase">
              Bloqueadas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-black text-rose-600">{stats.bloqueadas}</div>
            <span className="text-[10px] text-slate-400">critério de Go-Live</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Readiness por Fluxo vs Tabela Completa do Blueprint */}
      <Tabs defaultValue="fluxos" className="w-full">
        <TabsList className="bg-slate-200/80 p-1">
          <TabsTrigger value="fluxos" className="text-xs font-semibold">
            1. Readiness por Fluxo (7 Módulos SAP)
          </TabsTrigger>
          <TabsTrigger value="blueprint" className="text-xs font-semibold">
            2. Blueprint Técnico Detalhado (Estrutura Completa)
          </TabsTrigger>
          <TabsTrigger value="workflow" className="text-xs font-semibold">
            3. Workflow de Homologação (9 Etapas)
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: READINESS POR FLUXO */}
        <TabsContent value="fluxos" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sapFlows.map((flow) => (
              <Card
                key={flow.id}
                className="border-slate-200 shadow-sm hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div>
                  <CardHeader className="p-4 pb-2 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-2">
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] font-bold text-slate-700"
                      >
                        {flow.id}
                      </Badge>
                      <Badge className={`${flow.badgeColor} text-white text-[10px]`}>
                        {flow.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold text-slate-900 mt-2">
                      {flow.title}
                    </CardTitle>
                    <CardDescription className="text-xs font-mono text-slate-600">
                      {flow.sapSource}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Status & Justificativa:
                      </span>
                      <p className="text-slate-700 leading-tight font-medium mt-0.5">
                        {flow.reason}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Impacto no TMS:
                      </span>
                      <p className="text-slate-600 leading-tight mt-0.5">{flow.impact}</p>
                    </div>
                  </CardContent>
                </div>
                <div className="p-4 pt-0">
                  <div className="p-2 bg-sky-50 rounded border border-sky-100 text-[11px] text-sky-900">
                    <strong>Próximo Passo:</strong> {flow.nextStep}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 2: BLUEPRINT TÉCNICO COMPLETO */}
        <TabsContent value="blueprint" className="space-y-4 mt-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Mapeamento Técnico de Integrações (Blueprint SAP ↔ TMS CIAFAL)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Artefato formalizado contendo especificação de origens funcionais, objetos de
                    integração, chaves, frequência e transformações.
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    Versão: Blueprint SAP-TMS v0.4
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                      <th className="p-3">ID</th>
                      <th className="p-3">Processo</th>
                      <th className="p-3">Módulo TMS</th>
                      <th className="p-3">Origem Funcional</th>
                      <th className="p-3">Objeto SAP</th>
                      <th className="p-3">Campo SAP</th>
                      <th className="p-3">Campo TMS</th>
                      <th className="p-3">Direção</th>
                      <th className="p-3">Frequência</th>
                      <th className="p-3">RFC/BAPI/IDoc</th>
                      <th className="p-3">Status Técnico</th>
                      <th className="p-3">Pendência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {blueprintItems.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-bold text-slate-900">{b.id}</td>
                        <td className="p-3 font-sans font-bold text-slate-800">{b.process_name}</td>
                        <td className="p-3 font-sans text-slate-600">{b.tms_module || 'TMS'}</td>
                        <td className="p-3 font-sans text-slate-700 font-semibold">
                          {b.sap_object}
                        </td>
                        <td className="p-3 text-[#005596] font-semibold">
                          {b.table_or_view || 'N/D'}
                        </td>
                        <td
                          className="p-3 text-slate-800 text-[10px] max-w-xs truncate"
                          title={b.sap_field}
                        >
                          {b.sap_field}
                        </td>
                        <td
                          className="p-3 text-slate-800 text-[10px] max-w-xs truncate"
                          title={b.tms_field}
                        >
                          {b.tms_field}
                        </td>
                        <td className="p-3 font-sans">
                          <Badge variant="outline" className="text-[10px] bg-slate-50 font-bold">
                            {b.direction}
                          </Badge>
                        </td>
                        <td className="p-3 font-sans text-[10px] text-slate-600">{b.frequency}</td>
                        <td className="p-3 text-sky-800 font-semibold text-[10px]">
                          {b.rfc_bapi_idoc || 'N/D'}
                        </td>
                        <td className="p-3 font-sans">
                          <Badge
                            className={
                              b.status === 'Standard SAP' || b.status === 'Confirmado tecnicamente'
                                ? 'bg-emerald-600 text-white text-[10px]'
                                : b.status === 'Confirmado funcionalmente'
                                  ? 'bg-blue-600 text-white text-[10px]'
                                  : 'bg-amber-500 text-white text-[10px]'
                            }
                          >
                            {b.status}
                          </Badge>
                        </td>
                        <td className="p-3 font-sans text-[10px] text-rose-700 max-w-xs">
                          {b.pending_item || 'Nenhuma'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: WORKFLOW DE HOMOLOGAÇÃO */}
        <TabsContent value="workflow" className="space-y-4 mt-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
              <CardTitle className="text-base font-bold text-slate-900">
                Workflow de Homologação SAP por Interface (9 Etapas)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Ciclo formal de passagem de bastão entre Engenharia TMS e Consultoria ABAP.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 text-xs space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-2 font-mono text-[11px] text-center">
                {[
                  {
                    step: '1',
                    name: 'Identificada',
                    status: 'Concluído',
                    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                  },
                  {
                    step: '2',
                    name: 'Mapeada',
                    status: 'Concluído',
                    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                  },
                  {
                    step: '3',
                    name: 'Validada Func.',
                    status: 'Concluído',
                    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                  },
                  {
                    step: '4',
                    name: 'Validada Técn.',
                    status: 'Em andamento',
                    color: 'bg-blue-100 text-blue-800 border-blue-300',
                  },
                  {
                    step: '5',
                    name: 'Desenv. SAP',
                    status: 'Pendente ABAP',
                    color: 'bg-amber-100 text-amber-800 border-amber-300',
                  },
                  {
                    step: '6',
                    name: 'Testada DEV',
                    status: 'Parcial',
                    color: 'bg-amber-100 text-amber-800 border-amber-300',
                  },
                  {
                    step: '7',
                    name: 'Testada QAS',
                    status: 'Aguardando',
                    color: 'bg-slate-100 text-slate-700 border-slate-300',
                  },
                  {
                    step: '8',
                    name: 'Homologada',
                    status: 'Bloqueada',
                    color: 'bg-slate-100 text-slate-700 border-slate-300',
                  },
                  {
                    step: '9',
                    name: 'Produção',
                    status: 'Bloqueada',
                    color: 'bg-slate-100 text-slate-700 border-slate-300',
                  },
                ].map((st) => (
                  <div
                    key={st.step}
                    className={`p-3 rounded-lg border flex flex-col justify-between ${st.color}`}
                  >
                    <div className="font-bold text-xs">
                      {st.step}. {st.name}
                    </div>
                    <div className="text-[10px] mt-2 font-sans font-semibold">{st.status}</div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block text-xs">
                  Diretriz de Passagem para QAS/Produção:
                </span>
                <p className="text-slate-600 leading-relaxed text-xs">
                  Nenhuma interface é promovida para Homologada ou Produção sem evidência de testes
                  em QAS com mandante dedicado, validação de rollback em caso de falha de gravação
                  de transporte (VT01N) e auditoria de correlation_id em logs estruturados.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
export default SapIntegrationReadinessPage
