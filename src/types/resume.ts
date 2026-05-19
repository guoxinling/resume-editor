export interface CustomField {
  key: string
  value: string
}

export interface CustomSection {
  id: string
  label: string
  labelEn: string
  content: string
  contentEn: string
}

export interface PersonalInfo {
  name: string
  nameEn: string
  phone: string
  email: string
  location: string
  locationEn: string
  portfolio: string
  age: string
  photo?: string
  jobObjective: string
  jobObjectiveEn: string
  customFields: CustomField[]
}

export interface WorkEntry {
  id: string
  company: string
  companyEn: string
  role: string
  roleEn: string
  dates: string
  datesEn: string
  bullets: string[]
  bulletsEn: string[]
}

export interface AIProject {
  id: string
  name: string
  nameEn: string
  direction: string
  directionEn: string
  dates: string
  datesEn: string
  description: string
  descriptionEn: string
}

export interface Education {
  id: string
  school: string
  schoolEn: string
  degree: string
  degreeEn: string
  major: string
  majorEn: string
  dates: string
  datesEn: string
  highlights: string[]
  highlightsEn: string[]
}

export interface SkillItem {
  category: string
  categoryEn: string
  items: string
  itemsEn: string
}

export type Lang = 'zh' | 'en'

/** Built-in section keys */
export type BuiltinSectionKey = 'personalInfo' | 'summary' | 'workExperience' | 'aiProjects' | 'education' | 'skills' | 'languages' | 'selfEvaluation'

/** Section key = built-in | custom_{id} */
export type SectionKey = BuiltinSectionKey | `custom_${string}`

export const BUILTIN_SECTIONS: BuiltinSectionKey[] = ['personalInfo', 'summary', 'workExperience', 'aiProjects', 'education', 'skills', 'languages', 'selfEvaluation']

export interface ResumeData {
  personalInfo: PersonalInfo
  summary: string
  summaryEn: string
  workExperience: WorkEntry[]
  aiProjects: AIProject[]
  education: Education[]
  skills: SkillItem[]
  languages: string[]
  languagesEn: string[]
  selfEvaluation: string
  selfEvaluationEn: string
  customSections: CustomSection[]
  lang: Lang
}

export interface DraftMeta {
  id: string
  name: string
  updatedAt: number
  createdAt: number
  lang: Lang
}
