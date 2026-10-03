import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface ResponsiveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  badge?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full'
  className?: string
  contentClassName?: string
}

const maxWidthMap = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '3xl': 'sm:max-w-3xl',
  '4xl': 'sm:max-w-4xl',
  '5xl': 'sm:max-w-5xl',
  '6xl': 'sm:max-w-6xl',
  full: 'sm:max-w-[95vw]',
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  badge,
  children,
  footer,
  maxWidth = '2xl',
  className,
  contentClassName,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white border-slate-200 shadow-xl rounded-2xl w-[95vw]',
          maxWidthMap[maxWidth],
          className,
        )}
      >
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-2.5 min-w-0">
              {Icon && (
                <div className="p-2 rounded-lg bg-[#005596]/10 text-[#005596] shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {title}
                </DialogTitle>
                {description && (
                  <DialogDescription className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {description}
                  </DialogDescription>
                )}
              </div>
            </div>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
        </DialogHeader>

        <div className={cn('p-4 sm:p-6 overflow-y-auto flex-1 min-h-0', contentClassName)}>
          {children}
        </div>

        {footer && (
          <DialogFooter className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/50 flex-row items-center justify-end gap-2 shrink-0">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
