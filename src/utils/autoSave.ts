import { useEffect, useRef } from 'react'
import { useResumeStore } from '../store/resumeStore'
import { saveDraft } from './storage'
import type { ResumeData } from '../types/resume'

const AUTO_SAVE_DELAY = 2000
const AUTO_SAVE_DRAFT_ID = 'auto-save'
const AUTO_SAVE_DRAFT_NAME = '自动保存'

/** Simple hash for detecting data changes */
function hashData(data: ResumeData): string {
  return JSON.stringify(data)
}

/**
 * Debounced auto-save hook:
 * - Watches store data for changes
 * - After 2s of inactivity, saves to IndexedDB under a reserved draft id
 * - Only saves when data has actually changed since last save
 */
export function useAutoSave() {
  const data = useResumeStore((s) => s.data)
  const lastSavedHash = useRef<string>('')
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    const currentHash = hashData(data)

    // Skip if nothing changed from last save
    if (currentHash === lastSavedHash.current) return

    // Skip if all fields are empty (fresh state)
    const isEmpty = !data.personalInfo.name &&
      !data.personalInfo.email &&
      !data.summary &&
      data.workExperience.length === 0 &&
      data.aiProjects.length === 0 &&
      data.education.length === 0 &&
      data.skills.length === 0
    if (isEmpty) return

    // Debounce: clear previous timer, set new one
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        await saveDraft(AUTO_SAVE_DRAFT_ID, AUTO_SAVE_DRAFT_NAME, dataRef.current)
        lastSavedHash.current = hashData(dataRef.current)
        console.log('[auto-save] saved')
      } catch (e) {
        console.error('[auto-save] failed:', e)
      }
    }, AUTO_SAVE_DELAY)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [data])
}
