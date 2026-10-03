import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { TransportEditableRecord } from '@/domain/transportEditEngine'
import { TransportSyncBadge } from './TransportSyncBadge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Eye, Truck, Calendar, MapPin, User, FileText, CheckCircle2, X } from 'lucide-react'

interface TransportViewModalProps {
  open: boolean
  onClose: () => void
  transport: TransportEditableRecord | null
  onOpenEdit: (id: string) => void
  onOpenHistory: (trNum: string, sapNum: string, id: string) => void
}

export const TransportViewModal: React.FC<TransportViewModalProps> = ({
  open,
  onClose,
  transport,
  onOpenEdit,
  onOpenHistory,
}) => {
  if (!open || !transport) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="bg-primary/5 p-4 border-b shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  Visualização do Transporte
                  <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {transport.transport_number}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Documento operacional e dados estruturais sincronizados com o SAP VT02N.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <TransportSyncBadge status={transport.sap_sync_status} />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onOpenHistory(
                    transport.transport_number,
                    transport.sap_transport_number,
                    transport.id,
                  )
                }
                className="h-8 text-xs bg-white"
              >
                Histórico
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* BLOCO 1: IDENTIFICAÇÃO E STATUS */}
          <div className="bg-muted/15 border rounded-lg p-3.5 space-y-3">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
              1. Identificação Estrutural (SAP / HUB)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Nº Transporte HUB:</span>
                <span className="font-mono font-bold text-gray-900">
                  {transport.transport_number}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Nº Transporte SAP:</span>
                <span className="font-mono font-bold text-primary">
                  {transport.sap_transport_number || '—'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Centro / Empresa:</span>
                <span className="font-medium text-gray-800">
                  {transport.plant_code} / {transport.company_code}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Status Operacional:</span>
                <span className="font-bold text-gray-900">{transport.status}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Data de Criação:</span>
                <span>{new Date(transport.creation_date).toLocaleDateString('pt-BR')}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Origem do Registro:</span>
                <span>{transport.origin_system_source}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block text-[11px]">
                  Última Alteração Auditada:
                </span>
                <span className="truncate block">
                  {new Date(transport.last_modified_at).toLocaleString('pt-BR')} por{' '}
                  {transport.last_modified_by}
                </span>
              </div>
            </div>
          </div>

          {/* BLOCO 2: DADOS LOGÍSTICOS */}
          <div className="bg-white border rounded-lg p-3.5 space-y-3 shadow-xs">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
              2. Dados Logísticos e Veiculares
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Transportadora:</span>
                <span className="font-semibold text-gray-900">{transport.carrier_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Motorista:</span>
                <span className="font-semibold text-gray-900">{transport.driver_name}</span>
                {transport.driver_document_masked && (
                  <span className="text-[10px] text-muted-foreground font-mono block">
                    CPF: {transport.driver_document_masked}
                  </span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Placa Veículo / Carreta:
                </span>
                <span className="font-mono font-bold text-gray-900">
                  {transport.vehicle_plate}{' '}
                  {transport.trailer_plate ? `/ ${transport.trailer_plate}` : ''}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Tipo de Veículo:</span>
                <span>{transport.vehicle_type}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Itinerário:</span>
                <span className="font-mono font-semibold text-primary">
                  {transport.itinerary_code}
                </span>
                <span className="text-[11px] text-muted-foreground block truncate">
                  {transport.itinerary_description}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Previsão Carregamento:
                </span>
                <span>
                  {new Date(transport.scheduled_loading_date).toLocaleDateString('pt-BR')}{' '}
                  {transport.scheduled_loading_time}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Previsão Entrega:</span>
                <span>
                  {new Date(transport.scheduled_delivery_date).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Peso Total / Descargas:
                </span>
                <span className="font-mono font-bold text-gray-900">
                  {transport.total_weight_kg.toLocaleString('pt-BR')} kg (
                  {transport.discharges_count} descarga(s))
                </span>
              </div>
            </div>

            {transport.logistics_notes && (
              <div className="bg-muted/10 p-2.5 rounded border text-xs">
                <span className="font-semibold text-gray-700 block mb-0.5">Observações:</span>
                <p className="text-muted-foreground italic">{transport.logistics_notes}</p>
              </div>
            )}
          </div>

          {/* BLOCO 3: REMESSAS E PEDIDOS */}
          <div className="bg-white border rounded-lg p-3.5 space-y-3 shadow-xs">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
              3. Remessas Relacionadas ({transport.remessas.length})
            </span>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs">Seq.</TableHead>
                    <TableHead className="text-xs">Remessa</TableHead>
                    <TableHead className="text-xs">Pedido SAP</TableHead>
                    <TableHead className="text-xs">Cliente / Destino</TableHead>
                    <TableHead className="text-right text-xs">Peso (kg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transport.remessas.map((rem) => (
                    <TableRow key={rem.delivery_number}>
                      <TableCell className="text-center font-bold text-xs">
                        {rem.sequence}º
                      </TableCell>
                      <TableCell className="font-mono font-bold text-xs">
                        {rem.delivery_number}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{rem.order_number}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold">{rem.customer_name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {rem.destination_city} - {rem.destination_uf}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-xs">
                        {rem.weight_kg.toLocaleString('pt-BR')} kg
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-muted/20 p-3.5 border-t flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            <X className="h-3.5 w-3.5 mr-1" />
            Fechar
          </Button>

          <Button
            size="sm"
            onClick={() => {
              onClose()
              onOpenEdit(transport.id)
            }}
            className="bg-primary text-white text-xs font-medium"
          >
            Editar este transporte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
