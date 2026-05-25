import { useResumeStore } from '../store/resumeStore'
import { zh } from '../i18n/zh'
import { en } from '../i18n/en'
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

type EduField = 'school' | 'schoolEn' | 'degree' | 'degreeEn' | 'major' | 'majorEn' | 'dates' | 'datesEn'

function shouldShowField(f: EduField, lang: string): boolean {
  if (f.endsWith('En')) return lang === 'en'
  return lang === 'zh'
}

function SortableEduCard({ e, index }: { e: ReturnType<typeof useResumeStore.getState>['data']['education'][number]; index: number }) {
  const { data, removeEducation, updateEducation, addEduHighlight, updateEduHighlight, removeEduHighlight } = useResumeStore()
  const lang = data.lang
  const t = lang === 'zh' ? zh : en

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: e.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 border border-border-default rounded-2xl bg-bg-hover/60 space-y-2 hover:shadow-sm hover:bg-white transition-all relative group sortable-item ${isDragging ? 'dragging' : ''}`}
    >
      <div className="flex items-center justify-between">
        <button {...attributes} {...listeners} className="drag-handle text-text-muted/50 hover:text-text-secondary text-sm px-0.5 select-none" title="拖拽排序">
          ⠿
        </button>
        <button onClick={() => removeEducation(e.id)} className="text-text-muted/50 hover:text-red-500 text-sm leading-none opacity-0 group-hover:opacity-100 transition-opacity" title={t.education.removeEducation}>
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {((
          ['school', 'schoolEn', 'degree', 'degreeEn', 'major', 'majorEn', 'dates', 'datesEn'] as const
        ).filter((f) => shouldShowField(f, lang)) as EduField[]).map((f) => (
          <div key={f} className={f === 'school' || f === 'schoolEn' ? 'col-span-2' : ''}>
            <label className="block text-[10px] text-text-muted mb-0.5">{t.education[f]}</label>
            <input
              value={e[f]}
              onChange={(ev) => updateEducation(e.id, f, ev.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-border-default rounded-xl bg-white focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-accent-muted/80"
              placeholder={t.education[f]}
            />
          </div>
        ))}
      </div>

      {lang === 'zh' && (
        <div>
          <label className="block text-[10px] text-text-muted mb-1">中文亮点</label>
          {e.highlights.map((h, i) => (
            <div key={i} className="flex gap-1 mb-1">
              <input value={h} onChange={(ev) => updateEduHighlight(e.id, i, ev.target.value, 'zh')} className="flex-1 px-2.5 py-2 text-xs border border-border-default rounded-xl bg-white focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-accent-muted/80" placeholder="亮点" />
              {e.highlights.length > 1 && <button onClick={() => removeEduHighlight(e.id, i, 'zh')} className="text-gray-400 hover:text-red-500 text-xs px-1">✕</button>}
            </div>
          ))}
          <button onClick={() => addEduHighlight(e.id, 'zh')} className="text-[10px] text-brand-primary hover:text-brand-secondary mt-0.5 font-bold">{t.education.addHighlight}</button>
        </div>
      )}
      {lang === 'en' && (
        <div>
          <label className="block text-[10px] text-text-muted mb-1">English Highlights</label>
          {e.highlightsEn.map((h, i) => (
            <div key={i} className="flex gap-1 mb-1">
              <input value={h} onChange={(ev) => updateEduHighlight(e.id, i, ev.target.value, 'en')} className="flex-1 px-2.5 py-2 text-xs border border-border-default rounded-xl bg-white focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-accent-muted/80" placeholder="Highlight" />
              {e.highlightsEn.length > 1 && <button onClick={() => removeEduHighlight(e.id, i, 'en')} className="text-gray-400 hover:text-red-500 text-xs px-1">✕</button>}
            </div>
          ))}
          <button onClick={() => addEduHighlight(e.id, 'en')} className="text-[10px] text-brand-primary hover:text-brand-secondary mt-0.5 font-bold">{t.education.addHighlight}</button>
        </div>
      )}
    </div>
  )
}

export default function EducationForm() {
  const { data, addEducation, reorderEducation } = useResumeStore()
  const lang = data.lang
  const t = lang === 'zh' ? zh : en

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = data.education.findIndex((e) => e.id === active.id)
    const newIndex = data.education.findIndex((e) => e.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderEducation(oldIndex, newIndex)
    }
  }

  const ids = data.education.map((e) => e.id)

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {data.education.map((e, i) => (
              <SortableEduCard key={e.id} e={e} index={i} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button onClick={addEducation} className="text-xs text-brand-primary hover:text-brand-secondary font-bold">{t.education.addEducation}</button>
    </div>
  )
}
