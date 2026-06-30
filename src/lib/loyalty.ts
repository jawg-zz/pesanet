import { db } from "@/lib/db"
import { tierForPoints, normaliseKePhone } from "@/lib/wifi-utils"

/**
 * Award loyalty points to a customer. Positive `points` increases both
 * balance and lifetime points; negative `points` (redemption) only
 * decreases the balance. Recomputes the tier from lifetime points.
 * Creates a PointsTransaction ledger entry.
 */
export async function awardPoints(
  customerId: string,
  points: number,
  type: string,
  reason: string,
  referenceId?: string
) {
  const customer = await db.customer.findUnique({ where: { id: customerId } })
  if (!customer) return null

  const newBalance = customer.pointsBalance + points
  const newLifetime = customer.lifetimePoints + (points > 0 ? points : 0)
  const newTier = tierForPoints(newLifetime)

  const updated = await db.customer.update({
    where: { id: customerId },
    data: {
      pointsBalance: newBalance,
      lifetimePoints: newLifetime,
      tier: newTier,
    },
  })

  await db.pointsTransaction.create({
    data: { customerId, points, type, reason, referenceId: referenceId ?? null },
  })

  return updated
}

/**
 * If the given customer was referred and has a pending referral, mark it
 * completed and reward the referrer with bonus points.
 * The optional `phone` param is accepted for call-site compatibility
 * (the referred phone is already stored on the Referral record).
 */
export async function processReferralCompletion(
  customerId: string,
  _phone?: string
) {
  const pending = await db.referral.findFirst({
    where: { referredCustomerId: customerId, status: "pending" },
  })
  if (!pending) return null

  await db.referral.update({
    where: { id: pending.id },
    data: {
      status: "completed",
      completedAt: new Date(),
      rewardPoints: 100,
    },
  })

  await awardPoints(
    pending.referrerCustomerId,
    100,
    "earn_referral",
    `Referral: ${pending.referredPhone} joined & purchased`,
    pending.id
  )
  return pending
}

/** Check whether a phone number is blacklisted. Accepts any KE phone format. */
export async function isBlacklisted(phone: string): Promise<boolean> {
  const normalised = normaliseKePhone(phone)
  const entry = await db.blacklist.findUnique({ where: { phone: normalised } })
  return !!entry
}
