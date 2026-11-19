import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

export function linkAtendimentoMotorista(telefone: string): string | null {
  let numero = telefone.trim().replace(/\D/g, '')
  if (!numero) return null
  if (!telefone.trim().startsWith('+')) {
    numero = numero.replace(/^0+/, '')
    if (numero.length === 10 || numero.length === 11) numero = `55${numero}`
  }
  if (!/^\d{12,15}$/.test(numero)) return null
  return `/tms/conversas?telefone=${encodeURIComponent(numero)}`
}

export function DriverHelenaLink({ telefone, children }: { telefone: string; children: ReactNode }) {
  const destino = linkAtendimentoMotorista(telefone)
  if (!destino) return <span>{children}</span>
  return (
    <Link to={destino} className="text-emerald-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 rounded"
      title="Abrir atendimento no Helena · (37) 2101-1401">
      {children}
    </Link>
  )
}
