import { useRef, useState, useCallback } from 'react'
import { useResumeStore } from '../store/resumeStore'
import { zh } from '../i18n/zh'
import { en } from '../i18n/en'
import { BUILTIN_SECTIONS } from '../types/resume'
import type { BuiltinSectionKey } from '../types/resume'
import PersonalInfoForm from './PersonalInfoForm'
import SummaryForm from './SummaryForm'
import WorkExperienceForm from './WorkExperienceForm'
import AIProjectsForm from './AIProjectsForm'
import EducationForm from './EducationForm'
import SkillsForm from './SkillsForm'
import LanguagesForm from './LanguagesForm'
import SelfEvaluationForm from './SelfEvaluationForm'
import CustomSectionForm from './CustomSectionForm'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const SECTION_LABELS: Record<BuiltinSectionKey, { zh: string; en: string }> = {
  personalInfo: { zh: '个人信息', en: 'Personal Info' },
  summary: { zh: '个人概述', en: 'Summary' },
  workExperience: { zh: '工作经历', en: 'Work Experience' },
  aiProjects: { zh: 'AI产品实践', en: 'AI Projects' },
  education: { zh: '教育背景', en: 'Education' },
  skills: { zh: '专业技能', en: 'Skills' },
  languages: { zh: '语言能力', en: 'Languages' },
  selfEvaluation: { zh: '自我评价', en: 'Self Evaluation' },
}

/** Get display label for any section key (built-in or custom).
 *  Built-in labels come from the store (user-editable via setSectionLabel).
 */
function sectionLabel(key: string, lang: 'zh' | 'en', t: typeof zh): string {
  if (key.startsWith('custom_')) {
    const cs = useResumeStore.getState().data.customSections.find((cs) => cs.id === key)
    return lang === 'zh' ? (cs?.label || '自定义模块') : (cs?.labelEn || 'Custom')
  }
  const sl = useResumeStore.getState().sectionLabels
  if (sl[key]) {
    return lang === 'zh' ? sl[key].zh : sl[key].en
  }
  return key
}

function isBuiltin(key: string): key is BuiltinSectionKey {
  return BUILTIN_SECTIONS.includes(key as BuiltinSectionKey)
}

function sectionContent(key: string, data: ReturnType<typeof useResumeStore.getState>['data']) {
  if (key.startsWith('custom_')) {
    const cs = data.customSections.find((cs) => cs.id === key)
    return cs ? <CustomSectionForm cs={cs} /> : null
  }
  switch (key) {
    case 'personalInfo': return <PersonalInfoForm />
    case 'summary': return <SummaryForm />
    case 'workExperience': return <WorkExperienceForm />
    case 'aiProjects': return <AIProjectsForm />
    case 'education': return <EducationForm />
    case 'skills': return <SkillsForm />
    case 'languages': return <LanguagesForm />
    case 'selfEvaluation': return <SelfEvaluationForm />
    default: return null
  }
}

function CollapseArrow({ open }: { open: boolean }) {
  return (
    <span className={`inline-block text-[10px] transition-transform duration-200 ${open ? 'rotate-90' : 'rotate-0'}`}>
      ▶
    </span>
  )
}

function SortableSection({
  sectionKey,
  lang,
  collapsed,
  isOver,
  isCustom,
  onToggle,
  onRemove,
}: {
  sectionKey: string
  lang: 'zh' | 'en'
  collapsed: boolean
  isOver: boolean
  isCustom: boolean
  onToggle: () => void
  onRemove: () => void
}) {
  const data = useResumeStore((s) => s.data)
  const setSectionLabel = useResumeStore((s) => s.setSectionLabel)
  const t = lang === 'zh' ? zh : en
  const label = sectionLabel(sectionKey, lang, t)
  const open = !collapsed
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(label)
  const editRef = useRef<HTMLInputElement>(null)
  const isBuiltin = !isCustom

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sectionKey })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl relative p-3 bg-white border border-border-default/80 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset] ${isDragging ? 'opacity-40 bg-bg-hover shadow-lg z-10' : ''}`}
    >
      {/* Drop indicator */}
      {isOver && !isDragging && (
        <div className="absolute -top-[5px] left-0 right-0 h-[3px] rounded-full bg-brand-primary z-20 animate-pulse pointer-events-none" />
      )}

      {/* Section header */}
      <div className={`flex items-center gap-1.5 mb-3 pb-2 border-b ${isCustom ? 'border-dashed border-brand-primary/30' : 'border-border-default'} group`}>
        <button
          {...attributes}
          {...listeners}
          className="drag-handle text-text-muted/50 hover:text-text-secondary text-sm px-0.5 select-none shrink-0 cursor-grab active:cursor-grabbing"
          title="拖拽排序"
        >
          ⠿
        </button>

        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 text-sm font-bold text-text-primary hover:text-brand-primary transition-colors cursor-pointer select-none flex-1 text-left"
        >
          <CollapseArrow open={open} />
          {isCustom && <span className="text-[10px] text-brand-primary">✦</span>}
          {editing ? (
            <input
              ref={editRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => {
                setEditing(false)
                if (editValue.trim() && editValue.trim() !== label) {
                  setSectionLabel(sectionKey, lang, editValue.trim())
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
                if (e.key === 'Escape') {
                  setEditValue(label)
                  setEditing(false)
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-1.5 py-0.5 text-sm font-bold border-b-2 border-brand-primary bg-transparent outline-none text-text-primary min-w-0"
              autoFocus
            />
          ) : (
            <span
              className={isCustom ? 'text-brand-primary' : 'text-text-primary hover:text-brand-primary cursor-text'}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                if (isBuiltin) {
                  setEditValue(label)
                  setEditing(true)
                }
              }}
              title={isBuiltin ? '点击修改标题' : undefined}
            >
              {label}
            </span>
          )}
        </button>

        <button
          onClick={onRemove}
          className="text-text-muted/50 hover:text-red-500 text-sm leading-none shrink-0 opacity-0 group-hover:opacity-100 transition-opacity px-1"
          title={isCustom ? '删除此模块' : '隐藏此模块'}
        >
          ✕
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          open ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {sectionContent(sectionKey, data)}
      </div>
    </section>
  )
}

export default function EditorPanel() {
  const lang = useResumeStore((s) => s.data.lang)
  const { data, setPersonalInfo, sectionOrder, sectionLabels, setSectionOrder, hideSection, showSection, addCustomSection, removeCustomSection } = useResumeStore()
  const t = lang === 'zh' ? zh : en
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showCustomPrompt, setShowCustomPrompt] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const [customLabelEn, setCustomLabelEn] = useState('')
  const [overId, setOverId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const toggle = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event
    setOverId(over ? String(over.id) : null)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setOverId(null)
    if (!over || active.id === over.id) return
    const oldIndex = sectionOrder.indexOf(String(active.id))
    const newIndex = sectionOrder.indexOf(String(over.id))
    if (oldIndex !== -1 && newIndex !== -1) {
      const arr = [...sectionOrder]
      const [moved] = arr.splice(oldIndex, 1)
      arr.splice(newIndex, 0, moved)
      setSectionOrder(arr)
    }
  }, [sectionOrder, setSectionOrder])

  /** Hide built-in section, or delete custom section */
  const handleRemove = (key: string) => {
    if (isBuiltin(key)) {
      hideSection(key)
    } else {
      removeCustomSection(key)
    }
  }

  /** Add a built-in section back to the layout */
  const handleAddBuiltin = (key: BuiltinSectionKey) => {
    showSection(key)
    setShowAddMenu(false)
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  /** Add a new custom section */
  const handleAddCustom = () => {
    setShowAddMenu(false)
    setCustomLabel('')
    setCustomLabelEn('')
    setShowCustomPrompt(true)
  }

  const confirmCustom = () => {
    if (!customLabel.trim()) return
    addCustomSection(customLabel.trim(), customLabelEn.trim())
    setShowCustomPrompt(false)
  }

  /** Which built-in sections are currently hidden */
  const hiddenBuiltins = BUILTIN_SECTIONS.filter((k) => !sectionOrder.includes(k))

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setPersonalInfo('photo', reader.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleRemovePhoto = () => {
    setPersonalInfo('photo', '')
  }

  const photo = data.personalInfo.photo

  return (
    <aside className="lg:h-full w-full lg:w-[480px] shrink-0 bg-white/95 lg:border-r border-border-default editor-scroll overflow-y-auto">
      <div className="p-4 pb-20">
        {/* ── Photo upload ── */}
        <div className="flex items-center gap-3 mb-5 p-3 rounded-2xl bg-bg-hover border border-border-default">
          {photo ? (
            <div className="relative group">
              <img src={photo} alt="简历照片" crossOrigin="anonymous" className="w-16 h-20 object-cover rounded-xl border border-border-default" />
              <button
                onClick={handleRemovePhoto}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none"
                title={t.personalInfo.removePhoto}
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="w-16 h-20 border border-dashed border-border-default rounded-xl bg-white flex items-center justify-center text-text-muted text-2xl">
              👤
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            <button onClick={() => photoInputRef.current?.click()} className="px-3 py-1.5 text-xs bg-accent-muted hover:bg-[#E7D9FA] text-brand-primary rounded-full font-semibold transition-colors">
              {t.personalInfo.uploadPhoto}
            </button>
            {photo && (
              <button onClick={handleRemovePhoto} className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-full font-semibold transition-colors">
                {t.personalInfo.removePhoto}
              </button>
            )}
          </div>
        </div>

        {/* ── Draggable sections ── */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={() => setOverId(null)} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {sectionOrder.map((key) => (
                <SortableSection
                  key={key}
                  sectionKey={key}
                  lang={lang}
                  collapsed={collapsed.has(key)}
                  isOver={overId === key}
                  isCustom={!isBuiltin(key)}
                  onToggle={() => toggle(key)}
                  onRemove={() => handleRemove(key)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* ── Add section button (always visible) ── */}
        <div className="mt-6 relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="w-full py-3 border border-dashed border-brand-primary/30 rounded-2xl text-xs text-brand-primary bg-accent-muted/40 hover:bg-accent-muted hover:border-brand-primary/50 transition-colors font-bold"
          >
            + {t.addSection}
          </button>

          {showAddMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-border-default rounded-2xl shadow-xl shadow-slate-900/10 p-1.5 z-20">
              {/* Built-in sections that are currently hidden */}
              {hiddenBuiltins.map((key) => (
                <button
                  key={key}
                  onClick={() => handleAddBuiltin(key)}
                  className="w-full text-left px-4 py-2 text-xs text-text-secondary hover:bg-bg-hover hover:text-brand-primary rounded-xl transition-colors"
                >
                  {lang === 'zh' ? (sectionLabels[key]?.zh || SECTION_LABELS[key].zh) : (sectionLabels[key]?.en || SECTION_LABELS[key].en)}
                </button>
              ))}
              {/* Divider + custom section option */}
              {hiddenBuiltins.length > 0 && <div className="border-t border-border-default my-1" />}
              <button
                onClick={handleAddCustom}
                className="w-full text-left px-4 py-2 text-xs text-brand-primary hover:bg-accent-muted/60 rounded-xl transition-colors font-bold"
              >
                ✦ {t.addCustomSection}
              </button>
            </div>
          )}
        </div>

        {/* ── Add section menu backdrop click ── */}
        {showAddMenu && (
          <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
        )}
      </div>

      {/* ── Custom section name prompt modal ── */}
      {showCustomPrompt && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl shadow-2xl shadow-slate-900/15 border border-border-default p-6 w-[360px] max-w-[90vw]">
            <h3 className="text-sm font-bold text-text-primary mb-4">{t.addCustomSection}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-text-muted mb-1">中文名称</label>
                <input
                  autoFocus
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmCustom() }}
                  className="w-full px-3 py-2 text-sm border border-border-default rounded-xl focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-accent-muted/80"
                  placeholder="如：社会实践、获奖情况…"
                />
              </div>
              <div>
                <label className="block text-[10px] text-text-muted mb-1">English Name</label>
                <input
                  value={customLabelEn}
                  onChange={(e) => setCustomLabelEn(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmCustom() }}
                  className="w-full px-3 py-2 text-sm border border-border-default rounded-xl focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-accent-muted/80"
                  placeholder="e.g. Social Practice, Awards..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowCustomPrompt(false)}
                className="px-4 py-2 text-xs text-text-secondary hover:bg-bg-hover rounded-full transition-colors font-semibold"
              >
                {t.cancel}
              </button>
              <button
                onClick={confirmCustom}
                disabled={!customLabel.trim()}
                className="px-4 py-2 text-xs bg-brand-primary text-white rounded-full hover:brightness-110 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
              >
                {t.ok}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
