import { useState, type ReactNode } from 'react'
import { useResumeStore } from '../store/resumeStore'

interface Props {
  onImportClick: () => void
  onDraftContinue: () => void
  onWizardClick: () => void
}

type Feature = {
  title: string
  copy: string
  icon: ReactNode
  tone: string
}

const features: Feature[] = [
  {
    title: 'AI 对话写简历',
    copy: '像面试一样回答问题，AI 帮你整理经历、提炼亮点，生成结构完整的简历初稿。',
    tone: 'bg-[#EADDFF] text-[#6750A4]',
    icon: 'AI',
  },
  {
    title: '导入简历智能解析',
    copy: '支持 PDF、图片、Markdown 和文本导入，把旧简历转成可编辑的结构化内容。',
    tone: 'bg-[#D7F4E3] text-[#146C2E]',
    icon: 'IN',
  },
  {
    title: '经历润色',
    copy: '按 STAR 法则、结果导向和精炼压缩，帮你把职责描述改成更有说服力的成果表达。',
    tone: 'bg-[#FFD8E4] text-[#7D5260]',
    icon: 'WR',
  },
  {
    title: 'JD 岗位适配',
    copy: '粘贴目标岗位 JD，分析匹配点、缺失关键词，并给出可直接应用的修改建议。',
    tone: 'bg-[#FFE8C7] text-[#8A4B00]',
    icon: 'JD',
  },
  {
    title: '面试预测',
    copy: '根据简历生成高概率追问，提前准备经历深挖、能力验证和业务理解问题。',
    tone: 'bg-[#D9EAF7] text-[#245F73]',
    icon: 'Q',
  },
  {
    title: '中英翻译与导出',
    copy: '一键生成英文版本，实时预览 A4 版式，完成后导出 PDF 或 PNG 投递版。',
    tone: 'bg-[#E8DEF8] text-[#625B71]',
    icon: 'EN',
  },
]

function WorkspacePreview() {
  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <div className="absolute -left-4 top-10 h-20 w-20 rounded-[28px] bg-[#D7F4E3] opacity-70 blur-2xl" />
      <div className="absolute -right-5 bottom-8 h-24 w-24 rounded-[30px] bg-[#FFD8E4] opacity-70 blur-2xl" />

      <div className="relative overflow-hidden rounded-[28px] border border-[#CAC4D0]/70 bg-[#FFFBFE] shadow-[0_24px_80px_rgba(103,80,164,0.18)]">
        <div className="flex h-12 items-center justify-between border-b border-[#CAC4D0]/60 bg-[#F7F2FA] px-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#FFB4AB]" />
            <span className="h-3 w-3 rounded-full bg-[#FFD8A8]" />
            <span className="h-3 w-3 rounded-full bg-[#B8EBCB]" />
          </div>
          <span className="rounded-full bg-[#EADDFF] px-3 py-1 text-xs font-black text-[#6750A4]">AI 正在优化</span>
        </div>

        <div className="grid min-h-[360px] grid-cols-[0.72fr_1fr_0.72fr] gap-3 bg-[#FFFBFE] p-4 max-[720px]:grid-cols-1">
          <aside className="rounded-[22px] bg-[#F3EDF7] p-4">
            <p className="mb-4 text-xs font-black text-[#6750A4]">编辑模块</p>
            {['个人信息', '个人概述', '工作经历', '项目经历', '教育背景'].map((item, index) => (
              <div
                key={item}
                className={`mb-2 rounded-2xl px-3 py-2 text-xs font-bold ${
                  index === 2 ? 'bg-[#EADDFF] text-[#21005D]' : 'bg-white/75 text-[#49454F]'
                }`}
              >
                {item}
              </div>
            ))}
          </aside>

          <main className="rounded-[22px] border border-[#CAC4D0]/55 bg-white p-5 shadow-sm">
            <div className="mx-auto min-h-[300px] max-w-[230px] rounded-sm bg-white">
              <div className="mb-4">
                <div className="mb-2 h-5 w-28 rounded-full bg-[#1C1B1F]" />
                <div className="h-2 w-40 rounded-full bg-[#CAC4D0]" />
              </div>
              <div className="space-y-4">
                {[0, 1, 2].map((group) => (
                  <div key={group}>
                    <div className="mb-2 h-2.5 w-20 rounded-full bg-[#6750A4]" />
                    <div className="space-y-1.5">
                      <div className="h-2 w-full rounded-full bg-[#E7E0EC]" />
                      <div className="h-2 w-[86%] rounded-full bg-[#E7E0EC]" />
                      <div className="h-2 w-[68%] rounded-full bg-[#E7E0EC]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>

          <aside className="rounded-[22px] bg-[#EADDFF] p-4 text-[#21005D]">
            <p className="mb-3 text-xs font-black text-[#6750A4]">AI 助手</p>
            <div className="rounded-2xl bg-white/70 p-3 text-xs font-bold leading-5">
              工作经历里可以补充量化结果，例如用户增长、转化提升或交付周期。
            </div>
            <div className="mt-3 grid gap-2">
              {['润色这段经历', '适配目标 JD', '生成面试问题'].map((item) => (
                <div key={item} className="rounded-full bg-[#6750A4] px-3 py-2 text-center text-xs font-black text-white">
                  {item}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage({ onImportClick, onDraftContinue, onWizardClick }: Props) {
  const [loginHint, setLoginHint] = useState(false)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const hasDraft = useResumeStore((s) => {
    const d = s.data
    return !!(d.personalInfo.name || d.personalInfo.email || d.summary || d.workExperience.length > 0 || d.education.length > 0)
  })

  const handleLoginClick = () => {
    setLoginHint(true)
    window.setTimeout(() => setLoginHint(false), 1800)
  }

  const handleImportClick = () => {
    if (hasDraft) {
      setShowImportConfirm(true)
      return
    }
    onImportClick()
  }

  const handleContinueDraft = () => {
    setShowImportConfirm(false)
    onDraftContinue()
  }

  const handleConfirmImport = () => {
    setShowImportConfirm(false)
    onImportClick()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#FFFBFE] text-[#1C1B1F] antialiased">
      <header className="sticky top-0 z-30 border-b border-[#CAC4D0]/60 bg-[#FFFBFE]/86 backdrop-blur-xl">
        <nav className="mx-auto flex h-[72px] w-[min(1180px,calc(100%-32px))] items-center justify-between gap-3">
          <button type="button" onClick={onWizardClick} className="inline-flex min-w-max items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#6750A4] text-xl text-white shadow-[0_8px_18px_rgba(103,80,164,0.24)]">
              鸭
            </span>
            <span className="text-base font-black tracking-normal">简历鸭</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoginClick}
              className="hidden h-10 items-center justify-center rounded-full border border-[#CAC4D0] bg-[#FFFBFE] px-4 text-sm font-black text-[#6750A4] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#EADDFF]/55 hover:shadow-md active:translate-y-0 sm:inline-flex"
            >
              注册/登录
            </button>
            <button
              type="button"
              onClick={onWizardClick}
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#6750A4] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#5F479E] hover:shadow-[0_10px_24px_rgba(103,80,164,0.22)] active:translate-y-0"
            >
              开始使用
            </button>
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid w-[min(1180px,calc(100%-32px))] gap-10 py-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(440px,1.1fr)] lg:items-center lg:py-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#EADDFF] px-3.5 py-2 text-sm font-black text-[#6750A4]">
              <span className="h-2 w-2 rounded-full bg-[#6750A4] shadow-[0_0_0_5px_rgba(103,80,164,0.12)]" />
              AI 驱动的专业简历工作台
            </div>

            <h1 className="max-w-[720px] text-[clamp(40px,5.6vw,72px)] font-black leading-[1.04] tracking-normal">
              更快写出<span className="whitespace-nowrap text-[#6750A4]">好简历</span> 拿到好 Offer
            </h1>
            <p className="mt-5 max-w-[590px] text-[17px] leading-8 text-[#49454F]">
              无论你是第一次写简历，还是已有简历想优化。简历鸭都能帮你润色表达、适配岗位、演练面试，助你成功拿下好Offer。
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={onWizardClick}
                className="group rounded-[24px] border border-[#CAC4D0]/70 bg-[#FFFBFE] p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#6750A4]/40 hover:bg-[#F7F2FA] hover:shadow-[0_18px_42px_rgba(103,80,164,0.13)] active:translate-y-0"
              >
                <span className="mb-3 grid h-11 w-11 place-items-center rounded-[16px] bg-[#EADDFF] text-sm font-black text-[#6750A4]">
                  AI
                </span>
                <span className="block text-lg font-black text-[#1C1B1F]">我是第一次写简历</span>
                <span className="mt-2 block min-h-[48px] text-sm font-bold leading-6 text-[#49454F]">
                  用对话梳理目标岗位、经历和亮点，快速生成完整简历初稿。
                </span>
                <span className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[#6750A4] px-4 text-sm font-black text-white transition group-hover:bg-[#5F479E]">
                  开始 AI 对话
                </span>
              </button>
              <button
                type="button"
                onClick={handleImportClick}
                className="group rounded-[24px] border border-[#CAC4D0]/70 bg-[#FFFBFE] p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#146C2E]/35 hover:bg-[#F7FCF8] hover:shadow-[0_18px_42px_rgba(20,108,46,0.11)] active:translate-y-0"
              >
                <span className="mb-3 grid h-11 w-11 place-items-center rounded-[16px] bg-[#D7F4E3] text-sm font-black text-[#146C2E]">
                  IN
                </span>
                <span className="block text-lg font-black text-[#1C1B1F]">我已有简历想优化</span>
                <span className="mt-2 block min-h-[48px] text-sm font-bold leading-6 text-[#49454F]">
                  导入PDF、图片或Markdown，AI帮你润色和适配岗位
                </span>
                <span className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-[#CAC4D0] bg-white px-4 text-sm font-black text-[#6750A4] transition group-hover:bg-[#F3EDF7]">
                  导入已有简历
                </span>
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {hasDraft && (
                <button
                  type="button"
                  onClick={onDraftContinue}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#FFF3D6] px-5 text-base font-black text-[#8A4B00] transition hover:-translate-y-0.5 hover:bg-[#FFE8C7] active:translate-y-0"
                >
                  继续编辑草稿
                </button>
              )}
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              {['对话生成', 'PDF/图片导入', 'JD 适配', '面试预测'].map((item) => (
                <span key={item} className="rounded-full bg-[#F3EDF7] px-3 py-1.5 text-xs font-black text-[#49454F]">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <WorkspacePreview />
        </section>

        <section className="mx-auto w-[min(1180px,calc(100%-32px))] py-10 md:py-14">
          <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-2 text-sm font-black text-[#6750A4]">AI 功能</p>
              <h2 className="max-w-[720px] text-[clamp(30px,4vw,48px)] font-black leading-tight tracking-normal">
                AI 辅助写简历全流程，一路开挂
              </h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="min-h-[210px] rounded-[28px] border border-[#CAC4D0]/65 bg-[#FFFBFE] p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(103,80,164,0.13)]"
              >
                <div className={`mb-5 grid h-14 w-14 place-items-center rounded-[19px] text-sm font-black ${feature.tone}`}>
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-xl font-black tracking-normal">{feature.title}</h3>
                <p className="text-sm leading-7 text-[#49454F]">{feature.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-[min(1180px,calc(100%-32px))] py-12 pb-16 md:py-20">
          <div className="grid min-h-[300px] items-center gap-6 rounded-[32px] border border-[#6750A4]/20 bg-[#EADDFF] p-6 text-[#21005D] shadow-[0_18px_48px_rgba(103,80,164,0.16)] md:grid-cols-[1fr_auto] md:p-10 lg:p-12">
            <div>
              <p className="mb-3 text-sm font-black text-[#6750A4]">准备好了</p>
              <h2 className="max-w-[680px] text-[clamp(30px,4vw,48px)] font-black leading-tight tracking-normal">
                轻松写简历，就用简历鸭
              </h2>
              <p className="mt-4 max-w-[640px] text-base leading-8 text-[#49454F]">
                第一次写简历就从 AI 对话开始；已有简历则直接导入，进入现有编辑器继续优化。
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <button
                type="button"
                onClick={onWizardClick}
                className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#6750A4] px-6 text-base font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#5F479E] active:translate-y-0"
              >
                开始写简历
              </button>
              <button
                type="button"
                onClick={handleImportClick}
                className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[#6750A4]/25 bg-white/75 px-6 text-base font-black text-[#6750A4] transition hover:-translate-y-0.5 hover:bg-white active:translate-y-0"
              >
                导入已有简历
              </button>
            </div>
          </div>
        </section>
      </main>

      {loginHint && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#1C1B1F] px-4 py-2 text-sm font-bold text-white shadow-xl">
          注册/登录会在账号系统接入后开放
        </div>
      )}

      {showImportConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1B1F]/38 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[420px] rounded-[28px] border border-[#CAC4D0]/70 bg-[#FFFBFE] p-6 text-[#1C1B1F] shadow-[0_24px_80px_rgba(28,27,31,0.22)]">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-[18px] bg-[#FFF3D6] text-sm font-black text-[#8A4B00]">
              !
            </div>
            <h2 className="text-2xl font-black tracking-normal">检测到你有未完成的草稿</h2>
            <p className="mt-3 text-sm font-bold leading-7 text-[#49454F]">
              导入新简历会替换当前编辑内容。你可以先继续编辑草稿，或确认导入新的简历。
            </p>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={handleContinueDraft}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#6750A4] px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#5F479E] active:translate-y-0"
              >
                继续编辑草稿
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#CAC4D0] bg-white px-5 text-sm font-black text-[#6750A4] transition hover:-translate-y-0.5 hover:bg-[#F3EDF7] active:translate-y-0"
              >
                确认导入新简历
              </button>
              <button
                type="button"
                onClick={() => setShowImportConfirm(false)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-sm font-black text-[#49454F] transition hover:bg-[#F3EDF7]"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
