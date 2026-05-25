import { useResumeStore } from '../store/resumeStore'
import { useAIStore } from '../store/aiStore'
import { zh } from '../i18n/zh'
import { en } from '../i18n/en'
import { MiniToolbar, AIPolishButton, handleAutoContinue } from './shared/TextAreaToolbar'

export default function SelfEvaluationForm() {
  const { data, setSelfEvaluation, setSelfEvaluationEn } = useResumeStore()
  const { openPanel, setActiveTab, setPolishCustomText, selectSelfEvaluation } = useAIStore()
  const lang = data.lang
  const t = lang === 'zh' ? zh : en

  const handleAIPolish = (text: string, source: 'selfEvaluation' | 'selfEvaluationEn') => {
    if (!text.trim()) return
    setPolishCustomText(text, source)
    selectSelfEvaluation()
    setActiveTab('polish')
    openPanel()
  }

  return (
    <div className="space-y-1.5">
      {lang === 'zh' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-text-muted">中文自我评价</label>
            <AIPolishButton onClick={() => handleAIPolish(data.selfEvaluation, 'selfEvaluation')} />
          </div>
          <MiniToolbar textareaId="selfeval-zh" />
          <textarea
            id="selfeval-zh"
            value={data.selfEvaluation}
            onChange={(e) => setSelfEvaluation(e.target.value)}
            onKeyDown={handleAutoContinue}
            className="w-full px-2.5 py-2 text-xs border border-border-default rounded-xl bg-white focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-accent-muted/80 resize-y min-h-[100px]"
            placeholder="简要描述你的个人特点、职业规划和优势…"
          />
        </div>
      )}
      {lang === 'en' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-text-muted">English Self Evaluation</label>
            <AIPolishButton onClick={() => handleAIPolish(data.selfEvaluationEn, 'selfEvaluationEn')} label="AI Polish" />
          </div>
          <MiniToolbar textareaId="selfeval-en" />
          <textarea
            id="selfeval-en"
            value={data.selfEvaluationEn}
            onChange={(e) => setSelfEvaluationEn(e.target.value)}
            onKeyDown={handleAutoContinue}
            className="w-full px-2.5 py-2 text-xs border border-border-default rounded-xl bg-white focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-accent-muted/80 resize-y min-h-[100px]"
            placeholder="Briefly describe your strengths, career goals..."
          />
        </div>
      )}
    </div>
  )
}
