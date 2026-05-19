import Dexie, { type Table } from 'dexie'
import type { ResumeData, DraftMeta } from '../types/resume'

interface DraftRecord {
  id: string
  name: string
  data: ResumeData
  createdAt: number
  updatedAt: number
}

class ResumeDB extends Dexie {
  drafts!: Table<DraftRecord, string>

  constructor() {
    super('ResumeEditorDB')
    this.version(2).stores({ drafts: 'id, name, updatedAt' })
  }
}

const db = new ResumeDB()

export async function saveDraft(id: string, name: string, data: ResumeData): Promise<string> {
  const now = Date.now()
  const existing = await db.drafts.get(id)
  if (existing) {
    await db.drafts.update(id, { name, data, updatedAt: now })
  } else {
    await db.drafts.put({ id, name, data, createdAt: now, updatedAt: now })
  }
  return id
}

export async function loadDraft(id: string): Promise<ResumeData | null> {
  const record = await db.drafts.get(id)
  return record?.data ?? null
}

export async function listDrafts(): Promise<DraftMeta[]> {
  const all = await db.drafts.orderBy('updatedAt').reverse().toArray()
  return all.map((d) => ({ id: d.id, name: d.name, updatedAt: d.updatedAt, createdAt: d.createdAt, lang: d.data.lang }))
}

export async function deleteDraft(id: string): Promise<void> {
  await db.drafts.delete(id)
}

export { db }
