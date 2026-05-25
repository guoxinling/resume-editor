import { randomUUID } from 'crypto'
import { CREDIT_PACKAGES } from '../_lib/credits.js'
import { getAuthenticatedUser, getServiceSupabase, sendApiError } from '../_lib/supabase.js'
import { createZpaySign, getZpayConfig, toQuery } from '../_lib/zpay.js'

const PAY_TYPES = new Set(['alipay', 'wxpay'])

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    const user = await getAuthenticatedUser(req)
    const { packageId, payType = 'alipay' } = req.body || {}
    const pack = CREDIT_PACKAGES[packageId as keyof typeof CREDIT_PACKAGES]

    if (!pack) {
      res.status(400).json({ error: 'Invalid credit package' })
      return
    }
    if (!PAY_TYPES.has(payType)) {
      res.status(400).json({ error: 'Invalid pay type' })
      return
    }

    const supabase = getServiceSupabase()
    const orderId = randomUUID()
    const { error } = await supabase.from('payment_orders').insert({
      id: orderId,
      user_id: user.id,
      package_id: pack.id,
      amount_cents: pack.amountCents,
      credits: pack.credits,
      status: 'pending',
      provider: 'zpay',
      pay_type: payType,
    })
    if (error) throw error

    const config = getZpayConfig()
    const params = {
      pid: config.pid,
      type: payType,
      out_trade_no: orderId,
      notify_url: `${config.appBaseURL}/api/pay/notify`,
      return_url: `${config.appBaseURL}/api/pay/return`,
      name: `简历鸭${pack.name}`,
      money: (pack.amountCents / 100).toFixed(2),
    }
    const sign = createZpaySign(params, config.key)
    const payUrl = `${config.baseURL}/submit.php?${toQuery({ ...params, sign, sign_type: 'MD5' })}`

    res.status(200).json({
      orderId,
      package: pack,
      payUrl,
    })
  } catch (error: any) {
    sendApiError(res, error, '创建支付订单失败')
  }
}
