# 简历编辑器 — 第17轮开发指令

> **交付给另一个 AI Bot 执行。** 阅读以下全部内容后开始写代码。
> 项目根目录：`20_PROJECTS/resume-editor/`
> 运行验证：`npm run dev`（必须零报错）

---

## 目标

3 个待办项：
1. Section 可折叠
2. Card 式条目 + @dnd-kit 拖拽排序
3. 编辑面板宽度 420→480px + 预览区背景纹理

---

## 步骤 0：安装依赖

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## 任务 1：Section 可折叠

**文件：** `src/components/EditorPanel.tsx`

1. 顶部 import 加入 `useState`：
   ```tsx
   import { useRef, useState } from 'react'
   ```

2. 组件内第一行加状态：
   ```tsx
   const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
   const toggle = (key: string) => setCollapsed((prev) => {
     const next = new Set(prev)
     next.has(key) ? next.delete(key) : next.add(key)
     return next
   })
   ```

3. 6 个 section 结构改造（以"个人信息"为例，其余 5 个同理）：

   **改造前：**
   ```tsx
   <section>
     <h2 className="...">{t.sections.personalInfo}</h2>
     <PersonalInfoForm />
   </section>
   ```

   **改造后：**
   ```tsx
   <section>
     <button
       onClick={() => toggle('info')}
       className="flex items-center justify-between w-full text-sm font-bold text-gray-800 mb-3 pb-1.5 border-b-2 border-gray-800 tracking-wide cursor-pointer hover:text-brand-primary transition-colors"
     >
       <span>{t.sections.personalInfo}</span>
       <span className={`text-xs transition-transform duration-200 ${collapsed.has('info') ? 'rotate-180' : ''}`}>
         ▾
       </span>
     </button>
     {!collapsed.has('info') && <PersonalInfoForm />}
   </section>
   ```

4. 6 个 section 各自的 key：
   - 个人信息 → `'info'`
   - 个人概述 → `'summary'`
   - 工作经历 → `'work'`
   - AI产品实践 → `'projects'`
   - 教育背景 → `'education'`
   - 专业技能 → `'skills'`

5. 默认全部展开（空 Set），不需要改初始值。

---

## 任务 2：Card 式条目 + @dnd-kit 拖拽排序

### 2a. Store 新增 reorder 方法

**文件：** `src/store/resumeStore.ts`

1. 文件顶部添加工具函数：
   ```typescript
   function arrayMove<T>(arr: T[], from: number, to: number): T[] {
     const clone = [...arr]
     const [item] = clone.splice(from, 1)
     clone.splice(to, 0, item)
     return clone
   }
   ```

2. 在 `interface ResumeStore` 的大括号内，`reset` 之后添加：
   ```typescript
   reorderWork: (fromIndex: number, toIndex: number) => void
   reorderProject: (fromIndex: number, toIndex: number) => void
   reorderEducation: (fromIndex: number, toIndex: number) => void
   ```

3. 在 `create<ResumeStore>((set) => ({` 的实现对象中，找到 `addLanguageEn` 之前的位置，插入：
   ```typescript
   reorderWork: (from, to) =>
     set((s) => ({ data: { ...s.data, workExperience: arrayMove(s.data.workExperience, from, to) } })),
   reorderProject: (from, to) =>
     set((s) => ({ data: { ...s.data, aiProjects: arrayMove(s.data.aiProjects, from, to) } })),
   reorderEducation: (from, to) =>
     set((s) => ({ data: { ...s.data, education: arrayMove(s.data.education, from, to) } })),
   ```

### 2b. 新建 SortableCard 组件

**文件：** `src/components/SortableCard.tsx`（新建）

```tsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableCardProps {
  id: string
  index: number
  onRemove: () => void
  removeLabel: string
  children: React.ReactNode
}

export default function SortableCard({ id, onRemove, removeLabel, children }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-[#4F46E5]"
    >
      {/* Header row: drag handle + remove */}
      <div className="flex items-center justify-between px-2 pt-2 pb-0">
        <button
          {...attributes}
          {...listeners}
          className="text-gray-300 hover:text-gray-600 cursor-grab text-base select-none leading-none px-1"
          title="拖拽排序"
        >
          ⠿
        </button>
        <button onClick={onRemove} className="text-[10px] text-red-400 hover:text-red-600 px-1">
          {removeLabel}
        </button>
      </div>
      {/* Content area */}
      <div className="px-3 pb-3">
        {children}
      </div>
    </div>
  )
}
```

### 2c. 新建 DraggableList 容器组件

**文件：** `src/components/DraggableList.tsx`（新建）

```tsx
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { DragEndEvent } from '@dnd-kit/core'

interface DraggableListProps {
  items: { id: string }[]
  onReorder: (fromIndex: number, toIndex: number) => void
  children: React.ReactNode
}

export default function DraggableList({ items, onReorder, children }: DraggableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(oldIndex, newIndex)
      }
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {children}
        </div>
      </SortableContext>
    </DndContext>
  )
}
```

### 2d. 改造 WorkExperienceForm

**文件：** `src/components/WorkExperienceForm.tsx`

改造要点：
1. 顶部 import 加入 `DraggableList` 和 `SortableCard`
2. 从 store 解构加入 `reorderWork`
3. 最外层用 `<DraggableList>` 包裹
4. 每个工作经历条目用 `<SortableCard>` 包裹，替代原来的 `<div className="p-3 border...">`
5. 移除原来卡片底部的独立删除按钮（已提到 SortableCard 头部）

**改造后完整代码：**

```tsx
import { useResumeStore } from '../store/resumeStore'
import { zh } from '../i18n/zh'
import { en } from '../i18n/en'
import DraggableList from './DraggableList'
import SortableCard from './SortableCard'

type WorkField = 'company' | 'companyEn' | 'role' | 'roleEn' | 'dates' | 'datesEn'

function shouldShowField(f: WorkField, lang: string): boolean {
  if (f.endsWith('En')) return lang === 'en'
  return lang === 'zh'
}

export default function WorkExperienceForm() {
  const {
    data, addWork, removeWork, updateWork,
    addWorkBullet, updateWorkBullet, removeWorkBullet,
    reorderWork,
  } = useResumeStore()
  const lang = data.lang
  const t = lang === 'zh' ? zh : en

  return (
    <div className="space-y-3">
      <DraggableList items={data.workExperience} onReorder={reorderWork}>
        {data.workExperience.map((w, index) => (
          <SortableCard
            key={w.id}
            id={w.id}
            index={index}
            onRemove={() => removeWork(w.id)}
            removeLabel={t.work.removeWork}
          >
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
              <div className="mt-2">
                <label className="block text-[10px] text-gray-400 mb-1">中文描述</label>
                {w.bullets.map((b, i) => (
                  <div key={i} className="flex gap-1 mb-1">
                    <input
                      value={b}
                      onChange={(e) => updateWorkBullet(w.id, i, e.target.value, 'zh')}
                      className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-gray-400"
                      placeholder="描述要点"
                    />
                    {w.bullets.length > 1 && (
                      <button onClick={() => removeWorkBullet(w.id, i, 'zh')} className="text-gray-400 hover:text-red-500 text-xs px-1">✕</button>
                    )}
                  </div>
                ))}
                <button onClick={() => addWorkBullet(w.id, 'zh')} className="text-[10px] text-blue-600 hover:text-blue-800 mt-0.5">{t.work.addBullet}</button>
              </div>
            )}

            {lang === 'en' && (
              <div className="mt-2">
                <label className="block text-[10px] text-gray-400 mb-1">English Description</label>
                {w.bulletsEn.map((b, i) => (
                  <div key={i} className="flex gap-1 mb-1">
                    <input
                      value={b}
                      onChange={(e) => updateWorkBullet(w.id, i, e.target.value, 'en')}
                      className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-gray-400"
                      placeholder="Bullet point"
                    />
                    {w.bulletsEn.length > 1 && (
                      <button onClick={() => removeWorkBullet(w.id, i, 'en')} className="text-gray-400 hover:text-red-500 text-xs px-1">✕</button>
                    )}
                  </div>
                ))}
                <button onClick={() => addWorkBullet(w.id, 'en')} className="text-[10px] text-blue-600 hover:text-blue-800 mt-0.5">{t.work.addBullet}</button>
              </div>
            )}
          </SortableCard>
        ))}
      </DraggableList>

      <button onClick={addWork} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
        {t.work.addWork}
      </button>
    </div>
  )
}
```

### 2e. 改造 EducationForm

**文件：** `src/components/EducationForm.tsx`

改造模式与 WorkExperienceForm 完全一致：

1. import 加入 `DraggableList` 和 `SortableCard`
2. 解构加入 `reorderEducation`
3. 外层用 `<DraggableList items={data.education} onReorder={reorderEducation}>`
4. 每个条目用 `<SortableCard key={e.id} id={e.id} index={index} onRemove={() => removeEducation(e.id)} removeLabel={t.education.removeEducation}>`
5. 移除原来卡片底部的 `<button onClick={() => removeEducation(e.id)}>` 行
6. 移除原来的 `<div className="p-3 border border-gray-200 rounded-lg space-y-2">` 外层容器

（代码结构与 WorkExperienceForm 完全对齐，替换字段名：education/removeEducation/addEducation/reorderEducation/t.education 即可）

### 2f. 改造 AIProjectsForm

**文件：** `src/components/AIProjectsForm.tsx`

同上模式：

1. import 加入 `DraggableList` 和 `SortableCard`
2. 解构加入 `reorderProject`
3. 外层用 `<DraggableList items={data.aiProjects} onReorder={reorderProject}>`
4. 每个条目用 `<SortableCard key={p.id} id={p.id} index={index} onRemove={() => removeProject(p.id)} removeLabel={t.aiProjects.removeProject}>`
5. 移除原来卡片底部的 `<button onClick={() => removeProject(p.id)}>` 行
6. 移除原来的 `<div className="p-3 border...">` 外层容器

---

## 任务 3：编辑面板宽度 + 预览区背景纹理

### 3a. 编辑面板宽度

**文件：** `src/components/EditorPanel.tsx`

找到 `<aside className="w-[420px]...">` → 改为 `w-[480px]`

### 3b. 预览区背景纹理

**文件：** `src/index.css`

在 `@layer components` 内的 `.preview-a4` 规则之后添加：

```css
.bg-page-texture {
  background-color: #F6F8FB;
  background-image: radial-gradient(circle, #CBD5E1 1px, transparent 1px);
  background-size: 20px 20px;
}
```

**文件：** `src/components/ResumePreview.tsx`

第 21 行附近，将外层 div 的 `bg-bg-page` 替换为 `bg-page-texture`：

```tsx
// 改前
<div className="flex justify-center p-lg xl:p-xl min-h-full bg-bg-page">

// 改后
<div className="flex justify-center p-lg xl:p-xl min-h-full bg-page-texture">
```

---

## 验收标准

1. `npm run dev` — 零报错，终端输出无红色
2. 编辑面板每个 Section 标题右侧有 `▾` 图标，点击可折叠/展开
3. 工作经历/教育背景/AI项目 条目改为白色圆角卡片，左侧有紫色 accent bar，hover 有 shadow
4. 每个卡片右上角有 `⠿` 拖拽手柄，可上下拖动排序
5. 拖拽排序后，右侧预览区内容顺序实时更新
6. 编辑面板宽度变为 480px
7. 预览区背景显示 20px 间距的点阵纹理，A4 白卡浮在上面

---

## 修改文件清单

| 文件 | 操作 |
|---|---|
| `package.json` | `npm install` 后自动新增 @dnd-kit 三个依赖 |
| `src/store/resumeStore.ts` | 新增 `arrayMove` 函数 + `reorderWork/reorderProject/reorderEducation` |
| `src/components/SortableCard.tsx` | **新建** |
| `src/components/DraggableList.tsx` | **新建** |
| `src/components/EditorPanel.tsx` | Section 折叠 + 宽度 480px |
| `src/components/WorkExperienceForm.tsx` | DraggableList + SortableCard 改造 |
| `src/components/EducationForm.tsx` | DraggableList + SortableCard 改造 |
| `src/components/AIProjectsForm.tsx` | DraggableList + SortableCard 改造 |
| `src/components/ResumePreview.tsx` | 背景纹理 class 名替换 |
| `src/index.css` | 新增 `.bg-page-texture` 样式 |

10 个文件，全部变更已在上方给出具体代码。
