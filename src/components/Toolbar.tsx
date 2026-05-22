import { useRef, useState, useCallback, useEffect } from 'react'
import { useResumeStore } from '../store/resumeStore'
import { useAIStore } from '../store/aiStore'
import { useCreditsStore } from '../store/creditsStore'
import { zh } from '../i18n/zh'
import { en } from '../i18n/en'
import { downloadPdf } from '../utils/exportPdf'
import { exportPng } from '../utils/exportImage'
import { saveDraft } from '../utils/storage'
import { parseMarkdownResume } from '../utils/markdownParser'
import { validateResume } from '../utils/validation'
import { chatComplete } from '../services/aiClient'
import { buildTranslateMessages } from '../services/prompts'

interface Props {
  onOpenDrafts: () => void
  showEditor: boolean
  onToggleEditor: () => void
  onGoHome: () => void
}

export default function Toolbar({ onOpenDrafts, showEditor, onToggleEditor, onGoHome }: Props) {
  const { data, draftId, setLang, setDraftInfo, loadData, applyTranslation, translateLoading, translateError, setTranslateLoading, setTranslateError } = useResumeStore()
  const isPanelOpen = useAIStore((s) => s.isOpen)
  const togglePanel = useAIStore((s) => s.togglePanel)
  const credits = useCreditsStore()
  const lang = data.lang
  const t = lang === 'zh' ? zh : en
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingPng, setExportingPng] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)

  // ── Translation state ──
  const [translatedOnce, setTranslatedOnce] = useState(
    () => localStorage.getItem('resume-translated-en') === '1'
  )

  // ── Close menus on click outside ──
  useEffect(() => {
    if (!menuOpen && !exportMenuOpen) return
    const handler = () => { setMenuOpen(false); setExportMenuOpen(false) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [menuOpen, exportMenuOpen])

  // ── Credits display ──
  const remaining = credits.remaining()
  const creditsTotal = credits.dailyTotal + credits.purchased

  // ── Language toggle ──
  const toggleLang = useCallback(async () => {
    const state = useResumeStore.getState()
    const currentLang = state.data.lang
    const newLang = currentLang === 'zh' ? 'en' : 'zh'
    setLang(newLang)

    if (newLang === 'en' && !translatedOnce) {
      setTranslateLoading(true)
      setTranslateError(null)
      try {
        const d = state.data
        const snapshot: Record<string, any> = {
          nameEn: d.personalInfo.name,
          locationEn: d.personalInfo.location,
          summaryEn: d.summary,
          selfEvaluationEn: d.selfEvaluation,
          jobObjectiveEn: d.personalInfo.jobObjective,
          workExperience: d.workExperience.map((w, i) => ({ index: i, companyEn: w.company, roleEn: w.role, datesEn: w.dates, bulletsEn: w.bullets })),
          aiProjects: d.aiProjects.map((p, i) => ({ index: i, nameEn: p.name, directionEn: p.direction, datesEn: p.dates, descriptionEn: p.description })),
          education: d.education.map((e, i) => ({ index: i, schoolEn: e.school, degreeEn: e.degree, majorEn: e.major, datesEn: e.dates, highlightsEn: e.highlights })),
          skills: d.skills.map((s, i) => ({ index: i, categoryEn: s.category, itemsEn: s.items })),
          languagesEn: d.languages,
          customSections: d.customSections.map((cs, i) => ({ index: i, labelEn: cs.label, contentEn: cs.content })),
        }
        const messages = buildTranslateMessages(JSON.stringify(snapshot, null, 2))
        const raw = await chatComplete(messages)
        const json = raw.replace(/```json\s*|```/g, '').trim()
        applyTranslation(JSON.parse(json))
        localStorage.setItem('resume-translated-en', '1')
        setTranslatedOnce(true)
      } catch (err: any) {
        setTranslateError(err.message || '翻译失败')
      } finally {
        setTranslateLoading(false)
      }
    }
  }, [translatedOnce, setLang, setTranslateLoading, setTranslateError, applyTranslation])

  // ── File operations ──
  const handleSave = async () => {
    setMenuOpen(false)
    const name = prompt(t.draftName || '保存为', draftId ? undefined : '我的简历')
    if (!name) return
    const id = await saveDraft(draftId || crypto.randomUUID(), name, data)
    setDraftInfo(id, name)
    alert(t.exportSuccess || '保存成功')
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMenuOpen(false)
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (ext === 'md' || ext === 'txt') {
      try {
        const text = await file.text()
        const parsed = parseMarkdownResume(text)
        if (parsed) { loadData(parsed); alert('导入成功') }
        else alert('无法解析文件')
      } catch { alert('导入失败') }
      return
    }
    // PDF/Image
    try {
      const { importResumeFromFile } = await import('../services/resumeImport')
      const result = await importResumeFromFile(file, () => {})
      loadData(result)
    } catch (err: any) {
      alert('导入失败: ' + (err?.message || ''))
    }
  }

  const handleNew = () => {
    setMenuOpen(false)
    if (confirm(t.confirmDelete || '确认新建？当前未保存的内容将丢失。')) {
      useResumeStore.getState().reset()
    }
  }

  // ── Export ──
  const handleExportPdf = async () => {
    setExportMenuOpen(false)
    const result = validateResume(data)
    if (!result.valid) { alert(t.validationRequired || '请先填写简历内容'); return }
    setExportingPdf(true)
    try {
      await downloadPdf(data, lang, data.personalInfo.name || 'resume')
    } catch (err: any) {
      alert('PDF 导出失败: ' + (err?.message || String(err)))
    } finally { setExportingPdf(false) }
  }

  const handleExportPng = async () => {
    setExportMenuOpen(false)
    const result = validateResume(data)
    if (!result.valid) { alert(t.validationRequired || '请先填写简历内容'); return }
    const el = document.getElementById('resume-preview')
    if (!el) { alert('没有可导出的内容'); return }
    setExportingPng(true)
    try {
      await exportPng(el, (data.personalInfo.name || 'resume') + '.png')
    } finally { setExportingPng(false) }
  }

  // ── Button style helpers ──
  const iconBtn = 'w-8 h-8 rounded-lg flex items-center justify-center text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors'
  const pillBase = 'h-8 rounded-full text-[12px] px-3 font-medium transition-all duration-150 inline-flex items-center gap-1.5 cursor-pointer'

  return (
    <header className="h-12 bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0 z-10 select-none">
      {/* ── Left: Brand + Nav ── */}
      <div className="flex items-center gap-1.5">
        {/* Brand badge — goes home */}
        <button
          onClick={onGoHome}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
          title="返回首页"
        >
          <span className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[13px] leading-none text-white font-bold flex-shrink-0">
            🦆
          </span>
          <span className="text-[13px] font-semibold text-gray-800 hidden sm:inline">
            {t.appTitle}
          </span>
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block" />

        {/* Back arrow */}
        <button onClick={onGoHome} className={iconBtn} title="返回首页">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        {/* Resume name + file menu dropdown */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); setExportMenuOpen(false) }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors text-[13px] font-medium text-gray-700"
          >
            {data.personalInfo.name || lang === 'zh' ? '未命名简历' : 'Untitled'}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </button>

          {menuOpen && (
            <div className="absolute top-full left-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in slide-in-from-top-1">
              <button onClick={handleSave} className="w-full text-left px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                💾 {lang === 'zh' ? '保存草稿' : 'Save Draft'}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onOpenDrafts() }} className="w-full text-left px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                📂 {lang === 'zh' ? '我的草稿' : 'My Drafts'}
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button onClick={() => fileInputRef.current?.click()} className="w-full text-left px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                📎 {lang === 'zh' ? '导入简历' : 'Import'}
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button onClick={handleNew} className="w-full text-left px-3 py-2 text-[12px] text-red-500 hover:bg-red-50 flex items-center gap-2">
                ✕ {lang === 'zh' ? '新建简历' : 'New Resume'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Credits + Lang + Export + AI ── */}
      <div className="flex items-center gap-2">
        {/* Credits badge */}
        <span
          className={`${pillBase} text-[11px] ${
            remaining <= 3
              ? 'bg-red-50 text-red-600 border border-red-200'
              : remaining <= 5
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
          }`}
          title={lang === 'zh' ? `今日免费 ${credits.dailyTotal} 点，已用 ${credits.dailyUsed}` : `Daily free ${credits.dailyTotal}, used ${credits.dailyUsed}`}
        >
          <span className="text-[13px]">🔋</span>
          <span className="font-semibold">{remaining}</span>
          <span className="opacity-60">/{creditsTotal}</span>
        </span>

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          disabled={translateLoading}
          className={`${pillBase} bg-gray-900 text-white ${translateLoading ? 'opacity-50' : 'hover:bg-gray-800'}`}
        >
          {translateLoading ? '⏳' : lang === 'zh' ? 'EN' : '中'}
        </button>
        {translateError && <span className="text-[10px] text-red-500" title={translateError}>翻译失败</span>}

        {/* Export dropdown */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setExportMenuOpen(!exportMenuOpen); setMenuOpen(false) }}
            disabled={exportingPdf || exportingPng}
            className={`${pillBase} bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700 active:scale-[0.97] ${(exportingPdf || exportingPng) ? 'opacity-50' : ''}`}
          >
            {exportingPdf || exportingPng ? '⏳' : '⬇'}
            <span className="hidden sm:inline">{lang === 'zh' ? '导出' : 'Export'}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </button>

          {exportMenuOpen && (
            <div className="absolute top-full right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in slide-in-from-top-1">
              <button onClick={handleExportPdf} className="w-full text-left px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                📄 PDF
              </button>
              <button onClick={handleExportPng} className="w-full text-left px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                🖼️ PNG
              </button>
            </div>
          )}
        </div>

        {/* AI assistant button */}
        <button
          onClick={togglePanel}
          className={`h-8 rounded-full text-[12px] px-3 font-semibold transition-all duration-200 inline-flex items-center gap-1.5 ${
            isPanelOpen
              ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/20'
              : 'bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100'
          }`}
        >
          💬 {lang === 'zh' ? 'AI' : 'AI'}
        </button>

        {/* Mobile editor toggle */}
        <button onClick={onToggleEditor} className="lg:hidden h-8 rounded-full text-[11px] px-2.5 font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 active:scale-95 transition-all">
          {showEditor ? '✕' : '✎'}
        </button>
      </div>

      <input ref={fileInputRef} type="file" accept=".md,.txt,.pdf,.jpg,.jpeg,.png,.webp" onChange={handleImport} className="hidden" />
    </header>
  )
}
