import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { QrCodeSvg } from '@/components/QrCodeSvg'
import {
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  Share2,
  QrCode,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

export interface CollectorAccessModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const CollectorAccessModal: React.FC<CollectorAccessModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)

  // Link absoluto limpo sem credenciais ou parâmetros sensíveis
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const directLink = `${baseUrl}/coletor`

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(directLink)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = directLink
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      toast({
        title: 'Link copiado!',
        description: 'Cole no navegador do Chainway C72 ou envie ao expedidor.',
        className: 'bg-emerald-600 text-white',
      })
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast({
        title: 'Não foi possível copiar',
        description: directLink,
        variant: 'destructive',
      })
    }
  }

  const handleOpenNow = () => {
    window.open('/coletor', '_blank')
    onOpenChange(false)
  }

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Coletor de Expedição CIAFAL (Chainway C72)',
          text: 'Acesso direto ao Coletor de Expedição CIAFAL (Transação SAP ZWMT001).',
          url: directLink,
        })
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          handleCopyLink()
        }
      }
    } else {
      handleCopyLink()
    }
  }

  const hasWebShare = typeof navigator !== 'undefined' && !!navigator.share

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95vw] sm:w-full p-4 sm:p-6 bg-white rounded-2xl shadow-2xl border-slate-200">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-100 text-[#005596] text-xs font-black">
              <Smartphone className="w-3.5 h-3.5 text-[#005596]" />
              <span>Acesso Direto C72</span>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] border-emerald-500 text-emerald-700 bg-emerald-50"
            >
              <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
              Sessão HUB Segura
            </Badge>
          </div>
          <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Acessar Coletor de Expedição
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600">
            Abra diretamente no terminal Chainway C72 ou tablet sem navegar pelo menu do TMS. A
            aplicação é idêntica à versão desktop.
          </DialogDescription>
        </DialogHeader>

        {/* Bloco do Link Completo */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Link Direto do Coletor:
          </label>
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-300">
            <span className="font-mono text-xs sm:text-sm text-slate-900 font-bold truncate flex-1 select-all">
              {directLink}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCopyLink}
              className="shrink-0 h-8 text-xs font-bold border-slate-300 text-slate-700 gap-1 bg-white"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#005596]" />
                  Copiar
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Visualização de QR Code */}
        {showQr && (
          <div className="p-4 bg-sky-50/70 rounded-xl border border-sky-200 flex flex-col items-center justify-center space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
            <QrCodeSvg value={directLink} size={190} color="#005596" />
            <p className="text-xs font-bold text-[#005596] text-center">
              Escaneie para abrir o Coletor de Expedição
            </p>
            <p className="text-[11px] text-slate-500 text-center max-w-xs">
              Aponte a câmera do terminal móvel ou celular corporativo. A validação do operador é
              preservada.
            </p>
          </div>
        )}

        {/* Instruções de Uso no C72 */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-600">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Dicas para o Chainway C72:</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
            <li>O leitor laser HID envia a leitura como teclado com Enter automático.</li>
            <li>Adicione à tela inicial para abrir em tela cheia como PWA.</li>
            <li>Nenhuma credencial ou token RFC trafega na URL (RBAC seguro).</li>
          </ul>
        </div>

        {/* Botões de Ação */}
        <DialogFooter className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowQr(!showQr)}
            className="h-10 text-xs font-bold border-slate-300 text-slate-800 gap-1.5 bg-white"
          >
            <QrCode className="w-4 h-4 text-[#005596]" />
            {showQr ? 'Ocultar QR' : 'Gerar QR Code'}
          </Button>

          {hasWebShare ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleShare}
              className="h-10 text-xs font-bold border-slate-300 text-slate-800 gap-1.5 bg-white"
            >
              <Share2 className="w-4 h-4 text-emerald-600" />
              Compartilhar
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyLink}
              className="h-10 text-xs font-bold border-slate-300 text-slate-800 gap-1.5 bg-white"
            >
              <Copy className="w-4 h-4 text-[#005596]" />
              Copiar Link
            </Button>
          )}

          <Button
            type="button"
            onClick={handleOpenNow}
            className="h-10 text-xs font-black bg-[#005596] hover:bg-[#004275] text-white gap-1.5 shadow-sm col-span-2 sm:col-span-1"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir Agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
