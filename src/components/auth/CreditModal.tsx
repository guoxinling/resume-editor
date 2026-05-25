import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'

const packages = [
  { id: 'starter', name: '入门包', price: '9.9', credits: 100 },
  { id: 'plus', name: '进阶包', price: '19.9', credits: 250 },
  { id: 'pro', name: '专业包', price: '39.9', credits: 600 },
] as const

export default function CreditModal() {
  const isOpen = useAuthStore((s) => s.creditModalOpen)
  const close = useAuthStore((s) => s.closeCreditModal)
  const openAuth = useAuthStore((s) => s.openAuthModal)
  const user = useAuthStore((s) => s.user)
  const getAccessToken = useAuthStore((s) => s.getAccessToken)
  const balance = useAuthStore((s) => s.balance)
  const totalCredits = useAuthStore((s) => s.totalCredits)

  const [payType, setPayType] = useState<'alipay' | 'wxpay'>('alipay')
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const createOrder = async (packageId: string) => {
    if (!user) {
      close()
      openAuth()
      return
    }

    setLoadingPackage(packageId)
    setError(null)
    try {
      const token = await getAccessToken()
      const response = await fetch('/api/pay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ packageId, payType }),
      })
      const text = await response.text()
      const data = text ? JSON.parse(text) : null
      if (!response.ok) throw new Error(data?.error || '支付接口暂不可用，请检查后端环境变量或使用 Vercel Preview 测试')
      if (!data?.payUrl) throw new Error('支付接口未返回支付链接，请检查 ZPAY 配置')
      window.location.href = data.payUrl
    } catch (err: any) {
      setError(err.message || '创建订单失败')
    } finally {
      setLoadingPackage(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[560px] rounded-3xl border border-border-default bg-white p-6 shadow-2xl shadow-slate-900/20">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex h-12 items-center rounded-2xl bg-accent-muted px-4 text-sm font-black text-brand-primary">
              当前余额 {balance ?? 0}/{totalCredits ?? 20}
            </div>
            <h2 className="text-2xl font-black text-text-primary">充值 AI 点数</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-text-secondary">
              点数用于 AI 对话、润色、岗位适配、面试预测和 PDF/图片导入解析。
            </p>
          </div>
          <button onClick={close} className="h-8 w-8 rounded-full text-text-muted hover:bg-bg-hover">✕</button>
        </div>

        <div className="mb-4 inline-grid grid-cols-2 gap-2 rounded-full bg-bg-hover p-1">
          <button
            type="button"
            onClick={() => setPayType('alipay')}
            className={`h-9 rounded-full px-4 text-sm font-black ${payType === 'alipay' ? 'bg-white text-brand-primary shadow-sm' : 'text-text-secondary'}`}
          >
            支付宝
          </button>
          <button
            type="button"
            onClick={() => setPayType('wxpay')}
            className={`h-9 rounded-full px-4 text-sm font-black ${payType === 'wxpay' ? 'bg-white text-brand-primary shadow-sm' : 'text-text-secondary'}`}
          >
            微信
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {packages.map((pack) => (
            <button
              key={pack.id}
              type="button"
              onClick={() => createOrder(pack.id)}
              disabled={loadingPackage !== null}
              className="rounded-3xl border border-border-default bg-bg-hover/50 p-4 text-left transition hover:-translate-y-1 hover:bg-white hover:shadow-lg hover:shadow-slate-900/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="text-sm font-black text-brand-primary">{pack.name}</div>
              <div className="mt-3 text-3xl font-black text-text-primary">{pack.credits}</div>
              <div className="mt-1 text-xs font-bold text-text-muted">AI 点数</div>
              <div className="mt-4 rounded-full bg-brand-primary px-3 py-2 text-center text-sm font-black text-white">
                {loadingPackage === pack.id ? '创建中…' : `¥${pack.price}`}
              </div>
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
