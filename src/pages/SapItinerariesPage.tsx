import React, { useState, useEffect } from 'react'
import {
  Route,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Building,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { SapItineraryEntity } from '@/domain/rules'

export const SapItinerariesPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const { toast } = useToast()

  const [itineraries, setItineraries] = useState<SapItineraryEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Edit operational notes dialog
  const [selectedItinerary, setSelectedItinerary] = useState<SapItineraryEntity | null>(null)
  const [notesInput, setNotesInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const data = await TmsService.getSapItineraries()
      setItineraries(data)
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao carregar itinerários SAP.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredItineraries = itineraries.filter(
    (i) =>
      i.sap_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.uf || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.region || '').toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleOpenEdit = (itin: SapItineraryEntity) => {
    setSelectedItinerary(itin)
    setNotesInput(itin.operational_notes || '')
  }

  const handleSaveNotes = async () => {
    if (!selectedItinerary) return
    setIsSaving(true)
    try {
      const ok = await TmsService.updateItineraryOperationalNotes(
        selectedItinerary.id,
        notesInput,
        user?.email || 'gerente.carga@ciafal.logistica',
        user?.name || 'Gerente de Carga',
      )
      if (ok) {
        toast({
          title: 'Observações Salvas',
          description: `Metadados operacionais do itinerário ${selectedItinerary.sap_code} atualizados.`,
        })
        setSelectedItinerary(null)
        fetchData()
      } else {
        toast({
          title: 'Erro',
          description: 'Falha ao atualizar observações.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Erro ao salvar.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Itinerários SAP (Cadastro Mestre TVROT)
            </h1>
            <Badge className="bg-[#005596] text-white text-[10px] font-bold">
              FONTE OFICIAL SAP
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Origem corporativa SAP ECC 6.0 (Tabela TVROT). Usuários podem adicionar metadados
            operacionais, mas NÃO alterar código SAP arbitrariamente.
          </p>
        </div>

        <Button
          onClick={fetchData}
          variant="outline"
          size="sm"
          className="text-xs h-8"
          disabled={isLoading}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Sincronizar SAP TVROT
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <Input
            placeholder="Filtrar por código SAP, descrição, UF ou região..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="text-xs text-slate-500">
          Total de Itinerários Ativos:{' '}
          <strong className="text-slate-800">{filteredItineraries.length}</strong>
        </div>
      </div>

      {/* Itineraries Master Table */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Código SAP</th>
                  <th className="p-3">Descrição Corporativa SAP</th>
                  <th className="p-3">UF / Região</th>
                  <th className="p-3 text-center">Lead Time Médio</th>
                  <th className="p-3">Observações Operacionais TMS</th>
                  <th className="p-3 text-center">Status no TMS</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredItineraries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      Nenhum itinerário localizado.
                    </td>
                  </tr>
                ) : (
                  filteredItineraries.map((itin) => (
                    <tr key={itin.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-[#005596] text-sm">
                        {itin.sap_code}
                      </td>
                      <td className="p-3 font-medium text-slate-900">{itin.description}</td>
                      <td className="p-3 text-slate-600">
                        {itin.uf} • {itin.region || '—'}
                      </td>
                      <td className="p-3 text-center font-mono">
                        {itin.avg_transit_days ? `${itin.avg_transit_days} dias` : '1 dia'}
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">
                        {itin.operational_notes || (
                          <span className="text-slate-400 italic">Sem observações</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          className={`text-[9px] font-bold ${
                            itin.is_active ? 'bg-emerald-600 text-white' : 'bg-slate-400 text-white'
                          }`}
                        >
                          {itin.is_active ? 'ATIVO NO TMS' : 'INATIVO'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(itin)}
                          className="h-7 text-xs text-[#005596] hover:bg-sky-50"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Metadados
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Notes Modal */}
      <Dialog
        open={!!selectedItinerary}
        onOpenChange={(open) => !open && setSelectedItinerary(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Metadados Operacionais do Itinerário
            </DialogTitle>
            <DialogDescription className="text-xs">
              Adicione restrições de tráfego, horários de descarga ou particularidades de rota para
              a equipe de logística.
            </DialogDescription>
          </DialogHeader>

          {selectedItinerary && (
            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded border space-y-1">
                <div>
                  Código SAP:{' '}
                  <strong className="font-mono text-[#005596]">{selectedItinerary.sap_code}</strong>
                </div>
                <div>
                  Descrição: <strong>{selectedItinerary.description}</strong>
                </div>
                <div className="text-slate-500 text-[11px]">
                  Origem do cadastro: {selectedItinerary.origin || 'SAP_TVROT'}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Observações Operacionais (TMS):
                </label>
                <Textarea
                  placeholder="Ex: Rota com pedágio tag obrigatória, restrição de tráfego pesado entre 07h e 09h..."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="text-xs h-24"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedItinerary(null)}
              className="text-xs"
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveNotes}
              disabled={isSaving}
              className="bg-[#005596] text-white text-xs"
            >
              {isSaving ? 'Salvando...' : 'Salvar e Auditar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
