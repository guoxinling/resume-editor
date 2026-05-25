export default async function handler(req: any, res: any) {
  const appBaseURL = (process.env.APP_BASE_URL || '/').replace(/\/$/, '')
  const returnedOrderId = req.query?.out_trade_no || req.query?.order_id
  const orderId = returnedOrderId ? `&order_id=${encodeURIComponent(String(returnedOrderId))}` : ''
  res.writeHead(302, {
    Location: `${appBaseURL}/?payment=success${orderId}`,
  })
  res.end()
}
