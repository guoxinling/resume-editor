import { useState, useCallback } from 'react'
import { useAIStore } from '../../store/aiStore'
import { useResumeStore } from '../../store/resumeStore'
import { chatComplete } from '../../services/aiClient'
import { buildAdaptMessages } from '../../services/prompts'
import type { AdaptPatch, AdaptResult } from '../../types/ai'
import OCRCROCRUpload from './OCROCRUpload'

export default function JDAdapt() {
  const {
    jdText, adaptResult, adaptLoading, adaptError,
    setJdText, setAdaptResult, setAdaptError, setAdaptLoading,
  } = useAIStore()

  const resumeData = useResumeStore((s) => s.data)
  const setSummary = useResumeStore((s) => s.setSummary)
  const updateWork = useResumeStore((s) => s.updateWork)
  const updateSkill = useResumeStore((s) => s.updateSkill)
  const addSkill = useResumeStore((s) => s.addSkill)
  const [showOCR, setShowOCR] = useState(false)
  const [appliedPatches, setAppliedPatches] = useState<Set<number>>(() => new Set())
  const [skippedPatches, setSkippedPatches] = useState<Set<number>>(() => new Set())

  const buildResumeText = useCallback(() => {
    const lang = resumeData.lang
    const parts: string[] = []
    const pi = resumeData.personalInfo
    parts.push(`姓名: ${pi.name}`)
    if (pi.jobObjective) parts.push(`求职意向: ${lang === 'zh' ? pi.jobObjective : pi.jobObjectiveEn}`)
    if (resumeData.summary) parts.push(`概述: ${resumeData.summary}`)
    if (resumeData.selfEvaluation) parts.push(`自我评价: ${lang === 'zh' ? resumeData.selfEvaluation : resumeData.selfEvaluationEn}`)
    resumeData.workExperience.forEach((w, i) => {
      const c = lang === 'zh' ? w.company : w.companyEn || w.company
      const r = lang === 'zh' ? w.role : w.roleEn || w.role
      const b = (lang === 'zh' ? w.bullets : w.bulletsEn || w.bullets).join('；')
      if (c || r) parts.push(`工作经历[${i}]: ${c} - ${r}: ${b}`)
    })
    resumeData.aiProjects.forEach((p) => {
      parts.push(`项目: ${lang === 'zh' ? p.name : p.nameEn || p.name}: ${lang === 'zh' ? p.description : p.descriptionEn || p.description}`)
    })
    resumeData.skills.forEach((s, i) => {
      parts.push(`技能[${i}]: ${lang === 'zh' ? s.category : s.categoryEn || s.category}: ${lang === 'zh' ? s.items : s.itemsEn || s.items}`)
    })
    return parts.join('\n')
  }, [resumeData])

  const handleAnalyze = useCallback(async () => {
    if (!jdText.trim()) return
    setAdaptLoading(true)
    setAdaptError(null)
    setAdaptResult(null)
    setAppliedPatches(new Set())
    setSkippedPatches(new Set())
    try {
      const resumeText = buildResumeText()
      const messages = buildAdaptMessages(jdText, resumeText)
      const raw = await chatComplete(messages, 'adapt')
      // Parse JSON from AI response (strip possible markdown backticks)
      const json = raw.replace(/```json\s*|```/g, '').trim()
      const result = JSON.parse(json) as AdaptResult
      setAdaptResult(result)
    } catch (err: any) {
      setAdaptError(err.message || '分析失败')
    } finally {
      setAdaptLoading(false)
    }
  }, [jdText, buildResumeText, setAdaptLoading, setAdaptError, setAdaptResult])

  const splitPatchLines = (value: string) =>
    value
      .split(/\n|；|;/)
      .map((line) => line.replace(/^[•\-–—]\s*/, '').trim())
      .filter(Boolean)

  const resolveWorkId = (patch: AdaptPatch) => {
    if (typeof patch.targetIndex === 'number' && resumeData.workExperience[patch.targetIndex]) {
      return resumeData.workExperience[patch.targetIndex].id
    }
    const company = patch.company?.trim()
    const role = patch.role?.trim()
    const match = resumeData.workExperience.find((work) => {
      const companyHit = company && work.company.includes(company)
      const roleHit = role && work.role.includes(role)
      return companyHit || roleHit
    })
    return match?.id
  }

  const applyPatch = (patch: AdaptPatch, index: number) => {
    if (appliedPatches.has(index) || skippedPatches.has(index)) return

    if (patch.module === 'summary' && patch.replacement?.trim()) {
      setSummary(patch.replacement.trim())
    }

    if (patch.module === 'workExperience') {
      const workId = resolveWorkId(patch)
      const bullets = patch.newBullets?.length
        ? patch.newBullets.map((item) => item.trim()).filter(Boolean)
        : splitPatchLines(patch.replacement || '')
      if (workId && bullets.length > 0) {
        updateWork(workId, 'bullets', bullets)
      }
    }

    if (patch.module === 'skills' && patch.replacement?.trim()) {
      const nextValue = patch.replacement.trim()
      if (typeof patch.targetIndex === 'number' && resumeData.skills[patch.targetIndex]) {
        updateSkill(patch.targetIndex, 'items', nextValue)
      } else {
        const category = patch.category?.trim()
        const matchIndex = category
          ? resumeData.skills.findIndex((skill) => skill.category.includes(category))
          : -1
        if (matchIndex >= 0) {
          updateSkill(matchIndex, 'items', nextValue)
        } else {
          addSkill()
          const nextIndex = useResumeStore.getState().data.skills.length - 1
          updateSkill(nextIndex, 'category', category || '岗位关键词')
          updateSkill(nextIndex, 'items', nextValue)
        }
      }
    }

    setAppliedPatches((prev) => new Set(prev).add(index))
  }

  const skipPatch = (index: number) => {
    if (appliedPatches.has(index)) return
    setSkippedPatches((prev) => new Set(prev).add(index))
  }

  const moduleLabel = (module: AdaptPatch['module']) => {
    if (module === 'summary') return '个人概述'
    if (module === 'workExperience') return '工作经历'
    return '技能'
  }

  const btnPrimary = "h-[34px] px-4 rounded-md text-xs font-semibold bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white inline-flex items-center gap-1.5 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all"
  const btnSecondary = "h-[34px] px-4 rounded-md text-xs font-medium bg-white border border-gray-200 text-gray-800 inline-flex items-center gap-1.5 hover:border-[#4F46E5] hover:text-[#4F46E5] hover:bg-indigo-50 transition-all"

  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">粘贴 JD 文字，或截图识别 Boss 直聘岗位描述</p>

      {/* OCR Toggle */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setShowOCR(!showOCR)}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 ${
            showOCR
              ? 'border-[#7C3AED] text-[#7C3AED] bg-indigo-50'
              : 'border-dashed border-gray-300 text-gray-400 hover:border-[#7C3AED] hover:text-[#7C3AED]'
          }`}
        >
          📷 截图识别
        </button>
        {!showOCR && <span className="text-[10px] text-gray-400">直接 Ctrl+V 粘贴截图</span>}
      </div>

      {/* OCR Upload area */}
      {showOCR && <OCRCROCRUpload />}

      {/* JD Textarea */}
      <textarea
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
        placeholder={`在此粘贴目标岗位描述（JD）...

例如：
【岗位】AI 产品经理
【要求】
- 3年以上AI/大数据产品经验
- 熟悉大语言模型应用场景
- 具备数据分析能力，熟练使用SQL
...`}
        className="w-full min-h-[140px] p-3 rounded-lg border border-gray-200 text-xs resize-y focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100"
      />

      {/* Action */}
      <div className="mt-3">
        <button
          onClick={handleAnalyze}
          disabled={!jdText.trim() || adaptLoading}
          className={`${btnPrimary} ${(!jdText.trim() || adaptLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          🎯 分析匹配度
        </button>
      </div>

      {/* Error */}
      {adaptError && (
        <div className="mt-3 p-2.5 rounded-md bg-red-50 text-red-600 text-xs">{adaptError}</div>
      )}

      {/* Loading */}
      {adaptLoading && (
        <div className="flex gap-1 items-center py-3 justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '0.16s' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '0.32s' }} />
        </div>
      )}

      {/* Results */}
      {adaptResult && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-800">
            📊 匹配度分析
            <span className="text-[11px] font-normal text-gray-400">整体匹配 {adaptResult.score}%</span>
          </div>

          {/* Matches */}
          {adaptResult.matches.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                ✅ <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-600">匹配</span>
                与 JD 契合的经历
              </h4>
              {adaptResult.matches.map((m, i) => (
                <div key={i} className="bg-gray-50 rounded-md p-2.5 text-xs text-gray-600 leading-relaxed mt-1.5 border-l-[3px] border-l-[#7C3AED]">
                  <strong>{m.skill}</strong> — {m.evidence}。{m.suggestion}
                </div>
              ))}
            </div>
          )}

          {/* Missing */}
          {adaptResult.missing.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                ⚠️ <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-600">缺失</span>
                JD 要求但简历未体现
              </h4>
              {adaptResult.missing.map((m, i) => (
                <div key={i} className="bg-gray-50 rounded-md p-2.5 text-xs text-gray-600 leading-relaxed mt-1.5 border-l-[3px] border-l-[#7C3AED]">
                  <strong>{m.requirement}</strong> — {m.suggestion}
                </div>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {adaptResult.suggestions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                💡 <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600">建议强化</span>
                优化方向
              </h4>
              {adaptResult.suggestions.map((s, i) => (
                <div key={i} className="bg-gray-50 rounded-md p-2.5 text-xs text-gray-600 leading-relaxed mt-1.5 border-l-[3px] border-l-[#7C3AED]">
                  <strong>{s.area}</strong> — {s.detail}
                </div>
              ))}
            </div>
          )}

          {/* One-click adjust button */}
          {adaptResult.patches && adaptResult.patches.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                🔄 <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-[#4F46E5]">逐条应用</span>
                可写入简历的调整
              </h4>
              <div className="space-y-2">
                {adaptResult.patches.map((patch, i) => {
                  const applied = appliedPatches.has(i)
                  const skipped = skippedPatches.has(i)
                  return (
                    <div key={i} className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600 shadow-sm">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="font-semibold text-gray-800">
                          <span className="mr-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-[#4F46E5]">{moduleLabel(patch.module)}</span>
                          {patch.title}
                        </div>
                        {(applied || skipped) && (
                          <span className={`shrink-0 text-[10px] font-semibold ${applied ? 'text-green-600' : 'text-gray-400'}`}>
                            {applied ? '已应用' : '已跳过'}
                          </span>
                        )}
                      </div>
                      {patch.reason && <p className="mb-2 leading-relaxed text-gray-500">{patch.reason}</p>}
                      {patch.current && (
                        <p className="mb-1 line-clamp-2 text-gray-400">
                          原：{patch.current}
                        </p>
                      )}
                      <p className="leading-relaxed text-gray-700">
                        新：{patch.newBullets?.length ? patch.newBullets.join('；') : patch.replacement}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => applyPatch(patch, i)}
                          disabled={applied || skipped}
                          className={`${btnSecondary} h-8 !text-[#4F46E5] !border-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          应用到简历
                        </button>
                        <button
                          type="button"
                          onClick={() => skipPatch(i)}
                          disabled={applied || skipped}
                          className="h-8 rounded-md border border-gray-200 bg-white px-3 text-xs font-medium text-gray-500 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          跳过
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
