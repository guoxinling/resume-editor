import { getAuthenticatedUser, sendApiError } from './_lib/supabase.js'
import { refundCredits, spendCredits } from './_lib/credits.js'

const DEFAULT_CREDIT_BYPASS_EMAILS = ['guoxinling_xisu@163.com']

function isCreditBypassEmail(email?: string) {
  const configured = (process.env.AI_CREDIT_BYPASS_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
  const allowList = new Set([...DEFAULT_CREDIT_BYPASS_EMAILS, ...configured].map((item) => item.toLowerCase()))
  return Boolean(email && allowList.has(email.toLowerCase()))
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  const baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  if (!apiKey) {
    res.status(500).json({ error: 'AI 服务暂时不可用，请稍后重试' })
    return
  }

  let charge: { amount: number; refId: string; feature: string } | null = null
  let userId: string | null = null

  try {
    const user = await getAuthenticatedUser(req)
    userId = user.id

    const { messages, stream = false, feature } = req.body || {}
    if (!Array.isArray(messages)) {
      res.status(400).json({ error: 'Invalid messages' })
      return
    }

    const bypassCredits = isCreditBypassEmail(user.email)
    if (!bypassCredits) {
      const spent = await spendCredits(user.id, feature, {
        stream: Boolean(stream),
        messageCount: messages.length,
      })
      charge = { amount: spent.amount, refId: spent.refId, feature }
    }

    const upstream = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream,
      }),
    })

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      if (charge) await refundCredits(user.id, charge.amount, charge.feature, charge.refId)
      charge = null
      res.status(upstream.status).json({
        error: text || `AI 服务请求失败 (${upstream.status})`,
      })
      return
    }

    if (stream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      })

      if (!upstream.body) {
        res.end()
        return
      }

      const reader = upstream.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(Buffer.from(value))
      }
      res.end()
      return
    }

    const data = await upstream.json()
    res.status(200).json(data)
  } catch (error: any) {
    if (charge && userId) {
      await refundCredits(userId, charge.amount, charge.feature, charge.refId).catch(() => {})
    }
    sendApiError(res, error, 'AI 服务暂时不可用，请稍后重试')
  }
}
