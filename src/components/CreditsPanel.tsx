import { useEffect, useRef, useState } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  daily: number
  total: number
}

const tiers = [
  { points: 50, price: '¥9.9' },
  { points: 200, price: '¥29.9' },
  { points: 500, price: '¥59.9' },
]

export default function CreditsPanel({ isOpen, onClose, daily, total }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!isOpen) return
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const showPaymentToast = () => {
    setToast('支付功能将在备案完成后上线')
    window.setTimeout(() => setToast(''), 1800)
  }

  return (
    <>
      <div
        ref={ref}
        className="fixed right-24 top-[60px] z-[60] w-[280px] rounded-[28px] border border-[#CAC4D0]/75 bg-[#FFFBFE] p-4 shadow-2xl"
      >
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-2xl bg-[#F7F2FA] px-3 py-2">
            <span className="font-bold text-[#49454F]">今日免费</span>
            <strong className="text-[#6750A4]">{daily}/10</strong>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-[#F7F2FA] px-3 py-2">
            <span className="font-bold text-[#49454F]">已购点数</span>
            <strong className="text-[#1C1B1F]">{Math.max(0, total - 10)}</strong>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-[#CAC4D0]/70 bg-white p-3">
          <p className="mb-2 text-sm font-black text-[#1C1B1F]">充值点数</p>
          <div className="space-y-1">
            {tiers.map((tier) => (
              <button
                key={tier.points}
                type="button"
                onClick={showPaymentToast}
                className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition hover:bg-[#EADDFF]"
              >
                <span className="text-sm font-black text-[#1C1B1F]">{tier.points} 点</span>
                <span className="text-sm font-black text-[#6750A4]">{tier.price}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-3 text-xs leading-5 text-[#79747E]">实际支付功能将在备案完成后上线。</p>
      </div>
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-[#1C1B1F] px-4 py-2 text-sm font-bold text-white shadow-xl">
          {toast}
        </div>
      )}
    </>
  )
}
