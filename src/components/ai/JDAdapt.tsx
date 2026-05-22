import { useState, useCallback } from 'react'
import { useAIStore } from '../../store/aiStore'
import { useResumeStore } from '../../store/resumeStore'
import { chatComplete } from '../../services/aiClient'
import { buildAdaptMessages } from '../../services/prompts'
import type { AdaptResult, Modification, ModGroup } from '../../types/ai'
import OCRCROCRUpload from './OCROCRUpload'

/* ── 模块 icon 映射 ── */
const MODULE_ICONS: Record<string, string> = {
  '工作经历': '📋', '项目经历': '🚀', '自我评价': '💬',
  '技能标签': '🏷', '教育经历': '🎓', '基本信息': '👤', '简历结构': '📐',
}

/* ── group count badge 颜色 ── */
function countClass(total: number): string {
  if (total >= 3) return 'warn'
  return 'info'
}

export default function JDAdapt() {
  const {
    jdText, adaptResult, adaptLoading, adaptError,
    setJdText, setAdaptResult, setAdaptError, setAdaptLoading,
    appliedModIds, markModApplied, clearAppliedMods,
  } = useAIStore()

  const resumeData = useResumeStore((s) => s.data)
  const setSelfEvaluation = useResumeStore((s) => s.setSelfEvaluation)
  const setSummary = useResumeStore((s) => s.setSummary)
  const setPersonalInfo = useResumeStore((s) => s.setPersonalInfo)
  const updateWork = useResumeStore((s) => s.updateWork)
  const setWorkBullets = useResumeStore((s) => s.setWorkBullets)
  const updateProject = useResumeStore((s) => s.updateProject)
  const updateEducation = useResumeStore((s) => s.updateEducation)
  const addEduHighlight = useResumeStore((s) => s.addEduHighlight)
  const updateEduHighlight = useResumeStore((s) => s.updateEduHighlight)
  const addSkill = useResumeStore((s) => s.addSkill)
  const updateSkill = useResumeStore((s) => s.updateSkill)
  const lang = resumeData.lang
  const [showOCR, setShowOCR] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())

  /* ── 构建简历文本（带索引，让 AI 能定位字段） ── */
  const buildResumeText = useCallback(() => {
    const lang = resumeData.lang
    const parts: string[] = []
    const pi = resumeData.personalInfo
    parts.push(`[个人信息] 姓名:${pi.name} 电话:${pi.phone} 邮箱:${pi.email} 城市:${pi.location} 年龄:${pi.age} 求职意向:${lang === 'zh' ? pi.jobObjective : pi.jobObjectiveEn || pi.jobObjective}`)
    if (resumeData.summary) parts.push(`[个人概述] ${resumeData.summary}`)
    resumeData.workExperience.forEach((w, i) => {
      const bullets = (lang === 'zh' ? w.bullets : w.bulletsEn || w.bullets).map((b, j) => `  bullet[${j}]: ${b}`).join('\n')
      parts.push(`[工作经历 ${i}] 公司:${lang === 'zh' ? w.company : w.companyEn || w.company} 职位:${lang === 'zh' ? w.role : w.roleEn || w.role} 时间:${w.dates}\n${bullets}`)
    })
    resumeData.aiProjects.forEach((p, i) => {
      parts.push(`[项目经历 ${i}] 名称:${lang === 'zh' ? p.name : p.nameEn || p.name} 方向:${lang === 'zh' ? p.direction : p.directionEn || p.direction} 时间:${p.dates} 描述:${lang === 'zh' ? p.description : p.descriptionEn || p.description}`)
    })
    resumeData.education.forEach((e, i) => {
      const hi = e.highlights.length ? e.highlights.join('；') : ''
      parts.push(`[教育经历 ${i}] 学校:${lang === 'zh' ? e.school : e.schoolEn || e.school} 学位:${lang === 'zh' ? e.degree : e.degreeEn || e.degree} 专业:${lang === 'zh' ? e.major : e.majorEn || e.major} 时间:${e.dates} 亮点:${hi}`)
    })
    resumeData.skills.forEach((s, i) => {
      parts.push(`[技能 ${i}] 分类:${lang === 'zh' ? s.category : s.categoryEn || s.category} 条目:${lang === 'zh' ? s.items : s.itemsEn || s.items}`)
    })
    if (resumeData.languages.length > 0) parts.push(`[语言能力] ${resumeData.languages.join('、')}`)
    if (resumeData.selfEvaluation) parts.push(`[自我评价] ${lang === 'zh' ? resumeData.selfEvaluation : resumeData.selfEvaluationEn || resumeData.selfEvaluation}`)
    const sectionOrder = useResumeStore.getState().sectionOrder
    parts.push(`[模块顺序] ${sectionOrder.join(' → ')}`)
    return parts.join('\n\n')
  }, [resumeData])

  /* ── 分析匹配度 ── */
  const handleAnalyze = useCallback(async () => {
    if (!jdText.trim()) return
    setAdaptLoading(true)
    setAdaptError(null)
    setAdaptResult(null)
    clearAppliedMods()
    try {
      const resumeText = buildResumeText()
      const messages = buildAdaptMessages(jdText, resumeText)
      const raw = await chatComplete(messages)
      const json = raw.replace(/```json\s*|```/g, '').trim()
      const result = JSON.parse(json) as AdaptResult
      setAdaptResult(result)
      // 默认展开所有分组
      setOpenGroups(new Set(result.modifications.map(g => g.module)))
    } catch (err: any) {
      setAdaptError(err.message || '分析失败')
    } finally {
      setAdaptLoading(false)
    }
  }, [jdText, buildResumeText, setAdaptLoading, setAdaptError, setAdaptResult, clearAppliedMods])

  /* ── 一键应用单条修改 ── */
  const handleApplyMod = useCallback((mod: Modification, groupIdx: number, itemIdx: number) => {
    const modKey = `${groupIdx}-${itemIdx}`
    if (appliedModIds.includes(modKey)) return

    const { field } = mod.target
    const revised = mod.revised
    const parts = field.split('.')

    // selfEvaluation
    if (field === 'selfEvaluation') {
      setSelfEvaluation(revised)
    }
    // summary
    else if (field === 'summary') {
      setSummary(revised)
    }
    // personalInfo.xxx
    else if (parts[0] === 'personalInfo') {
      setPersonalInfo(parts[1], revised)
    }
    // workExperience.N.bullets.M (replace)
    else if (parts[0] === 'workExperience' && parts[2] === 'bullets' && parts[3] !== 'new') {
      const idx = parseInt(parts[1], 10)
      const bulletIdx = parseInt(parts[3], 10)
      const entry = resumeData.workExperience[idx]
      if (entry) {
        const bullets = [...(lang === 'zh' ? entry.bullets : entry.bulletsEn || entry.bullets)]
        bullets[bulletIdx] = revised
        setWorkBullets(entry.id, bullets.join('\n'), lang)
      }
    }
    // workExperience.N.bullets.new (add)
    else if (parts[0] === 'workExperience' && parts[2] === 'bullets' && parts[3] === 'new') {
      const idx = parseInt(parts[1], 10)
      const entry = resumeData.workExperience[idx]
      if (entry) {
        const bullets = [...(lang === 'zh' ? entry.bullets : entry.bulletsEn || entry.bullets), revised]
        setWorkBullets(entry.id, bullets.join('\n'), lang)
      }
    }
    // aiProjects.N.description
    else if (parts[0] === 'aiProjects' && parts.length >= 3) {
      const idx = parseInt(parts[1], 10)
      const proj = resumeData.aiProjects[idx]
      if (proj) {
        const fieldName = lang === 'zh' ? 'description' : 'descriptionEn'
        updateProject(proj.id, fieldName, revised)
      }
    }
    // skills.new
    else if (field === 'skills.new') {
      const colonIdx = revised.indexOf('：')
      const colonIdx2 = revised.indexOf(':')
      const sep = colonIdx >= 0 ? colonIdx : colonIdx2
      if (sep >= 0) {
        const cat = revised.slice(0, sep).trim()
        const items = revised.slice(sep + 1).trim()
        addSkill()
        // After addSkill, the new skill is at the end — we need to update it
        // Use setTimeout to ensure store has updated
        setTimeout(() => {
          const s = useResumeStore.getState()
          const lastIdx = s.data.skills.length - 1
          updateSkill(lastIdx, 'category', cat)
          updateSkill(lastIdx, 'items', items)
        }, 0)
      }
    }
    // education.N.highlights.new
    else if (parts[0] === 'education' && parts.length >= 4 && parts[2] === 'highlights' && parts[3] === 'new') {
      const idx = parseInt(parts[1], 10)
      const edu = resumeData.education[idx]
      if (edu) {
        addEduHighlight(edu.id, lang)
        setTimeout(() => {
          const s = useResumeStore.getState()
          const updated = s.data.education[idx]
          if (updated) {
            const lastIdx = updated.highlights.length - 1
            updateEduHighlight(edu.id, lastIdx, revised, lang)
          }
        }, 0)
      }
    }
    // sectionOrder — skip (needs complex reordering)

    markModApplied(modKey)
  }, [appliedModIds, resumeData, lang,
    setSelfEvaluation, setSummary, setPersonalInfo,
    setWorkBullets, updateProject, addSkill, updateSkill,
    addEduHighlight, updateEduHighlight, markModApplied])

  /* ── 全部应用 ── */
  const handleApplyAll = useCallback(() => {
    if (!adaptResult) return
    adaptResult.modifications.forEach((group, gi) => {
      group.items.forEach((mod, ii) => {
        handleApplyMod(mod, gi, ii)
      })
    })
  }, [adaptResult, handleApplyMod])

  /* ── 重新诊断 ── */
  const handleRediagnose = useCallback(() => {
    clearAppliedMods()
    if (adaptResult) setOpenGroups(new Set(adaptResult.modifications.map(g => g.module)))
    handleAnalyze()
  }, [clearAppliedMods, adaptResult, handleAnalyze])

  /* ── 折叠分组 ── */
  const toggleGroup = (module: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(module)) next.delete(module)
      else next.add(module)
      return next
    })
  }

  /* ── 计算已应用数 ── */
  const getGroupApplied = (gi: number, items: Modification[]) => {
    return items.filter((_, ii) => appliedModIds.includes(`${gi}-${ii}`)).length
  }

  const totalMods = adaptResult?.modifications.reduce((sum, g) => sum + g.items.length, 0) ?? 0
  const totalApplied = adaptResult?.modifications.reduce((sum, g, gi) => sum + getGroupApplied(gi, g.items), 0) ?? 0
  const totalRemaining = totalMods - totalApplied

  /* ── 获取 item 原文（截断显示） ── */
  const truncate = (s: string, max = 60) => s.length > max ? s.slice(0, max) + '…' : s

  /* ── Tailwind helpers ── */
  const btnBase = "text-xs font-semibold px-5 py-2 rounded-full inline-flex items-center gap-1.5 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
  const btnPrimary = `${btnBase} bg-[#6750A4] text-white shadow-sm hover:bg-[#6750A4]/90 hover:shadow-md hover:-translate-y-0.5 active:scale-95`
  const btnOutline = `${btnBase} bg-transparent text-[#49454F] border border-[#CAC4D0] hover:bg-[#6750A4]/5 hover:border-[#79747E] active:scale-95`
  const btnDone = `${btnPrimary} !bg-[#1B873F] !shadow-none pointer-events-none`

  if (adaptLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#6750A4] animate-bounce" />
          <span className="w-2 h-2 rounded-full bg-[#6750A4] animate-bounce" style={{ animationDelay: '0.16s' }} />
          <span className="w-2 h-2 rounded-full bg-[#6750A4] animate-bounce" style={{ animationDelay: '0.32s' }} />
        </div>
        <p className="text-xs text-[#49454F]">正在分析简历与岗位匹配度…</p>
      </div>
    )
  }

  return (
    <div>
      {/* ── JD 输入区 ── */}
      <p className="text-xs text-[#49454F] mb-1.5 opacity-70">粘贴目标岗位 JD，或截图识别</p>

      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setShowOCR(!showOCR)}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 ${
            showOCR
              ? 'border-[#6750A4] text-[#6750A4] bg-[#E8DEF8]'
              : 'border-dashed border-[#CAC4D0] text-[#49454F]/60 hover:border-[#6750A4] hover:text-[#6750A4]'
          }`}
        >
          📷 截图识别
        </button>
        {!showOCR && <span className="text-[10px] text-[#49454F]/50">直接 Ctrl+V 粘贴截图</span>}
      </div>

      {showOCR && <OCRCROCRUpload />}

      <textarea
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
        placeholder="在此粘贴目标岗位描述（JD）…"
        className="w-full min-h-[120px] p-3 rounded-xl border border-[#CAC4D0] bg-[#F3EDF7]/50 text-xs resize-y focus:outline-none focus:border-[#6750A4] focus:ring-2 focus:ring-[#6750A4]/10 placeholder:text-[#49454F]/40"
      />

      <div className="mt-3">
        <button
          onClick={handleAnalyze}
          disabled={!jdText.trim() || adaptLoading}
          className={`${btnPrimary} ${(!jdText.trim() || adaptLoading) ? 'opacity-50 cursor-not-allowed !pointer-events-none' : ''}`}
        >
          🎯 分析匹配度
        </button>
      </div>

      {/* Error */}
      {adaptError && (
        <div className="mt-3 p-2.5 rounded-xl bg-[#F9DEDC] text-[#B3261E] text-xs">{adaptError}</div>
      )}

      {/* ═══════ 诊断报告 ═══════ */}
      {adaptResult && (
        <div className="mt-5 space-y-0">
          {/* ── 头部评分 ── */}
          <div className="rounded-2xl bg-[#E8DEF8] text-center py-7 px-5 relative overflow-hidden">
            {/* 装饰圆 */}
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-5"
              style={{ background: 'radial-gradient(circle, #6750A4 0%, transparent 70%)' }} />
            <div className="relative z-10">
              <h3 className="text-sm font-medium text-[#1D192B] mb-1">AI 诊断报告</h3>
              <p className="text-[11px] text-[#1D192B]/50 mb-4">基于目标岗位分析</p>

              {/* 分数环 */}
              <div className="flex justify-center mb-3">
                <div className="relative w-[100px] h-[100px]">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="43" fill="none" stroke="rgba(29,25,43,.1)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="43" fill="none" stroke="#6750A4" strokeWidth="8"
                      strokeLinecap="round" strokeDasharray="270.18"
                      strokeDashoffset={270.18 * (1 - adaptResult.score / 100)} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[32px] font-bold text-[#1D192B] leading-none">{adaptResult.score}</span>
                    <span className="text-[10px] text-[#1D192B]/50 mt-0.5">综合得分</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-[#1D192B]/60 max-w-[340px] mx-auto leading-relaxed">
                针对性优化关键点可有效提升简历竞争力
              </p>
            </div>
          </div>

          {/* ── 分项评分 ── */}
          <div className="bg-white px-5 pt-4 pb-1 space-y-2.5">
            {adaptResult.dimensions.map((d) => (
              <div key={d.name} className="flex items-center gap-3">
                <span className="w-[72px] text-right text-[11px] font-medium text-[#49454F] flex-shrink-0">{d.name}</span>
                <div className="flex-1 h-2 bg-[#E7E0EC] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.2,0,0,1)] ${
                      d.score >= 80 ? 'bg-[#1B873F]' : d.score >= 60 ? 'bg-[#B06D00]' : 'bg-[#B3261E]'
                    }`}
                    style={{ width: `${d.score}%` }}
                  />
                </div>
                <span className={`w-7 text-right text-xs font-bold flex-shrink-0 ${
                  d.score >= 80 ? 'text-[#1B873F]' : d.score >= 60 ? 'text-[#B06D00]' : 'text-[#B3261E]'
                }`}>{d.score}</span>
              </div>
            ))}
          </div>

          {/* ── 优势 / 短板 ── */}
          <div className="grid grid-cols-2 gap-3 px-5 py-3">
            <div className="bg-[#F3EDF7] rounded-2xl p-3.5">
              <div className="text-[11px] font-medium text-[#1B873F] mb-2 pb-1.5 border-b border-[#CAC4D0]/50">✓ 核心优势</div>
              {adaptResult.strengths.map((s, i) => (
                <div key={i} className="text-[11px] text-[#49454F] leading-relaxed py-0.5 flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1B873F] flex-shrink-0 mt-1.5" />
                  {s}
                </div>
              ))}
            </div>
            <div className="bg-[#F3EDF7] rounded-2xl p-3.5">
              <div className="text-[11px] font-medium text-[#49454F] mb-2 pb-1.5 border-b border-[#CAC4D0]/50">✗ 主要短板</div>
              {adaptResult.weaknesses.map((w, i) => (
                <div key={i} className="text-[11px] text-[#49454F] leading-relaxed py-0.5 flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#CAC4D0] flex-shrink-0 mt-1.5" />
                  {w}
                </div>
              ))}
            </div>
          </div>

          {/* ── 分割线 ── */}
          <div className="h-px bg-[#CAC4D0]/50 mx-5" />

          {/* ── 修改建议 ── */}
          <div className="px-5 pt-3 pb-1">
            <h4 className="text-[13px] font-medium text-[#1C1B1F] mb-2.5 flex items-center gap-2">
              修改建议
              <span className="text-[10px] font-medium bg-[#E8DEF8] text-[#6750A4] px-2 py-0.5 rounded-full">{totalMods} 项</span>
            </h4>

            {adaptResult.modifications.map((group, gi) => {
              const groupApplied = getGroupApplied(gi, group.items)
              const isOpen = openGroups.has(group.module)
              return (
                <div key={group.module}
                  className={`mb-2 bg-[#F3EDF7] rounded-2xl overflow-hidden transition-shadow duration-300 ${
                    isOpen ? '' : ''
                  }`}
                >
                  {/* 分组头部 */}
                  <button
                    onClick={() => toggleGroup(group.module)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#6750A4]/5 transition-colors"
                  >
                    <span className="text-xs font-medium text-[#1C1B1F] flex items-center gap-2">
                      {MODULE_ICONS[group.module] || '📌'} {group.module}
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        countClass(group.items.length) === 'warn'
                          ? 'bg-[#FFF3D6] text-[#B06D00]'
                          : 'bg-[#E8DEF8] text-[#6750A4]'
                      }`}>{group.items.length} 项</span>
                      {groupApplied > 0 && (
                        <span className="text-[10px] font-medium text-[#1B873F]">✓ {groupApplied}/{group.items.length}</span>
                      )}
                    </span>
                    <span className={`text-[11px] text-[#49454F] transition-transform duration-300 w-6 h-6 flex items-center justify-center rounded-full ${isOpen ? 'rotate-180 bg-[#6750A4]/8' : ''}`}>
                      ▾
                    </span>
                  </button>

                  {/* 分组内容 */}
                  {isOpen && (
                    <div className="border-t border-[#CAC4D0]/50">
                      {group.items.map((mod, ii) => {
                        const modKey = `${gi}-${ii}`
                        const isApplied = appliedModIds.includes(modKey)
                        return (
                          <div key={ii} className={`px-4 py-3.5 ${ii > 0 ? 'border-t border-[#CAC4D0]/50' : ''}`}>
                            {/* 问题 */}
                            <div className="text-xs font-medium text-[#1C1B1F] mb-2.5 flex items-start gap-1.5">
                              <span className="flex-shrink-0 w-[18px] h-[18px] rounded-full bg-[#FFF3D6] text-[#B06D00] text-[10px] font-bold flex items-center justify-center">!</span>
                              {mod.problem}
                            </div>

                            {/* 修改前后对比 */}
                            <div className="rounded-xl overflow-hidden border border-[#CAC4D0]/60 mb-3">
                              <div className="bg-[#F5F4F6] px-3.5 py-2.5 text-[11px] text-[#49454F] leading-relaxed">
                                <div className="text-[9px] font-bold uppercase tracking-wider text-[#49454F]/40 mb-1">修改前</div>
                                {mod.target.text ? truncate(mod.target.text, 120) : '（原文未涉及）'}
                              </div>
                              <div className="bg-[#E8DEF8] px-3.5 py-2.5 text-[11px] text-[#1D192B] leading-relaxed border-t border-[#6750A4]/10">
                                <div className="text-[9px] font-bold uppercase tracking-wider text-[#6750A4] mb-1">建议改为</div>
                                {mod.revised}
                              </div>
                            </div>

                          {/* 操作钮 */}
                            <div className="flex gap-2 items-center" data-mod-item>
                              <button
                                onClick={() => handleApplyMod(mod, gi, ii)}
                                className={isApplied ? btnDone : btnPrimary}
                              >
                                {isApplied ? '✓ 已应用' : '✨ 应用'}
                              </button>
                              <button className={btnOutline}
                                onClick={(e) => {
                                  const parent = (e.target as HTMLElement).closest('[data-mod-item]')?.parentElement
                                  if (parent) parent.style.opacity = '0.35'
                                }}
                              >
                                忽略
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── 底部操作 ── */}
          <div className="flex gap-2.5 px-5 pb-5 pt-2">
            <button
              onClick={handleApplyAll}
              disabled={totalRemaining === 0}
              className={`flex-1 text-[13px] font-medium py-3 rounded-full transition-all duration-300 flex items-center justify-center gap-1.5 ${
                totalRemaining === 0
                  ? 'bg-[#1B873F] text-white shadow-none cursor-default'
                  : 'bg-[#6750A4] text-white shadow-sm hover:bg-[#6750A4]/90 hover:shadow-md hover:-translate-y-0.5 active:scale-96'
              }`}
            >
              {totalRemaining === 0 ? '✓ 全部已应用' : `🔄 全部应用（${totalRemaining}）`}
            </button>
            <button
              onClick={handleRediagnose}
              className="flex-1 text-[13px] font-medium py-3 rounded-full border-1.5 border-[#79747E] text-[#6750A4] bg-transparent hover:bg-[#6750A4]/5 hover:border-[#6750A4] hover:-translate-y-0.5 active:scale-96 transition-all duration-300 flex items-center justify-center gap-1.5"
            >
              🔁 重新诊断
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
