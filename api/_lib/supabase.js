import { createClient } from '@supabase/supabase-js'

export function getServiceSupabase() {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase 服务暂未配置')
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization
  if (!header || typeof header !== 'string') return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || null
}

export async function getAuthenticatedUser(req) {
  const token = getBearerToken(req)
  if (!token) {
    const error = new Error('请先登录')
    error.status = 401
    throw error
  }

  const supabase = getServiceSupabase()
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    const authError = new Error('登录状态已过期，请重新登录')
    authError.status = 401
    throw authError
  }

  return {
    id: data.user.id,
    email: data.user.email || undefined,
  }
}

export function sendApiError(res, error, fallback = '服务暂时不可用，请稍后重试') {
  const status = Number(error?.status || 500)
  res.status(status).json({ error: error?.message || fallback })
}

