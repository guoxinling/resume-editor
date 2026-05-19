import { create } from 'zustand'
import type { ResumeData, WorkEntry, AIProject, Education, SkillItem, Lang, SectionKey, CustomField, CustomSection } from '../types/resume'
import { BUILTIN_SECTIONS } from '../types/resume'

const emptyResume: ResumeData = {
  personalInfo: { name: '', nameEn: '', phone: '', email: '', location: '', locationEn: '', portfolio: '', age: '', photo: '', jobObjective: '', jobObjectiveEn: '', customFields: [] },
  summary: '',
  summaryEn: '',
  workExperience: [],
  aiProjects: [],
  education: [],
  skills: [],
  languages: [],
  languagesEn: [],
  selfEvaluation: '',
  selfEvaluationEn: '',
  customSections: [],
  lang: 'zh',
}

interface ResumeStore {
  data: ResumeData
  draftId: string | null
  draftName: string
  // Section order (editor layout) — includes built-in + custom keys
  sectionOrder: string[]
  setSectionOrder: (order: string[]) => void
  hideSection: (key: string) => void
  showSection: (key: string) => void
  // Section display labels (user can rename built-in sections)
  sectionLabels: Record<string, { zh: string; en: string }>
  setSectionLabel: (key: string, lang: 'zh' | 'en', value: string) => void
  // resume data methods
  setLang: (lang: Lang) => void
  setDraftInfo: (id: string | null, name: string) => void
  loadData: (data: ResumeData) => void
  reset: () => void
  // personal info
  setPersonalInfo: (field: string, value: string) => void
  addCustomField: () => void
  updateCustomField: (index: number, field: keyof CustomField, value: string) => void
  removeCustomField: (index: number) => void
  // summary
  setSummary: (value: string) => void
  setSummaryEn: (value: string) => void
  // work experience
  addWork: () => void
  removeWork: (id: string) => void
  reorderWork: (from: number, to: number) => void
  updateWork: (id: string, field: string, value: any) => void
  addWorkBullet: (id: string, lang: 'zh' | 'en') => void
  updateWorkBullet: (id: string, idx: number, value: string, lang: 'zh' | 'en') => void
  removeWorkBullet: (id: string, idx: number, lang: 'zh' | 'en') => void
  setWorkBullets: (id: string, bulletsText: string, lang: 'zh' | 'en') => void
  // ai projects
  addProject: () => void
  removeProject: (id: string) => void
  reorderProjects: (from: number, to: number) => void
  updateProject: (id: string, field: string, value: string) => void
  // education
  addEducation: () => void
  removeEducation: (id: string) => void
  reorderEducation: (from: number, to: number) => void
  updateEducation: (id: string, field: string, value: string) => void
  addEduHighlight: (id: string, lang: 'zh' | 'en') => void
  updateEduHighlight: (id: string, idx: number, value: string, lang: 'zh' | 'en') => void
  removeEduHighlight: (id: string, idx: number, lang: 'zh' | 'en') => void
  // skills
  addSkill: () => void
  removeSkill: (idx: number) => void
  reorderSkills: (from: number, to: number) => void
  updateSkill: (idx: number, field: string, value: string) => void
  // languages
  addLanguage: () => void
  updateLanguage: (idx: number, value: string) => void
  removeLanguage: (idx: number) => void
  addLanguageEn: () => void
  updateLanguageEn: (idx: number, value: string) => void
  removeLanguageEn: (idx: number) => void
  // self evaluation
  setSelfEvaluation: (value: string) => void
  setSelfEvaluationEn: (value: string) => void
  // custom sections
  addCustomSection: (label: string, labelEn: string) => void
  removeCustomSection: (id: string) => void
  updateCustomSection: (id: string, field: 'label' | 'labelEn' | 'content' | 'contentEn', value: string) => void
  // AI translation
  applyTranslation: (result: Record<string, any>) => void
  translateLoading: boolean
  translateError: string | null
  setTranslateLoading: (loading: boolean) => void
  setTranslateError: (error: string | null) => void
}

let idCounter = 1
const genId = () => String(Date.now()) + '-' + (idCounter++)

export const useResumeStore = create<ResumeStore>((set) => ({
  data: { ...emptyResume },
  draftId: null,
  draftName: '',
  sectionOrder: [...BUILTIN_SECTIONS],
  sectionLabels: {
    personalInfo: { zh: '个人信息', en: 'Personal Info' },
    summary: { zh: '个人概述', en: 'Summary' },
    workExperience: { zh: '工作经历', en: 'Work Experience' },
    aiProjects: { zh: '项目经历', en: 'Projects' },
    education: { zh: '教育背景', en: 'Education' },
    skills: { zh: '专业技能', en: 'Skills' },
    languages: { zh: '语言能力', en: 'Languages' },
    selfEvaluation: { zh: '自我评价', en: 'Self Evaluation' },
  },

  setSectionOrder: (order) => set({ sectionOrder: order }),
  setSectionLabel: (key, lang, value) =>
    set((s) => ({
      sectionLabels: {
        ...s.sectionLabels,
        [key]: { ...(s.sectionLabels[key] || { zh: '', en: '' }), [lang]: value },
      },
    })),
  hideSection: (key) =>
    set((s) => ({ sectionOrder: s.sectionOrder.filter((k) => k !== key) })),
  showSection: (key) =>
    set((s) => {
      if (s.sectionOrder.includes(key)) return s
      return { sectionOrder: [...s.sectionOrder, key] }
    }),

  setLang: (lang) => set((s) => ({ data: { ...s.data, lang } })),
  setDraftInfo: (id, name) => set({ draftId: id, draftName: name }),
  loadData: (data) => set({ data }),
  reset: () => {
    import('../utils/storage').then(({ deleteDraft }) => {
      deleteDraft('auto-save').catch(() => {})
    })
    set({ data: { ...emptyResume }, draftId: null, draftName: '' })
  },

  setPersonalInfo: (field, value) =>
    set((s) => ({ data: { ...s.data, personalInfo: { ...s.data.personalInfo, [field]: value } } })),

  addCustomField: () =>
    set((s) => ({ data: { ...s.data, personalInfo: { ...s.data.personalInfo, customFields: [...s.data.personalInfo.customFields, { key: '', value: '' }] } } })),
  updateCustomField: (index, field, value) =>
    set((s) => ({
      data: {
        ...s.data,
        personalInfo: {
          ...s.data.personalInfo,
          customFields: s.data.personalInfo.customFields.map((f, i) => i === index ? { ...f, [field]: value } : f),
        },
      },
    })),
  removeCustomField: (index) =>
    set((s) => ({
      data: {
        ...s.data,
        personalInfo: {
          ...s.data.personalInfo,
          customFields: s.data.personalInfo.customFields.filter((_, i) => i !== index),
        },
      },
    })),

  setSummary: (value) => set((s) => ({ data: { ...s.data, summary: value } })),
  setSummaryEn: (value) => set((s) => ({ data: { ...s.data, summaryEn: value } })),

  addWork: () =>
    set((s) => ({
      data: {
        ...s.data,
        workExperience: [...s.data.workExperience, { id: genId(), company: '', companyEn: '', role: '', roleEn: '', dates: '', datesEn: '', bullets: [''], bulletsEn: [''] }],
      },
    })),
  removeWork: (id) =>
    set((s) => ({ data: { ...s.data, workExperience: s.data.workExperience.filter((w) => w.id !== id) } })),
  reorderWork: (from, to) =>
    set((s) => {
      const arr = [...s.data.workExperience]
      const [moved] = arr.splice(from, 1)
      arr.splice(to, 0, moved)
      return { data: { ...s.data, workExperience: arr } }
    }),
  updateWork: (id, field, value) =>
    set((s) => ({
      data: {
        ...s.data,
        workExperience: s.data.workExperience.map((w) => (w.id === id ? { ...w, [field]: value } : w)),
      },
    })),
  addWorkBullet: (id, lang) =>
    set((s) => ({
      data: {
        ...s.data,
        workExperience: s.data.workExperience.map((w) =>
          w.id === id
            ? lang === 'zh'
              ? { ...w, bullets: [...w.bullets, ''] }
              : { ...w, bulletsEn: [...w.bulletsEn, ''] }
            : w
        ),
      },
    })),
  updateWorkBullet: (id, idx, value, lang) =>
    set((s) => ({
      data: {
        ...s.data,
        workExperience: s.data.workExperience.map((w) => {
          if (w.id !== id) return w
          if (lang === 'zh') {
            const bullets = [...w.bullets]; bullets[idx] = value
            return { ...w, bullets }
          } else {
            const bulletsEn = [...w.bulletsEn]; bulletsEn[idx] = value
            return { ...w, bulletsEn }
          }
        }),
      },
    })),
  removeWorkBullet: (id, idx, lang) =>
    set((s) => ({
      data: {
        ...s.data,
        workExperience: s.data.workExperience.map((w) => {
          if (w.id !== id) return w
          if (lang === 'zh') return { ...w, bullets: w.bullets.filter((_, i) => i !== idx) }
          return { ...w, bulletsEn: w.bulletsEn.filter((_, i) => i !== idx) }
        }),
      },
    })),
  setWorkBullets: (id, bulletsText, lang) =>
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
    }),

  addProject: () =>
    set((s) => ({ data: { ...s.data, aiProjects: [...s.data.aiProjects, { id: genId(), name: '', nameEn: '', direction: '', directionEn: '', dates: '', datesEn: '', description: '', descriptionEn: '' }] } })),
  removeProject: (id) => set((s) => ({ data: { ...s.data, aiProjects: s.data.aiProjects.filter((p) => p.id !== id) } })),
  reorderProjects: (from, to) =>
    set((s) => {
      const arr = [...s.data.aiProjects]
      const [moved] = arr.splice(from, 1)
      arr.splice(to, 0, moved)
      return { data: { ...s.data, aiProjects: arr } }
    }),
  updateProject: (id, field, value) =>
    set((s) => ({ data: { ...s.data, aiProjects: s.data.aiProjects.map((p) => p.id === id ? { ...p, [field]: value } as AIProject : p) } })),

  addEducation: () =>
    set((s) => ({ 
      data: { 
        ...s.data, 
        education: [...s.data.education, { 
          id: genId(), 
          school: '', 
          schoolEn: '', 
          degree: '', 
          degreeEn: '', 
          major: '', 
          majorEn: '', 
          dates: '', 
          datesEn: '', 
          highlights: [''], 
          highlightsEn: [''] 
        }] 
      } 
    })),
  removeEducation: (id) => set((s) => ({ data: { ...s.data, education: s.data.education.filter((e) => e.id !== id) } })),
  reorderEducation: (from, to) =>
    set((s) => {
      const arr = [...s.data.education]
      const [moved] = arr.splice(from, 1)
      arr.splice(to, 0, moved)
      return { data: { ...s.data, education: arr } }
    }),
  updateEducation: (id, field, value) =>
    set((s) => ({ data: { ...s.data, education: s.data.education.map((e) => (e.id === id ? { ...e, [field]: value } : e)) } })),
  addEduHighlight: (id, lang) =>
    set((s) => ({
      data: { ...s.data, education: s.data.education.map((e) => e.id === id ? (lang === 'zh' ? { ...e, highlights: [...e.highlights, ''] } : { ...e, highlightsEn: [...e.highlightsEn, ''] }) : e) },
    })),
  updateEduHighlight: (id, idx, value, lang) =>
    set((s) => ({
      data: { ...s.data, education: s.data.education.map((e) => {
        if (e.id !== id) return e
        if (lang === 'zh') { const h = [...e.highlights]; h[idx] = value; return { ...e, highlights: h } }
        const h = [...e.highlightsEn]; h[idx] = value; return { ...e, highlightsEn: h }
      }) },
    })),
  removeEduHighlight: (id, idx, lang) =>
    set((s) => ({
      data: { ...s.data, education: s.data.education.map((e) => {
        if (e.id !== id) return e
        if (lang === 'zh') return { ...e, highlights: e.highlights.filter((_, i) => i !== idx) }
        return { ...e, highlightsEn: e.highlightsEn.filter((_, i) => i !== idx) }
      }) },
    })),

  addSkill: () => set((s) => ({ data: { ...s.data, skills: [...s.data.skills, { category: '', categoryEn: '', items: '', itemsEn: '' }] } })),
  removeSkill: (idx) => set((s) => ({ data: { ...s.data, skills: s.data.skills.filter((_, i) => i !== idx) } })),
  reorderSkills: (from, to) =>
    set((s) => {
      const arr = [...s.data.skills]
      const [moved] = arr.splice(from, 1)
      arr.splice(to, 0, moved)
      return { data: { ...s.data, skills: arr } }
    }),
  updateSkill: (idx, field, value) =>
    set((s) => ({ data: { ...s.data, skills: s.data.skills.map((sk, i) => (i === idx ? { ...sk, [field]: value } : sk)) } })),

  addLanguage: () => set((s) => ({ data: { ...s.data, languages: [...s.data.languages, ''] } })),
  updateLanguage: (idx, value) => set((s) => ({ data: { ...s.data, languages: s.data.languages.map((l, i) => (i === idx ? value : l)) } })),
  removeLanguage: (idx) => set((s) => ({ data: { ...s.data, languages: s.data.languages.filter((_, i) => i !== idx) } })),
  addLanguageEn: () => set((s) => ({ data: { ...s.data, languagesEn: [...s.data.languagesEn, ''] } })),
  updateLanguageEn: (idx, value) => set((s) => ({ data: { ...s.data, languagesEn: s.data.languagesEn.map((l, i) => (i === idx ? value : l)) } })),
  removeLanguageEn: (idx) => set((s) => ({ data: { ...s.data, languagesEn: s.data.languagesEn.filter((_, i) => i !== idx) } })),

  setSelfEvaluation: (value) => set((s) => ({ data: { ...s.data, selfEvaluation: value } })),
  setSelfEvaluationEn: (value) => set((s) => ({ data: { ...s.data, selfEvaluationEn: value } })),

  addCustomSection: (label, labelEn) => {
    const id = `custom_${genId()}`
    set((s) => ({
      data: { ...s.data, customSections: [...s.data.customSections, { id, label, labelEn, content: '', contentEn: '' }] },
      sectionOrder: [...s.sectionOrder, id],
    }))
  },
  removeCustomSection: (id) =>
    set((s) => ({
      data: { ...s.data, customSections: s.data.customSections.filter((cs) => cs.id !== id) },
      sectionOrder: s.sectionOrder.filter((k) => k !== id),
    })),
  updateCustomSection: (id, field, value) =>
    set((s) => ({
      data: {
        ...s.data,
        customSections: s.data.customSections.map((cs) => cs.id === id ? { ...cs, [field]: value } : cs),
      },
    })),

  // ── AI Translation ──
  translateLoading: false,
  translateError: null as string | null,
  applyTranslation: (result: Record<string, any>) =>
    set((s) => {
      const d = { ...s.data }
      if (result.summaryEn) d.summaryEn = result.summaryEn
      if (result.selfEvaluationEn) d.selfEvaluationEn = result.selfEvaluationEn
      if (result.nameEn) d.personalInfo = { ...d.personalInfo, nameEn: result.nameEn }
      if (result.locationEn) d.personalInfo = { ...d.personalInfo, locationEn: result.locationEn }
      if (result.jobObjectiveEn) d.personalInfo = { ...d.personalInfo, jobObjectiveEn: result.jobObjectiveEn }

      if (result.workExperience) {
        d.workExperience = d.workExperience.map((w, i) => {
          const t = result.workExperience.find((x: any) => x.index === i)
          if (!t) return w
          return { ...w, companyEn: t.companyEn || w.companyEn, roleEn: t.roleEn || w.roleEn, datesEn: t.datesEn || w.datesEn, bulletsEn: t.bulletsEn || w.bulletsEn }
        })
      }
      if (result.aiProjects) {
        d.aiProjects = d.aiProjects.map((p, i) => {
          const t = result.aiProjects.find((x: any) => x.index === i)
          if (!t) return p
          return { ...p, nameEn: t.nameEn || p.nameEn, directionEn: t.directionEn || p.directionEn, datesEn: t.datesEn || p.datesEn, descriptionEn: t.descriptionEn || p.descriptionEn }
        })
      }
      if (result.education) {
        d.education = d.education.map((e, i) => {
          const t = result.education.find((x: any) => x.index === i)
          if (!t) return e
          return { ...e, schoolEn: t.schoolEn || e.schoolEn, degreeEn: t.degreeEn || e.degreeEn, majorEn: t.majorEn || e.majorEn, datesEn: t.datesEn || e.datesEn, highlightsEn: t.highlightsEn || e.highlightsEn }
        })
      }
      if (result.skills) {
        d.skills = d.skills.map((sk, i) => {
          const t = result.skills.find((x: any) => x.index === i)
          if (!t) return sk
          return { ...sk, categoryEn: t.categoryEn || sk.categoryEn, itemsEn: t.itemsEn || sk.itemsEn }
        })
      }
      if (result.languagesEn) d.languagesEn = result.languagesEn
      if (result.customSections) {
        d.customSections = d.customSections.map((cs, i) => {
          const t = result.customSections.find((x: any) => x.index === i)
          if (!t) return cs
          return { ...cs, labelEn: t.labelEn || cs.labelEn, contentEn: t.contentEn || cs.contentEn }
        })
      }
      return { data: d, translateError: null }
    }),
  setTranslateLoading: (loading: boolean) => set({ translateLoading: loading }),
  setTranslateError: (error: string | null) => set({ translateError: error }),
}))
