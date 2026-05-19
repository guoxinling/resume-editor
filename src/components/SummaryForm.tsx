import { useResumeStore } from '../store/resumeStore'
import { useAIStore } from '../store/aiStore'
import { zh } from '../i18n/zh'
import { en } from '../i18n/en'
import { MiniToolbar, AIPolishButton, handleAutoContinue } from './shared/TextAreaToolbar'

export default function SummaryForm() {
  const { data, setSummary, setSummaryEn } = useResumeStore()
  const { openPanel, setActiveTab, setPolishCustomText } = useAIStore()
  const lang = data.lang
  const t = lang === 'zh' ? zh : en

  const handleAIPolish = (text: string, source: 'summary' | 'summaryEn') => {
    if (!text.trim()) return
    setPolishCustomText(text, source)
    setActiveTab('polish')
    openPanel()
  }

  return (
    <div className="space-y-2">
      {lang === 'zh' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-gray-400">中文描述</label>
            <AIPolishButton onClick={() => handleAIPolish(data.summary, 'summary')} label="AI 润色" />
          </div>
          <MiniToolbar textareaId="summary-zh" />
          <textarea
            id="summary-zh"
            value={data.summary}
            onChange={(e) => setSummary(e.target.value)}
            onKeyDown={handleAutoContinue}
            placeholder={t.summary.placeholder}
            rows={4}
            className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100 resize-y"
          />
        </div>
      )}
      {lang === 'en' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-gray-400">English Description</label>
            <AIPolishButton onClick={() => handleAIPolish(data.summaryEn, 'summaryEn')} label="AI Polish" />
          </div>
          <MiniToolbar textareaId="summary-en" />
          <textarea
            id="summary-en"
            value={data.summaryEn}
            onChange={(e) => setSummaryEn(e.target.value)}
            onKeyDown={handleAutoContinue}
            placeholder={t.summary.placeholder}
            rows={4}
            className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100 resize-y"
          />
        </div>
      )}
    </div>
  )
}
