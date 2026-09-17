import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  const { t } = useTranslation()
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-charcoal-900/40 backdrop-blur-sm data-[state=open]:animate-rise dark:bg-black/70" />
      <DialogPrimitive.Content className={cn('fixed bottom-0 left-0 right-0 z-50 max-h-screen overflow-auto rounded-t-3xl bg-rice-50 p-5 shadow-float focus:outline-none focus-visible:ring-2 focus-visible:ring-chili-500 md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:p-6 dark:bg-slate-900', className)}>
        {title && <DialogPrimitive.Title className="pr-10 text-xl font-bold text-charcoal-900">{title}</DialogPrimitive.Title>}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full bg-white p-2 text-charcoal-500 shadow-sm transition hover:text-chili-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chili-500 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-red-400" aria-label={t("common.aria_close")}><X size={18} /></DialogPrimitive.Close>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
