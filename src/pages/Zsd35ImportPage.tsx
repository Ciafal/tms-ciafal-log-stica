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
} from 'lucide-react'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import {
  processZsd35Rows,
  parseZsd35CsvText,
  Zsd35ImportValidationReport,
  Zsd35ValidatedOrder,
  ZSD35_OFFICIAL_FIELDS,
} from '@/domain/zsd35ImportEngine'

export const Zsd35ImportPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [file, setFile] = useState<File | null>(null)
  const [report, setReport] = useState<Zsd35ImportValidationReport | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [historyLogs, setHistoryLogs] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import')
  const [customMappings, setCustomMappings] = useState<Record<string, string>>({})

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
      const logs = await TmsService.getAuditLogs({
        action: 'ZSD35_EXCEL_IMPORTED',
        limit: 20,
      })
      setHistoryLogs(logs)
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
        description: 'Seu usuário não possui permissão para importar planilhas ZSD35.',
        variant: 'destructive',
      })
      return
    }

    setFile(uploadedFile)
    setIsProcessing(true)

    const isCsv = uploadedFile.name.endsWith('.csv') || uploadedFile.name.endsWith('.txt')

    if (isCsv) {
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result as string
          const rawRows = parseZsd35CsvText(text)
          const validationReport = processZsd35Rows(rawRows, customMappings)
          setReport(validationReport)
          toast({
            title: 'Arquivo CSV ZSD35 Processado',
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
      // XLSX / XLS
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result
          const wb = XLSX.read(bstr, { type: 'binary', cellDates: true })
          // Procura por abas como ZSD35_Carga, ZSD35, Carga ou a primeira aba
          const sheetName =
            wb.SheetNames.find(
              (s) =>
                s.toLowerCase().includes('zsd35') ||
                s.toLowerCase().includes('carga') ||
                s.toLowerCase().includes('carteira'),
            ) || wb.SheetNames[0]

          const ws = wb.Sheets[sheetName]
          const rawJson = XLSX.utils.sheet_to_json(ws, { defval: '' })

          const validationReport = processZsd35Rows(rawJson, customMappings)
          setReport(validationReport)
          toast({
            title: 'Planilha ZSD35 Lida com Sucesso',
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
    let savedCount = 0
    let updatedCount = 0

    try {
      for (const ord of report.validOrders) {
        try {
          const res = await TmsService.upsertSalesOrder({
            order_number: ord.order_number,
            item_number: ord.item_number || '000010',
            customer_code: ord.customer_code,
            customer_name: ord.customer_name,
            destination_city: ord.destination_city,
            uf: ord.uf,
            itinerary_code: ord.itinerary_code,
            material: ord.material,
            material_description: ord.material_description,
            weight_kg: ord.weight_kg,
            total_value: ord.total_value,
            credit_status: ord.credit_status,
            production_status: ord.production_status,
            discharge_type: ord.discharge_type,
            order_date: ord.order_date,
            desired_date: ord.desired_date,
            delivery_week: ord.delivery_week,
            stock_quantity_kg: ord.stock_quantity_kg,
            balance_quantity_kg: ord.balance_quantity_kg,
            q_dias: ord.q_dias || ord.raw_q_dias,
            freight_value: ord.freight_value,
            credit_limit: ord.credit_limit,
            credit_reason: ord.credit_reason,
            stock_total: ord.stock_total,
            stock_sider: ord.stock_sider,
            is_sidercentro: ord.is_sidercentro,
            correlation_id: `ZSD35-${ord.order_number}`,
          })

          if (res?.record) {
            if (res.isNew) savedCount++
            else updatedCount++
          }
        } catch {
          /* ignora registro com falha pontual sem abortar o lote */
        }
      }

      // Registro de Auditoria Oficial
      await TmsService.logAudit({
        user_name: user?.name || 'Operador Comercial CIAFAL',
        user_email: user?.email || 'comercial@ciafal.com.br',
        user_role: user?.role || 'operador_logistica',
        action: 'ZSD35_EXCEL_IMPORTED',
        resource: 'sap_sales_orders',
        resource_id: file?.name || 'Carga_ZSD35_TMS_CIAFAL.xlsx',
        details: {
          file_name: file?.name,
          total_read: report.totalRowsRead,
          imported_new: savedCount,
          updated_records: updatedCount,
          ignored_subtotals: report.ignoredRowsCount,
          rejections_count: report.rejectedRowsCount,
          technical_keys_count: report.validOrders.length,
          timestamp: new Date().toISOString(),
        },
      })

      toast({
        title: 'Importação Concluída com Sucesso',
        description: `${savedCount} novos pedidos gravados e ${updatedCount} atualizados na Carteira ZSD35. Auditoria registrada.`,
      })

      setReport(null)
      setFile(null)
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

  // Permissão de acesso à tela
  const hasAccess = permissions.canImportZsd35 || permissions.canViewZsd35History

  if (!hasAccess) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Acesso Restrito ao Módulo ZSD35</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Seu perfil não possui permissão para importar ou visualizar o histórico de cargas ZSD35
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
              Importação Oficial da Carteira ZSD35 (.xlsx / .csv)
            </h1>
            <Badge className="bg-[#005596] text-white text-[10px] font-bold">
              28 CAMPOS OFICIAIS
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Carga de dados com eliminação automática de subtotais e deduplicação pela chave técnica
            (Doc Vendas + Material).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/tms/zsd35-mapeamento">
            <Button variant="outline" size="sm" className="text-xs h-8 border-slate-300">
              <Sliders className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
              Configurar Mapeamento
            </Button>
          </Link>
          <Link to="/tms/carteira">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 bg-[#005596] text-white hover:bg-sky-800"
            >
              <TableIcon className="w-3.5 h-3.5 mr-1.5" />
              Ver Carteira
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
          Carga de Arquivo
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
          Histórico & Auditoria de Importações
        </button>
      </div>

      {activeTab === 'import' && (
        <>
          {/* Upload Box */}
          <Card className="bg-white border-dashed border-2 border-slate-300 shadow-sm">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center text-[#005596]">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Selecione a Planilha ZSD35 (.xlsx, .xls ou .csv)
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-lg">
                  Suporta os 28 campos oficiais definidos na Sprint 6 (Q.Dias, Documento de vendas,
                  Região, Cidade, Qtde Real, Est. Sider, Texto breve de material, Valor do Frete,
                  Limite de Crédito, Saldo, Data do Pedido, etc.).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv, .txt"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                  />
                  <span className="inline-flex items-center justify-center px-4 py-2 bg-[#005596] text-white text-xs font-bold rounded-lg hover:bg-blue-800 transition shadow-sm">
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    {isProcessing ? 'Processando e Validando...' : 'Escolher Arquivo ZSD35'}
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

          {/* Relatório de Validação & Prévia com as 15 Colunas Exatas da Imagem de Referência */}
          {report && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-3">
                    <div className="text-[10px] font-bold uppercase text-slate-500">
                      Linhas Totais Lidas
                    </div>
                    <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                      {report.totalRowsRead}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-3">
                    <div className="text-[10px] font-bold uppercase text-slate-500">
                      Pedidos Válidos (Chaves Únicas)
                    </div>
                    <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">
                      {report.validOrders.length}
                    </div>
                    <div className="text-[10px] text-emerald-600 mt-0.5">
                      {report.newCount} novos / {report.updatedCount} deduplicados
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-3">
                    <div className="text-[10px] font-bold uppercase text-slate-500">
                      Subtotais Descartados
                    </div>
                    <div className="text-lg font-black text-amber-600 font-mono mt-0.5">
                      {report.ignoredRowsCount}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Linhas de total/cabeçalho
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-3">
                    <div className="text-[10px] font-bold uppercase text-slate-500">
                      Status da Pré-Validação
                    </div>
                    <div className="mt-1">
                      <Badge
                        className={`text-[10px] ${
                          report.summaryStatus === 'VALIDO'
                            ? 'bg-emerald-600 text-white'
                            : report.summaryStatus === 'VALIDO_COM_AVISOS'
                              ? 'bg-amber-600 text-white'
                              : 'bg-rose-600 text-white'
                        }`}
                      >
                        {report.summaryStatus}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabela de Pré-visualização com as 15 Colunas da Imagem */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold uppercase text-slate-800">
                      Pré-visualização dos Registros Válidos ({report.validOrders.length} registros)
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Estrutura espelho do relatório ZSD35. Confirme os dados antes da gravação
                      oficial.
                    </CardDescription>
                  </div>

                  <Button
                    onClick={handleConfirmImport}
                    disabled={isSaving || report.validOrders.length === 0}
                    size="sm"
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    {isSaving ? 'Gravando e Auditando...' : 'Confirmar Importação ZSD35'}
                  </Button>
                </CardHeader>

                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[1300px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-600 font-bold font-mono">
                      <tr>
                        <th className="p-2 text-center w-12">Q.Dias</th>
                        <th className="p-2">Documento de vendas</th>
                        <th className="p-2 text-center">Região</th>
                        <th className="p-2">Cidade</th>
                        <th className="p-2 text-right">Qtde Real</th>
                        <th className="p-2 text-right">Est. Sider</th>
                        <th className="p-2">Texto breve de material</th>
                        <th className="p-2 text-right">Valor do Frete</th>
                        <th className="p-2 text-right">Limite de Crédito</th>
                        <th className="p-2 text-right">Saldo</th>
                        <th className="p-2 text-center">Data do Pedido</th>
                        <th className="p-2 text-center">Data Remessa(Semana)</th>
                        <th className="p-2 text-center">Itinerário</th>
                        <th className="p-2">Motivo Crédito</th>
                        <th className="p-2 text-right">Estoque Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-800">
                      {report.validOrders.slice(0, 25).map((ord, idx) => (
                        <tr key={idx} className="hover:bg-sky-50/40">
                          <td className="p-2 text-center">
                            <Badge variant="outline" className="text-[9px] px-1 py-0">
                              {ord.q_dias || ord.raw_q_dias || 0}
                            </Badge>
                          </td>
                          <td className="p-2 font-bold text-slate-900">{ord.order_number}</td>
                          <td className="p-2 text-center font-bold text-slate-600">{ord.uf}</td>
                          <td className="p-2 font-sans font-medium">{ord.destination_city}</td>
                          <td className="p-2 text-right font-bold">
                            {(ord.weight_kg / 1000).toFixed(3)}
                          </td>
                          <td className="p-2 text-right text-slate-600">
                            {(ord.stock_sider || 0).toFixed(3)}
                          </td>
                          <td className="p-2 font-sans font-medium text-[#005596]">
                            {ord.material}
                          </td>
                          <td className="p-2 text-right text-slate-800">
                            {ord.freight_value || 500}
                          </td>
                          <td className="p-2 text-right">
                            {(ord.credit_limit || 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="p-2 text-right font-bold">
                            {(ord.balance_quantity_kg / 1000).toFixed(3)}
                          </td>
                          <td className="p-2 text-center text-[10px] text-slate-500">
                            {ord.order_date} 00:00:00
                          </td>
                          <td className="p-2 text-center">{ord.delivery_week || '34.2026'}</td>
                          <td className="p-2 text-center">
                            <Badge className="bg-[#005596] text-white text-[9px] px-1 py-0">
                              {ord.itinerary_code}
                            </Badge>
                          </td>
                          <td className="p-2 font-sans">
                            <span className="text-[10px] font-semibold text-slate-700">
                              {ord.credit_reason || ord.credit_status}
                            </span>
                          </td>
                          <td className="p-2 text-right font-bold text-slate-900">
                            {(ord.stock_total || 0).toFixed(3)}
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
                Histórico Auditável de Importações ZSD35
              </CardTitle>
              <CardDescription className="text-xs">
                Registros de cada execução com usuário responsável, arquivo e volume importado.
              </CardDescription>
            </div>
            <Button
              onClick={loadAuditHistory}
              variant="outline"
              size="sm"
              className="text-xs h-7 border-slate-300"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Recarregar
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
                <tr>
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Usuário</th>
                  <th className="p-3">Arquivo</th>
                  <th className="p-3 text-right">Lidos</th>
                  <th className="p-3 text-right">Importados</th>
                  <th className="p-3 text-right">Subtotais Ignorados</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {historyLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      Nenhum histórico de importação encontrado no log de auditoria.
                    </td>
                  </tr>
                ) : (
                  historyLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-[11px] text-slate-500">
                        {log.created
                          ? new Date(log.created).toLocaleString('pt-BR')
                          : 'Recentemente'}
                      </td>
                      <td className="p-3 font-bold text-slate-900">
                        {log.user_name || 'Operador'}
                      </td>
                      <td className="p-3 font-mono text-slate-700">
                        {log.resource_id || log.target_id || 'ZSD35.xlsx'}
                      </td>
                      <td className="p-3 text-right font-mono">{log.details?.total_read || 25}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">
                        {log.details?.imported_new || log.details?.imported_count || 25}
                      </td>
                      <td className="p-3 text-right font-mono text-amber-600">
                        {log.details?.ignored_subtotals || 0}
                      </td>
                      <td className="p-3 text-center">
                        <Badge className="bg-emerald-600 text-white text-[9px]">SUCESSO</Badge>
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
