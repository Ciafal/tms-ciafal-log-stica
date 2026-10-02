import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, Layers, ArrowLeft } from 'lucide-react'
import {
  GeneralTransportRecord,
  ColumnDefinition,
  GENERAL_TRANSPORT_COLUMNS,
} from '@/domain/generalTransportReportEngine'
import { ReportDataTable } from './ReportDataTable'

interface DrillDownModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  field: string
  value: string
  records: GeneralTransportRecord[]
  activeColumns: ColumnDefinition[]
  onSelectTransport: (transportNumber: string, rec: GeneralTransportRecord) => void
}

export const ReportDrillDownModal: React.FC<DrillDownModalProps> = ({
  open,
  onOpenChange,
  field,
  value,
  records,
  activeColumns,
  onSelectTransport,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50 border-slate-200">
        <DialogHeader className="p-4 pb-3 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#005596]/10 text-[#005596]">
                <Table className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>Drill-Down: {field} = </span>
                  <Badge className="bg-[#005596] text-white text-xs">{value}</Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Exibindo os transportes filtrados correspondentes ao item selecionado no gráfico.
                  Acesso aos 43 campos canônicos.
                </DialogDescription>
              </div>
            </div>

            <Badge variant="outline" className="text-xs font-mono font-bold">
              {records.length} registro(s)
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <ReportDataTable
            records={records}
            columns={activeColumns.length > 0 ? activeColumns : GENERAL_TRANSPORT_COLUMNS}
            sortField="transport_date"
            sortOrder="desc"
            onSort={() => {}}
            onSelectTransport={onSelectTransport}
            isLoading={false}
          />
        </div>

        <div className="p-3 border-t border-slate-200 bg-white flex justify-end">
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs h-8 px-4"
          >
            Voltar ao Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
