/**
 * Shared MiniToolbar + auto-continue for all long textareas.
 * Imported by SummaryForm, WorkExperienceForm, AIProjectsForm,
 * SelfEvaluationForm, CustomSectionForm, etc.
 */

import React from 'react'

/* ── MiniToolbar ── */

export function MiniToolbar({ textareaId }: { textareaId: string }) {
  const insert = (wrapper: [string, string]) => {
    const el = document.getElementById(textareaId) as HTMLTextAreaElement | null
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = el.value.substring(start, end)
    const replacement = wrapper[0] + selected + wrapper[1]
    el.focus()
    document.execCommand('insertText', false, replacement)
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

/* ── AI Polish Button (standardized style) ── */

export const AI_BTN_CLASS = "px-2.5 py-0.5 text-[11px] rounded-md border border-[#7C3AED]/30 text-[#7C3AED] bg-white hover:bg-[#7C3AED]/[0.08] hover:border-[#7C3AED] inline-flex items-center gap-1 transition-colors shrink-0 whitespace-nowrap"

export function AIPolishButton({ onClick, label = 'AI 润色' }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className={AI_BTN_CLASS} title={label}>
      ✨ {label}
    </button>
  )
}

/* ── Auto-continue on Enter ── */

export function handleAutoContinue(e: React.KeyboardEvent<HTMLTextAreaElement>) {
  if (e.key !== 'Enter') return
  const el = e.currentTarget
  const pos = el.selectionStart
  const value = el.value

  const lineStart = value.lastIndexOf('\n', pos - 1) + 1
  const lineText = value.slice(lineStart, pos)
  const restOfLine = value.slice(pos, value.indexOf('\n', pos) === -1 ? undefined : value.indexOf('\n', pos))

  // Numbered: "1. "
  const numMatch = lineText.match(/^(\s*)(\d+)\.\s/)
  if (numMatch) {
    e.preventDefault()
    const indent = numMatch[1]
    const num = parseInt(numMatch[2], 10)
    const contentAfter = lineText.slice(numMatch[0].length) + restOfLine
    if (contentAfter.trim() === '') {
      el.setSelectionRange(lineStart, lineStart + numMatch[0].length)
      document.execCommand('insertText', false, '')
      return
    }
    const next = `${indent}${num + 1}. `
    document.execCommand('insertText', false, '\n' + next)
    el.setSelectionRange(pos + 1 + next.length, pos + 1 + next.length)
    return
  }

  // Bullet: "• "
  const bulletMatch = lineText.match(/^(\s*)•\s/)
  if (bulletMatch) {
    e.preventDefault()
    const indent = bulletMatch[1]
    const contentAfter = lineText.slice(bulletMatch[0].length) + restOfLine
    if (contentAfter.trim() === '') {
      el.setSelectionRange(lineStart, lineStart + bulletMatch[0].length)
      document.execCommand('insertText', false, '')
      return
    }
    const next = `${indent}• `
    document.execCommand('insertText', false, '\n' + next)
    el.setSelectionRange(pos + 1 + next.length, pos + 1 + next.length)
    return
  }

  // Dash: "- "
  const dashMatch = lineText.match(/^(\s*)- (?!-)/)
  if (dashMatch) {
    e.preventDefault()
    const indent = dashMatch[1]
    const contentAfter = lineText.slice(dashMatch[0].length) + restOfLine
    if (contentAfter.trim() === '') {
      el.setSelectionRange(lineStart, lineStart + dashMatch[0].length)
      document.execCommand('insertText', false, '')
      return
    }
    const next = `${indent}- `
    document.execCommand('insertText', false, '\n' + next)
    el.setSelectionRange(pos + 1 + next.length, pos + 1 + next.length)
    return
  }
}

/* ── Standard textarea class (resizable + focus ring) ── */

export const TEXTAREA_CLASS = "w-full px-2.5 py-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100 resize-y"
