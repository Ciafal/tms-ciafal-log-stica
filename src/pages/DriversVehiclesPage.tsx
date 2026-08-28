import React, { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  DriverEntity,
  VehicleEntity,
  maskDocument,
  maskPhone,
  formatDocument,
  formatPhone,
} from '@/domain/rules'
import {
  Truck,
  Search,
  ShieldCheck,
  User,
  Phone,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const DriversVehiclesPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const [drivers, setDrivers] = useState<DriverEntity[]>([])
  const [vehicles, setVehicles] = useState<VehicleEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const loadData = async () => {
    setIsLoading(true)
    try {
      const d = await pb.collection('drivers').getFullList<DriverEntity>({ sort: 'name' })
      const v = await pb.collection('vehicles').getFullList<VehicleEntity>({ sort: 'plate' })
      setDrivers(d)
      setVehicles(v)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = drivers.filter((d) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      d.name.toLowerCase().includes(term) ||
      d.document.includes(term) ||
      (d.sap_id || '').toLowerCase().includes(term)
    )
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Truck className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Motoristas & Veículos Cadastrados
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Espelho da View SAP <strong>ZSD004V_V2</strong>. O CPF/CNPJ é a identidade funcional dos
            condutores.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="text-xs text-slate-700 border-slate-300 gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar Dados
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Pesquisar por nome do motorista, CPF/CNPJ ou Código SAP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((d) => {
          const matchedVehicles = vehicles.filter((v) => v.driver === d.id)
          return (
            <Card
              key={d.id}
              className="border-slate-200 shadow-sm hover:border-sky-400 transition-all"
            >
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{d.name}</h3>
                    <div className="text-slate-500 text-[11px] font-mono mt-0.5">
                      SAP: {d.sap_id || 'A confirmar no Blueprint'}
                    </div>
                  </div>
                  <Badge
                    className={
                      d.status === 'ativo' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }
                  >
                    {d.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="bg-slate-50 p-2.5 rounded border border-slate-100 space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">CPF/CNPJ:</span>
                    <strong className="font-mono text-slate-800">
                      {permissions.canViewFullSensitiveData
                        ? formatDocument(d.document)
                        : maskDocument(d.document)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">WhatsApp:</span>
                    <strong className="font-mono text-slate-800">
                      {permissions.canViewFullSensitiveData
                        ? formatPhone(d.whatsapp)
                        : maskPhone(d.whatsapp)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">CNH:</span>
                    <span className="font-mono text-slate-700">
                      {d.cnh || '---'} (Cat. {d.cnh_category || 'E'})
                    </span>
                  </div>
                </div>

                {matchedVehicles.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Veículos Vinculados:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {matchedVehicles.map((v) => (
                        <span
                          key={v.id}
                          className="bg-sky-50 border border-sky-200 text-[#005596] font-mono px-2 py-0.5 rounded font-bold"
                        >
                          {v.plate} ({v.type})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
