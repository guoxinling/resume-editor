import { useState } from 'react'
import { isSupabaseConfigured } from '../../services/supabaseClient'
import { useAuthStore } from '../../store/authStore'

export default function AuthModal() {
  const isOpen = useAuthStore((s) => s.authModalOpen)
  const close = useAuthStore((s) => s.closeAuthModal)
  const signIn = useAuthStore((s) => s.signInWithEmail)
  const signUp = useAuthStore((s) => s.signUpWithEmail)
  const error = useAuthStore((s) => s.error)

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null)

  if (!isOpen) return null

  const handleClose = () => {
    setVerificationEmail(null)
    setLocalError(null)
    close()
  }

  const submit = async () => {
    if (!email.trim() || password.length < 6) {
      setLocalError('请输入邮箱，并设置至少 6 位密码')
      return
    }
    setLoading(true)
    setLocalError(null)
    setVerificationEmail(null)
    try {
      if (mode === 'signin') await signIn(email.trim(), password)
      else {
        const result = await signUp(email.trim(), password)
        if (result.needsEmailVerification) {
          setVerificationEmail(email.trim())
          setPassword('')
        }
      }
    } catch (err: any) {
      setLocalError(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[420px] rounded-3xl border border-border-default bg-white p-6 shadow-2xl shadow-slate-900/20">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent-muted text-sm font-black text-brand-primary">
              鸭
            </div>
            <h2 className="text-2xl font-black text-text-primary">
              {verificationEmail ? '验证邮件已发送' : mode === 'signin' ? '登录简历鸭' : '注册简历鸭'}
            </h2>
            <p className="mt-2 text-sm font-bold leading-6 text-text-secondary">
              {verificationEmail
                ? '请前往邮箱完成验证，验证后再回到这里登录简历鸭。'
                : '登录后即可使用 AI 点数、充值和后续账号能力。'}
            </p>
          </div>
          <button onClick={handleClose} className="h-8 w-8 rounded-full text-text-muted hover:bg-bg-hover">✕</button>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-4 rounded-2xl bg-red-50 p-3 text-xs font-bold leading-5 text-red-600">
            Supabase 前端环境变量尚未配置：VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
          </div>
        )}

        {verificationEmail && (
          <div className="mb-4 rounded-2xl border border-[#B8E0C2] bg-[#F0FFF4] p-4 text-sm font-bold leading-6 text-[#166534]">
            我们已经向 <span className="font-black">{verificationEmail}</span> 发送验证邮件。完成验证后，请使用该邮箱登录。
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-full bg-bg-hover p-1">
          <button
            type="button"
            onClick={() => {
              setMode('signin')
              setVerificationEmail(null)
            }}
            className={`h-9 rounded-full text-sm font-black ${mode === 'signin' ? 'bg-white text-brand-primary shadow-sm' : 'text-text-secondary'}`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup')
              setVerificationEmail(null)
            }}
            className={`h-9 rounded-full text-sm font-black ${mode === 'signup' ? 'bg-white text-brand-primary shadow-sm' : 'text-text-secondary'}`}
          >
            注册
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱"
            className="w-full rounded-2xl border border-border-default px-4 py-3 text-sm outline-none focus:border-brand-primary focus:ring-4 focus:ring-accent-muted/80"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码（至少 6 位）"
            className="w-full rounded-2xl border border-border-default px-4 py-3 text-sm outline-none focus:border-brand-primary focus:ring-4 focus:ring-accent-muted/80"
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
          />
        </div>

        {(localError || error) && (
          <div className="mt-3 rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-600">
            {localError || error}
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={loading || !isSupabaseConfigured}
          className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-brand-primary px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? '处理中…' : mode === 'signin' ? '登录' : '注册并领取 20 点'}
        </button>
      </div>
    </div>
  )
}
