import { getAuthenticatedUser, getServiceSupabase, sendApiError } from '../_lib/supabase'

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    const user = await getAuthenticatedUser(req)
    const supabase = getServiceSupabase()

    let { data: account, error: accountError } = await supabase
      .from('credit_accounts')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle()

    if (accountError) throw accountError

    if (!account) {
      const { data: createdBalance, error: createError } = await supabase.rpc('grant_credits', {
        p_user_id: user.id,
        p_amount: 20,
        p_reason: 'signup_bonus',
        p_feature: 'signup',
        p_ref_id: `signup:${user.id}`,
        p_metadata: { source: 'balance_api_backfill' },
      })
      if (createError && !createError.message.includes('duplicate key')) throw createError
      account = { balance: Number(createdBalance || 20) }
    }

    const { data: ledger, error: ledgerError } = await supabase
      .from('credit_ledger')
      .select('id, delta, balance_after, reason, feature, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (ledgerError) throw ledgerError

    const { data: positiveLedger, error: positiveLedgerError } = await supabase
      .from('credit_ledger')
      .select('delta')
      .eq('user_id', user.id)
      .gt('delta', 0)

    if (positiveLedgerError) throw positiveLedgerError

    let positiveTotal = (positiveLedger || []).reduce((sum: number, item: { delta: number }) => sum + Number(item.delta || 0), 0)

    if (positiveTotal <= 0 && Number(account?.balance || 0) <= 0) {
      const { data: backfilledBalance, error: backfillError } = await supabase.rpc('grant_credits', {
        p_user_id: user.id,
        p_amount: 20,
        p_reason: 'signup_bonus',
        p_feature: 'signup',
        p_ref_id: `signup:${user.id}`,
        p_metadata: { source: 'balance_api_missing_bonus_backfill' },
      })
      if (backfillError && !backfillError.message.includes('duplicate key')) throw backfillError
      account = { balance: Number(backfilledBalance || 20) }
      positiveTotal = 20
    }

    const totalCredits = Math.max(20, positiveTotal)

    res.status(200).json({
      balance: Number(account?.balance || 0),
      totalCredits,
      ledger: ledger || [],
    })
  } catch (error: any) {
    sendApiError(res, error)
  }
}
