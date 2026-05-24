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

  try {
    const { messages, stream = false } = req.body || {}
    if (!Array.isArray(messages)) {
      res.status(400).json({ error: 'Invalid messages' })
      return
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
    res.status(500).json({ error: error?.message || 'AI 服务暂时不可用，请稍后重试' })
  }
}
