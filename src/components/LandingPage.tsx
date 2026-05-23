import { type ReactNode, useState } from 'react'
import { useResumeStore } from '../store/resumeStore'

interface Props {
  onImportClick: () => void
  onDraftContinue: () => void
  onWizardClick: () => void
}

type IconName =
  | 'spark'
  | 'upload'
  | 'chat'
  | 'target'
  | 'polish'
  | 'question'
  | 'file'
  | 'check'
  | 'arrow'

const icons: Record<IconName, ReactNode> = {
  spark: (
    <path
      d="M12 3l1.9 5.7L20 11l-6.1 2.3L12 19l-1.9-5.7L4 11l6.1-2.3L12 3Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  ),
  upload: (
    <>
      <path d="M12 15V4m0 11-4-4m4 4 4-4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 18h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </>
  ),
  chat: (
    <path
      d="M7 8h10M7 12h7M8 20l-3 2v-5.5A7.5 7.5 0 0 1 12.5 4h1A7.5 7.5 0 0 1 21 11.5v0A7.5 7.5 0 0 1 13.5 19H8Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  target: (
    <>
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  polish: (
    <>
      <path d="m4 20 4.6-1 9.8-9.8a2.1 2.1 0 0 0-3-3L5.6 16 4 20Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m13.8 7.8 2.4 2.4M18 4l2 2M20 12l1.4 1.4M9 3l1.4 1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  question: (
    <>
      <path d="M12 17h.01M9.8 9.4A2.7 2.7 0 0 1 12.4 7c1.6 0 2.9 1.1 2.9 2.6 0 1.8-1.6 2.4-2.6 3.1-.8.5-.9.9-.9 1.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  file: (
    <>
      <path d="M7 3.75h7.2L19 8.55v11.7H7V3.75Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M14 4v5h5M9.5 14h5M9.5 17h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  check: <path d="m20 6-11 11-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />,
}

const featureCards: Array<{ title: string; copy: string; icon: IconName; tone: string }> = [
  {
    title: '从零生成简历',
    copy: '用对话收集目标岗位、经历、项目和技能，自动整理成结构化简历初稿。',
    icon: 'chat',
    tone: 'bg-[#EADDFF] text-[#6750A4]',
  },
  {
    title: '导入旧简历优化',
    copy: '支持 PDF、图片、Markdown 和文本导入，保留可编辑结构后继续精修。',
    icon: 'upload',
    tone: 'bg-[#D2F2E0] text-[#1B873F]',
  },
  {
    title: 'AI 经历润色',
    copy: '按 STAR 法则、结果导向和精炼压缩，把职责描述变成成果表达。',
    icon: 'polish',
    tone: 'bg-[#FFD8E4] text-[#7D5260]',
  },
  {
    title: '岗位适配分析',
    copy: '粘贴 JD 后生成匹配度、缺失关键词和可直接应用的修改建议。',
    icon: 'target',
    tone: 'bg-[#FFF3D6] text-[#B06D00]',
  },
  {
    title: '面试预测',
    copy: '基于简历内容生成高概率追问，帮助你提前准备经历深挖。',
    icon: 'question',
    tone: 'bg-[#E8DEF8] text-[#625B71]',
  },
  {
    title: '实时预览导出',
    copy: '左侧编辑、右侧 A4 实时预览，完成后导出 PDF 或 PNG 投递版。',
    icon: 'file',
    tone: 'bg-[#D9EAF7] text-[#245F73]',
  },
]

const templates = [
  { name: '应届生模板', desc: '突出教育背景、实习经历、校园项目和可迁移能力。', tags: ['实习', '校园经历'], style: 'fresh' },
  { name: '职场进阶模板', desc: '强调工作成果、业务影响、团队协作和晋升潜力。', tags: ['成果导向', '管理经验'], style: 'business' },
  { name: '技术 / 产品模板', desc: '前置项目和技能栈，让作品、方法论和业务结果更醒目。', tags: ['项目经历', '作品集'], style: 'tech' },
  { name: '海外 / 双语模板', desc: '突出中英双语、跨文化经历和国际化项目。', tags: ['双语', '海外岗位'], style: 'global' },
] as const

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {icons[name]}
    </svg>
  )
}

function ResumeThumb({ style }: { style: (typeof templates)[number]['style'] }) {
  const bg =
    style === 'business'
      ? 'bg-[linear-gradient(90deg,#F7F2FA_0_32%,#FFFFFF_32%_100%)]'
      : style === 'tech'
        ? 'bg-[linear-gradient(180deg,#EADDFF_0_28%,#FFFFFF_28%_100%)]'
        : style === 'global'
          ? 'bg-[linear-gradient(90deg,#FFFFFF_0_50%,#F7F2FA_50%_100%)]'
          : 'bg-white'

  return (
    <div className={`h-[220px] rounded-2xl border border-[#CAC4D0]/75 p-4 shadow-inner ${bg}`}>
      <div className="mb-4 flex justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="h-3.5 w-20 rounded bg-[#1C1B1F]" />
          <div className="mt-2 h-1.5 w-28 rounded-full bg-[#CAC4D0]" />
        </div>
        {(style === 'fresh' || style === 'global') && <div className="h-11 w-9 rounded-lg bg-[#EADDFF]" />}
      </div>
      {[0, 1, 2].map((item) => (
        <div key={item} className="mt-4">
          <div className="mb-2 h-1 w-9 rounded-full bg-[#6750A4]" />
          <div className="mb-2 h-2 w-16 rounded-full bg-[#1C1B1F]/85" />
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#CAC4D0]" />
          <div className="mt-1.5 h-1.5 w-[72%] rounded-full bg-[#CAC4D0]" />
        </div>
      ))}
    </div>
  )
}

function WorkspacePreview() {
  return (
    <div className="relative min-h-[560px] overflow-hidden rounded-[32px] border border-[#CAC4D0]/70 bg-[#F3EDF7] p-4 shadow-[0_18px_48px_rgba(103,80,164,0.16)] md:p-[18px]">
      <div className="mb-3 flex h-9 items-center justify-between gap-3">
        <div className="flex gap-2" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF8A80]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FFD180]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#81C995]" />
        </div>
        <span className="rounded-full bg-[#EADDFF] px-3 py-1.5 text-xs font-black text-[#6750A4]">
          正在生成投递版简历
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-[#CAC4D0]/70 bg-[#FFFBFE] p-4 shadow-sm">
          <div className="mb-3 text-xs font-black text-[#49454F]">编辑器</div>
          {['个人信息', '工作经历', '项目经历', '专业技能'].map((label, index) => (
            <div key={label} className="mb-2 rounded-2xl border border-[#CAC4D0]/55 bg-[#F7F2FA] p-3">
              <div className="mb-2 flex items-center justify-between gap-2 text-xs font-black text-[#1C1B1F]">
                <span>{label}</span>
                {index < 3 && (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[#EADDFF] text-[#6750A4]">
                    <Icon name="spark" className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <div className="mt-2 h-2 w-[90%] rounded-full bg-[#CAC4D0]/70" />
              <div className="mt-2 h-2 w-[64%] rounded-full bg-[#CAC4D0]/70" />
            </div>
          ))}
        </aside>

        <div className="relative grid min-h-[420px] place-items-center rounded-3xl border border-[#CAC4D0]/70 bg-[#F7F2FA] bg-[linear-gradient(90deg,rgba(202,196,208,0.28)_1px,transparent_1px),linear-gradient(rgba(202,196,208,0.28)_1px,transparent_1px)] bg-[size:22px_22px] p-5 shadow-sm">
          <article className="min-h-[342px] w-[238px] rounded bg-white p-6 shadow-[0_16px_32px_rgba(28,27,31,0.12)] ring-1 ring-[#CAC4D0]/80">
            <div className="mb-2 h-5 w-32 rounded bg-[#1C1B1F]" />
            <div className="mb-6 flex gap-1.5">
              <span className="h-1.5 w-11 rounded-full bg-[#CAC4D0]" />
              <span className="h-1.5 w-14 rounded-full bg-[#CAC4D0]" />
              <span className="h-1.5 w-10 rounded-full bg-[#CAC4D0]" />
            </div>
            {[0, 1, 2].map((item) => (
              <section key={item} className="mt-4">
                <div className="mb-2 h-1 w-9 rounded-full bg-[#6750A4]" />
                <div className="mb-3 h-2 w-20 rounded-full bg-[#1C1B1F]/85" />
                <div className="mt-1.5 h-1.5 rounded-full bg-[#CAC4D0]" />
                <div className="mt-1.5 h-1.5 rounded-full bg-[#CAC4D0]" />
                <div className="mt-1.5 h-1.5 w-[68%] rounded-full bg-[#CAC4D0]" />
              </section>
            ))}
          </article>

          <aside className="absolute bottom-5 right-5 w-[min(260px,calc(100%-40px))] rounded-3xl border border-[#CAC4D0]/70 bg-[#FFFBFE]/95 p-4 shadow-[0_18px_46px_rgba(28,27,31,0.18)] backdrop-blur">
            <div className="mb-3 flex items-center justify-between gap-3">
              <strong className="text-sm text-[#1C1B1F]">AI 岗位适配</strong>
              <span className="rounded-full bg-[#D2F2E0] px-2.5 py-1 text-xs font-black text-[#1B873F]">82 分</span>
            </div>
            <div className="mb-3 rounded-2xl bg-[#EADDFF] p-3 text-[#21005D]">
              <strong className="mb-1 block text-xs">建议强化结果表达</strong>
              <p className="text-[11px] leading-relaxed text-[#21005D]/75">
                将职责描述改为成果描述，补充业务影响、协作对象与量化数据。
              </p>
            </div>
            <div className="inline-flex h-8 items-center rounded-full bg-[#6750A4] px-3 text-xs font-black text-white">
              应用建议
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage({ onImportClick, onDraftContinue, onWizardClick }: Props) {
  const [activeTemplate, setActiveTemplate] = useState(0)
  const hasDraft = useResumeStore((s) => {
    const d = s.data
    return !!(d.personalInfo.name || d.personalInfo.email || d.summary || d.workExperience.length > 0 || d.education.length > 0)
  })

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#FFFBFE_0%,#F8F3FB_48%,#FFFBFE_100%)] text-[#1C1B1F] antialiased">
      <header className="sticky top-0 z-30 border-b border-[#CAC4D0]/60 bg-[#FFFBFE]/85 backdrop-blur-xl">
        <nav className="mx-auto flex h-[72px] w-[min(1180px,calc(100%-32px))] items-center justify-between gap-4">
          <a href="#top" className="inline-flex min-w-max items-center gap-3 font-black tracking-normal">
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#6750A4] shadow-[0_8px_18px_rgba(103,80,164,0.24)]">
              <img src="/favicon.svg" alt="" className="h-[22px] w-[22px]" />
            </span>
            <span>简历鸭</span>
          </a>

          <div className="hidden items-center gap-1 rounded-full border border-[#CAC4D0]/65 bg-[#F3EDF7] p-1 text-sm font-extrabold text-[#49454F] md:flex">
            <a href="#features" className="rounded-full px-4 py-2 transition hover:bg-white hover:text-[#6750A4] hover:shadow-sm">功能</a>
            <a href="#templates" className="rounded-full px-4 py-2 transition hover:bg-white hover:text-[#6750A4] hover:shadow-sm">模板</a>
            <a href="#start" className="rounded-full px-4 py-2 transition hover:bg-white hover:text-[#6750A4] hover:shadow-sm">开始</a>
          </div>

          <button
            type="button"
            onClick={onWizardClick}
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#6750A4] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#5F479E] hover:shadow-[0_10px_24px_rgba(103,80,164,0.22)] active:translate-y-0"
          >
            开始写简历
          </button>
        </nav>
      </header>

      <main id="top">
        <section className="mx-auto grid w-[min(1180px,calc(100%-32px))] gap-10 py-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(430px,1.08fr)] lg:items-center lg:py-14">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#EADDFF] px-3.5 py-2 text-sm font-black text-[#6750A4]">
              <span className="h-2 w-2 rounded-full bg-[#6750A4] shadow-[0_0_0_5px_rgba(103,80,164,0.12)]" />
              AI 驱动的专业简历工作台
            </div>

            <h1 className="max-w-[720px] text-[clamp(40px,5.7vw,72px)] font-black leading-[1.04] tracking-normal">
              用 AI 写出一份<span className="text-[#6750A4]">更适合投递</span>的简历
            </h1>
            <p className="mt-5 max-w-[580px] text-[17px] leading-8 text-[#49454F]">
              从零开始对话生成，或导入已有简历继续优化。AI 帮你润色经历、适配岗位、预测面试问题，最后导出干净专业的 A4 简历。
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={onWizardClick}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#6750A4] px-6 font-black text-white shadow-[0_10px_24px_rgba(103,80,164,0.22)] transition hover:-translate-y-1 hover:bg-[#5F479E] hover:shadow-[0_18px_48px_rgba(103,80,164,0.16)] active:translate-y-0"
              >
                <Icon name="spark" />
                第一次写简历
              </button>
              <button
                type="button"
                onClick={onImportClick}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-[#CAC4D0] bg-[#FFFBFE] px-6 font-black text-[#6750A4] shadow-sm transition hover:-translate-y-1 hover:border-[#6750A4]/50 hover:bg-[#EADDFF]/50 hover:shadow-md active:translate-y-0"
              >
                <Icon name="upload" />
                导入已有简历
              </button>
              {hasDraft && (
                <button
                  type="button"
                  onClick={onDraftContinue}
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-[#F4C06A]/70 bg-[#FFF3D6] px-5 font-black text-[#7C4A00] transition hover:-translate-y-1 hover:shadow-md active:translate-y-0"
                >
                  <span className="h-2 w-2 rounded-full bg-[#B06D00]" />
                  继续未完成草稿
                </button>
              )}
            </div>

            <div className="mt-7 flex flex-wrap gap-2.5">
              {['AI 对话生成', '经历润色', '岗位适配', 'PDF 导出'].map((item) => (
                <span key={item} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#CAC4D0]/60 bg-[#F3EDF7]/85 px-3.5 text-sm font-bold text-[#49454F]">
                  <Icon name="check" className="h-4 w-4 text-[#6750A4]" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <WorkspacePreview />
        </section>

        <section id="features" className="mx-auto w-[min(1180px,calc(100%-32px))] py-12 md:py-16">
          <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-2 text-sm font-black text-[#6750A4]">AI 能力</p>
              <h2 className="max-w-[700px] text-[clamp(30px,4vw,48px)] font-black leading-tight tracking-normal">
                把写简历拆成更容易完成的几个动作
              </h2>
            </div>
            <p className="max-w-[430px] text-base leading-7 text-[#49454F]">
              不是替你编造经历，而是帮你把真实经历整理得更清楚、更专业、更贴近岗位。
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((feature) => (
              <article
                key={feature.title}
                className="min-h-[206px] rounded-3xl border border-[#CAC4D0]/65 bg-[#F7F2FA] p-5 shadow-sm transition hover:-translate-y-1 hover:bg-[#FFFBFE] hover:shadow-[0_8px_24px_rgba(28,27,31,0.08)]"
              >
                <div className={`mb-4 grid h-12 w-12 place-items-center rounded-[17px] ${feature.tone}`}>
                  <Icon name={feature.icon} className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-black tracking-normal">{feature.title}</h3>
                <p className="text-sm leading-7 text-[#49454F]">{feature.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="templates" className="mx-auto w-[min(1180px,calc(100%-32px))] py-12 md:py-16">
          <div className="rounded-[32px] border border-[#CAC4D0]/65 bg-[#F3EDF7] p-5 shadow-sm md:p-8 lg:p-11">
            <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="mb-2 text-sm font-black text-[#6750A4]">简历模板</p>
                <h2 className="max-w-[700px] text-[clamp(30px,4vw,48px)] font-black leading-tight tracking-normal">
                  选择一个模板，先看看好简历应该长什么样
                </h2>
              </div>
              <p className="max-w-[420px] text-base leading-7 text-[#49454F]">
                第一版提供精选场景模板。MVP 会先用 CSS 与模块顺序实现，不改变现有简历数据结构。
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {templates.map((template, index) => (
                <article
                  key={template.name}
                  onMouseEnter={() => setActiveTemplate(index)}
                  onFocus={() => setActiveTemplate(index)}
                  tabIndex={0}
                  className={`group flex min-h-[404px] flex-col rounded-3xl border bg-[#FFFBFE] p-3.5 shadow-sm outline-none transition hover:-translate-y-1.5 hover:shadow-[0_18px_48px_rgba(103,80,164,0.16)] ${
                    activeTemplate === index ? 'border-[#6750A4]/45 ring-2 ring-[#EADDFF]' : 'border-[#CAC4D0]/75'
                  }`}
                >
                  <ResumeThumb style={template.style} />
                  <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
                    <h3 className="text-lg font-black tracking-normal">{template.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#49454F]">{template.desc}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {template.tags.map((tag) => (
                        <span key={tag} className="inline-flex h-7 items-center rounded-full bg-[#EADDFF] px-2.5 text-xs font-black text-[#6750A4]">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={onWizardClick}
                      className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-black text-[#6750A4] transition group-hover:translate-x-1"
                    >
                      用此模板创建
                      <Icon name="arrow" className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="start" className="mx-auto w-[min(1180px,calc(100%-32px))] py-12 pb-16 md:py-20">
          <div className="grid min-h-[300px] items-center gap-6 rounded-[32px] border border-[#6750A4]/20 bg-[#EADDFF] p-6 text-[#21005D] shadow-[0_18px_48px_rgba(103,80,164,0.16)] md:grid-cols-[1fr_auto] md:p-10 lg:p-12">
            <div>
              <h2 className="max-w-[720px] text-[clamp(30px,4vw,48px)] font-black leading-tight tracking-normal">
                准备好开始整理你的下一份简历了吗？
              </h2>
              <p className="mt-4 max-w-[560px] text-base leading-7 text-[#21005D]/75">
                选择从零开始，或者导入旧简历。你始终可以编辑、忽略或应用 AI 建议，最终简历仍然由你决定。
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:min-w-[220px] md:flex-col">
              <button
                type="button"
                onClick={onWizardClick}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#6750A4] px-5 font-black text-white transition hover:-translate-y-1 hover:bg-[#5F479E] hover:shadow-lg active:translate-y-0"
              >
                AI 帮我从零写
              </button>
              <button
                type="button"
                onClick={onImportClick}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#6750A4]/35 bg-white px-5 font-black text-[#6750A4] transition hover:-translate-y-1 hover:shadow-md active:translate-y-0"
              >
                导入我的简历
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#CAC4D0]/65 py-7 text-sm text-[#49454F]">
        <div className="mx-auto flex w-[min(1180px,calc(100%-32px))] flex-col justify-between gap-2 sm:flex-row">
          <span className="font-black text-[#1C1B1F]">简历鸭</span>
          <span>真实经历，清楚表达，专业投递。</span>
        </div>
      </footer>
    </div>
  )
}
