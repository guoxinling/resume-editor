import { useCallback } from 'react'
import { useResumeStore } from '../store/resumeStore'
import { useAIStore } from '../store/aiStore'
import { zh } from '../i18n/zh'
import { en } from '../i18n/en'
import { MiniToolbar, AIPolishButton, handleAutoContinue } from './shared/TextAreaToolbar'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type ProjField = 'name' | 'nameEn' | 'direction' | 'directionEn' | 'dates' | 'datesEn'

function shouldShowField(f: ProjField, lang: string): boolean {
  if (f.endsWith('En')) return lang === 'en'
  return lang === 'zh'
}

/* ── Sortable Project Card ── */

function SortableProjectCard({ p, index }: { p: ReturnType<typeof useResumeStore.getState>['data']['aiProjects'][number]; index: number }) {
  const { data, removeProject, updateProject } = useResumeStore()
  const { openPanel, setActiveTab, setPolishCustomText, selectProject } = useAIStore()
  const lang = data.lang
  const t = lang === 'zh' ? zh : en

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id })

  const handleAIPolish = useCallback(() => {
    setPolishCustomText(lang === 'zh' ? p.description : p.descriptionEn, 'free')
    selectProject(p.id)
    setActiveTab('polish')
    openPanel()
  }, [p.description, p.descriptionEn, p.id, lang, setPolishCustomText, selectProject, setActiveTab, openPanel])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const rowInput = (field: ProjField, label: string) => (
    <div>
      <label className="block text-[10px] text-text-muted mb-0.5">{label}</label>
      <input
        value={p[field]}
        onChange={(e) => updateProject(p.id, field, e.target.value)}
        className="w-full px-2.5 py-2 text-xs border border-border-default rounded-xl bg-white focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-accent-muted/80"
        placeholder={label}
      />
    </div>
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 border border-border-default rounded-2xl bg-bg-hover/60 space-y-2 hover:shadow-sm hover:bg-white transition-all relative group sortable-item ${isDragging ? 'dragging' : ''}`}
    >
      {/* Drag handle + delete */}
      <div className="flex items-center justify-between">
        <button {...attributes} {...listeners} className="drag-handle text-text-muted/50 hover:text-text-secondary text-sm px-0.5 select-none" title="拖拽排序">
          ⠿
        </button>
        <button onClick={() => removeProject(p.id)} className="text-text-muted/50 hover:text-red-500 text-sm leading-none opacity-0 group-hover:opacity-100 transition-opacity" title={t.aiProjects.removeProject}>
          ✕
        </button>
      </div>

      {/* Row layout — name + role in 2-col, dates in 2-col */}
      <div className="grid grid-cols-2 gap-2">
        {((
          ['name', 'nameEn', 'direction', 'directionEn', 'dates', 'datesEn'] as const
        ).filter((f) => shouldShowField(f, lang)) as ProjField[]).map((f) => (
          <div key={f} className={f === 'name' || f === 'nameEn' ? 'col-span-2' : ''}>
            {rowInput(f, t.aiProjects[f])}
          </div>
        ))}
      </div>

      {/* Description textarea with MiniToolbar + AI Polish (ZH) */}
      {lang === 'zh' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-text-muted">{t.aiProjects.description}</label>
            <AIPolishButton onClick={handleAIPolish} />
          </div>
          <MiniToolbar textareaId={`proj-desc-zh-${p.id}`} />
          <textarea
            id={`proj-desc-zh-${p.id}`}
            value={p.description}
            onChange={(e) => updateProject(p.id, 'description', e.target.value)}
            onKeyDown={handleAutoContinue}
            className="w-full px-2.5 py-2 text-xs border border-border-default rounded-xl bg-white focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-accent-muted/80 resize-y"
            placeholder={`在此输入项目描述，每行一个要点…\n\n按 Enter 换行，编号/符号/横线自动续接`}
            rows={Math.max(4, p.description.split('\n').length + 1)}
            spellCheck={false}
          />
        </div>
      )}

      {/* Description textarea with MiniToolbar + AI Polish (EN) */}
      {lang === 'en' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-text-muted">{t.aiProjects.descriptionEn}</label>
            <AIPolishButton onClick={handleAIPolish} label="AI Polish" />
          </div>
          <MiniToolbar textareaId={`proj-desc-en-${p.id}`} />
          <textarea
            id={`proj-desc-en-${p.id}`}
            value={p.descriptionEn}
            onChange={(e) => updateProject(p.id, 'descriptionEn', e.target.value)}
            onKeyDown={handleAutoContinue}
            className="w-full px-2.5 py-2 text-xs border border-border-default rounded-xl bg-white focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-accent-muted/80 resize-y"
            placeholder={`Enter bullet points, one per line…\n\nPress Enter for a new bullet`}
            rows={Math.max(4, p.descriptionEn.split('\n').length + 1)}
            spellCheck={false}
          />
        </div>
      )}
    </div>
  )
}

/* ── AIProjects Form ── */

export default function AIProjectsForm() {
  const { data, addProject, reorderProjects } = useResumeStore()
  const lang = data.lang
  const t = lang === 'zh' ? zh : en

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = data.aiProjects.findIndex((p) => p.id === active.id)
    const newIndex = data.aiProjects.findIndex((p) => p.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderProjects(oldIndex, newIndex)
    }
  }

  const ids = data.aiProjects.map((p) => p.id)

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {data.aiProjects.map((p, i) => (
              <SortableProjectCard key={p.id} p={p} index={i} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button onClick={addProject} className="text-xs text-brand-primary hover:text-brand-secondary font-bold">{t.aiProjects.addProject}</button>
    </div>
  )
}
