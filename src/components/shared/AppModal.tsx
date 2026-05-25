import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface AppModalProps {
  title: string
  description?: string
  icon?: ReactNode
  children: ReactNode
  onClose: () => void
  maxWidth?: string
}

export default function AppModal({
  title,
  description,
  icon,
  children,
  onClose,
  maxWidth = 'max-w-[420px]',
}: AppModalProps) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} max-h-[86vh] overflow-y-auto rounded-3xl border border-border-default bg-white p-6 text-text-primary shadow-2xl shadow-slate-900/20`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {icon}
            <h2 className="text-2xl font-black tracking-normal text-text-primary">{title}</h2>
            {description && (
              <p className="mt-3 text-sm font-bold leading-7 text-text-secondary">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg leading-none text-text-muted transition hover:bg-bg-hover hover:text-text-primary"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

