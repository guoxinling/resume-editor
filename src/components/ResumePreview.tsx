import { useRef, useEffect, useState } from 'react'
import { useResumeStore } from '../store/resumeStore'
import type { Lang } from '../types/resume'

function T({ zh, en, lang }: { zh: string; en: string; lang: Lang }) {
  return <>{lang === 'zh' ? zh : en}</>
}

function useT() {
  const lang = useResumeStore((s) => s.data.lang)
  return { lang, T: ({ zh, en }: { zh: string; en: string }) => <T zh={zh} en={en} lang={lang} /> }
}

const INVALID_PREVIEW_VALUE_RE = /^(未知|\(未知\)|未填|未填写|待补充|待填写|暂无|无|n\/?a|null|undefined|-|—)$/i

const cleanPreviewText = (value: string) => {
  const text = value.replace(/\s+/g, ' ').trim()
  return INVALID_PREVIEW_VALUE_RE.test(text) ? '' : text
}

export default function ResumePreview() {
  const data = useResumeStore((s) => s.data)
  const sectionOrder = useResumeStore((s) => s.sectionOrder)
  const { lang, T } = useT()
  const pi = data.personalInfo

  const summary = lang === 'zh' ? data.summary : data.summaryEn

  const display = (zh: string, en: string) => cleanPreviewText(lang === 'zh' ? zh : en)

  const nameDisplay = display(pi.name, pi.nameEn || pi.name)
  const locationDisplay = display(pi.location, pi.locationEn || pi.location)
  const hasContact = [pi.phone, pi.email, locationDisplay, pi.age, pi.portfolio].filter(Boolean).length > 0
  const hasCustomFields = pi.customFields.some((f) => f.key && f.value)
  const jobObjective = display(pi.jobObjective, pi.jobObjectiveEn)

  const contentRef = useRef<HTMLDivElement>(null)
  const [pageBreaks, setPageBreaks] = useState<number[]>([])

  const A4_PRINTABLE_HEIGHT = 1000
  const A4_PAGE_HEIGHT = 1122.5

  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const observer = new ResizeObserver(() => {
      const totalHeight = el.scrollHeight
      const breaks: number[] = []
      for (let h = A4_PRINTABLE_HEIGHT; h < totalHeight; h += A4_PRINTABLE_HEIGHT) {
        breaks.push(h)
      }
      setPageBreaks(breaks)
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [data, sectionOrder])

  /** Check if a section has content to render */
  const sectionHasContent = (key: string): boolean => {
    switch (key) {
      case 'summary':
        return !!cleanPreviewText(summary)
      case 'workExperience':
        return data.workExperience.some((w) => display(w.company, w.companyEn))
      case 'aiProjects':
        return data.aiProjects.some((p) => display(p.name, p.nameEn))
      case 'education':
        return data.education.some((e) => display(e.school, e.schoolEn))
      case 'skills':
        return data.skills.some((s) => display(s.category, s.categoryEn))
      case 'languages':
        return (lang === 'zh' ? data.languages : data.languagesEn).some(cleanPreviewText)
      case 'selfEvaluation':
        return !!display(data.selfEvaluation, data.selfEvaluationEn)
      default:
        if (key.startsWith('custom_')) {
          const cs = data.customSections.find((cs) => cs.id === key)
          return !!(cs && display(cs.content, cs.contentEn))
        }
        return false
    }
  }

  /** Get section title */
  const sectionTitle = (key: string): { zh: string; en: string } | null => {
    if (key.startsWith('custom_')) {
      const cs = data.customSections.find((cs) => cs.id === key)
      return cs ? { zh: cs.label, en: cs.labelEn } : null
    }
    // Use store's user-editable labels (with fallback defaults)
    const sl = useResumeStore.getState().sectionLabels
    if (sl[key]) return { zh: sl[key].zh, en: sl[key].en }
    // Fallback built-in labels
    const fallback: Record<string, { zh: string; en: string }> = {
      summary: { zh: '个人概述', en: 'PROFESSIONAL SUMMARY' },
      workExperience: { zh: '工作经历', en: 'WORK EXPERIENCE' },
      aiProjects: { zh: '项目经历', en: 'PROJECTS' },
      education: { zh: '教育背景', en: 'EDUCATION' },
      skills: { zh: '专业技能', en: 'SKILLS' },
      languages: { zh: '语言能力', en: 'LANGUAGES' },
      selfEvaluation: { zh: '自我评价', en: 'SELF EVALUATION' },
    }
    return fallback[key] || null
  }

  /** Render a section by key (driven by sectionOrder) */
  const renderSection = (key: string) => {
    if (!sectionHasContent(key)) return null

    const title = sectionTitle(key)
    if (!title) return null

    return (
      <Section key={key}>
        <SectionTitle><T zh={title.zh} en={title.en} /></SectionTitle>

        {key === 'summary' && (
          <p className="text-body leading-relaxed text-text-secondary">{summary}</p>
        )}

        {key === 'workExperience' && (
          <div className="space-y-md">
            {data.workExperience.map((w) => {
              const c = display(w.company, w.companyEn)
              const r = display(w.role, w.roleEn)
              const d = display(w.dates, w.datesEn)
              const bullets = lang === 'zh' ? w.bullets : w.bulletsEn
              if (!c && !r) return null
              return (
                <div key={w.id}>
                  <div className="flex justify-between items-baseline mb-xs">
                    <p className="text-body font-bold text-text-primary">
                      {c}{r ? ` · ${r}` : ''}
                    </p>
                    <p className="text-caption text-text-muted whitespace-nowrap ml-md">{d}</p>
                  </div>
                  {bullets.filter(Boolean).length > 0 && (
                    <ul className="space-y-0.5">
                      {bullets.filter(Boolean).map((b, i) => (
                        <li key={i} className="text-body leading-relaxed text-text-secondary ml-md relative before:content-['–'] before:absolute before:-ml-md before:text-text-muted">
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {key === 'aiProjects' && (
          <div className="space-y-md">
            {data.aiProjects.map((p) => {
              const n = display(p.name, p.nameEn)
              const r = display(p.direction, p.directionEn)
              const d = display(p.dates, p.datesEn)
              const desc = display(p.description, p.descriptionEn)
              if (!n && !r) return null
              return (
                <div key={p.id}>
                  <div className="flex justify-between items-baseline mb-xs">
                    <p className="text-body font-bold text-text-primary">
                      {n}{r ? ` · ${r}` : ''}
                    </p>
                    <p className="text-caption text-text-muted whitespace-nowrap ml-md">{d}</p>
                  </div>
                  {desc && (
                    <ul className="space-y-0.5">
                      {desc.split('\n').filter(Boolean).map((line, i) => (
                        <li key={i} className="text-body leading-relaxed text-text-secondary ml-md relative before:content-['–'] before:absolute before:-ml-md before:text-text-muted">
                          {line}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {key === 'education' && (
          <div className="space-y-md">
            {data.education.map((e) => {
              const s = display(e.school, e.schoolEn)
              if (!s) return null
              const highlights = lang === 'zh' ? e.highlights : e.highlightsEn
              return (
                <div key={e.id}>
                  <div className="flex justify-between items-baseline mb-xs">
                    <p className="text-body font-bold text-text-primary">
                      {[s, display(e.degree, e.degreeEn), display(e.major, e.majorEn)].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-caption text-text-muted whitespace-nowrap ml-md">{display(e.dates, e.datesEn)}</p>
                  </div>
                  {highlights.filter(Boolean).length > 0 && (
                    <ul className="space-y-0.5">
                      {highlights.filter(Boolean).map((h, i) => (
                        <li key={i} className="text-body leading-relaxed text-text-secondary ml-md relative before:content-['–'] before:absolute before:-ml-md before:text-text-muted">
                          {h}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {key === 'skills' && (
          <div className="space-y-xs">
            {data.skills.map((sk, i) => {
              const cat = display(sk.category, sk.categoryEn)
              const items = display(sk.items, sk.itemsEn)
              if (!cat) return null
              return (
                <div key={i} className="flex">
                  <span className="w-20 shrink-0 text-body font-bold text-text-primary">{cat}</span>
                  <span className="text-body leading-relaxed text-text-secondary">{items}</span>
                </div>
              )
            })}
          </div>
        )}

        {key === 'languages' && (
          <p className="text-body leading-relaxed text-text-secondary">
            {(lang === 'zh' ? data.languages : data.languagesEn).map(cleanPreviewText).filter(Boolean).join(' / ')}
          </p>
        )}

        {key === 'selfEvaluation' && (
          <p className="text-body leading-relaxed text-text-secondary">{display(data.selfEvaluation, data.selfEvaluationEn)}</p>
        )}

        {key.startsWith('custom_') && (
          <p className="text-body leading-relaxed text-text-secondary">
            {display(data.customSections.find((cs) => cs.id === key)?.content || '', data.customSections.find((cs) => cs.id === key)?.contentEn || '')}
          </p>
        )}
      </Section>
    )
  }

  return (
    <div className="flex-1 bg-gray-100 dot-bg overflow-y-auto overflow-x-hidden relative">
      <div
        ref={contentRef}
        className="relative mx-auto"
        style={{ width: 793.7, minHeight: '100%' }}
      >
        {/* A4 Page */}
        <div id="resume-preview" className="relative bg-white shadow-md mx-auto overflow-hidden" style={{ width: 793.7, minHeight: A4_PAGE_HEIGHT, padding: '48px 64px' }}>
          {/* ── Header (always first, not in sectionOrder) ── */}
          {(nameDisplay || hasContact || pi.photo) && (
            <div className="">
              <div className="flex justify-between items-start gap-6">
                <div className="flex-1 min-w-0">
                  {nameDisplay && (
                    <h1 className="text-resume-name font-bold text-text-primary mb-xs xl:mb-sm tracking-tight">
                      {nameDisplay}
                    </h1>
                  )}
                  {jobObjective && (
                    <p className="text-body font-medium text-brand-secondary mb-xs">{jobObjective}</p>
                  )}
                  {hasContact && (
                    <p className="text-caption text-text-muted leading-relaxed">
                      {[pi.phone, pi.email, locationDisplay, pi.age].filter(Boolean).join('  |  ')}
                    </p>
                  )}
                  {pi.portfolio && (
                    <p className="text-caption text-brand-primary mt-0.5">
                      <a href={pi.portfolio.startsWith('http') ? pi.portfolio : `https://${pi.portfolio}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                        {pi.portfolio}
                      </a>
                    </p>
                  )}
                  {hasCustomFields && (
                    <p className="text-caption text-text-muted leading-relaxed mt-1">
                      {pi.customFields.filter((f) => f.key && f.value).map((f, i) => (
                        <span key={i}>
                          {i > 0 && '  |  '}
                          <span className="font-medium text-text-primary">{f.key}</span>
                          <span className="text-text-muted">: {f.value}</span>
                        </span>
                      ))}
                    </p>
                  )}
                </div>
                {pi.photo && (
                  <div className="shrink-0">
                    <img
                      src={pi.photo}
                      alt="简历照片"
                      crossOrigin="anonymous"
                      className="w-[75px] h-[100px] object-cover rounded border border-border-default"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Sections driven by editor sectionOrder ── */}
          {sectionOrder.filter((k) => k !== 'personalInfo').map(renderSection)}

          {/* Page break indicators */}
          {pageBreaks.length > 0 && (
            <div className="page-break-indicator absolute left-0 right-0 pointer-events-none" style={{ top: 0 }}>
              {pageBreaks.map((y, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 flex items-center gap-2"
                  style={{ top: y - 12 }}
                >
                  <div className="flex-1 border-t-2 border-dashed border-gray-300" />
                  <span className="text-[10px] font-medium text-gray-400 bg-white/80 px-2 py-0.5 rounded-full shrink-0">
                    第 {i + 2} 页
                  </span>
                  <div className="flex-1 border-t-2 border-dashed border-gray-300" />
                </div>
              ))}
            </div>
          )}

          {Array.from({ length: Math.max(1, pageBreaks.length + 1) }).map((_, index) => (
            <div
              key={index}
              className="pointer-events-none absolute select-none text-[10px] font-medium tracking-[0.18em] text-[#7C6F8F]/35"
              style={{ right: 64, top: (index + 1) * A4_PAGE_HEIGHT - 34 }}
            >
              简历鸭 · jianliya
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return <section className="mb-lg xl:mb-xl">{children}</section>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-sm xl:mb-md">
      <div className="w-8 h-[2px] bg-brand-secondary mb-2" />
      <h2 className="text-[11px] font-bold text-text-primary tracking-[0.05em] uppercase">
        {children}
      </h2>
    </div>
  )
}
