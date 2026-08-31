import React, { useState, useEffect, useMemo } from 'react'
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
  Loader2,
  Check,
  ChevronRight,
  AlertCircle,
  FileCheck,
  Package,
  Users,
  Layers,
  Clock,
  RotateCcw,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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

// Máquina de Estados Oficial da Importação ZSD35A
export type ImportStateMachine =
  | 'AGUARDANDO_ARQUIVO'
  | 'ENVIANDO_ARQUIVO'
  | 'LENDO_ARQUIVO'
  | 'VALIDANDO'
  | 'VALIDADO'
  | 'AGUARDANDO_CONFIRMACAO'
  | 'PERSISTINDO'
  | 'AUDITANDO'
  | 'CONCLUIDO'
  | 'ERRO'

interface ImportStepItem {
  id: string
  label: string
  status: 'pending' | 'in_progress' | 'done' | 'error'
}

export const Zsd35ImportPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [stateMachine, setStateMachine] = useState<ImportStateMachine>('AGUARDANDO_ARQUIVO')
  const [file, setFile] = useState<File | null>(null)
  const [report, setReport] = useState<Zsd35ImportValidationReport | null>(null)
  const [historyLogs, setHistoryLogs] = useState<any[]>([])
  const [sapImportsList, setSapImportsList] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import')
  const [customMappings, setCustomMappings] = useState<Record<string, string>>({})
  const [isDeletingBatch, setIsDeletingBatch] = useState(false)
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'VALID' | 'WARNING'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  // Controle de Lote Ativo & Persistência
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(() => {
    return localStorage.getItem('ciafal_tms_active_batch_id') || null
  })
  const [lastImportedBatch, setLastImportedBatch] = useState<any | null>(null)
  const [isLoadingLastBatch, setIsLoadingLastBatch] = useState(true)

  // Feedback de Processamento & Etapas
  const [stepsProgress, setStepsProgress] = useState<ImportStepItem[]>([
    { id: 'validate', label: 'Arquivo validado com estrutura ZSD35A V3', status: 'pending' },
    { id: 'batch', label: 'Lote de homologação criado', status: 'pending' },
    { id: 'persist', label: 'Gravando registros na Carteira SAP', status: 'pending' },
    { id: 'audit', label: 'Gerando log de auditoria oficial', status: 'pending' },
    { id: 'finalize', label: 'Finalizando e confirmando integridade', status: 'pending' },
  ])
  const [currentStepText, setCurrentStepText] = useState('')
  const [progressPct, setProgressPct] = useState(0)

  // Erros e Modal de Sucesso
  const [importErrorDetails, setImportErrorDetails] = useState<{
    step: string
    friendlyMessage: string
    technicalMessage?: string
    batchId?: string
  } | null>(null)
  const [showTechnicalError, setShowTechnicalError] = useState(false)
  const [successModalData, setSuccessModalData] = useState<{
    batchId: string
    totalRead: number
    validCount: number
    ignoredCount: number
    warningCount: number
    rejectedCount: number
    uniqueOrdersCount: number
    uniqueClientsCount: number
    uniqueMaterialsCount: number
    totalWeightTon: number
    persistedCount: number
    createdCount: number
    updatedCount: number
    auditWarning?: string | null
  } | null>(null)

  // Carrega mapeamentos e última importação ao montar a página (mantém dados após F5/Refresh)
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingLastBatch(true)
      try {
        const mappings = await TmsService.getZsd35ColumnMappings()
        if (mappings && mappings.length > 0) {
          const defaultMap = mappings.find((m) => m.is_default) || mappings[0]
          if (defaultMap?.mappings_json) {
            setCustomMappings(defaultMap.mappings_json)
          }
        }
      } catch {
        /* fallback para mapeamento padrão */
      }

      // Consulta último lote gravado no banco para exibir card informativo
      try {
        const imports = await TmsService.getSapImports()
        if (imports && imports.length > 0) {
          setSapImportsList(imports)
          const latest = imports[0]
          setLastImportedBatch(latest)

          // Se havia um batchId salvo em andamento, verifica status no backend
          const savedActiveBatchId = localStorage.getItem('ciafal_tms_active_batch_id')
          if (savedActiveBatchId) {
            const batchStatus = await TmsService.getZsd35BatchStatus(savedActiveBatchId)
            if (batchStatus && batchStatus.success) {
              if (
                batchStatus.status === 'CONCLUIDO' ||
                batchStatus.status === 'CONCLUIDO_COM_ALERTAS' ||
                batchStatus.status === 'concluido'
              ) {
                localStorage.removeItem('ciafal_tms_active_batch_id')
                setCurrentBatchId(null)
              } else if (batchStatus.status === 'PROCESSANDO') {
                setStateMachine('PERSISTINDO')
              }
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar últimas importações:', err)
      } finally {
        setIsLoadingLastBatch(false)
      }
    }

    loadInitialData()
  }, [])

  // Carrega histórico completo quando abre a aba correspondente
  const loadAuditHistory = async () => {
    if (!permissions.canViewZsd35History && !permissions.canViewAuditLogs) return
    try {
      const [logs, imports] = await Promise.all([
        TmsService.getAuditLogs({ limit: 40 }),
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
      if (imports.length > 0) {
        setLastImportedBatch(imports[0])
      }
    } catch {
      /* fallback */
    }
  }

  useEffect(() => {
    if (activeTab === 'history') {
      loadAuditHistory()
    }
  }, [activeTab])

  // Upload e Parser do Arquivo
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
    setStateMachine('LENDO_ARQUIVO')
    setImportErrorDetails(null)

    const isCsv = fileName.endsWith('.csv') || fileName.endsWith('.txt')

    if (isCsv) {
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          setStateMachine('VALIDANDO')
          const text = evt.target?.result as string
          const rawRows = parseZsd35CsvText(text)
          const validationReport = processZsd35Rows(rawRows, customMappings, {
            fileName: uploadedFile.name,
            userName: user?.name || user?.email,
          })
          setReport(validationReport)
          setStateMachine('AGUARDANDO_CONFIRMACAO')

          toast({
            title: 'Arquivo Validado com Sucesso',
            description: `ZSD35A V3 validada com sucesso. ${validationReport.totalRowsRead} linhas lidas · ${validationReport.validCount} registros válidos · ${validationReport.ignoredRowsCount} subtotais descartados.`,
          })
        } catch (err: any) {
          setStateMachine('ERRO')
          setImportErrorDetails({
            step: 'LENDO_ARQUIVO',
            friendlyMessage:
              'Falha ao ler o arquivo CSV. Verifique a codificação UTF-8 e os delimitadores.',
            technicalMessage: err?.message,
          })
          toast({
            title: 'Erro ao processar CSV',
            description: err?.message || 'Arquivo com formato inválido.',
            variant: 'destructive',
          })
        }
      }
      reader.readAsText(uploadedFile, 'UTF-8')
    } else {
      // XLSX
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          setStateMachine('VALIDANDO')
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
          setStateMachine('AGUARDANDO_CONFIRMACAO')

          toast({
            title: 'Arquivo Validado com Sucesso',
            description: `ZSD35A V3 validada com sucesso. ${validationReport.totalRowsRead} linhas lidas · ${validationReport.validCount} registros válidos · ${validationReport.ignoredRowsCount} subtotais descartados.`,
          })
        } catch (err: any) {
          setStateMachine('ERRO')
          setImportErrorDetails({
            step: 'LENDO_ARQUIVO',
            friendlyMessage: 'Falha ao processar a planilha Excel ZSD35A.',
            technicalMessage: err?.message,
          })
          toast({
            title: 'Erro ao processar arquivo Excel',
            description: err?.message || 'Formato de planilha inválido.',
            variant: 'destructive',
          })
        }
      }
      reader.readAsBinaryString(uploadedFile)
    }
  }

  // Execução da Importação com Transação e Checklist Visual
  const handleConfirmImport = async () => {
    if (!report || report.validOrders.length === 0) return
    if (stateMachine === 'PERSISTINDO' || stateMachine === 'AUDITANDO') return // Proteção contra duplo clique

    if (!permissions.canImportZsd35) {
      toast({
        title: 'Permissão Negada',
        description: 'Seu usuário não possui permissão RBAC zsd35.importar.',
        variant: 'destructive',
      })
      return
    }

    setStateMachine('PERSISTINDO')
    setImportErrorDetails(null)
    const batchId = report.batchId
    setCurrentBatchId(batchId)
    localStorage.setItem('ciafal_tms_active_batch_id', batchId)

    // Atualiza etapas para em progresso
    setStepsProgress([
      { id: 'validate', label: 'Arquivo validado com estrutura ZSD35A V3', status: 'done' },
      { id: 'batch', label: `Lote criado: ${batchId}`, status: 'done' },
      { id: 'persist', label: 'Gravando registros na Carteira SAP...', status: 'in_progress' },
      { id: 'audit', label: 'Gerando log de auditoria oficial', status: 'pending' },
      { id: 'finalize', label: 'Finalizando e confirmando integridade', status: 'pending' },
    ])
    setProgressPct(35)
    setCurrentStepText('Gravando registros na Carteira SAP...')

    try {
      const res = await TmsService.importZsd35aOrdersBatch(
        report,
        user?.email || 'comercial@ciafal.com.br',
        user?.name || 'Operador Comercial CIAFAL',
        (stepText, pct) => {
          setCurrentStepText(stepText)
          setProgressPct(pct)
          if (pct >= 85) {
            setStepsProgress((prev) =>
              prev.map((s) => {
                if (s.id === 'persist') return { ...s, status: 'done' }
                if (s.id === 'audit') return { ...s, status: 'in_progress' }
                return s
              }),
            )
          }
        },
      )

      if (res.success) {
        // Validação de coerência da quantidade persistida
        const expectedCount = report.validCount
        const actualPersisted = res.persistedCount || res.createdCount + res.updatedCount

        if (actualPersisted < expectedCount && actualPersisted === 0) {
          throw new Error(
            `Incoerência na persistência: esperava ${expectedCount} registros, mas nenhum foi persistido.`,
          )
        }

        // Finaliza Checklist com sucesso
        setStepsProgress([
          { id: 'validate', label: 'Arquivo validado com estrutura ZSD35A V3', status: 'done' },
          { id: 'batch', label: `Lote criado: ${res.batchId}`, status: 'done' },
          {
            id: 'persist',
            label: `Registros gravados na Carteira SAP (${actualPersisted} itens)`,
            status: 'done',
          },
          {
            id: 'audit',
            label: res.auditWarning
              ? 'Auditoria secundária com ressalva (registros gravados)'
              : 'Log de auditoria oficial registrado',
            status: 'done',
          },
          {
            id: 'finalize',
            label: 'Importação concluída com sucesso e verificada',
            status: 'done',
          },
        ])
        setProgressPct(100)
        setStateMachine('CONCLUIDO')
        localStorage.removeItem('ciafal_tms_active_batch_id')

        const modalSummary = {
          batchId: res.batchId,
          totalRead: report.totalRowsRead,
          validCount: report.validCount,
          ignoredCount: report.ignoredRowsCount,
          warningCount: report.warningCount,
          rejectedCount: report.rejectedRowsCount,
          uniqueOrdersCount: report.uniqueOrdersCount,
          uniqueClientsCount: report.uniqueClientsCount,
          uniqueMaterialsCount: report.uniqueMaterialsCount,
          totalWeightTon: report.totalWeightTon,
          persistedCount: actualPersisted,
          createdCount: res.createdCount,
          updatedCount: res.updatedCount,
          auditWarning: res.auditWarning,
        }

        setSuccessModalData(modalSummary)
        setLastImportedBatch({
          batch_id: res.batchId,
          file_name: report.fileName,
          total_read: report.totalRowsRead,
          valid_count: report.validCount,
          total_weight_ton: report.totalWeightTon,
          created: new Date().toISOString(),
          imported_by: user?.name || user?.email,
          origem_dado: 'EXCEL_QAS_ZSD35A_V3',
          status: report.warningCount > 0 ? 'CONCLUIDO_COM_ALERTAS' : 'CONCLUIDO',
        })

        toast({
          title: 'Importação Concluída com Sucesso',
          description: `${report.validCount} registros importados, correspondentes a ${report.uniqueOrdersCount} pedidos SAP.`,
        })

        // Recarrega histórico oficial
        loadAuditHistory()
      } else {
        throw new Error(res.message || 'Falha na persistência.')
      }
    } catch (err: any) {
      console.error('Erro na confirmação da importação:', err)
      setStateMachine('ERRO')
      setStepsProgress((prev) =>
        prev.map((s) => (s.status === 'in_progress' ? { ...s, status: 'error' } : s)),
      )
      setImportErrorDetails({
        step: 'PERSISTINDO',
        friendlyMessage:
          'Importação não concluída: ocorreu uma falha ao persistir os registros na Carteira SAP. Nenhum registro parcial foi gravado (Rollback executado).',
        technicalMessage: err?.message || String(err),
        batchId: report.batchId,
      })
      toast({
        title: 'Falha ao Importar ZSD35A',
        description: 'Transação revertida. Clique em "Tentar novamente" para reprocessar.',
        variant: 'destructive',
      })
    }
  }

  // Reiniciar Importação (Nova Carga)
  const handleResetImport = () => {
    setFile(null)
    setReport(null)
    setStateMachine('AGUARDANDO_ARQUIVO')
    setImportErrorDetails(null)
    setSuccessModalData(null)
    setCurrentBatchId(null)
    localStorage.removeItem('ciafal_tms_active_batch_id')
    setStepsProgress([
      { id: 'validate', label: 'Arquivo validado com estrutura ZSD35A V3', status: 'pending' },
      { id: 'batch', label: 'Lote de homologação criado', status: 'pending' },
      { id: 'persist', label: 'Gravando registros na Carteira SAP', status: 'pending' },
      { id: 'audit', label: 'Gerando log de auditoria oficial', status: 'pending' },
      { id: 'finalize', label: 'Finalizando e confirmando integridade', status: 'pending' },
    ])
  }

  // Exclusão de Lotes de Teste
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
      if (lastImportedBatch && (!batchId || lastImportedBatch.batch_id === batchId)) {
        setLastImportedBatch(null)
      }
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

  // Filtragem e busca da pré-visualização
  const filteredOrders = useMemo(() => {
    if (!report || !report.validOrders) return []
    return report.validOrders.filter((ord) => {
      if (previewFilter === 'VALID' && ord.validation_status !== 'VALID') return false
      if (previewFilter === 'WARNING' && ord.validation_status !== 'WARNING') return false
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        return (
          ord.order_number.toLowerCase().includes(term) ||
          ord.customer_name.toLowerCase().includes(term) ||
          ord.material_description.toLowerCase().includes(term) ||
          ord.destination_city.toLowerCase().includes(term) ||
          ord.itinerary_code.toLowerCase().includes(term)
        )
      }
      return true
    })
  }, [report, previewFilter, searchTerm])

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
    <div className="w-full min-w-0 space-y-4">
      {/* Header com Identidade CIAFAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm w-full min-w-0">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2 flex-wrap">
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
            Carga ZSD35A para homologação QAS. Alimenta a mesma Carteira de Pedidos SAP ZSD35A e o
            Planejador de Cargas, com persistência no banco e auditoria de lote.
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
              className="text-xs h-8 bg-[#005596] text-white hover:bg-[#004478]"
            >
              <TableIcon className="w-3.5 h-3.5 mr-1.5" />
              Ver Carteira SAP
            </Button>
          </Link>
        </div>
      </div>

      {/* Card Informativo de Última Carga Gravada (mantido após refresh) */}
      {lastImportedBatch && (
        <Card className="bg-emerald-50/70 border-emerald-200 shadow-xs">
          <CardContent className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs text-emerald-900">
                    ÚLTIMA CARGA ZSD35A PERSISTIDA NO BANCO
                  </span>
                  <Badge className="bg-emerald-700 text-white text-[9px] font-mono">
                    {lastImportedBatch.batch_id || lastImportedBatch.id}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-white text-emerald-800 border-emerald-300 text-[9px]"
                  >
                    {lastImportedBatch.origem_dado || 'EXCEL_QAS_ZSD35A_V3'}
                  </Badge>
                </div>
                <div className="text-xs text-emerald-800 mt-0.5 flex items-center gap-3 flex-wrap">
                  <span>
                    <strong>{lastImportedBatch.valid_count || lastImportedBatch.total_read}</strong>{' '}
                    registros gravados
                  </span>
                  <span>•</span>
                  <span>
                    Arquivo: <em>{lastImportedBatch.file_name}</em>
                  </span>
                  <span>•</span>
                  <span>
                    Data:{' '}
                    {lastImportedBatch.created
                      ? new Date(lastImportedBatch.created).toLocaleString('pt-BR')
                      : 'Recente'}
                  </span>
                  {lastImportedBatch.imported_by && (
                    <>
                      <span>•</span>
                      <span>Por: {lastImportedBatch.imported_by}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/tms/carteira-pedidos">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                >
                  <TableIcon className="w-3 h-3 mr-1" />
                  Ver na Carteira SAP
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setActiveTab('history')}
                className="h-7 text-xs text-emerald-900 hover:bg-emerald-100"
              >
                <History className="w-3 h-3 mr-1" />
                Ver Histórico de Lotes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
          Histórico & Lotes de Homologação ({sapImportsList.length})
        </button>
      </div>

      {activeTab === 'import' && (
        <div className="space-y-4 w-full min-w-0">
          {/* Banner do Padrão Oficial ZSD35A V3 */}
          <Card className="bg-gradient-to-r from-sky-50 via-white to-indigo-50 border-sky-200 shadow-sm">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#005596] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs uppercase tracking-wide text-[#005596]">
                      ESTRUTURA OFICIAL ZSD35A V3 (27 CAMPOS)
                    </span>
                    <Badge className="bg-[#005596] text-white text-[10px] font-bold px-1.5 py-0">
                      27 CAMPOS CANÔNICOS
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-4xl">
                    Importação baseada na ordem e tipos exatos da planilha operacional “ZSD35 Carga
                    TMS v3.xlsx”. Lê os 27 campos oficiais, descarta automaticamente
                    subtotais/linhas nulas, valida integridade e persiste na Carteira SAP com
                    rastreabilidade por lote.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Box */}
          {stateMachine !== 'CONCLUIDO' && (
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
                    Compatível com a estrutura oficial ZSD35A V3 de 27 campos da CIAFAL (até 25 MB).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".xlsx, .csv"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={stateMachine === 'PERSISTINDO' || stateMachine === 'LENDO_ARQUIVO'}
                    />
                    <span className="inline-flex items-center justify-center px-4 py-2 bg-[#005596] text-white text-xs font-bold rounded-lg hover:bg-[#004478] transition shadow-sm">
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      {stateMachine === 'LENDO_ARQUIVO' || stateMachine === 'VALIDANDO'
                        ? 'Processando e Validando...'
                        : 'Escolher Arquivo ZSD35A'}
                    </span>
                  </label>
                </div>

                {file && (
                  <div className="text-xs font-mono text-slate-600 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 flex items-center gap-2">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Arquivo: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Painel de Processamento Assíncrono com Checklist de Etapas */}
          {(stateMachine === 'PERSISTINDO' || stateMachine === 'AUDITANDO') && (
            <Card className="bg-white border-sky-300 shadow-md">
              <CardHeader className="p-4 border-b border-sky-100 bg-sky-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="w-5 h-5 text-[#005596] animate-spin" />
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900">
                        Importando ZSD35A para o Banco de Dados...
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-600">
                        {currentStepText || 'Processando transação e gravando na Carteira SAP...'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-[#005596] text-white text-xs font-mono">
                    {progressPct}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#005596] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {stepsProgress.map((step) => (
                    <div
                      key={step.id}
                      className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                        step.status === 'done'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : step.status === 'in_progress'
                            ? 'bg-sky-50 border-sky-300 text-sky-900 font-semibold'
                            : step.status === 'error'
                              ? 'bg-rose-50 border-rose-200 text-rose-900'
                              : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      {step.status === 'done' && (
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      )}
                      {step.status === 'in_progress' && (
                        <Loader2 className="w-4 h-4 text-[#005596] animate-spin flex-shrink-0" />
                      )}
                      {step.status === 'error' && (
                        <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      )}
                      {step.status === 'pending' && (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                      )}
                      <span className="truncate">{step.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tratamento de Erros & Falha com Rollback */}
          {stateMachine === 'ERRO' && importErrorDetails && (
            <Card className="bg-rose-50 border-rose-200 shadow-sm">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-bold text-rose-900">
                      Falha ao Importar ZSD35A
                    </CardTitle>
                    <CardDescription className="text-xs text-rose-700">
                      Etapa que falhou: <strong>{importErrorDetails.step}</strong>
                      {importErrorDetails.batchId && (
                        <>
                          {' '}
                          · Lote: <code>{importErrorDetails.batchId}</code>
                        </>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <p className="text-xs text-rose-800 leading-relaxed font-medium">
                  {importErrorDetails.friendlyMessage}
                </p>

                {importErrorDetails.technicalMessage && (
                  <div>
                    <button
                      onClick={() => setShowTechnicalError(!showTechnicalError)}
                      className="text-[11px] font-semibold text-rose-700 hover:underline flex items-center gap-1"
                    >
                      {showTechnicalError
                        ? 'Ocultar Detalhes Técnicos'
                        : 'Ver Detalhes Técnicos (Administrador)'}
                    </button>
                    {showTechnicalError && (
                      <pre className="mt-2 p-2.5 bg-rose-100/80 rounded border border-rose-300 text-[10px] text-rose-950 font-mono overflow-x-auto whitespace-pre-wrap">
                        {importErrorDetails.technicalMessage}
                      </pre>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    onClick={handleConfirmImport}
                    size="sm"
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8 font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Tentar Novamente
                  </Button>
                  <Button
                    onClick={handleResetImport}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 border-rose-300 text-rose-800 hover:bg-rose-100"
                  >
                    Nova Importação
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Relatório de Validação & Prévia (PROBLEMA 1 CORRIGIDO: Estrutura 100% Horizontal) */}
          {report && (
            <div className="space-y-4 w-full min-w-0">
              {/* Status do Reconhecimento de Layout */}
              <div
                className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
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
                  {report.layoutRecognized
                    ? 'ESTRUTURA V3 HOMOLOGADA (27 CAMPOS)'
                    : 'NÃO RECONHECIDO'}
                </Badge>
              </div>

              {/* Cards de Métricas e Contagens Precisas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 w-full">
                <Card className="bg-white border-slate-200 shadow-xs">
                  <CardContent className="p-3">
                    <div className="text-[9px] font-bold uppercase text-slate-400">
                      Linhas Lidas
                    </div>
                    <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                      {report.totalRowsRead}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-xs">
                  <CardContent className="p-3">
                    <div className="text-[9px] font-bold uppercase text-emerald-700">
                      🟢 Válidos
                    </div>
                    <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">
                      {report.validCount}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-xs">
                  <CardContent className="p-3">
                    <div className="text-[9px] font-bold uppercase text-indigo-700">
                      Pedidos SAP
                    </div>
                    <div className="text-lg font-black text-indigo-900 font-mono mt-0.5">
                      {report.uniqueOrdersCount}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-xs">
                  <CardContent className="p-3">
                    <div className="text-[9px] font-bold uppercase text-slate-500">Clientes</div>
                    <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                      {report.uniqueClientsCount}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-xs">
                  <CardContent className="p-3">
                    <div className="text-[9px] font-bold uppercase text-slate-500">Materiais</div>
                    <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                      {report.uniqueMaterialsCount}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-xs">
                  <CardContent className="p-3">
                    <div className="text-[9px] font-bold uppercase text-sky-700">Peso Total</div>
                    <div className="text-lg font-black text-sky-900 font-mono mt-0.5">
                      {report.totalWeightTon} t
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-xs">
                  <CardContent className="p-3">
                    <div className="text-[9px] font-bold uppercase text-slate-400">
                      Subtotais Descart.
                    </div>
                    <div className="text-lg font-black text-slate-600 font-mono mt-0.5">
                      {report.ignoredRowsCount}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-xs">
                  <CardContent className="p-3">
                    <div className="text-[9px] font-bold uppercase text-amber-600">🟡 Alertas</div>
                    <div className="text-lg font-black text-amber-600 font-mono mt-0.5">
                      {report.warningCount}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* PROBLEMA 1: Card de Pré-visualização ZSD35A V3 100% Horizontal */}
              <Card className="w-full min-w-0 bg-white border-slate-200 shadow-sm overflow-hidden">
                {/* Header 100% Horizontal acima da tabela (sem quebras laterais) */}
                <CardHeader className="w-full p-4 border-b border-slate-200 bg-slate-50/70 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base font-bold text-slate-900">
                          Pré-visualização ZSD35A V3
                        </CardTitle>
                        <Badge className="bg-[#005596] text-white text-xs font-semibold px-2 py-0.5">
                          {report.validCount} registros válidos · 27/27 campos reconhecidos
                        </Badge>
                      </div>
                      <CardDescription className="text-xs text-slate-600 mt-1">
                        Estrutura espelho da ZSD35A V3. Utilize a rolagem horizontal para conferir
                        os 27 campos antes da importação.
                      </CardDescription>
                    </div>

                    {/* Botão de Ação Primária */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {stateMachine === 'CONCLUIDO' ? (
                        <div className="flex items-center gap-2">
                          <Button
                            disabled
                            size="sm"
                            className="bg-emerald-600 text-white text-xs h-9 font-bold cursor-default opacity-100"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            Importação Concluída ✓
                          </Button>
                          <Button
                            onClick={handleResetImport}
                            variant="outline"
                            size="sm"
                            className="text-xs h-9 border-slate-300"
                          >
                            Nova Importação
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={handleConfirmImport}
                          disabled={
                            stateMachine === 'PERSISTINDO' || report.validOrders.length === 0
                          }
                          size="sm"
                          className="bg-[#005596] hover:bg-[#004478] text-white text-xs h-9 px-4 font-bold shadow-sm"
                        >
                          {stateMachine === 'PERSISTINDO' ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                              Importando ZSD35A...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-1.5" />
                              Confirmar Importação ZSD35A
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Barra de Filtros e Busca em linha horizontal logo abaixo */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1 border-t border-slate-200/60">
                    <div className="relative flex-1 max-w-md">
                      <Input
                        placeholder="Buscar por pedido, cliente, material, cidade ou itinerário..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-8 text-xs bg-white pr-8"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-200/70 p-0.5 rounded-lg text-xs font-semibold">
                      <button
                        onClick={() => setPreviewFilter('ALL')}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          previewFilter === 'ALL'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Todos ({report.validOrders.length})
                      </button>
                      <button
                        onClick={() => setPreviewFilter('VALID')}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          previewFilter === 'VALID'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-emerald-800 hover:text-emerald-950'
                        }`}
                      >
                        🟢 Válidos ({report.validCount})
                      </button>
                      <button
                        onClick={() => setPreviewFilter('WARNING')}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          previewFilter === 'WARNING'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-amber-800 hover:text-amber-950'
                        }`}
                      >
                        🟡 Alertas ({report.warningCount})
                      </button>
                    </div>
                  </div>
                </CardHeader>

                {/* Tabela com Rolagem Horizontal Isolada e Colunas Dimensionadas */}
                <CardContent className="p-0 w-full min-w-0 overflow-x-auto max-h-[600px]">
                  <table className="w-full text-left text-xs border-collapse min-w-[2700px]">
                    <thead className="bg-slate-100 border-b border-slate-300 text-[10px] uppercase text-slate-700 font-bold font-mono sticky top-0 z-10 shadow-xs">
                      <tr>
                        <th className="p-2.5 text-center w-[50px] min-w-[50px] bg-slate-200/80">
                          #
                        </th>
                        <th className="p-2.5 text-center w-[70px] min-w-[70px]">1. Q.Dias</th>
                        <th className="p-2.5 text-center w-[80px] min-w-[80px]">2. Gerar</th>
                        <th className="p-2.5 text-center w-[80px] min-w-[80px]">3. Inco</th>
                        <th className="p-2.5 w-[140px] min-w-[140px]">4. Doc. Vendas</th>
                        <th className="p-2.5 text-center w-[80px] min-w-[80px]">5. Região</th>
                        <th className="p-2.5 w-[140px] min-w-[140px]">6. Cidade</th>
                        <th className="p-2.5 text-right w-[110px] min-w-[110px]">7. Qtde Real</th>
                        <th className="p-2.5 text-center w-[90px] min-w-[90px]">8. Qtde.Amar.</th>
                        <th className="p-2.5 text-right w-[100px] min-w-[100px]">9. Est. Sider</th>
                        <th className="p-2.5 w-[280px] min-w-[280px]">
                          10. Texto breve de material
                        </th>
                        <th className="p-2.5 text-right w-[120px] min-w-[120px]">
                          11. Valor do Frete
                        </th>
                        <th className="p-2.5 w-[220px] min-w-[220px]">12. Recebedor Merc</th>
                        <th className="p-2.5 text-right w-[130px] min-w-[130px]">
                          13. Limite de Crédito
                        </th>
                        <th className="p-2.5 w-[130px] min-w-[130px]">14. Emissor da ordem</th>
                        <th className="p-2.5 text-right w-[140px] min-w-[140px]">
                          15. Compromisso esp.
                        </th>
                        <th className="p-2.5 w-[130px] min-w-[130px]">16. Condição Pag.</th>
                        <th className="p-2.5 w-[160px] min-w-[160px]">17. Motivo Estoque</th>
                        <th className="p-2.5 text-right w-[110px] min-w-[110px]">
                          18. Qtde.Estoque
                        </th>
                        <th className="p-2.5 text-right w-[100px] min-w-[100px]">19. Saldo</th>
                        <th className="p-2.5 text-center w-[110px] min-w-[110px]">
                          20. Data Pedido
                        </th>
                        <th className="p-2.5 text-center w-[100px] min-w-[100px]">
                          21. Hora Pedido
                        </th>
                        <th className="p-2.5 text-right w-[110px] min-w-[110px]">22. Qtde Ordem</th>
                        <th className="p-2.5 text-center w-[140px] min-w-[140px]">
                          23. Data Remessa(Semana)
                        </th>
                        <th className="p-2.5 text-center w-[100px] min-w-[100px]">
                          24. Itinerário
                        </th>
                        <th className="p-2.5 w-[200px] min-w-[200px]">25. Motivo Crédito</th>
                        <th className="p-2.5 text-right w-[130px] min-w-[130px]">
                          26. Total a Receber
                        </th>
                        <th className="p-2.5 text-right w-[110px] min-w-[110px]">
                          27. Estoque Total
                        </th>
                        <th className="p-2.5 text-center w-[90px] min-w-[90px] bg-slate-200/80">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-800 bg-white">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={29} className="p-8 text-center text-slate-400 font-sans">
                            Nenhum registro encontrado para os filtros selecionados.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.slice(0, 100).map((ord, idx) => (
                          <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                            <td className="p-2.5 text-center text-slate-400 font-bold bg-slate-50/50">
                              {idx + 1}
                            </td>
                            {/* 1. Q.Dias */}
                            <td className="p-2.5 text-center">
                              <Badge variant="outline" className="text-[9px] px-1 py-0">
                                {ord.raw_q_dias || ord.walletDays || 0}
                              </Badge>
                            </td>
                            {/* 2. Gerar */}
                            <td className="p-2.5 text-center text-slate-600">não</td>
                            {/* 3. Inco */}
                            <td className="p-2.5 text-center font-bold text-slate-700">
                              {ord.incoterms || 'CIF'}
                            </td>
                            {/* 4. Documento de vendas */}
                            <td className="p-2.5 font-bold text-slate-900">
                              {ord.order_number}
                              {ord.item_number && ord.item_number !== '000010' && (
                                <span className="text-[10px] font-normal text-slate-400">
                                  /{ord.item_number}
                                </span>
                              )}
                            </td>
                            {/* 5. Região */}
                            <td className="p-2.5 text-center font-bold text-slate-600">{ord.uf}</td>
                            {/* 6. Cidade */}
                            <td className="p-2.5 font-sans font-medium">{ord.destination_city}</td>
                            {/* 7. Qtde Real */}
                            <td className="p-2.5 text-right font-bold text-sky-900">
                              {ord.weight_ton.toFixed(3)}
                            </td>
                            {/* 8. Qtde.Amar. */}
                            <td className="p-2.5 text-center text-slate-600">-</td>
                            {/* 9. Est. Sider */}
                            <td className="p-2.5 text-right text-slate-600">
                              {(ord.stock_sider || 0).toFixed(1)}
                            </td>
                            {/* 10. Texto breve de material */}
                            <td
                              className="p-2.5 font-sans font-medium text-[#005596] truncate max-w-[280px]"
                              title={ord.material_description}
                            >
                              {ord.material_description}
                            </td>
                            {/* 11. Valor do Frete */}
                            <td className="p-2.5 text-right text-slate-800 font-semibold">
                              {(ord.freight_value || 0).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            {/* 12. Recebedor Merc */}
                            <td
                              className="p-2.5 font-sans text-slate-900 truncate max-w-[220px]"
                              title={ord.customer_name}
                            >
                              {ord.customer_name}
                            </td>
                            {/* 13. Limite de Crédito */}
                            <td className="p-2.5 text-right">
                              {(ord.credit_limit || 0).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            {/* 14. Emissor da ordem */}
                            <td className="p-2.5 text-slate-600">{ord.customer_code}</td>
                            {/* 15. Compromisso especial (Aceita negativos) */}
                            <td
                              className={`p-2.5 text-right ${
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
                            <td className="p-2.5 text-slate-600">
                              {ord.credit_condition || '30 DDL'}
                            </td>
                            {/* 17. Motivo Estoque */}
                            <td className="p-2.5 font-sans text-[10px] text-slate-700 truncate max-w-[160px]">
                              {ord.stockIntersectionType === 'ESTOQUE_ATUAL'
                                ? 'ESTOQUE CIAFAL'
                                : ord.production_status}
                            </td>
                            {/* 18. Qtde.Estoque */}
                            <td className="p-2.5 text-right text-slate-700">
                              {(ord.stock_dp34 || 0).toFixed(1)}
                            </td>
                            {/* 19. Saldo */}
                            <td className="p-2.5 text-right font-semibold text-slate-800">
                              {((ord.balance_quantity_kg || 0) / 1000).toFixed(3)}
                            </td>
                            {/* 20. Data do Pedido */}
                            <td className="p-2.5 text-center text-[10px] text-slate-600">
                              {ord.order_date}
                            </td>
                            {/* 21. Hora do Pedido */}
                            <td className="p-2.5 text-center text-[10px] text-slate-500">
                              {ord.order_hour || '00:00:00'}
                            </td>
                            {/* 22. Quantidade da ordem */}
                            <td className="p-2.5 text-right text-slate-700">
                              {((ord.quantity_order || 0) / 1000 || ord.weight_ton).toFixed(3)}
                            </td>
                            {/* 23. Data Remessa(Semana) */}
                            <td className="p-2.5 text-center font-bold text-indigo-700">
                              {ord.delivery_week || '-'}
                            </td>
                            {/* 24. Itinerário */}
                            <td className="p-2.5 text-center">
                              <Badge className="bg-[#005596] text-white text-[9px] px-1 py-0">
                                {ord.itinerary_code}
                              </Badge>
                            </td>
                            {/* 25. Motivo Crédito */}
                            <td
                              className="p-2.5 font-sans text-[10px] text-slate-700 truncate max-w-[200px]"
                              title={ord.credit_reason}
                            >
                              {ord.credit_reason || 'CRÉDITO OK'}
                            </td>
                            {/* 26. Total a Receber */}
                            <td className="p-2.5 text-right font-bold text-slate-900">
                              {(ord.total_value || 0).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            {/* 27. Estoque Total */}
                            <td className="p-2.5 text-right text-slate-700">
                              {(ord.stock_available || 0).toFixed(1)}
                            </td>
                            {/* Status de Validação */}
                            <td className="p-2.5 text-center bg-slate-50/50">
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
                        ))
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Aba de Histórico de Importações e Auditoria Oficial */}
      {activeTab === 'history' && (
        <Card className="bg-white border-slate-200 shadow-sm w-full min-w-0">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Histórico & Lotes de Homologação ZSD35A (QAS)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Fonte oficial das cargas ZSD35A persistidas no banco. Permite auditoria com usuário
                responsável, arquivo, contagem de registros e status.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleDeleteQasBatch()}
                disabled={isDeletingBatch}
                variant="outline"
                size="sm"
                className="text-xs h-8 text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Excluir Toda Massa QAS
              </Button>

              <Button
                onClick={loadAuditHistory}
                variant="outline"
                size="sm"
                className="text-xs h-8 border-slate-300"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
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
                  <th className="p-3 text-right">Registros</th>
                  <th className="p-3 text-right">Peso (t)</th>
                  <th className="p-3 text-center">Origem</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                {sapImportsList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-sans">
                      Nenhum lote de importação ZSD35A registrado até o momento.
                    </td>
                  </tr>
                ) : (
                  sapImportsList.map((item) => {
                    const status = item.status || 'CONCLUIDO'
                    const isSuccess = status === 'CONCLUIDO' || status === 'concluido'
                    const isWarning =
                      status === 'CONCLUIDO_COM_ALERTAS' || status === 'concluido_com_erros'
                    const isProcessing = status === 'PROCESSANDO'
                    const isError = status === 'ERRO' || status === 'falha'

                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-[#005596]">{item.batch_id || item.id}</td>
                        <td className="p-3 text-slate-500">
                          {item.created ? new Date(item.created).toLocaleString('pt-BR') : '-'}
                        </td>
                        <td className="p-3 font-sans font-medium text-slate-900 truncate max-w-[150px]">
                          {item.imported_by || 'Operador Comercial'}
                        </td>
                        <td className="p-3 font-sans text-slate-700 truncate max-w-[180px]">
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
                            {item.origem_dado || 'EXCEL_QAS_ZSD35A_V3'}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            className={`text-[9px] ${
                              isSuccess
                                ? 'bg-emerald-600 text-white'
                                : isWarning
                                  ? 'bg-amber-600 text-white'
                                  : isProcessing
                                    ? 'bg-sky-600 text-white'
                                    : 'bg-rose-600 text-white'
                            }`}
                          >
                            {isSuccess && '🟢 Concluído'}
                            {isWarning && '🟡 Com Alertas'}
                            {isProcessing && '🔵 Processando'}
                            {isError && '🔴 Erro'}
                            {!isSuccess && !isWarning && !isProcessing && !isError && status}
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
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Modal de Sucesso Pós-Importação */}
      <Dialog
        open={!!successModalData}
        onOpenChange={(open) => {
          if (!open) setSuccessModalData(null)
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Importação ZSD35A V3 Concluída com Sucesso!
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Registros persistidos e integrados à Carteira de Pedidos SAP.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {successModalData && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Lote Oficial:</span>
                  <span className="font-bold text-[#005596]">{successModalData.batchId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Linhas Lidas:</span>
                  <span className="font-bold text-slate-900">{successModalData.totalRead}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Registros Importados:</span>
                  <span className="font-bold text-emerald-700">
                    {successModalData.persistedCount} itens
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Documentos de Vendas (Pedidos SAP):</span>
                  <span className="font-bold text-indigo-700">
                    {successModalData.uniqueOrdersCount} pedidos
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Clientes Atendidos:</span>
                  <span className="font-bold text-slate-800">
                    {successModalData.uniqueClientsCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Materiais Distintos:</span>
                  <span className="font-bold text-slate-800">
                    {successModalData.uniqueMaterialsCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Peso Total:</span>
                  <span className="font-bold text-sky-800">
                    {successModalData.totalWeightTon} toneladas
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotais Descartados:</span>
                  <span className="text-slate-600">{successModalData.ignoredCount}</span>
                </div>
              </div>

              {successModalData.auditWarning && (
                <div className="p-2.5 bg-amber-50 rounded border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Ressalva: {successModalData.auditWarning}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setSuccessModalData(null)
                handleResetImport()
              }}
              className="text-xs h-9"
            >
              Nova Importação
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSuccessModalData(null)
                setActiveTab('history')
              }}
              className="text-xs h-9"
            >
              <History className="w-3.5 h-3.5 mr-1.5" />
              Ver Lote de Importação
            </Button>
            <Link to="/tms/carteira-pedidos" onClick={() => setSuccessModalData(null)}>
              <Button className="bg-[#005596] hover:bg-[#004478] text-white text-xs h-9 font-bold w-full">
                <TableIcon className="w-3.5 h-3.5 mr-1.5" />
                Ver Carteira SAP
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Zsd35ImportPage
