import type { ResumeData } from '../types/resume'

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * Validates required fields:
 * - Name is mandatory
 * - At least one of phone/email is required
 */
export function validateResume(data: ResumeData): ValidationResult {
  const errors: ValidationError[] = []

  if (!data.personalInfo.name.trim()) {
    errors.push({ field: 'name', message: '请输入姓名' })
  }

  const hasPhone = data.personalInfo.phone.trim().length > 0
  const hasEmail = data.personalInfo.email.trim().length > 0

  if (!hasPhone && !hasEmail) {
    errors.push({ field: 'phone', message: '请填写电话或邮箱' })
    errors.push({ field: 'email', message: '请填写电话或邮箱' })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
