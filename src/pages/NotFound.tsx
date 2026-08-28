import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Home } from 'lucide-react'

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">404 - Página Não Encontrada</h1>
        <p className="text-xs text-slate-500">
          A rota solicitada não existe no sistema TMS CIAFAL ou foi realocada.
        </p>
        <Link to="/tms/dashboard">
          <Button className="bg-[#005596] hover:bg-sky-700 text-white text-xs font-bold w-full mt-2">
            <Home className="w-4 h-4 mr-1.5" />
            Voltar ao Dashboard TMS
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default NotFound
