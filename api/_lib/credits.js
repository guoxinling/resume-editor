import { randomUUID } from 'crypto'
import { getServiceSupabase } from './supabase.js'

export const FEATURE_COSTS = {
  wizard: 1,
  polish: 1,
  adapt: 3,
  interview: 3,
  translate: 3,
  import_parse: 5,
}

export const CREDIT_PACKAGES = {
  starter: { id: 'starter', name: '入门包', amountCents: 990, credits: 100 },
  plus: { id: 'plus', name: '进阶包', amountCents: 1990, credits: 250 },
  pro: { id: 'pro', name: '专业包', amountCents: 3990, credits: 600 },
}

export function getFeatureCost(feature) {
  if (typeof feature !== 'string' || !(feature in FEATURE_COSTS)) {
    const error = new Error('Invalid AI feature')
    error.status = 400
    throw error
  }
  return FEATURE_COSTS[feature]
}

export async function getCreditBalance(userId) {
  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('credit_accounts')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return Number(data?.balance || 0)
}

export async function spendCredits(userId, feature, metadata = {}) {
  const amount = getFeatureCost(feature)
  const refId = `ai:${feature}:${randomUUID()}`
  const supabase = getServiceSupabase()
  const { data, error } = await supabase.rpc('spend_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_feature: feature,
    p_ref_id: refId,
    p_reason: 'ai_usage',
    p_metadata: metadata,
  })

  if (error) {
    const err = new Error(error.message.includes('insufficient_credits') ? '点数不足，请先充值' : error.message)
    err.status = error.message.includes('insufficient_credits') ? 402 : 500
    throw err
  }

  return { amount, refId, balance: Number(data || 0) }
}

export async function refundCredits(userId, amount, feature, refId, reason = 'ai_refund') {
  const supabase = getServiceSupabase()
  await supabase.rpc('grant_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_feature: feature,
    p_ref_id: `refund:${refId}`,
    p_metadata: { originalRefId: refId },
  })
}

