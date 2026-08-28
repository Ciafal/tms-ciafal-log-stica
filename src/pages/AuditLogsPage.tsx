import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { TmsService } from '@/services/tmsService'
import { AuditLogEntity } from '@/domain/rules'
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Clock,
  User,
  Activity,
  FileCode,
  ShieldCheck,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const AuditLogsPage: React.FC = () => {
  const { user, permissions } = useAuth()
  const [logs, setLogs] = useState<AuditLogEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const loadLogs = async () => {
    setIsLoading(true)
    try {
      const data = await TmsService.getAuditLogs(150)
      setLogs(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const filtered = logs.filter((l) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      (l.action || '').toLowerCase().includes(term) ||
      (l.user_email || '').toLowerCase().includes(term) ||
      (l.reason || '').toLowerCase().includes(term) ||
      (l.resource || '').toLowerCase().includes(term) ||
      (l.correlation_id || '').toLowerCase().includes(term)
    )
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-[#005596]" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Trilha de Auditoria & Governança TMS
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Registro imutável de transições de estado, ações manuais, motivos, correlation IDs e
            eventos da fila.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadLogs}
          className="text-xs text-slate-700 border-slate-300 gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar Logs
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Pesquisar por ação, operador, motivo, recurso ou Correlation ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-sm">Nenhum registro de auditoria encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Ação</th>
                  <th className="p-3">Recurso</th>
                  <th className="p-3">Operador</th>
                  <th className="p-3">Estado Anterior → Novo</th>
                  <th className="p-3">Motivo Declarado</th>
                  <th className="p-3">Correlation ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                      {log.created ? new Date(log.created).toLocaleString('pt-BR') : '---'}
                    </td>
                    <td className="p-3">
                      <Badge className="bg-sky-100 text-[#005596] font-bold border-none text-[10px]">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="p-3 font-medium text-slate-800">{log.resource}</td>
                    <td className="p-3 text-slate-600">
                      <div className="font-semibold">{log.user_name || log.user_email}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.user_email}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="text-slate-500">{log.previous_state || 'N/A'}</span>
                      <span className="mx-1 text-slate-400">→</span>
                      <strong className="text-slate-900">{log.new_state || 'N/A'}</strong>
                    </td>
                    <td className="p-3 text-slate-700 max-w-xs">{log.reason || '---'}</td>
                    <td className="p-3 font-mono text-[10px] text-slate-400">
                      {log.correlation_id || '---'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
