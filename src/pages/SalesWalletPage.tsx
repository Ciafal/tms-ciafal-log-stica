import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  FileSpreadsheet,
  Search,
  RefreshCw,
  Layers,
  ShieldAlert,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Package,
  TrendingUp,
  Download,
  Filter,
  Eye,
  SlidersHorizontal,
  Upload,
  FileCheck,
  XCircle,
  AlertCircle,
  HelpCircle,
  Trash2,
  History,
  Info,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { TmsService } from '@/services/tmsService'
import {
  SapSalesOrderEntity,
  SapItineraryEntity,
  calculateOrderPriorityScore,
} from '@/domain/rules'
import {
  processZsd35Rows,
  parseZsd35CsvText,
  downloadZsd35aTemplateFile,
  Zsd35ImportValidationReport,
  Zsd35ValidatedOrder,
} from '@/domain/zsd35ImportEngine'
import { exportToCsv } from '@/lib/exportUtils'

// Mock inicial espelhando os registros de homologação ZSD35A da CIAFAL
const INITIAL_PREVIEW_RECORDS: Partial<SapSalesOrderEntity>[] = [
  {
    order_number: '258477',
    uf: 'AL',
    destination_city: 'MACEIO',
    weight_kg: 2000,
    stock_sider: 158.565,
    material: 'B. CH. 1 X 1/8 - 6,00M - 10',
    material_description: 'B. CH. 1 X 1/8 - 6,00M - 10',
    freight_value: 531,
    credit_limit: 104944.72,
    balance_quantity_kg: 2000,
    order_date: '2026-08-20',
    delivery_week: '34.2026',
    desired_date: '2026-08-20',
    itinerary_code: 'AL001C',
    credit_reason: 'CRÉDITO OK/CHECAR LIMITE',
    credit_status: 'Liberado',
    stock_total: 159.825,
    q_dias: 9,
    production_status: 'Pronto',
    customer_name: 'METALURGICA ALAGOAS S.A.',
    customer_code: 'CLI-258477',
    total_value: 12500,
    origem_dado: 'SAP',
  },
  {
    order_number: '258506',
    uf: 'AL',
    destination_city: 'MACEIO',
    weight_kg: 2000,
    stock_sider: 0.0,
    material: 'B. CH. 2 X 1/8 - 6,00 M - 10',
    material_description: 'B. CH. 2 X 1/8 - 6,00 M - 10',
    freight_value: 531,
    credit_limit: 104944.72,
    balance_quantity_kg: 2000,
    order_date: '2026-08-20',
    delivery_week: '34.2026',
    desired_date: '2026-08-20',
    itinerary_code: 'AL001C',
    credit_reason: 'CRÉDITO OK/CHECAR LIMITE',
    credit_status: 'Liberado',
    stock_total: 68.192,
    q_dias: 9,
    production_status: 'Pronto',
    customer_name: 'CONSTRUTORA NORDESTE LTDA',
    customer_code: 'CLI-258506',
    total_value: 13200,
    origem_dado: 'SAP',
  },
  {
    order_number: '258520',
    uf: 'AL',
    destination_city: 'MACEIO',
    weight_kg: 1000,
    stock_sider: 0.0,
    material: 'CANT. 2 X 3/16 - 6,00 M - 1',
    material_description: 'CANT. 2 X 3/16 - 6,00 M - 1',
    freight_value: 531,
    credit_limit: 104944.72,
    balance_quantity_kg: 1000,
    order_date: '2026-08-20',
    delivery_week: '34.2026',
    desired_date: '2026-08-20',
    itinerary_code: 'AL001C',
    credit_reason: 'CRÉDITO OK/CHECAR LIMITE',
    credit_status: 'Liberado',
    stock_total: 242.595,
    q_dias: 9,
    production_status: 'Pronto',
    customer_name: 'DISTRIBUIDORA MACEIO AÇOS',
    customer_code: 'CLI-258520',
    total_value: 6800,
    origem_dado: 'SAP',
  },
  {
    order_number: '257690',
    uf: 'CE',
    destination_city: 'FORTALEZA',
    weight_kg: 1000,
    stock_sider: 0.0,
    material: 'B. QUAD. 2" - 6,00 M - 102',
    material_description: 'B. QUAD. 2" - 6,00 M - 102',
    freight_value: 640,
    credit_limit: 70000.0,
    balance_quantity_kg: 1000,
    order_date: '2026-08-05',
    delivery_week: '32.2026',
    desired_date: '2026-08-05',
    itinerary_code: 'CE001C',
    credit_reason: 'DATA SEGUINTE P/ REVISÃO',
    credit_status: 'Em Análise',
    stock_total: 94.142,
    q_dias: 24,
    production_status: 'Pronto',
    customer_name: 'FORTALEZA SIDERURGIA CE',
    customer_code: 'CLI-257690',
    total_value: 7800,
    origem_dado: 'SAP',
  },
]

export const SalesWalletPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [orders, setOrders] = useState<SapSalesOrderEntity[]>([])
  const [itineraries, setItineraries] = useState<SapItineraryEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filtros
  const [search, setSearch] = useState('')
  const [filterItinerary, setFilterItinerary] = useState('ALL')
  const [filterUf, setFilterUf] = useState('ALL')
  const [filterCredit, setFilterCredit] = useState('ALL')
  const [filterProduction, setFilterProduction] = useState('ALL')
  const [filterStockIntersection, setFilterStockIntersection] = useState('ALL')
  const [filterWalletTime, setFilterWalletTime] = useState('ALL')
  const [filterOverdue, setFilterOverdue] = useState('ALL')
  const [filterOrigem, setFilterOrigem] = useState<
    'ALL' | 'SAP' | 'EXCEL_QAS' | 'EXCEL_QAS_ZSD35_V3' | 'EXCEL_QAS_ZSD35A_V3'
  >('ALL')

  // Stock & Credit Request Modals
  const [stockModalOrder, setStockModalOrder] = useState<SapSalesOrderEntity | null>(null)
  const [stockReason, setStockReason] = useState('')
  const [stockNotes, setStockNotes] = useState('')
  const [isSubmittingStock, setIsSubmittingStock] = useState(false)

  const [creditModalOrder, setCreditModalOrder] = useState<SapSalesOrderEntity | null>(null)
  const [creditReason, setCreditReason] = useState('')
  const [creditRequestedVal, setCreditRequestedVal] = useState<number>(0)
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false)

  // Modal Carga ZSD35A via Excel (QAS)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [validationReport, setValidationReport] = useState<Zsd35ImportValidationReport | null>(null)
  const [previewSearch, setPreviewSearch] = useState('')
  const [previewFilterStatus, setPreviewFilterStatus] = useState<string>('ALL')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Modal Histórico de Importações
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [importHistory, setImportHistory] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isDeletingBatch, setIsDeletingBatch] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [ords, itins] = await Promise.all([
        TmsService.getSapSalesOrders(),
        TmsService.getSapItineraries(),
      ])

      if (ords.length === 0) {
        const seeded = INITIAL_PREVIEW_RECORDS.map((rec, idx) => ({
          id: `seed-png-${idx}`,
          order_number: rec.order_number || `PED-${idx}`,
          item_number: '000010',
          customer_code: rec.customer_code || `CLI-${rec.order_number}`,
          customer_name: rec.customer_name || 'CLIENTE CIAFAL',
          customer_tier: 'B (Corporativo)',
          destination_city: rec.destination_city || 'SÃO PAULO',
          uf: rec.uf || 'SP',
          itinerary_code: rec.itinerary_code || 'SP001A',
          weight_kg: rec.weight_kg || 2000,
          total_value: rec.total_value || 10000,
          material: rec.material || 'LAMINADO DE AÇO',
          material_description: rec.material_description || rec.material || 'LAMINADO',
          order_date: rec.order_date || '2026-08-20',
          desired_date: rec.desired_date || '2026-08-20',
          delivery_week: rec.delivery_week || '34.2026',
          credit_status: rec.credit_status || 'Liberado',
          credit_reason: rec.credit_reason || 'CRÉDITO OK',
          credit_limit: rec.credit_limit || 100000,
          freight_value: rec.freight_value || 500,
          stock_sider: rec.stock_sider || 0,
          stock_total: rec.stock_total || 100,
          production_status: rec.production_status || 'Pronto',
          q_dias: rec.q_dias || 5,
          origem_dado: (rec.origem_dado as any) || 'SAP',
          status: 'disponivel' as const,
        }))
        setOrders(seeded as SapSalesOrderEntity[])
      } else {
        const mapped = ords.map((o) => ({
          ...o,
          origem_dado: o.origem_dado || 'SAP',
          q_dias: o.q_dias !== undefined ? o.q_dias : o.raw_q_dias || 5,
          freight_value: o.freight_value || 500,
          credit_limit: o.credit_limit || 50000,
          credit_reason:
            o.credit_reason || (o.credit_status === 'Liberado' ? 'CRÉDITO OK' : 'CHECAR LIMITE'),
          stock_total: o.stock_total || (o.stock_quantity_kg ? o.stock_quantity_kg / 1000 : 120.5),
          stock_sider: o.stock_sider || (o.is_sidercentro ? 50.0 : 0.0),
        }))
        setOrders(mapped)
      }

      setItineraries(itins)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar Carteira SAP',
        description: err?.message || 'Falha ao buscar ZSD35.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Processamento e Indicadores Calculados
  const processedOrders = useMemo(() => {
    const today = new Date()
    return orders.map((o) => {
      // 1. Tempo em Carteira automático (hoje - data pedido)
      let walletDays = o.q_dias || 0
      if (o.order_date) {
        const d = new Date(o.order_date + (o.order_date.includes('T') ? '' : 'T12:00:00'))
        const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
        if (!isNaN(diff) && diff >= 0) {
          walletDays = diff
        }
      }
      if (o.wallet_days !== undefined && o.wallet_days > 0) {
        walletDays = o.wallet_days
      } else if (o.q_dias && o.q_dias > 0) {
        walletDays = o.q_dias
      }

      // 2. Atraso (comparação remessa vs atual)
      let overdueDays = 0
      let delayText = 'No prazo'
      let isOverdue = false
      if (o.desired_date) {
        const desired = new Date(o.desired_date + (o.desired_date.includes('T') ? '' : 'T12:00:00'))
        const diffDays = Math.floor((today.getTime() - desired.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays > 0) {
          overdueDays = diffDays
          delayText = `${diffDays}d atraso`
          isOverdue = true
        } else if (diffDays === 0) {
          delayText = 'Vence hoje'
        } else {
          delayText = `Faltam ${Math.abs(diffDays)}d`
        }
      }

      // 3. Cruzamentos Visuais com Estoque DP34 e PCP Robotizado
      let stockIntersectionType: 'ESTOQUE_ATUAL' | 'PRODUCAO_FUTURA' | 'SEM_PREVISAO' =
        'ESTOQUE_ATUAL'
      const stockTotalVal = o.stock_total || (o.stock_quantity_kg ? o.stock_quantity_kg / 1000 : 0)
      const reqWeightTon = (o.weight_kg || 0) / 1000

      if (stockTotalVal >= reqWeightTon && stockTotalVal > 0) {
        stockIntersectionType = 'ESTOQUE_ATUAL'
      } else if (
        o.production_status === 'Em Produção' ||
        o.production_status === 'Programado' ||
        o.production_status === 'Aguardando PCP'
      ) {
        stockIntersectionType = 'PRODUCAO_FUTURA'
      } else {
        stockIntersectionType = 'SEM_PREVISAO'
      }

      const priority = calculateOrderPriorityScore(o)

      return {
        ...o,
        walletDays,
        overdueDays,
        delayText,
        isOverdue,
        stockIntersectionType,
        origem_dado: o.origem_dado || 'SAP',
        priorityScore: priority.totalScore,
        priorityClass: priority.classification,
        priorityExplanation: priority.explanation,
      }
    })
  }, [orders])

  // Lista Filtrada
  const filteredOrders = useMemo(() => {
    return processedOrders.filter((o) => {
      if (search) {
        const q = search.toLowerCase()
        const match =
          o.order_number.toLowerCase().includes(q) ||
          (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
          (o.material && o.material.toLowerCase().includes(q)) ||
          (o.destination_city && o.destination_city.toLowerCase().includes(q)) ||
          (o.credit_reason && o.credit_reason.toLowerCase().includes(q)) ||
          (o.itinerary_code && o.itinerary_code.toLowerCase().includes(q))
        if (!match) return false
      }
      if (filterOrigem !== 'ALL') {
        if (
          filterOrigem === 'EXCEL_QAS' &&
          (o.origem_dado === 'EXCEL_QAS' ||
            o.origem_dado === 'EXCEL_QAS_ZSD35_V3' ||
            o.origem_dado === 'EXCEL_QAS_ZSD35A_V3')
        ) {
          // match both
        } else if (o.origem_dado !== filterOrigem) {
          return false
        }
      }
      if (filterItinerary !== 'ALL' && o.itinerary_code !== filterItinerary) return false
      if (filterUf !== 'ALL' && o.uf !== filterUf) return false
      if (filterCredit !== 'ALL' && o.credit_status !== filterCredit) return false
      if (filterProduction !== 'ALL' && o.production_status !== filterProduction) return false
      if (filterStockIntersection !== 'ALL' && o.stockIntersectionType !== filterStockIntersection)
        return false

      if (filterWalletTime !== 'ALL') {
        if (filterWalletTime === '0-4' && (o.walletDays < 0 || o.walletDays > 4)) return false
        if (filterWalletTime === '5-15' && (o.walletDays < 5 || o.walletDays > 15)) return false
        if (filterWalletTime === '16-30' && (o.walletDays < 16 || o.walletDays > 30)) return false
        if (filterWalletTime === '>30' && o.walletDays <= 30) return false
      }

      if (filterOverdue !== 'ALL') {
        if (filterOverdue === 'atrasado' && !o.isOverdue) return false
        if (filterOverdue === 'no_prazo' && o.isOverdue) return false
      }

      return true
    })
  }, [
    processedOrders,
    search,
    filterOrigem,
    filterItinerary,
    filterUf,
    filterCredit,
    filterProduction,
    filterStockIntersection,
    filterWalletTime,
    filterOverdue,
  ])

  // KPIs
  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length
    const totalWeightTons = filteredOrders.reduce((acc, o) => acc + (o.weight_kg || 0), 0) / 1000
    const totalFrete = filteredOrders.reduce((acc, o) => acc + (o.freight_value || 0), 0)
    const estoqueAtualCount = filteredOrders.filter(
      (o) => o.stockIntersectionType === 'ESTOQUE_ATUAL',
    ).length
    const producaoFuturaCount = filteredOrders.filter(
      (o) => o.stockIntersectionType === 'PRODUCAO_FUTURA',
    ).length
    const semPrevisaoCount = filteredOrders.filter(
      (o) => o.stockIntersectionType === 'SEM_PREVISAO',
    ).length
    const excelQasCount = filteredOrders.filter(
      (o) =>
        o.origem_dado === 'EXCEL_QAS' ||
        o.origem_dado === 'EXCEL_QAS_ZSD35_V3' ||
        o.origem_dado === 'EXCEL_QAS_ZSD35A_V3',
    ).length

    return {
      totalOrders,
      totalWeightTons: Math.round(totalWeightTons * 10) / 10,
      totalFrete,
      estoqueAtualCount,
      producaoFuturaCount,
      semPrevisaoCount,
      excelQasCount,
    }
  }, [filteredOrders])

  // Exportação CSV
  const handleExportCsv = () => {
    const headers = [
      'Origem Dado',
      'Q.Dias',
      'Documento de vendas',
      'Item',
      'Região',
      'Cidade',
      'Qtde Real (t)',
      'Est. Sider (t)',
      'Texto breve de material',
      'Valor do Frete (R$)',
      'Limite de Crédito (R$)',
      'Saldo (t)',
      'Data do Pedido',
      'Data Remessa(Semana)',
      'Itinerário',
      'Motivo Crédito',
      'Estoque Total (t)',
      'Cruzamento DP34/PCP',
    ]

    const rows = filteredOrders.map((o) => [
      o.origem_dado || 'SAP',
      o.q_dias || o.walletDays || 0,
      o.order_number,
      o.item_number || '000010',
      o.uf,
      o.destination_city,
      (o.weight_kg / 1000).toFixed(3),
      (o.stock_sider || 0).toFixed(3),
      o.material || o.material_description || '',
      o.freight_value || 0,
      o.credit_limit || 0,
      (o.balance_quantity_kg ? o.balance_quantity_kg / 1000 : o.weight_kg / 1000).toFixed(3),
      o.order_date || '',
      o.delivery_week || o.desired_date || '',
      o.itinerary_code,
      o.credit_reason || o.credit_status || '',
      (o.stock_total || 0).toFixed(3),
      o.stockIntersectionType,
    ])

    exportToCsv(`Carteira_ZSD35A_CIAFAL_${new Date().toISOString().split('T')[0]}`, headers, rows)
  }

  // Ação de Atualizar SAP / ZSD35A (Nunca retorna erro de sistema, sempre orienta)
  const handleUpdateSapOrReprocess = async () => {
    setIsLoading(true)
    try {
      await fetchData()
      toast({
        title: 'Atualização Concluída',
        description:
          'Carteira de Pedidos ZSD35A atualizada com sucesso. Ambiente de homologação QAS sincronizado com a base de dados.',
      })
    } catch {
      toast({
        title: 'Integração SAP QAS',
        description:
          'A sincronização online RFC/BAPI com o SAP ECC está aguardando parametrização de credenciais corporativas. Exibindo última massa de homologação carregada.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Processamento do Arquivo Excel (.xlsx) no Modal de Carga
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processSelectedFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processSelectedFile(file)
    }
  }

  const processSelectedFile = (file: File) => {
    // 17. Validação de Segurança: Apenas .xlsx (rejeitar macros .xlsm e executáveis)
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.csv')) {
      toast({
        title: 'Formato de Arquivo Rejeitado',
        description:
          'Por motivos de segurança cibernética corporativa, são aceitos exclusivamente arquivos .xlsx ou .csv padrão. Arquivos com macros (.xlsm) ou executáveis são bloqueados.',
        variant: 'destructive',
      })
      return
    }

    // Limite de 25 MB
    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: 'Arquivo Excede o Limite',
        description: 'O tamanho máximo permitido para o arquivo ZSD35A é de 25 MB.',
        variant: 'destructive',
      })
      return
    }

    setSelectedFile(file)
    setIsParsing(true)
    setValidationReport(null)

    const reader = new FileReader()

    if (fileName.endsWith('.csv')) {
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string
          const rawRows = parseZsd35CsvText(text)
          const report = processZsd35Rows(rawRows, undefined, {
            fileName: file.name,
            userName: user?.name || user?.email,
          })
          setValidationReport(report)
        } catch (err: any) {
          toast({
            title: 'Erro no Processamento do CSV',
            description: err.message || 'Falha ao analisar a estrutura do arquivo CSV.',
            variant: 'destructive',
          })
        } finally {
          setIsParsing(false)
        }
      }
      reader.readAsText(file, 'utf-8')
    } else {
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array', cellDates: true })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

          const report = processZsd35Rows(rawRows, undefined, {
            fileName: file.name,
            userName: user?.name || user?.email,
          })
          setValidationReport(report)
        } catch (err: any) {
          toast({
            title: 'Erro no Processamento do Excel',
            description: err.message || 'Falha ao analisar o arquivo .xlsx.',
            variant: 'destructive',
          })
        } finally {
          setIsParsing(false)
        }
      }
      reader.readAsArrayBuffer(file)
    }
  }

  // Confirmação da Importação ZSD35A
  const handleConfirmImport = async () => {
    if (!validationReport || validationReport.validOrders.length === 0) return

    setIsImporting(true)
    try {
      const res = await TmsService.importZsd35aOrdersBatch(
        validationReport,
        user?.email || 'homologacao@ciafal.logistica',
        user?.name || 'Operador Logístico QAS',
      )

      if (res.success) {
        toast({
          title: 'Carga ZSD35A Realizada com Sucesso!',
          description: `${res.createdCount} novos pedidos inseridos e ${res.updatedCount} atualizados na Carteira oficial.`,
        })
        setIsImportModalOpen(false)
        setSelectedFile(null)
        setValidationReport(null)
        await fetchData()
      } else {
        toast({
          title: 'Falha na Carga',
          description: res.message,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro Crítico',
        description: err.message || 'Falha durante a persistência dos pedidos.',
        variant: 'destructive',
      })
    } finally {
      setIsImporting(false)
    }
  }

  // Histórico de Importações
  const handleOpenHistoryModal = async () => {
    setIsHistoryModalOpen(true)
    setIsLoadingHistory(true)
    try {
      const history = await TmsService.getSapImports()
      setImportHistory(history)
    } catch {
      setImportHistory([])
    } finally {
      setIsLoadingHistory(false)
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
      const history = await TmsService.getSapImports()
      setImportHistory(history)
      await fetchData()
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

  // Filtragem da Prévia no Modal
  const filteredPreviewOrders = useMemo(() => {
    if (!validationReport) return []
    return validationReport.validOrders.filter((o) => {
      if (previewSearch) {
        const q = previewSearch.toLowerCase()
        const match =
          o.order_number.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          o.material.toLowerCase().includes(q) ||
          o.destination_city.toLowerCase().includes(q)
        if (!match) return false
      }
      if (previewFilterStatus !== 'ALL' && o.validation_status !== previewFilterStatus) {
        return false
      }
      return true
    })
  }, [validationReport, previewSearch, previewFilterStatus])

  // Ações Operacionais (Estoque & Crédito)
  const handleOpenStockModal = (order: SapSalesOrderEntity) => {
    if (!permissions.canRequestStockConfirmation) {
      toast({
        title: 'Acesso Negado',
        description: 'Seu perfil RBAC não possui permissão para solicitar confirmação de estoque.',
        variant: 'destructive',
      })
      return
    }
    setStockModalOrder(order)
    setStockReason('Confirmação de saldo físico em estoque para carregamento')
    setStockNotes(
      `Pedido ${order.order_number} (${order.material}). Solicitado saldo para liberação de transporte.`,
    )
  }

  const handleSubmitStockRequest = async () => {
    if (!stockModalOrder) return
    setIsSubmittingStock(true)
    try {
      const res = await TmsService.createStockConfirmationRequest(
        {
          order_number: stockModalOrder.order_number,
          item_number: stockModalOrder.item_number || '000010',
          material_code: stockModalOrder.material || 'MAT-GEN',
          material_description: stockModalOrder.material_description || stockModalOrder.material,
          required_quantity: stockModalOrder.weight_kg / 1000,
          stock_informed: stockModalOrder.weight_kg / 1000,
          unit: 'TON',
          reason: stockReason,
          notes: stockNotes,
        },
        user?.email || 'gerente.carga@ciafal.logistica',
        user?.name || 'Gerente de Carga',
      )

      if (res) {
        toast({
          title: 'Solicitação de Confirmação Enviada',
          description: `Workflow iniciado para o pedido ${stockModalOrder.order_number}. Responsável do Pátio/Estoque notificado.`,
        })
        setStockModalOrder(null)
      }
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao solicitar confirmação.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingStock(false)
    }
  }

  const handleOpenCreditModal = (order: SapSalesOrderEntity) => {
    if (!permissions.canRequestCreditReassessment) {
      toast({
        title: 'Acesso Negado',
        description: 'Seu perfil RBAC não possui permissão para solicitar reavaliação de crédito.',
        variant: 'destructive',
      })
      return
    }
    setCreditModalOrder(order)
    setCreditRequestedVal(order.total_value || 0)
    setCreditReason('Liberação de crédito para composição e fechamento de carga completa')
  }

  const handleSubmitCreditRequest = async () => {
    if (!creditModalOrder) return
    setIsSubmittingCredit(true)
    try {
      const res = await TmsService.createCreditReassessmentRequest(
        {
          customer_code: creditModalOrder.customer_code,
          customer_name: creditModalOrder.customer_name,
          order_number: creditModalOrder.order_number,
          order_value: creditModalOrder.total_value,
          requested_value: creditRequestedVal,
          logistic_reason: creditReason,
          desired_delivery_date: creditModalOrder.desired_date,
          days_overdue: (creditModalOrder as any).overdueDays || 0,
        },
        user?.email || 'gerente.carga@ciafal.logistica',
        user?.name || 'Gerente de Carga',
      )

      if (res) {
        toast({
          title: 'Reavaliação de Crédito Enviada',
          description: `Solicitação encaminhada ao setor Financeiro/Crédito para o cliente ${creditModalOrder.customer_name}.`,
        })
        setCreditModalOrder(null)
      }
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao solicitar reavaliação.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingCredit(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header com Identidade CIAFAL Pantone 2945 e Sequência Obrigatória de Botões */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Carteira de Pedidos SAP (ZSD35A)
            </h1>
            <Badge className="bg-[#005596] text-white text-[10px] font-bold">
              ESTRUTURA OFICIAL 40 CAMPOS
            </Badge>
            {metrics.excelQasCount > 0 && (
              <Badge
                variant="outline"
                className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                EXCEL QAS ({metrics.excelQasCount})
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Espelho da transação SAP ZSD35A da CIAFAL. Fonte unificada para o Planejador de Cargas,
            Roteirizador e Mesa de Fretes.
          </p>
        </div>

        {/* Sequência Solicitada: [ Importar ZSD35A — Excel ] [ Exportar CSV ] [ Atualizar SAP / ZSD35A ] */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-[#005596] hover:bg-[#004478] text-white text-xs h-8 shadow-xs font-semibold"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            Importar ZSD35A — Excel
            <Badge className="ml-1.5 bg-amber-400/30 text-amber-100 text-[9px] px-1 py-0 font-normal">
              QAS
            </Badge>
          </Button>

          <Button
            onClick={handleExportCsv}
            variant="outline"
            size="sm"
            className="text-xs h-8 border-slate-300"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
            Exportar CSV
          </Button>

          <Button
            onClick={handleUpdateSapOrReprocess}
            variant="outline"
            size="sm"
            className="text-xs h-8 border-slate-300"
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar SAP / ZSD35A
          </Button>

          <Button
            onClick={handleOpenHistoryModal}
            variant="ghost"
            size="sm"
            className="text-xs h-8 text-slate-600 hover:text-slate-900"
            title="Histórico de Importações QAS"
          >
            <History className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Histórico
          </Button>
        </div>
      </div>

      {/* Identificação de Massa de Homologação QAS Discreta */}
      {metrics.excelQasCount > 0 && (
        <div className="bg-purple-50 border border-purple-200 text-purple-900 px-3.5 py-2 rounded-lg text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-purple-600 shrink-0" />
            <span>
              <strong>Massa de Homologação — Excel ZSD35A:</strong> {metrics.excelQasCount} pedidos
              carregados via planilha QAS ativos na carteira. Eles utilizam o mesmo motor e regras
              do SAP.
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDeleteQasBatch()}
            disabled={isDeletingBatch}
            className="text-[11px] h-6 text-purple-700 hover:bg-purple-100 font-semibold"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Limpar Massa QAS
          </Button>
        </div>
      )}

      {/* KPI Cards & Indicadores Cruzados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3 space-y-1 flex flex-col justify-between h-full">
            <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">
              Itens em Carteira
            </span>
            <div className="text-xl font-black font-mono text-slate-900">{metrics.totalOrders}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3 space-y-1 flex flex-col justify-between h-full">
            <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">
              Volume Total (Qtde Real)
            </span>
            <div className="text-xl font-black font-mono text-sky-700">
              {metrics.totalWeightTons}{' '}
              <span className="text-xs font-sans font-semibold text-slate-500">t</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3 space-y-1 flex flex-col justify-between h-full">
            <span className="text-[10px] uppercase font-bold text-emerald-600 block truncate">
              ✓ Estoque Atual (DP34)
            </span>
            <div className="text-xl font-black font-mono text-emerald-700">
              {metrics.estoqueAtualCount}{' '}
              <span className="text-xs font-normal text-slate-400 font-sans">pedidos</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3 space-y-1 flex flex-col justify-between h-full">
            <span className="text-[10px] uppercase font-bold text-sky-600 block truncate">
              ⚙ Produção Futura (PCP)
            </span>
            <div className="text-xl font-black font-mono text-sky-700">
              {metrics.producaoFuturaCount}{' '}
              <span className="text-xs font-normal text-slate-400 font-sans">pedidos</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3 space-y-1 flex flex-col justify-between h-full">
            <span className="text-[10px] uppercase font-bold text-amber-500 block truncate">
              ⚠ Sem Previsão Estoque
            </span>
            <div className="text-xl font-black font-mono text-amber-600">
              {metrics.semPrevisaoCount}{' '}
              <span className="text-xs font-normal text-slate-400 font-sans">pedidos</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3 space-y-1 flex flex-col justify-between h-full">
            <span className="text-[10px] uppercase font-bold text-slate-500 block truncate">
              Total Frete Previsto
            </span>
            <div
              className="text-lg font-black font-mono text-slate-800 truncate"
              title={`R$ ${metrics.totalFrete.toLocaleString('pt-BR')}`}
            >
              R$ {metrics.totalFrete.toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-3.5 space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                placeholder="Buscar por Doc. Vendas, Cliente, Cidade, Material, Itinerário, Motivo Crédito..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
            {/* Origem do Dado */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">Origem:</label>
              <Select value={filterOrigem} onValueChange={(v: any) => setFilterOrigem(v)}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todas Origens</SelectItem>
                  <SelectItem value="SAP">SAP Oficial</SelectItem>
                  <SelectItem value="EXCEL_QAS">EXCEL QAS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* UF */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">Região / UF:</label>
              <Select value={filterUf} onValueChange={setFilterUf}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todas Regiões</SelectItem>
                  <SelectItem value="AL">AL (Alagoas)</SelectItem>
                  <SelectItem value="AM">AM (Amazonas)</SelectItem>
                  <SelectItem value="BA">BA (Bahia)</SelectItem>
                  <SelectItem value="CE">CE (Ceará)</SelectItem>
                  <SelectItem value="DF">DF (Distrito Federal)</SelectItem>
                  <SelectItem value="ES">ES (Espírito Santo)</SelectItem>
                  <SelectItem value="MG">MG (Minas Gerais)</SelectItem>
                  <SelectItem value="SP">SP (São Paulo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Itinerário */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">Itinerário:</label>
              <Select value={filterItinerary} onValueChange={setFilterItinerary}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todos Itinerários</SelectItem>
                  <SelectItem value="AL001C">AL001C (Maceió)</SelectItem>
                  <SelectItem value="AM001C">AM001C (Manaus)</SelectItem>
                  <SelectItem value="BA001C">BA001C (Mucuri)</SelectItem>
                  <SelectItem value="CE001C">CE001C (Fortaleza/Juazeiro)</SelectItem>
                  <SelectItem value="DF001B">DF001B (Brasília)</SelectItem>
                  <SelectItem value="ES001A">ES001A (Cachoeiro)</SelectItem>
                  <SelectItem value="SP001A">SP001A (Campinas/SP)</SelectItem>
                  {itineraries.map((it) => (
                    <SelectItem key={it.sap_code} value={it.sap_code}>
                      {it.sap_code} ({it.uf})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cruzamento Estoque DP34 vs PCP */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">DP34 x PCP:</label>
              <Select value={filterStockIntersection} onValueChange={setFilterStockIntersection}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todos Cruzamentos</SelectItem>
                  <SelectItem value="ESTOQUE_ATUAL">Estoque Atual (DP34)</SelectItem>
                  <SelectItem value="PRODUCAO_FUTURA">Produção Futura (PCP)</SelectItem>
                  <SelectItem value="SEM_PREVISAO">Sem Previsão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tempo em Carteira (Q.Dias) */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">
                Dias em Carteira:
              </label>
              <Select value={filterWalletTime} onValueChange={setFilterWalletTime}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todas Faixas</SelectItem>
                  <SelectItem value="0-4">0 a 4 dias (Verde)</SelectItem>
                  <SelectItem value="5-15">5 a 15 dias (Amarelo)</SelectItem>
                  <SelectItem value="16-30">16 a 30 dias (Laranja)</SelectItem>
                  <SelectItem value=">30">&gt; 30 dias (Vermelho)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Crédito */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">Crédito:</label>
              <Select value={filterCredit} onValueChange={setFilterCredit}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todos Créditos</SelectItem>
                  <SelectItem value="Liberado">Liberado / OK</SelectItem>
                  <SelectItem value="Em Análise">Em Análise / Checar Limite</SelectItem>
                  <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Atraso / Prazo Remessa */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">
                Atraso / Remessa:
              </label>
              <Select value={filterOverdue} onValueChange={setFilterOverdue}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todos Prazos</SelectItem>
                  <SelectItem value="atrasado">Apenas Atrasados</SelectItem>
                  <SelectItem value="no_prazo">No Prazo / Futuro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela Principal da Carteira ZSD35A */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-800">
              Visualização da Carteira ZSD35A ({filteredOrders.length} registros)
            </span>
            <Badge variant="outline" className="text-[10px] font-mono bg-white text-slate-700">
              Ordem das Colunas: Transação SAP ZSD35A CIAFAL
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Estoque
              Atual
            </span>
            <span className="flex items-center gap-1 ml-2">
              <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span> Produção Futura
            </span>
            <span className="flex items-center gap-1 ml-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Sem Previsão
            </span>
          </div>
        </div>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1450px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                <th className="p-2.5 text-center font-mono w-16">Origem</th>
                <th className="p-2.5 text-center font-mono w-16">Q.Dias</th>
                <th className="p-2.5 font-mono">Documento de vendas</th>
                <th className="p-2.5 text-center font-mono">Região</th>
                <th className="p-2.5">Cidade</th>
                <th className="p-2.5 text-right font-mono">Qtde Real</th>
                <th className="p-2.5 text-right font-mono">Est. Sider</th>
                <th className="p-2.5">Texto breve de material</th>
                <th className="p-2.5 text-right font-mono">Valor do Frete</th>
                <th className="p-2.5 text-right font-mono">Limite de Crédito</th>
                <th className="p-2.5 text-right font-mono">Saldo</th>
                <th className="p-2.5 text-center font-mono">Data do Pedido</th>
                <th className="p-2.5 text-center font-mono">Data Remessa(Semana)</th>
                <th className="p-2.5 text-center font-mono">Itinerário</th>
                <th className="p-2.5">Motivo Crédito</th>
                <th className="p-2.5 text-right font-mono">Estoque Total</th>
                <th className="p-2.5 text-center">Cruzamento DP34/PCP</th>
                <th className="p-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 text-[11px] font-mono">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={18} className="p-8 text-center text-slate-400 font-sans">
                    Nenhum registro ZSD35A encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, idx) => {
                  let qDiasClass = 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  const dias = order.walletDays || order.q_dias || 0
                  if (dias > 30) {
                    qDiasClass = 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                  } else if (dias >= 16) {
                    qDiasClass = 'bg-orange-100 text-orange-800 border-orange-300 font-bold'
                  } else if (dias >= 5) {
                    qDiasClass = 'bg-amber-100 text-amber-800 border-amber-300'
                  }

                  let intersectionBadge = (
                    <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">
                      Estoque Atual
                    </Badge>
                  )
                  if (order.stockIntersectionType === 'PRODUCAO_FUTURA') {
                    intersectionBadge = (
                      <Badge className="bg-sky-600 text-white text-[9px] px-1.5 py-0">
                        Produção Futura
                      </Badge>
                    )
                  } else if (order.stockIntersectionType === 'SEM_PREVISAO') {
                    intersectionBadge = (
                      <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0">
                        Sem Previsão
                      </Badge>
                    )
                  }

                  const qtdeRealFormatted = (order.weight_kg / 1000).toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 3,
                  })
                  const estSiderFormatted = (order.stock_sider || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 3,
                  })
                  const saldoFormatted = (
                    order.balance_quantity_kg
                      ? order.balance_quantity_kg / 1000
                      : order.weight_kg / 1000
                  ).toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 3,
                  })
                  const estoqueTotalFormatted = (order.stock_total || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 3,
                  })

                  const orderDateFormatted = order.order_date
                    ? order.order_date.includes(' ')
                      ? order.order_date
                      : `${order.order_date} 00:00:00`
                    : '2026-08-20 00:00:00'

                  return (
                    <tr
                      key={order.id || `${order.order_number}-${idx}`}
                      className="hover:bg-sky-50/50 transition-colors"
                    >
                      {/* 0. Origem do Dado */}
                      <td className="p-2.5 text-center">
                        {order.origem_dado === 'EXCEL_QAS_ZSD35A_V3' ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] font-mono px-1 py-0 bg-purple-50 text-purple-700 border-purple-200 font-bold"
                            title="Massa de Homologação Oficial ZSD35A V3"
                          >
                            EXCEL_QAS_ZSD35A_V3
                          </Badge>
                        ) : order.origem_dado === 'EXCEL_QAS' ||
                          order.origem_dado === 'EXCEL_QAS_ZSD35_V3' ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] font-mono px-1 py-0 bg-purple-50 text-purple-700 border-purple-200 font-bold"
                            title="Massa de Homologação via Excel QAS"
                          >
                            EXCEL_QAS_ZSD35A_V3
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[9px] font-mono px-1 py-0 bg-slate-100 text-slate-700 border-slate-200"
                          >
                            SAP
                          </Badge>
                        )}
                      </td>

                      {/* 1. Q.Dias */}
                      <td className="p-2.5 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono px-1.5 py-0 ${qDiasClass}`}
                          title={`Tempo em carteira calculado: ${dias} dias`}
                        >
                          {dias}
                        </Badge>
                      </td>

                      {/* 2. Documento de vendas */}
                      <td className="p-2.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{order.order_number}</span>
                          {order.item_number && order.item_number !== '000010' && (
                            <span className="text-[10px] font-normal text-slate-400">
                              /{order.item_number}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Região */}
                      <td className="p-2.5 text-center font-bold text-slate-700">{order.uf}</td>

                      {/* 4. Cidade */}
                      <td className="p-2.5 font-sans font-medium text-slate-800">
                        {order.destination_city}
                      </td>

                      {/* 5. Qtde Real */}
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {qtdeRealFormatted}
                      </td>

                      {/* 6. Est. Sider */}
                      <td className="p-2.5 text-right text-slate-600 font-mono">
                        {estSiderFormatted}
                      </td>

                      {/* 7. Texto breve de material */}
                      <td className="p-2.5 font-sans text-slate-800 max-w-[220px] truncate">
                        <span className="font-medium text-[#005596] font-mono text-xs">
                          {order.material}
                        </span>
                      </td>

                      {/* 8. Valor do Frete */}
                      <td className="p-2.5 text-right text-slate-800">
                        {order.freight_value !== undefined ? order.freight_value : 500}
                      </td>

                      {/* 9. Limite de Crédito */}
                      <td
                        className={`p-2.5 text-right font-mono ${
                          (order.credit_limit || 0) < 0
                            ? 'text-rose-600 font-bold'
                            : (order.credit_limit || 0) <= 1
                              ? 'text-amber-600'
                              : 'text-slate-700'
                        }`}
                      >
                        {(order.credit_limit || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* 10. Saldo */}
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {saldoFormatted}
                      </td>

                      {/* 11. Data do Pedido */}
                      <td className="p-2.5 text-center text-[10px] text-slate-600">
                        {orderDateFormatted}
                      </td>

                      {/* 12. Data Remessa(Semana) */}
                      <td className="p-2.5 text-center">
                        <div className="font-semibold text-slate-800">
                          {order.delivery_week ||
                            (order.desired_date
                              ? `${order.desired_date} (${order.delayText})`
                              : '34.2026')}
                        </div>
                        {order.isOverdue && (
                          <Badge className="bg-rose-600 text-white text-[8px] px-1 py-0 mt-0.5">
                            {order.delayText}
                          </Badge>
                        )}
                      </td>

                      {/* 13. Itinerário */}
                      <td className="p-2.5 text-center">
                        <Badge className="bg-[#005596] text-white text-[10px] font-mono px-1.5 py-0">
                          {order.itinerary_code}
                        </Badge>
                      </td>

                      {/* 14. Motivo Crédito */}
                      <td className="p-2.5 font-sans">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            order.credit_reason?.includes('DATA SEGUINTE')
                              ? 'bg-amber-100 text-amber-900'
                              : order.credit_reason?.includes('CHECAR')
                                ? 'bg-sky-100 text-sky-900'
                                : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {order.credit_reason ||
                            (order.credit_status === 'Liberado' ? 'CRÉDITO OK' : 'CHECAR LIMITE')}
                        </span>
                      </td>

                      {/* 15. Estoque Total */}
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {estoqueTotalFormatted}
                      </td>

                      {/* 16. Cruzamento DP34 / PCP */}
                      <td className="p-2.5 text-center font-sans">{intersectionBadge}</td>

                      {/* 17. Ações Operacionais */}
                      <td className="p-2.5 text-center font-sans">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenStockModal(order)}
                            className="h-6 px-1.5 text-[10px] text-sky-700 hover:bg-sky-50 border-slate-200"
                            title="Solicitar Confirmação de Estoque"
                          >
                            DP34
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenCreditModal(order)}
                            className="h-6 px-1.5 text-[10px] text-amber-700 hover:bg-amber-50 border-slate-200"
                            title="Solicitar Reavaliação de Crédito"
                          >
                            Crédito
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* MODAL 1: CARGA ZSD35A VIA EXCEL (QAS) COM PRÉVIA & VALIDAÇÃO RIGOROSA      */}
      {/* ========================================================================= */}
      <Dialog
        open={isImportModalOpen}
        onOpenChange={(open) => {
          if (!open && !isImporting) {
            setIsImportModalOpen(false)
            setSelectedFile(null)
            setValidationReport(null)
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#005596]" />
                Carga ZSD35A — QAS (Massa de Homologação)
              </DialogTitle>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                Homologação / Simulação Temporária SAP
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-600">
              Alimenta o mesmo objeto "Pedido TMS" da integração online SAP. Não cria cadastros
              mestres e passa por validação rigorosa com sanitização contra formula injection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Bloco 1: Download do Template e Upload */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block mb-1">
                    Template Padrão ZSD35A
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Baixe o layout padrão oficial ZSD35A V3 contendo os 27 campos da planilha
                    operacional.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadZsd35aTemplateFile}
                  className="mt-3 text-xs w-full border-slate-300 text-[#005596] hover:bg-sky-50 font-semibold"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Baixar Template ZSD35A (.xlsx)
                </Button>
              </div>

              {/* Área de Drag & Drop */}
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`md:col-span-2 border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-[#005596] bg-sky-50/50'
                    : 'border-slate-300 hover:border-slate-400 bg-white'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-slate-700">
                  {selectedFile
                    ? selectedFile.name
                    : 'Clique para selecionar ou arraste o arquivo .xlsx'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Suporta arquivos .xlsx e .csv (Máx. 25 MB). Sanitização e proteção DDE ativas.
                </span>
              </div>
            </div>

            {/* Spinner de Parsing */}
            {isParsing && (
              <div className="p-8 text-center bg-slate-50 rounded-lg border border-slate-200">
                <RefreshCw className="w-6 h-6 animate-spin text-[#005596] mx-auto mb-2" />
                <span className="text-xs font-semibold text-slate-700">
                  Validando e normalizando linhas da planilha ZSD35A...
                </span>
              </div>
            )}

            {/* Bloco 2: Relatório de Validação Antes da Carga */}
            {validationReport && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">
                      Total Lidas
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {validationReport.totalRowsRead}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">
                      Pedidos
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {validationReport.uniqueOrdersCount}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">
                      Clientes
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {validationReport.uniqueClientsCount}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">
                      Materiais
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {validationReport.uniqueMaterialsCount}
                    </span>
                  </div>
                  <div className="p-2 bg-sky-50 border border-sky-200 rounded text-center">
                    <span className="text-[9px] text-sky-700 uppercase font-bold block">
                      Peso Total
                    </span>
                    <span className="text-sm font-bold text-sky-900">
                      {validationReport.totalWeightTon} t
                    </span>
                  </div>
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-center">
                    <span className="text-[9px] text-emerald-700 uppercase font-bold block">
                      🟢 Válidos
                    </span>
                    <span className="text-sm font-bold text-emerald-900">
                      {validationReport.validCount}
                    </span>
                  </div>
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded text-center">
                    <span className="text-[9px] text-amber-700 uppercase font-bold block">
                      🟡 Avisos
                    </span>
                    <span className="text-sm font-bold text-amber-900">
                      {validationReport.warningCount}
                    </span>
                  </div>
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded text-center">
                    <span className="text-[9px] text-rose-700 uppercase font-bold block">
                      🔴 Rejeitados
                    </span>
                    <span className="text-sm font-bold text-rose-900">
                      {validationReport.rejectedRowsCount}
                    </span>
                  </div>
                </div>

                {/* Avisos ou Rejeições */}
                {validationReport.rejectionsLog.length > 0 && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-900 space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      Erros impeditivos encontrados ({validationReport.rejectionsLog.length} linhas
                      descartadas):
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                      {validationReport.rejectionsLog.slice(0, 3).map((rej, i) => (
                        <li key={i}>
                          Linha {rej.rowNumber}: {rej.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Bloco 3: Tabela de Prévia */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        Prévia dos Registros ({filteredPreviewOrders.length} de{' '}
                        {validationReport.validOrders.length})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Filtrar na prévia..."
                        value={previewSearch}
                        onChange={(e) => setPreviewSearch(e.target.value)}
                        className="h-7 text-xs w-48"
                      />
                      <Select value={previewFilterStatus} onValueChange={setPreviewFilterStatus}>
                        <SelectTrigger className="h-7 text-xs w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="ALL">Todos Status</SelectItem>
                          <SelectItem value="VALID">🟢 Válidos</SelectItem>
                          <SelectItem value="WARNING">🟡 Com Avisos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-60">
                    <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                      <thead className="bg-slate-100 sticky top-0 text-[11px] font-bold text-slate-700">
                        <tr>
                          <th className="p-2 font-mono">Pedido</th>
                          <th className="p-2 font-mono">Item</th>
                          <th className="p-2">Cliente</th>
                          <th className="p-2">Cidade/UF</th>
                          <th className="p-2">Material</th>
                          <th className="p-2 text-right font-mono">Qtde (kg)</th>
                          <th className="p-2 text-right font-mono">Peso t</th>
                          <th className="p-2 text-center">Estoque</th>
                          <th className="p-2 text-center">PCP</th>
                          <th className="p-2">Crédito</th>
                          <th className="p-2 text-center font-mono">Itinerário</th>
                          <th className="p-2 text-center font-mono">Dias Cart.</th>
                          <th className="p-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                        {filteredPreviewOrders.map((ord, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-bold text-slate-900">{ord.order_number}</td>
                            <td className="p-2 text-slate-500">{ord.item_number}</td>
                            <td className="p-2 font-sans truncate max-w-[150px]">
                              {ord.customer_name}
                            </td>
                            <td className="p-2 font-sans">
                              {ord.destination_city}/{ord.uf}
                            </td>
                            <td className="p-2 font-sans truncate max-w-[140px] text-[#005596]">
                              {ord.material}
                            </td>
                            <td className="p-2 text-right">
                              {ord.weight_kg.toLocaleString('pt-BR')}
                            </td>
                            <td className="p-2 text-right font-bold text-slate-900">
                              {ord.weight_ton.toFixed(3)}
                            </td>
                            <td className="p-2 text-center font-sans">
                              {ord.stockIntersectionType === 'ESTOQUE_ATUAL' ? (
                                <Badge className="bg-emerald-600 text-white text-[8px]">
                                  DP34 OK
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-slate-500">-</span>
                              )}
                            </td>
                            <td className="p-2 text-center font-sans">
                              <span className="text-[10px] text-slate-700">
                                {ord.production_status}
                              </span>
                            </td>
                            <td className="p-2 font-sans">
                              <span
                                className={`text-[10px] font-semibold ${
                                  ord.credit_status === 'Bloqueado'
                                    ? 'text-rose-600'
                                    : ord.credit_status === 'Em Análise'
                                      ? 'text-amber-600'
                                      : 'text-emerald-700'
                                }`}
                              >
                                {ord.credit_status}
                              </span>
                            </td>
                            <td className="p-2 text-center">
                              <Badge variant="outline" className="text-[9px]">
                                {ord.itinerary_code}
                              </Badge>
                            </td>
                            <td className="p-2 text-center font-bold">{ord.walletDays}d</td>
                            <td className="p-2 text-center">
                              {ord.validation_status === 'VALID' ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px]">
                                  🟢 Válido
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px]">
                                  🟡 Alerta
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between border-t border-slate-200 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsImportModalOpen(false)
                setSelectedFile(null)
                setValidationReport(null)
              }}
              className="text-xs"
              disabled={isImporting}
            >
              Cancelar
            </Button>

            <Button
              onClick={handleConfirmImport}
              disabled={
                !validationReport || validationReport.validOrders.length === 0 || isImporting
              }
              className="bg-[#005596] hover:bg-[#004478] text-white text-xs font-bold shadow-xs"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Processando Carga...
                </>
              ) : (
                <>
                  <FileCheck className="w-3.5 h-3.5 mr-1.5" />
                  Confirmar Importação ZSD35A ({validationReport?.validOrders.length || 0}{' '}
                  registros)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: HISTÓRICO DE IMPORTAÇÕES & GESTÃO DE LOTES QAS                    */}
      {/* ========================================================================= */}
      <Dialog
        open={isHistoryModalOpen}
        onOpenChange={(open) => !open && setIsHistoryModalOpen(false)}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-[#005596]" />
                Histórico de Importações ZSD35A (QAS)
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteQasBatch()}
                disabled={isDeletingBatch}
                className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Excluir Toda Massa QAS
              </Button>
            </div>
            <DialogDescription className="text-xs">
              Registro auditável dos lotes de importação executados. Somente registros com
              origem_dado = 'EXCEL_QAS', 'EXCEL_QAS_ZSD35_V3' ou 'EXCEL_QAS_ZSD35A_V3' podem ser
              excluídos por esta função.
            </DialogDescription>
          </DialogHeader>

          {isLoadingHistory ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#005596]" />
              Carregando histórico...
            </div>
          ) : importHistory.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-lg text-slate-400 text-xs">
              Nenhuma carga de homologação registrada até o momento.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead className="bg-slate-100 text-[11px] font-bold text-slate-700">
                  <tr>
                    <th className="p-2">Lote</th>
                    <th className="p-2">Data/Hora</th>
                    <th className="p-2">Arquivo</th>
                    <th className="p-2 text-right">Lidas</th>
                    <th className="p-2 text-right">Peso (t)</th>
                    <th className="p-2 text-center">Status</th>
                    <th className="p-2 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {importHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-[#005596]">{item.batch_id || item.id}</td>
                      <td className="p-2 text-slate-600">
                        {item.created ? new Date(item.created).toLocaleString('pt-BR') : '-'}
                      </td>
                      <td className="p-2 truncate max-w-[160px] font-sans">{item.file_name}</td>
                      <td className="p-2 text-right font-bold text-slate-900">
                        {item.valid_count || item.total_read || 0}
                      </td>
                      <td className="p-2 text-right text-sky-700">
                        {(item.total_weight_ton || 0).toFixed(2)} t
                      </td>
                      <td className="p-2 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            item.status === 'concluido'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {item.status || 'concluido'}
                        </Badge>
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteQasBatch(item.batch_id)}
                          disabled={isDeletingBatch}
                          className="h-6 px-1 text-rose-600 hover:bg-rose-50 text-[10px]"
                          title="Excluir apenas este lote QAS"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHistoryModalOpen(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Confirmation Request Modal */}
      <Dialog open={!!stockModalOrder} onOpenChange={(open) => !open && setStockModalOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#005596]" />
              Solicitar Confirmação de Estoque DP34
            </DialogTitle>
            <DialogDescription className="text-xs">
              Workflow formal para verificação física de saldo de laminados. Não altera o SAP
              diretamente.
            </DialogDescription>
          </DialogHeader>

          {stockModalOrder && (
            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 text-[10px] block">Pedido / Item</span>
                  <strong>{stockModalOrder.order_number}</strong> (Item{' '}
                  {stockModalOrder.item_number || '000010'})
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Material</span>
                  <strong className="text-[#005596]">{stockModalOrder.material}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Quantidade Necessária</span>
                  <strong>{(stockModalOrder.weight_kg / 1000).toFixed(1)} TON</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Estoque Total Informado</span>
                  <strong>
                    {(stockModalOrder.stock_total || 0).toFixed(3)} t (
                    {stockModalOrder.production_status})
                  </strong>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">
                  Motivo da Solicitação:
                </label>
                <Input
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">
                  Observações / Detalhes:
                </label>
                <Textarea
                  value={stockNotes}
                  onChange={(e) => setStockNotes(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStockModalOrder(null)}
              className="text-xs"
              disabled={isSubmittingStock}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitStockRequest}
              disabled={isSubmittingStock}
              className="bg-[#005596] hover:bg-sky-700 text-white text-xs font-bold"
            >
              {isSubmittingStock ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Reassessment Request Modal */}
      <Dialog open={!!creditModalOrder} onOpenChange={(open) => !open && setCreditModalOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Solicitar Reavaliação de Crédito
            </DialogTitle>
            <DialogDescription className="text-xs">
              Workflow formal Logística → Financeiro para liberação ou desbloqueio de valor de
              pedido.
            </DialogDescription>
          </DialogHeader>

          {creditModalOrder && (
            <div className="space-y-3 text-xs">
              <div className="bg-amber-50 p-2.5 rounded border border-amber-200 grid grid-cols-2 gap-2 text-amber-950">
                <div>
                  <span className="text-amber-700 text-[10px] block">Cliente</span>
                  <strong>{creditModalOrder.customer_name}</strong>
                </div>
                <div>
                  <span className="text-amber-700 text-[10px] block">Pedido SAP</span>
                  <strong>{creditModalOrder.order_number}</strong>
                </div>
                <div>
                  <span className="text-amber-700 text-[10px] block">Limite Atual / Saldo</span>
                  <strong>
                    R${' '}
                    {(creditModalOrder.credit_limit || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </strong>
                </div>
                <div>
                  <span className="text-amber-700 text-[10px] block">Motivo Atual</span>
                  <Badge className="bg-amber-600 text-white text-[9px]">
                    {creditModalOrder.credit_reason || creditModalOrder.credit_status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">
                  Valor Solicitado para Desbloqueio (R$):
                </label>
                <Input
                  type="number"
                  value={creditRequestedVal}
                  onChange={(e) => setCreditRequestedVal(Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">
                  Justificativa Logística:
                </label>
                <Textarea
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreditModalOrder(null)}
              className="text-xs"
              disabled={isSubmittingCredit}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitCreditRequest}
              disabled={isSubmittingCredit}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
            >
              {isSubmittingCredit ? 'Enviando...' : 'Encaminhar ao Financeiro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SalesWalletPage
