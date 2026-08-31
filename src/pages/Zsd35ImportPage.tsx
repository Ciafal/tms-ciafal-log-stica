import React, { useState, useEffect } from 'react'
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  ArrowRight,
  Database,
  Filter,
  History,
  ShieldCheck,
  ShieldAlert,
  Download,
  RefreshCw,
  Sliders,
  Table as TableIcon,
  Trash2,
  Info,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import {
  processZsd35Rows,
  parseZsd35CsvText,
  downloadZsd35aTemplateFile,
  downloadZsd35aExampleFile,
  Zsd35ImportValidationReport,
  Zsd35ValidatedOrder,
  ZSD35A_V3_OFFICIAL_FIELDS,
} from '@/domain/zsd35ImportEngine'

export const Zsd35ImportPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [file, setFile] = useState<File | null>(null)
  const [report, setReport] = useState<Zsd35ImportValidationReport | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [historyLogs, setHistoryLogs] = useState<any[]>([])
  const [sapImportsList, setSapImportsList] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import')
  const [customMappings, setCustomMappings] = useState<Record<string, string>>({})
  const [isDeletingBatch, setIsDeletingBatch] = useState(false)
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'VALID' | 'WARNING'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  // Carrega mapeamento e histórico se permitido
  useEffect(() => {
    const loadMappings = async () => {
      try {
        const mappings = await TmsService.getZsd35ColumnMappings()
        if (mappings && mappings.length > 0) {
          const defaultMap = mappings.find((m) => m.is_default) || mappings[0]
          if (defaultMap?.mappings_json) {
            setCustomMappings(defaultMap.mappings_json)
          }
        }
      } catch {
        /* fallback para mapeamento nativo */
      }
    }
    loadMappings()
  }, [])

  const loadAuditHistory = async () => {
    if (!permissions.canViewZsd35History && !permissions.canViewAuditLogs) return
    try {
      const [logs, imports] = await Promise.all([
        TmsService.getAuditLogs({
          limit: 30,
        }),
        TmsService.getSapImports(),
      ])
      const zsdLogs = logs.filter(
        (l) =>
          l.action === 'ZSD35_EXCEL_IMPORTED' ||
          l.action === 'ZSD35A_EXCEL_IMPORT' ||
          (l as any).action_type === 'ZSD35A_EXCEL_IMPORT' ||
          (l as any).action_type === 'DELETE_EXCEL_QAS_BATCH',
      )
      setHistoryLogs(zsdLogs)
      setSapImportsList(imports)
    } catch {
      /* fallback */
    }
  }

  useEffect(() => {
    if (activeTab === 'history') {
      loadAuditHistory()
    }
  }, [activeTab])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    if (!permissions.canImportZsd35) {
      toast({
        title: 'Acesso Negado (RBAC: zsd35.importar)',
        description: 'Seu usuário não possui permissão para importar planilhas ZSD35A.',
        variant: 'destructive',
      })
      return
    }

    const fileName = uploadedFile.name.toLowerCase()
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.csv')) {
      toast({
        title: 'Formato de Arquivo Rejeitado',
        description:
          'Por motivos de segurança cibernética corporativa, são aceitos exclusivamente arquivos .xlsx ou .csv padrão. Arquivos com macros (.xlsm) ou executáveis são bloqueados.',
        variant: 'destructive',
      })
      return
    }

    if (uploadedFile.size > 25 * 1024 * 1024) {
      toast({
        title: 'Arquivo Excede o Limite',
        description: 'O tamanho máximo permitido para o arquivo ZSD35A é de 25 MB.',
        variant: 'destructive',
      })
      return
    }

    setFile(uploadedFile)
    setIsProcessing(true)

    const isCsv = fileName.endsWith('.csv') || fileName.endsWith('.txt')

    if (isCsv) {
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result as string
          const rawRows = parseZsd35CsvText(text)
          const validationReport = processZsd35Rows(rawRows, customMappings, {
            fileName: uploadedFile.name,
            userName: user?.name || user?.email,
          })
          setReport(validationReport)
          toast({
            title: 'Arquivo CSV ZSD35A Processado',
            description: `${validationReport.validOrders.length} pedidos validados. ${validationReport.ignoredRowsCount} subtotais/cabeçalhos descartados.`,
          })
        } catch (err: any) {
          toast({
            title: 'Erro ao processar CSV',
            description: err?.message || 'Arquivo com formato inválido.',
            variant: 'destructive',
          })
        } finally {
          setIsProcessing(false)
        }
      }
      reader.readAsText(uploadedFile, 'UTF-8')
    } else {
      // XLSX
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result
          const wb = XLSX.read(bstr, { type: 'binary', cellDates: true })
          const sheetName =
            wb.SheetNames.find(
              (s) =>
                s.toLowerCase().includes('zsd35') ||
                s.toLowerCase().includes('carga') ||
                s.toLowerCase().includes('carteira'),
            ) || wb.SheetNames[0]

          const ws = wb.Sheets[sheetName]
          const rawJson = XLSX.utils.sheet_to_json(ws, { defval: '' })

          const validationReport = processZsd35Rows(rawJson, customMappings, {
            fileName: uploadedFile.name,
            userName: user?.name || user?.email,
          })
          setReport(validationReport)
          toast({
            title: 'Planilha ZSD35A Lida com Sucesso',
            description: `${validationReport.validOrders.length} pedidos validados. ${validationReport.ignoredRowsCount} subtotais descartados.`,
          })
        } catch (err: any) {
          toast({
            title: 'Erro ao processar arquivo Excel',
            description: err?.message || 'Formato de planilha inválido.',
            variant: 'destructive',
          })
        } finally {
          setIsProcessing(false)
        }
      }
      reader.readAsBinaryString(uploadedFile)
    }
  }

  const handleConfirmImport = async () => {
    if (!report || report.validOrders.length === 0) return

    if (!permissions.canImportZsd35) {
      toast({
        title: 'Permissão Negada',
        description: 'Seu usuário não possui permissão RBAC zsd35.importar.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)

    try {
      const res = await TmsService.importZsd35aOrdersBatch(
        report,
        user?.email || 'comercial@ciafal.com.br',
        user?.name || 'Operador Comercial CIAFAL',
      )

      if (res.success) {
        toast({
          title: 'Importação ZSD35A Concluída com Sucesso',
          description: `${res.createdCount} novos pedidos gravados e ${res.updatedCount} atualizados na Carteira oficial. Auditoria registrada.`,
        })

        setReport(null)
        setFile(null)
      } else {
        toast({
          title: 'Erro na importação para o banco',
          description: res.message,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro na importação para o banco',
        description: err?.message || 'Falha ao salvar registros.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteQasBatch = async (batchId?: string) => {
    if (
      !confirm(
        'ATENÇÃO: Deseja realmente excluir esta massa de homologação (EXCEL_QAS)? Registros oficiais do SAP permanecerão 100% protegidos.',
      )
    ) {
      return
    }

    setIsDeletingBatch(true)
    try {
      const res = await TmsService.deleteExcelQasBatch(
        batchId,
        user?.email || 'admin@ciafal.logistica',
        user?.name || 'Gestor Logístico',
      )
      toast({
        title: 'Massa Homologação Excluída',
        description: res.message,
      })
      await loadAuditHistory()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsDeletingBatch(false)
    }
  }

  // Permissão de acesso à tela
  const hasAccess = permissions.canImportZsd35 || permissions.canViewZsd35History

  if (!hasAccess) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Acesso Restrito ao Módulo ZSD35A</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Seu perfil não possui permissão para importar ou visualizar o histórico de cargas ZSD35A
          (RBAC requerido: <code>zsd35.importar</code> ou <code>zsd35.ver_historico</code>).
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header com Identidade CIAFAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Importação da Carteira ZSD35A (.xlsx / .csv)
            </h1>
            <Badge className="bg-[#005596] text-white text-[10px] font-bold">
              ESTRUTURA OFICIAL — 27 CAMPOS
            </Badge>
            <Badge
              variant="outline"
              className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold"
            >
              Excel / QAS
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Carga ZSD35A para homologação QAS. Alimenta o mesmo objeto "Pedido TMS" da integração
            online SAP, com sanitização contra formula injection.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadZsd35aTemplateFile}
            className="text-xs h-8 border-slate-300 text-[#005596] hover:bg-sky-50 font-semibold"
            title="Baixa a planilha em branco com os 27 cabeçalhos canônicos da ZSD35A V3"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Baixar Template ZSD35A
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={downloadZsd35aExampleFile}
            className="text-xs h-8 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            title="Baixa exemplo preenchido com dados fictícios da ZSD35A V3"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Baixar Exemplo Preenchido
          </Button>

          <Link to="/tms/zsd35-mapeamento">
            <Button variant="outline" size="sm" className="text-xs h-8 border-slate-300">
              <Sliders className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
              Mapeamento
            </Button>
          </Link>

          <Link to="/tms/carteira-pedidos">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 bg-[#005596] text-white hover:bg-sky-800"
            >
              <TableIcon className="w-3.5 h-3.5 mr-1.5" />
              Ver Carteira SAP
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'import'
              ? 'border-[#005596] text-[#005596]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          Carga de Arquivo ZSD35A
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'border-[#005596] text-[#005596]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Histórico & Lotes de Homologação
        </button>
      </div>

      {activeTab === 'import' && (
        <>
          {/* Bloco Visual de Identificação do Layout Padrão ZSD35A V3 */}
          <Card className="bg-gradient-to-r from-sky-50 via-white to-indigo-50 border-sky-200 shadow-sm">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#005596] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs uppercase tracking-wide text-[#005596]">
                      PADRÃO ZSD35A V3
                    </span>
                    <Badge className="bg-[#005596] text-white text-[10px] font-bold px-1.5 py-0">
                      27 CAMPOS
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">
                    Importação baseada no layout operacional oficial “ZSD35 Carga TMS v3”. O arquivo
                    é carregado sem necessidade de conversão manual e posteriormente enriquecido
                    pelo TMS com dados de estoque, PCP, crédito, logística e disponibilidade.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Box */}
          <Card className="bg-white border-dashed border-2 border-slate-300 shadow-sm">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center text-[#005596]">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Selecione a Planilha ZSD35A (.xlsx ou .csv)
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-lg">
                  Compatível com a estrutura oficial ZSD35A V3 de 27 campos utilizada pela CIAFAL.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx, .csv"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                  />
                  <span className="inline-flex items-center justify-center px-4 py-2 bg-[#005596] text-white text-xs font-bold rounded-lg hover:bg-blue-800 transition shadow-sm">
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    {isProcessing ? 'Processando e Validando...' : 'Escolher Arquivo ZSD35A'}
                  </span>
                </label>
              </div>

              {file && (
                <div className="text-xs font-mono text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                  Arquivo: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </CardContent>
          </Card>

          {/* Relatório de Validação & Prévia */}
          {report && (
            <div className="space-y-4">
              {/* Status do Reconhecimento de Layout */}
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  report.layoutRecognized
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  {report.layoutRecognized ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  )}
                  <div>
                    <strong>{report.layoutMessage}</strong> — Origem:{' '}
                    <code>{report.origem_dado}</code> (Layout: <code>{report.layoutVersion}</code>)
                  </div>
                </div>
                <Badge
                  className={
                    report.layoutRecognized
                      ? 'bg-emerald-600 text-white text-[10px]'
                      : 'bg-rose-600 text-white text-[10px]'
                  }
                >
                  {report.layoutRecognized ? 'LAYOUT V3 RECONHECIDO' : 'NÃO RECONHECIDO'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-3">
                    <div className="text-[9px] font-bold uppercase text-slate-400">Total Lidas</div>
                    <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                      {report.totalRowsRead}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-3">
                    <div className="text-[9px] font-bold uppercase text-slate-400">Pedidos</div>
                    <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                      {report.uniqueOrdersCount}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-3">
                    <div className="text-[9px] font-bold uppercase text-slate-400">Clientes</div>
                    <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                      {report.uniqueClientsCount}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-3">
                    <div className="text-[9px] font-bold uppercase text-slate-400">Materiais</div>
                    <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                      {report.uniqueMaterialsCount}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-3">
                    <div className="text-[9px] font-bold uppercase text-sky-700">Peso Total</div>
                    <div className="text-lg font-black text-sky-900 font-mono mt-0.5">
                      {report.totalWeightTon} t
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-3">
                    <div className="text-[9px] font-bold uppercase text-emerald-700">
                      🟢 Válidos
                    </div>
                    <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">
                      {report.validCount}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-3">
                    <div className="text-[9px] font-bold uppercase text-amber-600">🟡 Alertas</div>
                    <div className="text-lg font-black text-amber-600 font-mono mt-0.5">
                      {report.warningCount}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-3">
                    <div className="text-[9px] font-bold uppercase text-rose-600">
                      🔴 Rejeitados
                    </div>
                    <div className="text-lg font-black text-rose-600 font-mono mt-0.5">
                      {report.rejectedRowsCount}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabela de Pré-visualização com Rolagem Horizontal para os 27 Campos */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-xs font-bold uppercase text-slate-800">
                      Pré-visualização dos 27 Campos ZSD35A V3 ({report.validOrders.length}{' '}
                      registros válidos)
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Estrutura espelho do arquivo operacional ZSD35A V3. Navegue horizontalmente
                      para conferir todas as 27 colunas.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Buscar pedido, cliente ou material..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8 text-xs w-48"
                    />

                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                      <button
                        onClick={() => setPreviewFilter('ALL')}
                        className={`px-2 py-1 rounded font-semibold ${
                          previewFilter === 'ALL'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Todos ({report.validOrders.length})
                      </button>
                      <button
                        onClick={() => setPreviewFilter('VALID')}
                        className={`px-2 py-1 rounded font-semibold ${
                          previewFilter === 'VALID'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-emerald-700 hover:text-emerald-900'
                        }`}
                      >
                        🟢 Válidos ({report.validCount})
                      </button>
                      <button
                        onClick={() => setPreviewFilter('WARNING')}
                        className={`px-2 py-1 rounded font-semibold ${
                          previewFilter === 'WARNING'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-amber-700 hover:text-amber-900'
                        }`}
                      >
                        🟡 Alertas ({report.warningCount})
                      </button>
                    </div>

                    <Button
                      onClick={handleConfirmImport}
                      disabled={isSaving || report.validOrders.length === 0}
                      size="sm"
                      className="bg-[#005596] hover:bg-[#004478] text-white text-xs h-8 font-bold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      {isSaving ? 'Gravando e Auditando...' : 'Confirmar Importação ZSD35A'}
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[2400px]">
                    <thead className="bg-slate-100/90 border-b border-slate-200 text-[10px] uppercase text-slate-600 font-bold font-mono">
                      <tr>
                        <th className="p-2 text-center w-12 bg-slate-200/50">#</th>
                        <th className="p-2 text-center w-16">1. Q.Dias</th>
                        <th className="p-2 text-center w-16">2. Gerar</th>
                        <th className="p-2 text-center w-16">3. Inco</th>
                        <th className="p-2 w-32">4. Doc. Vendas</th>
                        <th className="p-2 text-center w-16">5. Região</th>
                        <th className="p-2 w-36">6. Cidade</th>
                        <th className="p-2 text-right w-24">7. Qtde Real</th>
                        <th className="p-2 text-center w-20">8. Qtde.Amar.</th>
                        <th className="p-2 text-right w-20">9. Est. Sider</th>
                        <th className="p-2 w-56">10. Texto breve de material</th>
                        <th className="p-2 text-right w-24">11. Valor do Frete</th>
                        <th className="p-2 w-52">12. Recebedor Merc</th>
                        <th className="p-2 text-right w-28">13. Limite de Crédito</th>
                        <th className="p-2 w-28">14. Emissor da ordem</th>
                        <th className="p-2 text-right w-28">15. Compromisso esp.</th>
                        <th className="p-2 w-28">16. Condição Pag.</th>
                        <th className="p-2 w-36">17. Motivo Estoque</th>
                        <th className="p-2 text-right w-24">18. Qtde.Estoque</th>
                        <th className="p-2 text-right w-20">19. Saldo</th>
                        <th className="p-2 text-center w-24">20. Data Pedido</th>
                        <th className="p-2 text-center w-20">21. Hora Pedido</th>
                        <th className="p-2 text-right w-24">22. Qtde Ordem</th>
                        <th className="p-2 text-center w-28">23. Data Remessa(Semana)</th>
                        <th className="p-2 text-center w-20">24. Itinerário</th>
                        <th className="p-2 w-52">25. Motivo Crédito</th>
                        <th className="p-2 text-right w-28">26. Total a Receber</th>
                        <th className="p-2 text-right w-24">27. Estoque Total</th>
                        <th className="p-2 text-center w-20 bg-slate-200/50">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-800">
                      {report.validOrders
                        .filter((ord) => {
                          if (previewFilter === 'VALID' && ord.validation_status !== 'VALID')
                            return false
                          if (previewFilter === 'WARNING' && ord.validation_status !== 'WARNING')
                            return false
                          if (searchTerm.trim()) {
                            const term = searchTerm.toLowerCase()
                            return (
                              ord.order_number.toLowerCase().includes(term) ||
                              ord.customer_name.toLowerCase().includes(term) ||
                              ord.material_description.toLowerCase().includes(term) ||
                              ord.destination_city.toLowerCase().includes(term)
                            )
                          }
                          return true
                        })
                        .slice(0, 50)
                        .map((ord, idx) => (
                          <tr key={idx} className="hover:bg-sky-50/40">
                            <td className="p-2 text-center text-slate-400 font-bold bg-slate-50/50">
                              {idx + 1}
                            </td>
                            {/* 1. Q.Dias */}
                            <td className="p-2 text-center">
                              <Badge variant="outline" className="text-[9px] px-1 py-0">
                                {ord.raw_q_dias || ord.walletDays || 0}
                              </Badge>
                            </td>
                            {/* 2. Gerar */}
                            <td className="p-2 text-center text-slate-600">não</td>
                            {/* 3. Inco */}
                            <td className="p-2 text-center font-bold text-slate-700">
                              {ord.incoterms || 'CIF'}
                            </td>
                            {/* 4. Documento de vendas */}
                            <td className="p-2 font-bold text-slate-900">
                              {ord.order_number}
                              {ord.item_number && ord.item_number !== '000010' && (
                                <span className="text-[10px] font-normal text-slate-400">
                                  /{ord.item_number}
                                </span>
                              )}
                            </td>
                            {/* 5. Região */}
                            <td className="p-2 text-center font-bold text-slate-600">{ord.uf}</td>
                            {/* 6. Cidade */}
                            <td className="p-2 font-sans font-medium">{ord.destination_city}</td>
                            {/* 7. Qtde Real */}
                            <td className="p-2 text-right font-bold text-sky-900">
                              {ord.weight_ton.toFixed(3)}
                            </td>
                            {/* 8. Qtde.Amar. */}
                            <td className="p-2 text-center text-slate-600">-</td>
                            {/* 9. Est. Sider */}
                            <td className="p-2 text-right text-slate-600">
                              {(ord.stock_sider || 0).toFixed(1)}
                            </td>
                            {/* 10. Texto breve de material */}
                            <td className="p-2 font-sans font-medium text-[#005596] truncate max-w-[220px]">
                              {ord.material_description}
                            </td>
                            {/* 11. Valor do Frete */}
                            <td className="p-2 text-right text-slate-800 font-semibold">
                              {(ord.freight_value || 0).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            {/* 12. Recebedor Merc */}
                            <td className="p-2 font-sans text-slate-900 truncate max-w-[200px]">
                              {ord.customer_name}
                            </td>
                            {/* 13. Limite de Crédito */}
                            <td className="p-2 text-right">
                              {(ord.credit_limit || 0).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            {/* 14. Emissor da ordem */}
                            <td className="p-2 text-slate-600">{ord.customer_code}</td>
                            {/* 15. Compromisso especial (Aceita negativos) */}
                            <td
                              className={`p-2 text-right ${
                                (ord.special_commitment || 0) < 0
                                  ? 'text-rose-600 font-bold'
                                  : 'text-slate-700'
                              }`}
                            >
                              {(ord.special_commitment || 0).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            {/* 16. Condição de Pagament */}
                            <td className="p-2 text-slate-600">
                              {ord.credit_condition || '30 DDL'}
                            </td>
                            {/* 17. Motivo Estoque */}
                            <td className="p-2 font-sans text-[10px] text-slate-700 truncate max-w-[150px]">
                              {ord.stockIntersectionType === 'ESTOQUE_ATUAL'
                                ? 'ESTOQUE CIAFAL'
                                : ord.production_status}
                            </td>
                            {/* 18. Qtde.Estoque */}
                            <td className="p-2 text-right text-slate-700">
                              {(ord.stock_dp34 || 0).toFixed(1)}
                            </td>
                            {/* 19. Saldo */}
                            <td className="p-2 text-right font-semibold text-slate-800">
                              {((ord.balance_quantity_kg || 0) / 1000).toFixed(3)}
                            </td>
                            {/* 20. Data do Pedido */}
                            <td className="p-2 text-center text-[10px] text-slate-600">
                              {ord.order_date}
                            </td>
                            {/* 21. Hora do Pedido */}
                            <td className="p-2 text-center text-[10px] text-slate-500">
                              {ord.order_hour || '00:00:00'}
                            </td>
                            {/* 22. Quantidade da ordem */}
                            <td className="p-2 text-right text-slate-700">
                              {((ord.quantity_order || 0) / 1000 || ord.weight_ton).toFixed(3)}
                            </td>
                            {/* 23. Data Remessa(Semana) */}
                            <td className="p-2 text-center font-bold text-indigo-700">
                              {ord.delivery_week || '-'}
                            </td>
                            {/* 24. Itinerário */}
                            <td className="p-2 text-center">
                              <Badge className="bg-[#005596] text-white text-[9px] px-1 py-0">
                                {ord.itinerary_code}
                              </Badge>
                            </td>
                            {/* 25. Motivo Crédito */}
                            <td className="p-2 font-sans text-[10px] text-slate-700 truncate max-w-[200px]">
                              {ord.credit_reason || 'CRÉDITO OK'}
                            </td>
                            {/* 26. Total a Receber */}
                            <td className="p-2 text-right font-bold text-slate-900">
                              {(ord.total_value || 0).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            {/* 27. Estoque Total */}
                            <td className="p-2 text-right text-slate-700">
                              {(ord.stock_available || 0).toFixed(1)}
                            </td>
                            {/* Status de Validação */}
                            <td className="p-2 text-center bg-slate-50/50">
                              {ord.validation_status === 'VALID' ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[8px]">
                                  Válido
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[8px]">
                                  Alerta
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Aba de Histórico de Importações e Auditoria */}
      {activeTab === 'history' && (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Histórico Auditável de Lotes ZSD35A (QAS)
              </CardTitle>
              <CardDescription className="text-xs">
                Registros de cada execução com usuário responsável, arquivo e volume importado.
                Exclusão restrita à massa EXCEL_QAS.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleDeleteQasBatch()}
                disabled={isDeletingBatch}
                variant="outline"
                size="sm"
                className="text-xs h-7 text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Excluir Toda Massa QAS
              </Button>

              <Button
                onClick={loadAuditHistory}
                variant="outline"
                size="sm"
                className="text-xs h-7 border-slate-300"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Recarregar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
                <tr>
                  <th className="p-3">Lote</th>
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Usuário</th>
                  <th className="p-3">Arquivo</th>
                  <th className="p-3 text-right">Lidos</th>
                  <th className="p-3 text-right">Peso (t)</th>
                  <th className="p-3 text-center">Origem</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                {sapImportsList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-400 font-sans">
                      Nenhum lote de importação ZSD35A registrado até o momento.
                    </td>
                  </tr>
                ) : (
                  sapImportsList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-[#005596]">{item.batch_id || item.id}</td>
                      <td className="p-3 text-slate-500">
                        {item.created ? new Date(item.created).toLocaleString('pt-BR') : '-'}
                      </td>
                      <td className="p-3 font-sans font-medium text-slate-900 truncate max-w-[150px]">
                        {item.imported_by || 'Operador'}
                      </td>
                      <td className="p-3 font-sans text-slate-700 truncate max-w-[160px]">
                        {item.file_name}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        {item.valid_count || item.total_read || 0}
                      </td>
                      <td className="p-3 text-right text-sky-700">
                        {(item.total_weight_ton || 0).toFixed(2)} t
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant="outline"
                          className="text-[9px] bg-purple-50 text-purple-700 border-purple-200"
                        >
                          {item.origem_dado || 'EXCEL_QAS'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          className={`text-[9px] ${
                            item.status === 'concluido'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-600 text-white'
                          }`}
                        >
                          {item.status || 'concluido'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteQasBatch(item.batch_id)}
                          disabled={isDeletingBatch}
                          className="h-6 px-1.5 text-rose-600 hover:bg-rose-50 text-[10px]"
                          title="Excluir apenas este lote QAS"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Zsd35ImportPage
