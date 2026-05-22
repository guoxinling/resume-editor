import { useRef } from 'react'
import { useResumeStore } from '../store/resumeStore'

interface Props {
  onImportClick: () => void
  onDraftContinue: () => void
  onWizardClick: () => void
}

export default function LandingPage({ onImportClick, onDraftContinue, onWizardClick }: Props) {
  const hasDraft = useResumeStore((s) => {
    const d = s.data
    return !!(d.personalInfo.name || d.personalInfo.email || d.summary || d.workExperience.length > 0 || d.education.length > 0)
  })

  const handleWizard = () => {
    onWizardClick()
  }

  const handleImport = () => {
    onImportClick()
  }

  const stars = useRef(Array.from({ length: 40 }, (_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 2 + Math.random() * 4,
    size: 1 + Math.random() * 2,
  })))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F0F1A]">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-[-30%] left-[-20%] w-[60vw] h-[80vh] opacity-20"
          style={{
            background: 'radial-gradient(ellipse, rgba(124,58,237,0.4) 0%, transparent 70%)',
            animation: 'floatGlow1 12s ease-in-out infinite',
          }}
        />
        <div
          className="absolute bottom-[-30%] right-[-15%] w-[50vw] h-[70vh] opacity-15"
          style={{
            background: 'radial-gradient(ellipse, rgba(79,70,229,0.4) 0%, transparent 70%)',
            animation: 'floatGlow2 14s ease-in-out infinite reverse',
          }}
        />
      </div>

      {/* Stars */}
      <div className="fixed inset-0 pointer-events-none">
        {stars.current.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: 0,
              animation: `twinkle ${s.duration}s ease-in-out infinite`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center px-6 py-10 max-w-[680px] w-full">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-xl shadow-lg shadow-indigo-500/20">
            🦆
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/5 text-purple-400 border border-white/10 tracking-wide">
            v1.0 Beta
          </span>
        </div>

        {/* Hero */}
        <h1 className="text-[34px] font-bold tracking-tight text-center leading-tight mt-4 mb-3 text-white">
          让你的简历<br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
            从零到完美
          </span>
        </h1>
        <p className="text-[15px] text-slate-400 text-center leading-relaxed max-w-[420px] mb-10">
          无论你是第一次写简历，还是想用 AI 让现有简历更出彩，这里都能帮你做到。
        </p>

        {/* Two Paths */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-4">
          {/* Path 1: Wizard */}
          <button
            onClick={handleWizard}
            className="group relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7 text-left
              hover:border-indigo-500/40 hover:bg-indigo-500/[0.06] hover:-translate-y-0.5
              hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-[52px] h-[52px] rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[32px] mb-3.5">
              🤖
            </div>
            <div className="text-[17px] font-semibold mb-1 text-white group-hover:text-purple-400 transition-colors">
              我是第一次写简历
            </div>
            <div className="text-[12.5px] text-slate-400 leading-relaxed mb-4">
              AI 面试式引导，主动挖掘你的经历与亮点，边聊边生成一份完整简历。
            </div>
            <div className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-lg
              bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white
              shadow-md shadow-indigo-500/20 group-hover:shadow-lg group-hover:shadow-indigo-500/30
              transition-all">
              🚀 开始对话
            </div>
          </button>

          {/* Path 2: Import */}
          <button
            onClick={handleImport}
            className="group relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7 text-left
              hover:border-white/20 hover:bg-white/[0.06] hover:-translate-y-0.5
              hover:shadow-xl hover:shadow-white/5 transition-all duration-300"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-[52px] h-[52px] rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[32px] mb-3.5">
              📥
            </div>
            <div className="text-[17px] font-semibold mb-1 text-slate-200 group-hover:text-white transition-colors">
              我已有简历想优化
            </div>
            <div className="text-[12.5px] text-slate-400 leading-relaxed mb-4">
              导入现有 PDF · JPG · PNG · Markdown，AI 自动解析后精修优化。
            </div>
            <div className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-lg
              bg-white/[0.06] text-slate-200 border border-white/[0.1]
              group-hover:bg-white/[0.1] group-hover:border-white/[0.18] transition-all">
              📎 导入简历
            </div>
          </button>
        </div>

        {/* Draft Link */}
        {hasDraft && (
          <button
            onClick={onDraftContinue}
            className="flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-purple-400
              hover:bg-indigo-500/[0.04] px-3 py-2 rounded-lg transition-colors mb-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/40" />
            你有未完成的草稿，继续编辑 →
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Feature Tags */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center mt-6">
          {['AI 对话写简历', 'PDF · 图片导入', 'AI 经历润色', '中英一键翻译', '面试预测', '导出 PDF'].map((f) => (
            <div key={f} className="flex items-center gap-1.5 text-[12px] text-slate-400">
              <span className="w-1 h-1 rounded-full bg-indigo-400/60" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes floatGlow1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 20px) scale(1.05); }
          66% { transform: translate(20px, -15px) scale(0.95); }
        }
        @keyframes floatGlow2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -20px) scale(1.04); }
          66% { transform: translate(-15px, 15px) scale(0.96); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
