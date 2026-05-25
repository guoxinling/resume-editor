/**
 * Unified resume import service
 * Handles: MD/TXT (markdownParser), PDF (pdf.js + AI), Image (Tesseract + AI)
 */
import { parseMarkdownResume } from '../utils/markdownParser'
import { chatComplete } from './aiClient'
import { buildStructurizeMessages } from './prompts'
import type { ResumeData } from '../types/resume'

export type ImportStep = 'parsing' | 'ocr' | 'ai_analyzing' | 'done' | 'error'
export type ImportProgress = {
  step: ImportStep
  message: string
  progress: number // 0-100
}

export async function importResumeFromFile(
  file: File,
  onProgress: (p: ImportProgress) => void,
): Promise<ResumeData> {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''

  // ── Step 1: MD/TXT → markdownParser ──
  if (ext === 'md' || ext === 'txt') {
    onProgress({ step: 'parsing', message: '解析 Markdown…', progress: 50 })
    const text = await file.text()
    onProgress({ step: 'parsing', message: '解析完成', progress: 100 })
    const parsed = parseMarkdownResume(text)
    if (!parsed) throw new Error('Markdown 解析失败，请检查文件格式')
    return parsed
  }

  // ── Step 2: PDF → pdf.js extract text ──
  if (ext === 'pdf') {
    onProgress({ step: 'parsing', message: '正在提取 PDF 文字…', progress: 20 })
    const text = await extractPdfText(file, onProgress)
    if (!text.trim()) throw new Error('PDF 中未找到可提取的文字（可能是扫描件），请使用图片导入')
    return structurizeText(text, onProgress)
  }

  // ── Step 3: Image → Tesseract OCR ──
  if (['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext)) {
    onProgress({ step: 'ocr', message: '正在加载 OCR 引擎…', progress: 10 })
    const text = await ocrImage(file, onProgress)
    if (!text.trim()) throw new Error('OCR 未识别到文字，请检查图片清晰度')
    return structurizeText(text, onProgress)
  }

  throw new Error(`不支持的文件格式: .${ext}`)
}

// ── PDF Text Extraction ──
async function extractPdfText(
  file: File,
  onProgress: (p: ImportProgress) => void,
): Promise<string> {
  // Dynamic import to keep pdfjs-dist out of main bundle
  const pdfjsLib = await import('pdfjs-dist')

  // Use local worker file (copied to public/ by postinstall)
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  onProgress({ step: 'parsing', message: '解析 PDF 结构…', progress: 40 })

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const texts: string[] = []
  const totalPages = pdf.numPages

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ')
    texts.push(pageText)
    onProgress({
      step: 'parsing',
      message: `提取 PDF 第 ${i}/${totalPages} 页…`,
      progress: 40 + Math.round((i / totalPages) * 50),
    })
  }

  onProgress({ step: 'parsing', message: 'PDF 文字提取完成', progress: 90 })
  return texts.join('\n')
}

// ── Image OCR ──
async function ocrImage(
  file: File,
  onProgress: (p: ImportProgress) => void,
): Promise<string> {
  const { createWorker } = await import('tesseract.js')

  // Convert File to data URL
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })

  onProgress({ step: 'ocr', message: '初始化 OCR 识别引擎…', progress: 25 })

  const worker = await createWorker('chi_sim+eng')

  onProgress({ step: 'ocr', message: '正在识别图片文字…', progress: 50 })

  const { data: { text } } = await worker.recognize(dataUrl)

  onProgress({ step: 'ocr', message: 'OCR 识别完成', progress: 95 })

  await worker.terminate()
  return text
}

// ── AI Structurization ──
async function structurizeText(
  text: string,
  onProgress: (p: ImportProgress) => void,
): Promise<ResumeData> {
  onProgress({ step: 'ai_analyzing', message: 'AI 正在分析简历结构…', progress: 50 })

  const messages = buildStructurizeMessages(text)
  const raw = await chatComplete(messages, 'import_parse')
  const json = raw.replace(/```json\s*|```/g, '').trim()

  onProgress({ step: 'ai_analyzing', message: 'AI 分析完成，正在填充…', progress: 90 })

  const parsed = JSON.parse(json)

  // Convert to ResumeData format
  return normalizeResumeData(parsed)
}

// ── Normalize AI output to ResumeData ──
function normalizeResumeData(raw: Record<string, any>): ResumeData {
  let idCounter = 1
  const genId = () => String(Date.now()) + '-' + (idCounter++)

  const pi = raw.personalInfo || {}
  const personalInfo = {
    name: String(pi.name ?? ''),
    nameEn: '',
    phone: String(pi.phone ?? ''),
    email: String(pi.email ?? ''),
    location: String(pi.location ?? ''),
    locationEn: '',
    portfolio: String(pi.portfolio ?? ''),
    age: String(pi.age ?? ''),
    photo: undefined as string | undefined,
    jobObjective: String(pi.jobObjective ?? ''),
    jobObjectiveEn: '',
    customFields: [] as { key: string; value: string }[],
  }

  // Work experience
  const workExperience = (Array.isArray(raw.workExperience) ? raw.workExperience : [])
    .map((w: any) => ({
      id: genId(),
      company: String(w.company ?? ''),
      companyEn: '',
      role: String(w.role ?? ''),
      roleEn: '',
      dates: String(w.dates ?? ''),
      datesEn: '',
      bullets: Array.isArray(w.bullets) ? w.bullets.map(String).filter(Boolean) : [],
      bulletsEn: [] as string[],
    }))

  // Internships → merge into workExperience (prepend)
  if (Array.isArray(raw.internships)) {
    const internshipEntries = (raw.internships as any[]).map((w: any) => ({
      id: genId(),
      company: String(w.company ?? '') + '（实习）',
      companyEn: '',
      role: String(w.role ?? ''),
      roleEn: '',
      dates: String(w.dates ?? ''),
      datesEn: '',
      bullets: w.description ? [String(w.description)] : [],
      bulletsEn: [] as string[],
    }))
    workExperience.unshift(...internshipEntries)
  }

  // Projects → aiProjects (role → direction for compatibility)
  const aiProjects = (Array.isArray(raw.projects) ? raw.projects : [])
    .map((p: any) => ({
      id: genId(),
      name: String(p.name ?? ''),
      nameEn: '',
      direction: String(p.role ?? p.direction ?? ''),
      directionEn: '',
      dates: String(p.dates ?? ''),
      datesEn: '',
      description: String(p.description ?? ''),
      descriptionEn: '',
    }))
  // Also accept the old aiProjects field for backward compat
  if (Array.isArray(raw.aiProjects) && aiProjects.length === 0) {
    (raw.aiProjects as any[]).forEach((p: any) => {
      aiProjects.push({
        id: genId(),
        name: String(p.name ?? ''),
        nameEn: '',
        direction: String(p.direction ?? ''),
        directionEn: '',
        dates: String(p.dates ?? ''),
        datesEn: '',
        description: String(p.description ?? ''),
        descriptionEn: '',
      })
    })
  }

  const education = (Array.isArray(raw.education) ? raw.education : [])
    .map((e: any) => ({
      id: genId(),
      school: String(e.school ?? ''),
      schoolEn: '',
      degree: String(e.degree ?? ''),
      degreeEn: '',
      major: String(e.major ?? ''),
      majorEn: '',
      dates: String(e.dates ?? ''),
      datesEn: '',
      highlights: Array.isArray(e.highlights) ? e.highlights.map(String).filter(Boolean) : [],
      highlightsEn: [] as string[],
    }))

  const skills = (Array.isArray(raw.skills) ? raw.skills : [])
    .map((s: any) => ({
      id: genId(),
      category: String(s.category ?? ''),
      categoryEn: '',
      items: String(s.items ?? ''),
      itemsEn: '',
    }))

  const languages = Array.isArray(raw.languages) ? raw.languages.map(String).filter(Boolean) : []

  // ── Build customSections from honors, certificates, and unknownSections ──
  const customSections: Array<{ id: string; label: string; labelEn: string; content: string; contentEn: string }> = []

  // Honors → custom section "获奖荣誉"
  if (Array.isArray(raw.honors) && raw.honors.length > 0) {
    const items = (raw.honors as string[]).filter(Boolean)
    if (items.length > 0) {
      customSections.push({
        id: genId(),
        label: '获奖荣誉',
        labelEn: 'Honors & Awards',
        content: items.map((h) => `• ${h}`).join('\n'),
        contentEn: '',
      })
    }
  }

  // Certificates → custom section "证书资质"
  if (Array.isArray(raw.certificates) && raw.certificates.length > 0) {
    const items = (raw.certificates as string[]).filter(Boolean)
    if (items.length > 0) {
      customSections.push({
        id: genId(),
        label: '证书资质',
        labelEn: 'Certifications',
        content: items.map((c) => `• ${c}`).join('\n'),
        contentEn: '',
      })
    }
  }

  // unknownSections → customSections (preserve original title + content)
  if (Array.isArray(raw.unknownSections)) {
    for (const us of raw.unknownSections as any[]) {
      const label = String(us.title ?? '其他').trim()
      const content = String(us.content ?? '').trim()
      if (content) {
        customSections.push({
          id: genId(),
          label,
          labelEn: '',
          content,
          contentEn: '',
        })
      }
    }
  }

  return {
    personalInfo,
    summary: String(raw.summary ?? ''),
    summaryEn: '',
    workExperience,
    aiProjects,
    education,
    skills,
    languages,
    languagesEn: [],
    selfEvaluation: String(raw.selfEvaluation ?? ''),
    selfEvaluationEn: '',
    customSections,
    lang: 'zh',
  }
}
