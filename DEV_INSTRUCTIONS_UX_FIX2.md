# 简历编辑器 — 三连修复

> **交付给 @Dev 执行。** 阅读完开始写代码。
> 项目根目录：`20_PROJECTS/resume-editor/`

---

## 背景

用户反馈三个问题：

1. **排版重叠**：简历预览区名字和电话信息挤在一起，间距太小
2. **头像不显示**：上传了照片但在预览区看不到
3. **A4 分页不直观**：预览区看起来是一页，实际导出却是两页，需要在预览区显示分页线

---

## 任务 1：修复排版重叠

**文件：** `src/components/ResumePreview.tsx`

当前 name heading 的 `mb-0.5`（2px）太小，jobObjective 的 `mb-1` 也不够。加大间距：

```tsx
// 第 43 行附近，name 标题:
<h1 className="text-heading-1 text-text-primary tracking-tight mb-2">

// 第 47 行附近，job objective:
<p className="text-body font-medium text-brand-primary mb-1.5">
```

把 `mb-0.5` 改为 `mb-2`，把 `mb-1` 改为 `mb-1.5`。

---

## 任务 2：修复头像不显示

**诊断**：代码逻辑正确，但 `pi.photo` 来自 IndexedDB 持久化。如果在添加 `jobObjective` 字段后重新加载了页面，已有的 photo 数据仍然存在。

**可能原因**：`img` 标签无 `alt` 属性导致 Lighthouse/AXE 问题但不影响渲染。真正原因待确认——先保持代码不变，确保 Dev 环境有测试数据。

**文件：** `src/components/ResumePreview.tsx`

在 photo img 标签上添加 `crossOrigin="anonymous"` 以确保 base64 data URL 不会被 CORS 拦截：

```tsx
{pi.photo && (
  <div className="shrink-0">
    <img
      src={pi.photo}
      alt="简历照片"
      className="w-[75px] h-[100px] object-cover rounded border border-gray-200"
    />
  </div>
)}
```

同时检查 `src/components/EditorPanel.tsx` 中照片上传按钮区域，确保 `photoInputRef` 已声明且 `ref` 已绑定：

```tsx
// 需要在组件顶部添加（如果还没有）：
const photoInputRef = useRef<HTMLInputElement>(null)
```

---

## 任务 3：A4 分页预览

**需求**：预览区应该能看出内容在哪处分页，而不是看起来一整页导出却两页。

**方案**：用 JS 测量内容高度，在接近 A4 页面高度处插入分页指示线。

**A4 计算**：
- A4 尺寸：210mm × 297mm
- PDF 页边距（page padding）：40px
- 可打印高度约：297mm - 80px ≈ 1043px（96dpi）
- 预览区 `max-w-[210mm]` ≈ 794px 宽，等比例缩放
- 实际可用高度：约 1000px

**文件：** `src/components/ResumePreview.tsx`

添加分页指示逻辑：

### 3.1 添加 import 和 ref

在文件顶部添加：
```tsx
import { useRef, useEffect, useState } from 'react'
```

### 3.2 添加分页逻辑

在 `ResumePreview` 组件内，`return` 之前添加：

```tsx
const contentRef = useRef<HTMLDivElement>(null)
const [pageBreaks, setPageBreaks] = useState<number[]>([])

// A4 可打印高度（96dpi 下近似值）
const A4_PRINTABLE_HEIGHT = 1000

useEffect(() => {
  const el = contentRef.current
  if (!el) return
  
  const observer = new ResizeObserver(() => {
    const totalHeight = el.scrollHeight
    const breaks: number[] = []
    for (let h = A4_PRINTABLE_HEIGHT; h < totalHeight; h += A4_PRINTABLE_HEIGHT) {
      breaks.push(h)
    }
    setPageBreaks(breaks)
  })
  
  observer.observe(el)
  return () => observer.disconnect()
}, [data]) // re-measure when data changes
```

### 3.3 在 JSX 中添加分页线

在内容区最外层 div 上绑定 ref，并在底部添加分页指示：

找到 `<div className="w-full max-w-[210mm] ...">` 这一行，添加 `ref={contentRef}`：

```tsx
<div ref={contentRef} className="w-full max-w-[210mm] bg-bg-card shadow-lg rounded-sm p-xl xl:p-2xl font-sans relative">
```

在内容底部（`</div>` 关闭前，最后一个 section 之后）添加：

```tsx
{/* Page break indicators */}
{pageBreaks.length > 0 && (
  <div className="absolute left-0 right-0 pointer-events-none" style={{ top: 0 }}>
    {pageBreaks.map((y, i) => (
      <div
        key={i}
        className="absolute left-0 right-0 flex items-center gap-2"
        style={{ top: y - 12 }}
      >
        <div className="flex-1 h-px bg-dashed border-t-2 border-dashed border-gray-300" />
        <span className="text-[10px] font-medium text-gray-400 bg-white/80 px-2 py-0.5 rounded-full">
          第 {i + 2} 页
        </span>
        <div className="flex-1 h-px border-t-2 border-dashed border-gray-300" />
      </div>
    ))}
  </div>
)}
```

---

## 验收标准

1. `npm run dev` — 零报错
2. `npx tsc --noEmit` — 零错误
3. 名字和电话之间有足够间距，不重叠
4. 上传的照片在预览区可见
5. 内容超过 A4 一页时，预览区出现虚线分页标识「第 2 页」「第 3 页」

---

## 文件清单

| 文件 | 操作 |
|------|------|
| `src/components/ResumePreview.tsx` | 修改 — 间距、头像、分页线 |
| `src/components/EditorPanel.tsx` | 检查 — photoInputRef 绑定 |
