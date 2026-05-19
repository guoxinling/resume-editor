import { useCallback } from 'react'
import { useAIStore } from '../../store/aiStore'
import { useResumeStore } from '../../store/resumeStore'
import { chatComplete } from '../../services/aiClient'
import { buildInterviewMessages } from '../../services/prompts'
import type { InterviewQuestion } from '../../types/ai'

export default function InterviewPredict() {
  const {
    interviewQuestions, interviewLoading, interviewError,
    setInterviewQuestions, setInterviewError, setInterviewLoading,
  } = useAIStore()

  const resumeData = useResumeStore((s) => s.data)

  const buildResumeText = useCallback(() => {
    const lang = resumeData.lang
    const parts: string[] = []
    const pi = resumeData.personalInfo
    parts.push(`姓名: ${pi.name}`)
    if (pi.jobObjective) parts.push(`求职意向: ${lang === 'zh' ? pi.jobObjective : pi.jobObjectiveEn}`)
    if (resumeData.summary) parts.push(`个人概述: ${resumeData.summary}`)
    if (resumeData.selfEvaluation) parts.push(`自我评价: ${lang === 'zh' ? resumeData.selfEvaluation : resumeData.selfEvaluationEn}`)
    resumeData.workExperience.forEach((w) => {
      const c = lang === 'zh' ? w.company : w.companyEn || w.company
      const r = lang === 'zh' ? w.role : w.roleEn || w.role
      const b = (lang === 'zh' ? w.bullets : w.bulletsEn || w.bullets).join('；')
      if (c || r) parts.push(`工作经历: ${c} - ${r}: ${b}`)
    })
    resumeData.aiProjects.forEach((p) => {
      parts.push(`AI项目: ${lang === 'zh' ? p.name : p.nameEn || p.name}: ${lang === 'zh' ? p.description : p.descriptionEn || p.description}`)
    })
    resumeData.education.forEach((e) => {
      parts.push(`教育: ${lang === 'zh' ? e.school : e.schoolEn || e.school} ${lang === 'zh' ? e.degree : e.degreeEn || e.degree} ${lang === 'zh' ? e.major : e.majorEn || e.major}`)
    })
    resumeData.skills.forEach((s) => {
      parts.push(`技能: ${lang === 'zh' ? s.category : s.categoryEn || s.category}: ${lang === 'zh' ? s.items : s.itemsEn || s.items}`)
    })
    return parts.join('\n')
  }, [resumeData])

  const handleGenerate = useCallback(async () => {
    setInterviewLoading(true)
    setInterviewError(null)
    setInterviewQuestions([])
    try {
      const resumeText = buildResumeText()
      const messages = buildInterviewMessages(resumeText)
      const raw = await chatComplete(messages)
      const json = raw.replace(/```json\s*|```/g, '').trim()
      const questions = JSON.parse(json) as InterviewQuestion[]
      setInterviewQuestions(questions)
    } catch (err: any) {
      setInterviewError(err.message || '生成失败')
    } finally {
      setInterviewLoading(false)
    }
  }, [buildResumeText, setInterviewLoading, setInterviewError, setInterviewQuestions])

  const btnPrimary = "h-[34px] px-4 rounded-md text-xs font-semibold bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white inline-flex items-center gap-1.5 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all"

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">基于你的简历内容，AI 预测面试官可能提出的 10 个问题</p>

      <button
        onClick={handleGenerate}
        disabled={interviewLoading}
        className={`${btnPrimary} ${interviewLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        💬 生成面试问题
      </button>

      {/* Error */}
      {interviewError && (
        <div className="mt-3 p-2.5 rounded-md bg-red-50 text-red-600 text-xs">{interviewError}</div>
      )}

      {/* Loading */}
      {interviewLoading && (
        <div className="flex gap-1 items-center py-4 justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '0.16s' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '0.32s' }} />
        </div>
      )}

      {/* Questions */}
      {interviewQuestions.length > 0 && (
        <div className="mt-4 space-y-2">
          {interviewQuestions.map((q, i) => (
            <div
              key={i}
              className="p-3 rounded-lg border border-gray-200 bg-white flex items-start gap-2.5 hover:border-[#7C3AED] hover:bg-indigo-50 transition-all"
            >
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-gray-800 leading-relaxed">{q.question}</div>
                <div className="text-[11px] text-gray-400 mt-1 leading-relaxed">{q.hint}</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-[#7C3AED] whitespace-nowrap flex-shrink-0">
                {q.category}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
