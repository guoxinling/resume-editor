import { createPortal } from 'react-dom'

interface AppProgressOverlayProps {
  icon: string
  message: string
  progress: number
  failed?: boolean
  hint?: string
}

export default function AppProgressOverlay({
  icon,
  message,
  progress,
  failed = false,
  hint = '正在处理，请稍候…',
}: AppProgressOverlayProps) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[360px] rounded-3xl border border-border-default bg-white p-6 text-center shadow-2xl shadow-slate-900/20">
        <div className="mb-3 text-3xl">{icon}</div>
        <div className="mb-2 text-[13px] font-semibold text-gray-800">{message}</div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              failed ? 'bg-red-500' : 'bg-gradient-to-r from-brand-primary to-brand-secondary'
            }`}
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
        {progress < 100 && !failed && <p className="mt-2 text-[10px] text-gray-400">{hint}</p>}
      </div>
    </div>,
    document.body,
  )
}

