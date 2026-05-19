import { useResumeStore } from '../store/resumeStore'
import { useAIStore } from '../store/aiStore'
import { zh } from '../i18n/zh'
import { en } from '../i18n/en'
import { MiniToolbar, AIPolishButton, handleAutoContinue } from './shared/TextAreaToolbar'
import type { CustomSection } from '../types/resume'

export default function CustomSectionForm({ cs }: { cs: CustomSection }) {
  const { data, updateCustomSection } = useResumeStore()
  const { openPanel, setActiveTab, setPolishCustomText, selectCustomSection } = useAIStore()
  const lang = data.lang
  const t = lang === 'zh' ? zh : en

  const handleAIPolish = (text: string) => {
    if (!text.trim()) return
    setPolishCustomText(text, 'customSection')
    selectCustomSection(cs.id)
    setActiveTab('polish')
    openPanel()
  }

  return (
    <div className="space-y-2">
      {/* Editable title */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-gray-400 mb-0.5">{t.customSection.label}</label>
          <input
            value={cs.label}
            onChange={(e) => updateCustomSection(cs.id, 'label', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-gray-400"
            placeholder="模块名称"
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-400 mb-0.5">{t.customSection.labelEn}</label>
          <input
            value={cs.labelEn}
            onChange={(e) => updateCustomSection(cs.id, 'labelEn', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-gray-400"
            placeholder="Section Name"
          />
        </div>
      </div>

      {/* Content */}
      {lang === 'zh' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-gray-400">内容</label>
            <AIPolishButton onClick={() => handleAIPolish(cs.content)} />
          </div>
          <MiniToolbar textareaId={`custom-zh-${cs.id}`} />
          <textarea
            id={`custom-zh-${cs.id}`}
            value={cs.content}
            onChange={(e) => updateCustomSection(cs.id, 'content', e.target.value)}
            onKeyDown={handleAutoContinue}
            className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100 resize-y min-h-[80px]"
            placeholder="输入内容…"
          />
        </div>
      )}
      {lang === 'en' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-gray-400">Content</label>
            <AIPolishButton onClick={() => handleAIPolish(cs.contentEn)} label="AI Polish" />
          </div>
          <MiniToolbar textareaId={`custom-en-${cs.id}`} />
          <textarea
            id={`custom-en-${cs.id}`}
            value={cs.contentEn}
            onChange={(e) => updateCustomSection(cs.id, 'contentEn', e.target.value)}
            onKeyDown={handleAutoContinue}
            className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100 resize-y min-h-[80px]"
            placeholder="Enter content..."
          />
        </div>
      )}
    </div>
  )
}
