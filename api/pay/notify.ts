import { getServiceSupabase } from '../_lib/supabase.ts'
import { getZpayConfig, verifyZpaySign } from '../_lib/zpay.ts'

function collectParams(req: any): Record<string, string> {
  return {
    ...(req.query || {}),
    ...(req.body || {}),
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    res.status(405).send('fail')
    return
  }

  try {
    const config = getZpayConfig()
    const params = collectParams(req)

    if (!verifyZpaySign(params, config.key)) {
      res.status(400).send('fail')
      return
    }

    const orderId = params.out_trade_no
    const providerTradeNo = params.trade_no || params.api_trade_no || ''
    const paidMoney = Number(params.money || 0)
    const status = String(params.trade_status || params.status || 'TRADE_SUCCESS')

    if (!orderId || !status.includes('SUCCESS')) {
      res.status(400).send('fail')
      return
    }

    const supabase = getServiceSupabase()
    const { data: order, error: orderError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError || !order) {
      res.status(404).send('fail')
      return
    }

    if (order.status === 'paid') {
      res.status(200).send('success')
      return
    }

    if (Number(order.amount_cents) !== Math.round(paidMoney * 100)) {
      await supabase
        .from('payment_orders')
        .update({ status: 'amount_mismatch', provider_trade_no: providerTradeNo })
        .eq('id', orderId)
      res.status(400).send('fail')
      return
    }

    const { data: updatedOrders, error: updateError } = await supabase
      .from('payment_orders')
      .update({
        status: 'paid',
        provider_trade_no: providerTradeNo,
        paid_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'pending')
      .select('id')

    if (updateError) throw updateError
    if (!updatedOrders || updatedOrders.length === 0) {
      res.status(200).send('success')
      return
    }

    const { error: creditError } = await supabase.rpc('grant_credits', {
      p_user_id: order.user_id,
      p_amount: order.credits,
      p_reason: 'payment',
      p_feature: 'payment',
      p_ref_id: `payment:${orderId}`,
      p_metadata: {
        orderId,
        packageId: order.package_id,
        providerTradeNo,
      },
    })

    if (creditError) throw creditError

    res.status(200).send('success')
  } catch (error) {
    res.status(500).send('fail')
  }
}
