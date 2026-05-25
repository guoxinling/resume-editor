import { createHash } from 'crypto'

export function getZpayConfig() {
  const pid = process.env.ZPAY_PID
  const key = process.env.ZPAY_KEY
  const baseURL = (process.env.ZPAY_BASE_URL || 'https://z-pay.cn').replace(/\/$/, '')
  const appBaseURL = (process.env.APP_BASE_URL || '').replace(/\/$/, '')

  if (!pid || !key || !appBaseURL) {
    throw new Error('支付服务暂未配置')
  }

  return { pid, key, baseURL, appBaseURL }
}

export function createZpaySign(params, key) {
  const payload = Object.entries(params)
    .filter(([k, v]) => k !== 'sign' && k !== 'sign_type' && v !== undefined && v !== null && String(v) !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')

  return createHash('md5').update(`${payload}${key}`).digest('hex')
}

export function verifyZpaySign(params, key) {
  const expected = createZpaySign(params, key)
  return String(params.sign || '').toLowerCase() === expected.toLowerCase()
}

export function toQuery(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
}

