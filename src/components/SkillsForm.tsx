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

function SortableSkillCard({ sk, i }: { sk: ReturnType<typeof useResumeStore.getState>['data']['skills'][number]; i: number }) {
  const { data, removeSkill, updateSkill } = useResumeStore()
  const lang = data.lang
  const t = lang === 'zh' ? zh : en

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `skill-${i}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid grid-cols-2 gap-2 p-3 border border-gray-200 rounded-lg hover:shadow-sm hover:border-gray-300 transition-all relative group sortable-item ${isDragging ? 'dragging' : ''}`}
    >
      <div className="col-span-2 flex items-center justify-between">
        <button {...attributes} {...listeners} className="drag-handle text-gray-300 hover:text-gray-500 text-sm px-0.5 select-none" title="拖拽排序">
          ⠿
        </button>
        <button onClick={() => removeSkill(i)} className="text-gray-300 hover:text-red-500 text-sm leading-none opacity-0 group-hover:opacity-100 transition-opacity" title={t.skills.removeSkill}>
          ✕
        </button>
      </div>

      {lang === 'zh' && (
        <>
          <div>
            <label className="block text-[10px] text-gray-400 mb-0.5">{t.skills.category}</label>
            <input value={sk.category} onChange={(e) => updateSkill(i, 'category', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-gray-400" placeholder={t.skills.category} />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] text-gray-400 mb-0.5">{t.skills.items}</label>
            <input value={sk.items} onChange={(e) => updateSkill(i, 'items', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-gray-400" placeholder={t.skills.items} />
          </div>
        </>
      )}
      {lang === 'en' && (
        <>
          <div>
            <label className="block text-[10px] text-gray-400 mb-0.5">{t.skills.categoryEn}</label>
            <input value={sk.categoryEn} onChange={(e) => updateSkill(i, 'categoryEn', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-gray-400" placeholder={t.skills.categoryEn} />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] text-gray-400 mb-0.5">{t.skills.itemsEn}</label>
            <input value={sk.itemsEn} onChange={(e) => updateSkill(i, 'itemsEn', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-gray-400" placeholder={t.skills.itemsEn} />
          </div>
        </>
      )}
    </div>
  )
}

export default function SkillsForm() {
  const { data, addSkill, reorderSkills } = useResumeStore()
  const lang = data.lang
  const t = lang === 'zh' ? zh : en

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleSkillDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = parseInt(String(active.id).replace('skill-', ''))
    const newIndex = parseInt(String(over.id).replace('skill-', ''))
    if (!isNaN(oldIndex) && !isNaN(newIndex)) {
      reorderSkills(oldIndex, newIndex)
    }
  }

  const skillIds = data.skills.map((_, i) => `skill-${i}`)

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSkillDragEnd}>
        <SortableContext items={skillIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {data.skills.map((sk, i) => (
              <SortableSkillCard key={`skill-${i}`} sk={sk} i={i} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button onClick={addSkill} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
        {t.skills.addSkill}
      </button>
    </div>
  )
}
