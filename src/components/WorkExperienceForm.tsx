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

type WorkField = 'company' | 'companyEn' | 'role' | 'roleEn' | 'dates' | 'datesEn'

function shouldShowField(f: WorkField, lang: string): boolean {
  if (f.endsWith('En')) return lang === 'en'
  return lang === 'zh'
}

/* ── Sortable Work Card ── */

function SortableWorkCard({ w, index }: { w: ReturnType<typeof useResumeStore.getState>['data']['workExperience'][number]; index: number }) {
  const { data, removeWork, updateWork, setWorkBullets } = useResumeStore()
  const { openPanel, setActiveTab, selectExperience } = useAIStore()
  const lang = data.lang
  const t = lang === 'zh' ? zh : en

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: w.id })

  const handleAIPolish = useCallback(() => {
    selectExperience(w.id)
    setActiveTab('polish')
    openPanel()
  }, [w.id, selectExperience, setActiveTab, openPanel])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 border border-gray-200 rounded-lg space-y-2 hover:shadow-sm hover:border-gray-300 transition-all relative group sortable-item ${isDragging ? 'dragging' : ''}`}
    >
      {/* Drag handle + delete */}
      <div className="flex items-center justify-between">
        <button {...attributes} {...listeners} className="drag-handle text-gray-300 hover:text-gray-500 text-sm px-0.5 select-none" title={t.work.dragToReorder ?? '拖拽排序'}>
          ⠿
        </button>
        <button onClick={() => removeWork(w.id)} className="text-gray-300 hover:text-red-500 text-sm leading-none opacity-0 group-hover:opacity-100 transition-opacity" title={t.work.removeWork}>
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {((
          ['company', 'companyEn', 'role', 'roleEn', 'dates', 'datesEn'] as const
        ).filter((f) => shouldShowField(f, lang)) as WorkField[]).map((f) => (
          <div key={f} className={f === 'company' || f === 'companyEn' ? 'col-span-2' : ''}>
            <label className="block text-[10px] text-gray-400 mb-0.5">{t.work[f]}</label>
            <input
              value={w[f]}
              onChange={(e) => updateWork(w.id, f, e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-gray-400"
              placeholder={t.work[f]}
            />
          </div>
        ))}
      </div>

      {lang === 'zh' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-gray-400">中文描述</label>
            <AIPolishButton onClick={handleAIPolish} />
          </div>
          <MiniToolbar textareaId={`bullets-zh-${w.id}`} />
          <textarea
            id={`bullets-zh-${w.id}`}
            value={w.bullets.join('\n')}
            onChange={(e) => setWorkBullets(w.id, e.target.value, 'zh')}
            onKeyDown={handleAutoContinue}
            className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100 resize-y"
            placeholder={`在此输入工作描述，每行一个要点…\n\n按 Enter 换行，编号/符号/横线自动续接`}
            rows={Math.max(4, w.bullets.length + 1)}
            spellCheck={false}
          />
        </div>
      )}

      {lang === 'en' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-gray-400">English Description</label>
            <AIPolishButton onClick={handleAIPolish} label="AI Polish" />
          </div>
          <MiniToolbar textareaId={`bullets-en-${w.id}`} />
          <textarea
            id={`bullets-en-${w.id}`}
            value={w.bulletsEn.join('\n')}
            onChange={(e) => setWorkBullets(w.id, e.target.value, 'en')}
            onKeyDown={handleAutoContinue}
            className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100 resize-y"
            placeholder={`Enter bullet points, one per line…\n\nPress Enter for a new bullet`}
            rows={Math.max(4, w.bulletsEn.length + 1)}
            spellCheck={false}
          />
        </div>
      )}
    </div>
  )
}

export default function WorkExperienceForm() {
  const { data, addWork, reorderWork } = useResumeStore()
  const lang = data.lang
  const t = lang === 'zh' ? zh : en

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = data.workExperience.findIndex((w) => w.id === active.id)
    const newIndex = data.workExperience.findIndex((w) => w.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderWork(oldIndex, newIndex)
    }
  }

  const ids = data.workExperience.map((w) => w.id)

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {data.workExperience.map((w, i) => (
              <SortableWorkCard key={w.id} w={w} index={i} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button onClick={addWork} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
        {t.work.addWork}
      </button>
    </div>
  )
}
