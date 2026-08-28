import React, { useState, useEffect } from 'react'
import {
  Layers,
  Sparkles,
  Send,
  Building,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  Plus,
  AlertCircle,
  Truck,
  Package,
} from 'lucide-react'
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
import { OportunidadeComplementoCargaEntity, SapSalesOrderEntity } from '@/domain/rules'

export const ComplementCargosPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [opportunities, setOpportunities] = useState<OportunidadeComplementoCargaEntity[]>([])
  const [orders, setOrders] = useState<SapSalesOrderEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Send to CRM modal
  const [selectedOpp, setSelectedOpp] = useState<OportunidadeComplementoCargaEntity | null>(null)
  const [isSendingToCrm, setIsSendingToCrm] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [opps, ords] = await Promise.all([
        TmsService.getComplementOpportunities(),
        TmsService.getSapSalesOrders(),
      ])
      setOpportunities(opps)
      setOrders(ords)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar oportunidades',
        description: err?.message || 'Falha ao buscar oportunidades de complemento.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSendToCrm = async () => {
    if (!selectedOpp) return
    setIsSendingToCrm(true)
    try {
      const ok = await TmsService.sendComplementOpportunityToCrm(
        selectedOpp.id,
        user?.email || 'gerente.carga@ciafal.logistica',
        user?.name || 'Gerente de Carga',
      )
      if (ok) {
        toast({
          title: 'Oportunidade Enviada ao CRM 360°',
          description: `Alerta logístico gerado com sucesso (Correlation ID: ${selectedOpp.correlation_id}).`,
        })
        setSelectedOpp(null)
        fetchData()
      } else {
        toast({
          title: 'Falha no envio',
          description: 'Não foi possível despachar a oportunidade para o CRM.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Erro no envio.',
        variant: 'destructive',
      })
    } finally {
      setIsSendingToCrm(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Complemento de Cargas
            </h1>
            <Badge className="bg-purple-600 text-white text-[10px] font-bold">
              OPORTUNIDADES LOGÍSTICAS
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Identificação de cargas com capacidade residual e geração de oportunidades para equipe
            comercial (CRM 360°).
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
          Atualizar Oportunidades
        </Button>
      </div>

      {/* Explication Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 space-y-1">
        <div className="font-bold flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>FLUXO DE INTEGRAÇÃO: TMS → OPORTUNIDADE → CRM 360° → VENDEDOR → SAP</span>
        </div>
        <p className="text-[11px] text-purple-800 leading-relaxed">
          "NUNCA inserir pedido automaticamente na carga." O sistema detecta o saldo residual do
          veículo (ex: capacidade 28t, peso atual 23,5t, saldo 4,5t) e sugere pedidos e clientes do
          mesmo itinerário para aprovação humana do Gerente de Carga.
        </p>
      </div>

      {/* Grid of Opportunities */}
      {opportunities.length === 0 ? (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-10 text-center text-slate-400 text-xs">
            Nenhuma oportunidade de complemento de carga registrada no momento.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {opportunities.map((opp) => {
            const candidateOrdersList = Array.isArray(opp.candidate_orders)
              ? opp.candidate_orders
              : typeof opp.candidate_orders === 'string'
                ? JSON.parse(opp.candidate_orders || '[]')
                : []

            const candidateClientsList = Array.isArray(opp.candidate_clients)
              ? opp.candidate_clients
              : typeof opp.candidate_clients === 'string'
                ? JSON.parse(opp.candidate_clients || '[]')
                : []

            return (
              <Card
                key={opp.id}
                className="bg-white border-slate-200 shadow-sm hover:shadow transition-all relative overflow-hidden"
              >
                <div className="h-1.5 w-full bg-purple-600" />
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 font-mono">
                        {opp.cargo_code}
                      </CardTitle>
                      <CardDescription className="text-xs font-mono text-[#005596] font-semibold">
                        Itinerário: {opp.itinerary_code}
                      </CardDescription>
                    </div>

                    <Badge
                      className={`text-[10px] font-bold ${
                        opp.status === 'Nova'
                          ? 'bg-purple-600 text-white'
                          : opp.status === 'Enviada CRM'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-600 text-white'
                      }`}
                    >
                      {opp.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-0 space-y-3 text-xs">
                  {/* Weight metrics */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">
                        Peso Atual
                      </span>
                      <strong className="text-slate-900 font-mono">
                        {(opp.current_weight_kg / 1000).toFixed(1)} t
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">
                        Capacidade
                      </span>
                      <strong className="text-slate-900 font-mono">
                        {(opp.capacity_kg / 1000).toFixed(1)} t
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-purple-700 uppercase block font-bold">
                        Saldo Disponível
                      </span>
                      <strong className="text-purple-700 font-mono font-black">
                        {(opp.balance_kg / 1000).toFixed(1)} t
                      </strong>
                    </div>
                  </div>

                  {/* Candidates */}
                  <div className="space-y-1 text-[11px]">
                    <div className="text-slate-500 font-bold">Clientes Candidatos:</div>
                    <div className="text-slate-800 font-medium">
                      {candidateClientsList.join(', ') || 'Clientes com demanda aberta'}
                    </div>

                    <div className="text-slate-500 font-bold pt-1">Pedidos Candidatos:</div>
                    <div className="font-mono text-[#005596]">
                      {candidateOrdersList.join(', ') || 'Nenhum pedido vinculado'}
                    </div>
                  </div>

                  {opp.notes && (
                    <div className="p-2 bg-slate-50 rounded text-[10px] text-slate-600 italic">
                      {opp.notes}
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {opp.correlation_id}
                    </span>

                    {opp.status === 'Nova' ? (
                      <Button
                        size="sm"
                        onClick={() => setSelectedOpp(opp)}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-7 font-semibold"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Enviar ao CRM
                      </Button>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-emerald-700 border-emerald-500 text-[10px]"
                      >
                        ✓ Notificado no CRM
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dispatch to CRM Modal */}
      <Dialog open={!!selectedOpp} onOpenChange={(open) => !open && setSelectedOpp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Despachar Oportunidade para CRM 360°
            </DialogTitle>
            <DialogDescription className="text-xs">
              Será criado um evento comercial alertando a equipe de vendas sobre a capacidade
              logística disponível no itinerário.
            </DialogDescription>
          </DialogHeader>

          {selectedOpp && (
            <div className="space-y-3 text-xs">
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 space-y-1">
                <div className="font-bold text-purple-900">
                  Carga {selectedOpp.cargo_code} — Itinerário {selectedOpp.itinerary_code}
                </div>
                <div className="text-purple-800">
                  Saldo de transporte disponível:{' '}
                  <strong>{(selectedOpp.balance_kg / 1000).toFixed(1)} toneladas</strong>.
                </div>
              </div>

              <p className="text-slate-600 text-[11px] leading-relaxed">
                O CRM 360° notificará os vendedores com clientes ativos no itinerário{' '}
                <strong>{selectedOpp.itinerary_code}</strong> para antecipação de pedidos ou vendas
                adicionais.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedOpp(null)}
              className="text-xs"
              disabled={isSendingToCrm}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSendToCrm}
              disabled={isSendingToCrm}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
            >
              {isSendingToCrm ? 'Enviando...' : 'Confirmar Envio ao CRM 360°'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
