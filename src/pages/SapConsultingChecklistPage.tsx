import React, { useState } from 'react'
import {
  HelpCircle,
  FileSpreadsheet,
  Download,
  AlertCircle,
  FileText,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { exportToCsv, exportToXlsxXml, triggerPrintPdf } from '@/lib/exportUtils'

export interface SapConsultingItem {
  id: string
  fluxo: string
  assunto: string
  pergunta: string
  contexto: string
  impactoTMS: string
  status: 'Pendente Consultoria SAP' | 'Respondida' | 'Em Análise'
  responsavel: string
  resposta?: string
}

export const SapConsultingChecklistPage: React.FC = () => {
  const { toast } = useToast()
  const [filterFluxo, setFilterFluxo] = useState<string>('todos')

  const checklistItems: SapConsultingItem[] = [
    // 1. CARTEIRA ZSD35
    {
      id: 'SAP-CK-01',
      fluxo: 'Carteira (ZSD35)',
      assunto: 'Programa ABAP & Lógica de Extração',
      pergunta:
        'Qual o programa ABAP/relatório subjacente que alimenta a transação ZSD35 no SAP ECC 6.0?',
      contexto:
        'A ZSD35 é uma transação/report executável no SAP GUI. Para integração contínua com o TMS, precisamos saber se ela executa um Function Module existente reutilizável ou se o TMS deve chamar uma RFC Z dedicada desenvolvida pela consultoria.',
      impactoTMS:
        'Define a arquitetura do adaptador SapCarteiraService: chamada de RFC customizada dedicada vs polling estruturado.',
      status: 'Pendente Consultoria SAP',
      responsavel: 'Consultoria SAP SD/ABAP',
    },
    {
      id: 'SAP-CK-02',
      fluxo: 'Carteira (ZSD35)',
      assunto: 'Tabelas Fonte & Lógica de Seleção',
      pergunta:
        'Quais tabelas fonte do SAP SD compõem o saldo residual da ZSD35 (VBAK, VBAP, VBEP, VBUK, VBUP)?',
      contexto:
        'O TMS precisa calcular com exatidão a quantidade pendente de faturamento (KWMENG - LFIMG) para evitar planejar cargas com ordens já entregues ou bloqueadas.',
      impactoTMS:
        'Garante integridade matemática da carteira e evita montagem de cargas duplicadas.',
      status: 'Pendente Consultoria SAP',
      responsavel: 'Consultoria SAP SD',
    },
    {
      id: 'SAP-CK-03',
      fluxo: 'Carteira (ZSD35)',
      assunto: 'RFC-Enabled FM & Leitura Incremental',
      pergunta:
        'Existe Function Module RFC-enabled disponível ou necessidade de criar RFC Z com leitura incremental (delta por data/hora de alteração AEDAT/ERDAT)?',
      contexto:
        'Para evitar full table scans no SAP a cada ciclo de polling (15 minutos), a leitura incremental por Change Document ou carimbo de data/hora é mandatória.',
      impactoTMS:
        'Preserva performance e consumo de memória do SAP e garante latência sub-segundo no TMS.',
      status: 'Pendente Consultoria SAP',
      responsavel: 'Consultoria SAP SD/ABAP',
    },
    {
      id: 'SAP-CK-04',
      fluxo: 'Carteira (ZSD35)',
      assunto: 'Chave de Alteração, Volume e Frequência',
      pergunta:
        'Qual o volume médio diário de ordens abertas na ZSD35 e qual a chave primária de controle (VBELN + POSNR)?',
      contexto:
        'Mapeamento volumétrico para dimensionar a paginação da RFC e conciliação idempotente no TMS.',
      impactoTMS: 'Dimensionamento correto de buffer e política de paginação no cliente RFC.',
      status: 'Pendente Consultoria SAP',
      responsavel: 'Consultoria SAP SD / TI CIAFAL',
    },

    // 2. MOTORISTAS E VEÍCULOS ZSD004V_V2
    {
      id: 'SAP-CK-05',
      fluxo: 'Motoristas/Veículos (ZSD004V_V2)',
      assunto: 'Origem da View & Chave de Negócio',
      pergunta:
        'Qual a origem das tabelas subjacentes da view ZSD004V_V2 e qual a chave técnica primária (CPF + Placa)?',
      contexto:
        'No TMS, um motorista autônomo pode operar múltiplos cavalos mecânicos ou implementos e vice-versa.',
      impactoTMS:
        'Integridade referencial do modelo relacional no TMS e tratamento de duplicidade de pré-cadastro.',
      status: 'Pendente Consultoria SAP',
      responsavel: 'Consultoria SAP SD',
    },
    {
      id: 'SAP-CK-06',
      fluxo: 'Motoristas/Veículos (ZSD004V_V2)',
      assunto: 'Mecanismo de Leitura & Wrapper RFC',
      pergunta:
        'Qual mecanismo padrão de leitura da ZSD004V_V2 será fornecido: RFC_READ_TABLE ou novo wrapper RFC Z com paginação?',
      contexto:
        'A RFC_READ_TABLE standard possui limites de buffer (512 bytes) e restrições de governança. Um wrapper RFC Z dedicado oferece maior segurança e suporte a campos novos.',
      impactoTMS: 'Arquitetura do SapVeiculoService e extração estável de dados cadastrais.',
      status: 'Pendente Consultoria SAP',
      responsavel: 'Consultoria SAP SD/ABAP',
    },

    // 3. ITINERÁRIOS TVROT
    {
      id: 'SAP-CK-07',
      fluxo: 'Itinerários (TVROT)',
      assunto: 'Campos Utilizados & Sincronização',
      pergunta:
        'Quais campos da tabela TVROT são utilizados na CIAFAL (ROUTE, BEZEI, DISTZ, MEDST, TRAZTD) e qual a periodicidade de atualização?',
      contexto:
        'A tabela TVROT parametriza as rotas oficiais de entrega SD e suas distâncias de referência.',
      impactoTMS: 'Alinhamento entre código de itinerário do SAP e os roteirizadores do TMS.',
      status: 'Pendente Consultoria SAP',
      responsavel: 'Consultoria SAP SD',
    },

    // 4. CLIENTES E SHIP-TO
    {
      id: 'SAP-CK-08',
      fluxo: 'Clientes (KNA1/VBPA)',
      assunto: 'Endereço Oficial de Entrega & Ship-to WE',
      pergunta:
        'A tabela KNA1 é suficiente para o endereço ou existem múltiplos parceiros de entrega Ship-to (VBPA com função parceiro WE)?',
      contexto:
        'O TMS necessita do endereço exato de descarga para o motor de geocoding e cálculo de pedágios e ANTT.',
      impactoTMS:
        'Evita erros de roteirização quando o local de entrega é filial/obra diferente do pagador.',
      status: 'Pendente Consultoria SAP',
      responsavel: 'Consultoria SAP SD',
    },

    // 5. ESTOQUE MB52
    {
      id: 'SAP-CK-09',
      fluxo: 'Estoque (MB52)',
      assunto: 'Objeto de Saldo Livre & Depósitos de Expedição',
      pergunta:
        'Qual BAPI/RFC fornece o saldo de estoque livre (LABST), bloqueado (SPEME), reservado e por centro/depósito/lote da CIAFAL?',
      contexto:
        'O Planejador de Cargas valida se há estoque físico pronto antes de aprovar uma simulação.',
      impactoTMS: 'Prevenção de carregamento sem material pronto na fábrica.',
      status: 'Pendente Consultoria SAP',
      responsavel: 'Consultoria SAP MM/SD',
    },

    // 6. CRÉDITO FINANCEIRO
    {
      id: 'SAP-CK-10',
      fluxo: 'Crédito (KNKK)',
      assunto: 'Fonte Oficial & Status de Crédito',
      pergunta:
        'Qual a fonte oficial de crédito no SAP (BAPI_CREDIT_CHECK, tabela KNKK ou transação VKM1) e como são retornados limite, exposição e bloqueios?',
      contexto:
        'A regra inegociável do TMS CIAFAL exige validação estritamente por valor financeiro (R$).',
      impactoTMS: 'Bloqueio imediato de montagem de carga se cliente estiver inadimplente.',
      status: 'Pendente Consultoria SAP',
      responsavel: 'Consultoria SAP FI/SD',
    },

    // 7. CRIAÇÃO DE TRANSPORTE
    {
      id: 'SAP-CK-11',
      fluxo: 'Transportes (VT01N)',
      assunto: 'BAPI/RFC Standard ou Z de Criação',
      pergunta:
        'Qual BAPI (BAPI_SHIPMENT_CREATE) ou RFC Z criará a Ordem de Transporte no SAP após o leilão e quais campos obrigatórios são exigidos pelo customizing?',
      contexto:
        'Mapeamento de tipo de transporte (SHTYPE), ponto de planejamento (TPLST), rota (ROUTE), motorista (LIFNR/SIGNI) e entregas.',
      impactoTMS:
        'Geração oficial do documento no SAP e bloqueio em DEV/QAS até homologação formal.',
      status: 'Pendente Consultoria SAP',
      responsavel: 'Consultoria SAP LE-TRA/ABAP',
    },
    {
      id: 'SAP-CK-12',
      fluxo: 'Transportes (VT01N)',
      assunto: 'Retorno Oficial do Número TKNUM & Rollback',
      pergunta:
        'Como será retornado o número oficial do transporte (TKNUM) e qual o tratamento de rollback em caso de falha de validação no SAP?',
      contexto:
        'O TMS exige resposta síncrona ou webhook assíncrono idempotente preservando correlation_id.',
      impactoTMS: 'Reconciliação bidirecional auditável entre a Mesa de Fretes e o SAP.',
      status: 'Pendente Consultoria SAP',
      responsavel: 'Consultoria SAP LE-TRA/ABAP',
    },
  ]

  const filteredItems = checklistItems.filter(
    (item) => filterFluxo === 'todos' || item.fluxo.includes(filterFluxo),
  )

  const handleExport = (format: 'CSV' | 'XLSX' | 'PDF') => {
    const versionStr = 'v0.4 (Sprint 4.2)'
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `CIAFAL_Checklist_Consultoria_SAP_${dateStr}`

    const headers = [
      'ID',
      'Fluxo / Módulo',
      'Assunto Técnico',
      'Pergunta Objetiva para Consultoria SAP',
      'Contexto de Engenharia',
      'Impacto no TMS CIAFAL',
      'Status',
      'Responsável Designado',
    ]

    const rows = filteredItems.map((i) => [
      i.id,
      i.fluxo,
      i.assunto,
      i.pergunta,
      i.contexto,
      i.impactoTMS,
      i.status,
      i.responsavel,
    ])

    if (format === 'CSV') {
      exportToCsv(filename, headers, rows)
      toast({
        title: 'Checklist CSV Exportado',
        description: `Arquivo ${filename}.csv gerado com sucesso com ${rows.length} perguntas técnicas.`,
      })
    } else if (format === 'XLSX') {
      exportToXlsxXml(filename, 'Checklist SAP', headers, rows)
      toast({
        title: 'Checklist XLSX Exportado',
        description: `Arquivo ${filename}.xls gerado com formatação e estilos oficiais para a consultoria.`,
      })
    } else {
      triggerPrintPdf(`CIAFAL - Checklist Técnico Consultoria SAP ${versionStr}`)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <HelpCircle className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Checklist Técnico SAP — TMS CIAFAL
            </h1>
            <Badge className="bg-[#005596] text-white text-xs">Documento Oficial v0.4</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Questionário técnico formalizado por assunto para alinhamento com a consultoria ABAP/SAP
            ECC 6.0 EHP8.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('CSV')}
            className="text-xs border-slate-300 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('XLSX')}
            className="text-xs border-slate-300 gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Exportar XLSX
          </Button>
          <Button
            size="sm"
            onClick={() => handleExport('PDF')}
            className="text-xs bg-[#005596] hover:bg-[#004070] gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            Imprimir / Salvar PDF
          </Button>
        </div>
      </div>

      {/* Corporate Guidance Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs space-y-1.5 text-amber-900">
        <div className="flex items-center space-x-2 font-bold text-amber-950">
          <AlertCircle className="w-4 h-4 text-amber-700" />
          <span>DIRETRIZ DE ENGENHARIA — OBJETOS TÉCNICOS A CONFIRMAR:</span>
        </div>
        <p className="leading-relaxed text-amber-900/90">
          As transações <strong>ZSD35 (Carteira)</strong> e{' '}
          <strong>ZSD004V_V2 (Motoristas/Veículos)</strong> são fontes funcionais confirmadas.
          Enquanto a consultoria SAP não homologar o Function Module ou RFC Z correspondente, o
          sistema registra formalmente o status como{' '}
          <strong className="text-amber-950">"OBJETO RFC A CONFIRMAR"</strong> sem inventar chamadas
          fictícias.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-lg w-fit">
        {[
          { id: 'todos', label: 'Todos os Assuntos (12)' },
          { id: 'Carteira', label: '1. Carteira ZSD35 (4)' },
          { id: 'Motoristas', label: '2. Veículos ZSD004V_V2 (2)' },
          { id: 'Itinerários', label: '3. Itinerários TVROT (1)' },
          { id: 'Clientes', label: '4. Clientes KNA1 (1)' },
          { id: 'Estoque', label: '5. Estoque MB52 (1)' },
          { id: 'Crédito', label: '6. Crédito KNKK (1)' },
          { id: 'Transportes', label: '7. Transportes VT01N (2)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterFluxo(tab.id)}
            className={`text-xs px-3 py-1.5 rounded-md font-semibold transition ${
              filterFluxo === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredItems.map((q) => (
          <Card key={q.id} className="border-slate-200 shadow-sm hover:border-slate-300 transition">
            <CardHeader className="p-4 pb-2 bg-slate-50/50 border-b border-slate-100">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="font-mono text-xs font-bold text-slate-700">
                    {q.id}
                  </Badge>
                  <Badge className="bg-[#005596] text-white text-[10px]">{q.fluxo}</Badge>
                  <Badge variant="outline" className="text-[10px] text-slate-600 bg-white">
                    {q.assunto}
                  </Badge>
                </div>
                <Badge
                  variant="outline"
                  className="text-amber-700 bg-amber-50 border-amber-300 font-semibold text-xs"
                >
                  {q.status}
                </Badge>
              </div>
              <CardTitle className="text-base font-bold text-slate-900 mt-2">
                {q.pergunta}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Contexto Técnico & Motivação:
                  </span>
                  <p className="text-slate-700 leading-relaxed">{q.contexto}</p>
                </div>
                <div className="bg-sky-50/60 p-3 rounded-lg border border-sky-100">
                  <span className="text-[10px] uppercase font-bold text-sky-700 block mb-1">
                    Impacto Operacional no TMS CIAFAL:
                  </span>
                  <p className="text-sky-900 leading-relaxed">{q.impactoTMS}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-100">
                <span>
                  <strong>Responsável Designado:</strong> {q.responsavel}
                </span>
                <span className="text-amber-600 font-medium">Aguardando Workshop Técnico</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
export default SapConsultingChecklistPage
