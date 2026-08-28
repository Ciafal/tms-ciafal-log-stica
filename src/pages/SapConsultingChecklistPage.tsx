import React, { useState } from 'react'
import {
  HelpCircle,
  FileSpreadsheet,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  Layers,
  FileText,
  Server,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

interface SapConsultingItem {
  id: string
  fluxo: 'Carteira (ZSD35)' | 'Motoristas/Veículos (ZSD004V_V2)' | 'Transportes (VT01N)'
  pergunta: string
  contexto: string
  impactoTMS: string
  status: 'Pendente' | 'Respondida' | 'Em Análise'
  resposta?: string
}

export const SapConsultingChecklistPage: React.FC = () => {
  const { toast } = useToast()
  const [filterFluxo, setFilterFluxo] = useState<string>('todos')

  const checklistItems: SapConsultingItem[] = [
    // 1. CARTEIRA ZSD35
    {
      id: 'SAP-Q-01',
      fluxo: 'Carteira (ZSD35)',
      pergunta: 'Qual programa ABAP padrão ou Z customizado alimenta a transação ZSD35?',
      contexto:
        'Identificar a lógica de seleção de dados (ex: ZSD_REL_CARTEIRA) para espelhar filtros e critérios de status no TMS.',
      impactoTMS:
        'Garante que os mesmos pedidos visíveis na ZSD35 apareçam no Planejador de Cargas.',
      status: 'Pendente',
    },
    {
      id: 'SAP-Q-02',
      fluxo: 'Carteira (ZSD35)',
      pergunta: 'Existe Function Module ou BAPI reutilizável que encapsula a leitura da ZSD35?',
      contexto:
        'Evitar leitura direta de tabelas relacionais (VBAK/VBAP/VBEP) caso já exista lógica de negócio encapsulada.',
      impactoTMS: 'Reduz tempo de desenvolvimento ABAP e garante fidelidade de regras de negócio.',
      status: 'Pendente',
    },
    {
      id: 'SAP-Q-03',
      fluxo: 'Carteira (ZSD35)',
      pergunta:
        'Existe RFC-enabled Function Module disponível ou será necessária a criação de uma nova RFC Z?',
      contexto:
        'Conexão do TMS com SAP ECC 6.0 exige função remota com permissões de comunicação RFC.',
      impactoTMS:
        'Define se o TMS usará uma RFC existente ou se a consultoria precisará criar ZSD_RFC_CARTEIRA_GET.',
      status: 'Pendente',
    },
    {
      id: 'SAP-Q-04',
      fluxo: 'Carteira (ZSD35)',
      pergunta: 'Quais tabelas e views compõem a fonte de dados da carteira?',
      contexto:
        'Mapear chaves e relacionamentos: VBAK (Cabeçalho), VBAP (Itens), VBEP (Divisões de Remessa), VBPA (Parceiros/Ship-to) e TVROT (Itinerários).',
      impactoTMS: 'Validação da consistência dos 12 campos obrigatórios do Blueprint.',
      status: 'Pendente',
    },
    {
      id: 'SAP-Q-05',
      fluxo: 'Carteira (ZSD35)',
      pergunta: 'Qual é o volume médio de itens em carteira aberta e o tempo de resposta estimado?',
      contexto: 'Dimensionamento de paginação, timeout de chamada RFC e buffer de sincronização.',
      impactoTMS: 'Configuração do Circuit Breaker (timeout padrão de 10s e paginação por blocos).',
      status: 'Pendente',
    },
    {
      id: 'SAP-Q-06',
      fluxo: 'Carteira (ZSD35)',
      pergunta:
        'É possível realizar leitura incremental (Delta Sync) com base em data/hora de alteração (AEDAT/CPUDT/ERDAT)?',
      contexto:
        'Se o SAP não fornecer timestamp de alteração, o TMS terá que fazer full-load a cada 15 min.',
      impactoTMS: 'Otimização de consumo de rede e carga no servidor de aplicação SAP ECC.',
      status: 'Pendente',
    },
    {
      id: 'SAP-Q-07',
      fluxo: 'Carteira (ZSD35)',
      pergunta:
        'Qual o mecanismo recomendado pela consultoria: RFC síncrona com polling ou disparo de IDoc / qRFC assíncrono?',
      contexto:
        'Avaliar latência e volume para definir o canal ideal entre o gateway e o barramento.',
      impactoTMS: 'Arquitetura do adaptador no SapGateway.',
      status: 'Pendente',
    },

    // 2. MOTORISTAS E VEÍCULOS ZSD004V_V2
    {
      id: 'SAP-Q-08',
      fluxo: 'Motoristas/Veículos (ZSD004V_V2)',
      pergunta:
        'A view ZSD004V_V2 é diretamente acessível via RFC_READ_TABLE ou requer RFC dedicada?',
      contexto:
        'Verificar se a view de banco ZSD004V_V2 pode ser lida com RFC padrão com proteção de autorização.',
      impactoTMS: 'Sincronização cadastral da fila de disponibilidade e pré-cadastros.',
      status: 'Pendente',
    },
    {
      id: 'SAP-Q-09',
      fluxo: 'Motoristas/Veículos (ZSD004V_V2)',
      pergunta: 'Quais campos compõem a chave primária técnica da view ZSD004V_V2?',
      contexto:
        'Garantir identificação unívoca de motoristas e veículos (MANDT + CPF + Placa do Cavalo).',
      impactoTMS: 'Prevenção de duplicidades no cadastro de veículos do TMS.',
      status: 'Pendente',
    },
    {
      id: 'SAP-Q-10',
      fluxo: 'Motoristas/Veículos (ZSD004V_V2)',
      pergunta:
        'Como identificar alterações de bloqueio operacional ou documental do motorista/veículo no SAP?',
      contexto:
        'Garantir que motoristas bloqueados no SAP não possam receber propostas na Mesa de Fretes.',
      impactoTMS: 'Motor de elegibilidade da Mesa de Fretes bloqueia propostas automaticamente.',
      status: 'Pendente',
    },
    {
      id: 'SAP-Q-11',
      fluxo: 'Motoristas/Veículos (ZSD004V_V2)',
      pergunta: 'Qual a frequência ideal de sincronização da base de motoristas/veículos?',
      contexto:
        'Frequência proposta: Carga diária completa + sincronização incremental a cada 30 min.',
      impactoTMS: 'Parametrização do scheduler no backend do TMS.',
      status: 'Pendente',
    },

    // 3. TRANSPORTES VT01N
    {
      id: 'SAP-Q-12',
      fluxo: 'Transportes (VT01N)',
      pergunta:
        'A consultoria disponibilizará BAPI_SHIPMENT_CREATE ou uma RFC wrapper customizada com tratamento de erros?',
      contexto: 'Criação do documento de transporte após encerramento do leilão na Mesa de Fretes.',
      impactoTMS:
        'Permitirá geração do número oficial de transporte VT01N (TKNUM) quando SAP_WRITE_ENABLED = true.',
      status: 'Pendente',
    },
  ]

  const filteredItems = checklistItems.filter(
    (item) => filterFluxo === 'todos' || item.fluxo === filterFluxo,
  )

  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Fluxo',
      'Pergunta Técnica para Consultoria',
      'Contexto e Detalhes',
      'Impacto no TMS',
      'Status',
    ]
    const rows = filteredItems.map((i) => [
      i.id,
      i.fluxo,
      `"${i.pergunta.replace(/"/g, '""')}"`,
      `"${i.contexto.replace(/"/g, '""')}"`,
      `"${i.impactoTMS.replace(/"/g, '""')}"`,
      i.status,
    ])
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `CIAFAL_Checklist_Consultoria_SAP_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({
      title: 'Checklist Exportado',
      description: 'O arquivo CSV com as pendências técnicas para a Consultoria SAP foi baixado.',
    })
  }

  const handleExportPdf = () => {
    window.print()
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <HelpCircle className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Pendências & Perguntas para Consultoria SAP
            </h1>
            <Badge className="bg-[#005596] text-white text-xs">Sprint 4.1</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Questionário técnico formalizado para alinhamento com a consultoria ABAP/SAP ECC 6.0
            EHP8.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="text-xs border-slate-300 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV / XLSX
          </Button>
          <Button
            size="sm"
            onClick={handleExportPdf}
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
      <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg w-fit">
        {[
          'todos',
          'Carteira (ZSD35)',
          'Motoristas/Veículos (ZSD004V_V2)',
          'Transportes (VT01N)',
        ].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterFluxo(tab)}
            className={`text-xs px-3 py-1.5 rounded-md font-semibold transition ${
              filterFluxo === tab
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab === 'todos' ? 'Todos os Fluxos' : tab}
          </button>
        ))}
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredItems.map((q, idx) => (
          <Card key={q.id} className="border-slate-200 shadow-sm hover:border-slate-300 transition">
            <CardHeader className="p-4 pb-2 bg-slate-50/50 border-b border-slate-100">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="font-mono text-xs font-bold text-slate-700">
                    {q.id}
                  </Badge>
                  <Badge className="bg-[#005596] text-white text-[10px]">{q.fluxo}</Badge>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
