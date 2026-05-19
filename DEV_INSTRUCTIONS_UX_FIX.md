# 简历编辑器 — 布局居中 + 经历文本编辑框

> **交付给 @Dev 执行。** 阅读完开始写代码。
> 项目根目录：`20_PROJECTS/resume-editor/`

---

## 背景

用户反馈两个体验问题：

1. **编辑区域太靠左**：左侧编辑面板贴着浏览器左边缘，需要向中间移动，增加左侧留白
2. **经历描述编辑体验差**：当前一条经历用多个 `<input>` 逐条编辑 bullet，单行无换行，写长了看不到前面内容。需要改为一个大的文本编辑框 + 格式化工具

---

## 任务 1：布局居中 — 编辑区增加左侧留白

**文件：** `src/App.tsx`

将 `EditorPanel + PreviewPanel` 的 flex 容器改为居中布局，添加左侧 padding。

当前代码（第 49 行附近）：
```tsx
<div className="flex-1 flex overflow-hidden">
  <EditorPanel />
  <PreviewPanel />
</div>
```

改为：
```tsx
<div className="flex-1 flex overflow-hidden justify-center bg-gray-50">
  <div className="flex w-full max-w-[1440px]">
    <EditorPanel />
    <PreviewPanel />
  </div>
</div>
```

效果：
- 宽屏时编辑区 + 预览区整体居中，两侧对称留白
- 窄于 1440px 时自动顶满（自适应）
- 不影响 AIPanel（它是 fixed 定位，独立于布局流）

---

## 任务 2：经历描述 — 文本编辑框替代逐条输入

**文件：** `src/components/WorkExperienceForm.tsx`

### 2.1 新增 MiniToolbar 组件

在 `WorkExperienceForm.tsx` 中（放在 `SortableWorkCard` 之前），新增一个迷你工具栏组件：

```tsx
function MiniToolbar({ textareaId }: { textareaId: string }) {
  const insert = (wrapper: [string, string]) => {
    const el = document.getElementById(textareaId) as HTMLTextAreaElement | null
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = el.value.substring(start, end)
    const replacement = wrapper[0] + selected + wrapper[1]
    el.focus()
    document.execCommand('insertText', false, replacement)
    // 选中刚插入的内容（不包含包裹符）
    setTimeout(() => {
      el.setSelectionRange(start + wrapper[0].length, start + replacement.length - wrapper[1].length)
    })
  }

  const insertBol = (prefix: string) => {
    const el = document.getElementById(textareaId) as HTMLTextAreaElement | null
    if (!el) return
    el.focus()
    const pos = el.selectionStart
    const before = el.value.lastIndexOf('\n', pos - 1)
    const lineStart = before === -1 ? 0 : before + 1
    el.setSelectionRange(lineStart, lineStart)
    document.execCommand('insertText', false, prefix)
    el.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length)
  }

  const btn = "h-6 px-2 rounded text-[10px] font-medium text-gray-500 hover:text-[#4F46E5] hover:bg-indigo-50 transition-colors select-none"

  return (
    <div className="flex items-center gap-0.5 mb-1.5">
      <button type="button" onClick={() => insert(['**', '**'])} className={btn} title="加粗">
        <strong>B</strong>
      </button>
      <span className="w-px h-3 bg-gray-200" />
      <button type="button" onClick={() => insertBol('• ')} className={btn} title="项目符号">
        • List
      </button>
      <button type="button" onClick={() => insertBol('1. ')} className={btn} title="编号列表">
        1. Num
      </button>
      <button type="button" onClick={() => insertBol('- ')} className={btn} title="短横线">
        — Dash
      </button>
    </div>
  )
}
```

### 2.2 修改 SortableWorkCard

替换掉原来逐条 `<input>` 编辑 bullet 的部分（中文 bullet 区和英文 bullet 区），改为一个 `textarea`。

找到中文描述部分（约第 69-83 行）：
```tsx
{lang === 'zh' && (
  <div>
    <label className="block text-[10px] text-gray-400 mb-1">中文描述</label>
    {w.bullets.map((b, i) => (
      <div key={i} className="flex gap-1 mb-1">
        <input ... />
        ...
      </div>
    ))}
    <button onClick={() => addWorkBullet(w.id, 'zh')}>...</button>
  </div>
)}
```

改为：
```tsx
{lang === 'zh' && (
  <div>
    <label className="block text-[10px] text-gray-400 mb-1">中文描述</label>
    <MiniToolbar textareaId={`bullets-zh-${w.id}`} />
    <textarea
      id={`bullets-zh-${w.id}`}
      value={w.bullets.join('\n')}
      onChange={(e) => {
        const lines = e.target.value.split('\n')
        // 同步更新 bullets 数组
        const currentBullets = [...w.bullets]
        // 差异更新：逐行对比
        for (let i = 0; i < Math.max(lines.length, currentBullets.length); i++) {
          if (i < lines.length && i < currentBullets.length) {
            if (lines[i] !== currentBullets[i]) {
              updateWorkBullet(w.id, i, lines[i], 'zh')
            }
          } else if (i < lines.length) {
            addWorkBullet(w.id, 'zh')
            // 需要再更新内容（add 后新 bullet 为空）
            setTimeout(() => updateWorkBullet(w.id, i, lines[i], 'zh'), 0)
          } else {
            removeWorkBullet(w.id, i, 'zh')
          }
        }
      }}
      className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100 resize-y"
      placeholder="描述要点，每行一个要点…&#10;按 Enter 换行添加新要点&#10;&#10;提示：选中文字后点 B 加粗"
      rows={Math.max(3, w.bullets.length + 1)}
      spellCheck={false}
    />
  </div>
)}
```

**⚠️ 重要：** 上面的 onChange 逐条对比方案**有 bug**。当用户编辑第一行时删除字符，lines 数量不变，但如果不小心删了换行符，行数会变。而且 `setTimeout` 不可靠。

**推荐方案：先简单处理 — 存为纯文本字符串，不拆数组：**

实际上，用户的核心需求是「能在一个框里看到全部内容 + 能换行」。最简单可靠的做法是：

1. 在 textarea 中，用换行符分隔各要点
2. onChange 直接对整个 textarea value 做处理
3. 需要修改 store 来支持「设置整段 bullets」

让我重新设计更可靠的方案：

```tsx
// SortableWorkCard 内，中文描述区
{lang === 'zh' && (
  <div>
    <label className="block text-[10px] text-gray-400 mb-1">中文描述</label>
    <MiniToolbar textareaId={`bullets-zh-${w.id}`} />
    <textarea
      id={`bullets-zh-${w.id}`}
      value={w.bullets.join('\n')}
      onChange={(e) => updateWork(w.id, 'bullets', e.target.value)}
      className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100 resize-y font-mono"
      placeholder="要点 1&#10;要点 2&#10;要点 3"
      rows={Math.max(3, w.bullets.length + 1)}
      spellCheck={false}
    />
  </div>
)}
```

但 `updateWork` 当前签名的 field 参数类型是 `WorkField`，不包含 `'bullets'`。

需要扩展 `updateWork` 来支持字符串赋值给 bullets。

**更简单的方案：** 直接在 store 里添加一个 `setWorkBullets` 方法。

---

**最终推荐方案（选这个！）：**

### 2.3 修改 resumeStore — 添加 setWorkBullets

**文件：** `src/store/resumeStore.ts`

找到 `updateWork` 方法的类型签名和实现。在 store interface 和实现中添加：

```typescript
// Interface 中添加：
setWorkBullets: (id: string, bulletsText: string, lang: 'zh' | 'en') => void

// 实现：
setWorkBullets: (id, bulletsText, lang) => {
  set((s) => {
    const list = [...s.data.workExperience]
    const idx = list.findIndex((w) => w.id === id)
    if (idx === -1) return s
    const entry = { ...list[idx] }
    const lines = bulletsText.split('\n')
    if (lang === 'zh') {
      entry.bullets = lines
    } else {
      entry.bulletsEn = lines
    }
    list[idx] = entry
    return { data: { ...s.data, workExperience: list } }
  })
},
```

### 2.4 修改 SortableWorkCard

用 textarea 替代逐条 input：

**中文描述区（替换约第 69-83 行）：**
```tsx
{lang === 'zh' && (
  <div>
    <label className="block text-[10px] text-gray-400 mb-1">中文描述</label>
    <MiniToolbar textareaId={`bullets-zh-${w.id}`} />
    <textarea
      id={`bullets-zh-${w.id}`}
      value={w.bullets.join('\n')}
      onChange={(e) => setWorkBullets(w.id, e.target.value, 'zh')}
      className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100 resize-y"
      placeholder={`在此输入工作描述，每行一个要点…\n\n按 Enter 换行添加新要点\n选中文字后点上方 B 按钮加粗`}
      rows={Math.max(4, w.bullets.length + 1)}
      spellCheck={false}
    />
  </div>
)}
```

**英文描述区（同理替换）：**
```tsx
{lang === 'en' && (
  <div>
    <label className="block text-[10px] text-gray-400 mb-1">English Description</label>
    <MiniToolbar textareaId={`bullets-en-${w.id}`} />
    <textarea
      id={`bullets-en-${w.id}`}
      value={w.bulletsEn.join('\n')}
      onChange={(e) => setWorkBullets(w.id, e.target.value, 'en')}
      className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100 resize-y"
      placeholder="Enter bullet points, one per line…&#10;&#10;Press Enter for a new bullet&#10;Select text and click B to bold"
      rows={Math.max(4, w.bulletsEn.length + 1)}
      spellCheck={false}
    />
  </div>
)}
```

**在 SortableWorkCard 顶部解构添加 `setWorkBullets`：**
```tsx
const { data, removeWork, updateWork, setWorkBullets } = useResumeStore()
```

（原来有 `addWorkBullet`, `updateWorkBullet`, `removeWorkBullet` — 现在不需要这三个了，可以从解构中移除。但保留也无害，不用特意删除。）

---

## 验收标准

1. **`npm run dev` — 零报错**（Vite 正常启动）
2. **`npx tsc --noEmit` — 零 TypeScript 错误**
3. **布局**：编辑区内侧有留白，宽屏下编辑区+预览区居中
4. **经历编辑**：每条经历卡片中，描述区是一个 textarea（不是逐条 input）
5. **mini 工具栏**：textarea 上方有 B / • / 1. / — 四个按钮
6. **加粗**：选中文字点 B，文字被 `**text**` 包裹
7. **项目符号**：光标所在行首插入 `• ` / `1. ` / `- `
8. **换行**：在 textarea 中按 Enter 产生新行，内容实时反映到 bullets 数组
9. **预览区**：预览面板中的 bullet 列表仍然正常显示（因为 bullets 数组数据未变）

---

## 文件清单

| 文件 | 操作 |
|------|------|
| `src/App.tsx` | 修改 — 布局居中 |
| `src/components/WorkExperienceForm.tsx` | 修改 — 添加 MiniToolbar + 替换 bullet inputs 为 textarea |
| `src/store/resumeStore.ts` | 修改 — 添加 `setWorkBullets` 方法 |
