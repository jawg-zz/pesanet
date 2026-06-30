# Task 11-a — Backend agent work record

## Files created
- `src/app/api/loyalty/redeem/route.ts` — POST: redeem a package voucher with loyalty points.
- `src/app/api/referrals/route.ts` — GET: list all referrals with referrer name/phone.
- `src/app/api/referrals/apply/route.ts` — POST: apply a referral code (self-referral + duplicate-referral guards).
- `src/app/api/sms/route.ts` — GET/POST: list broadcasts + send broadcast (audiences all/active/by_site/by_package). Exports `computeAudience` for reuse.
- `src/app/api/sms/audience-preview/route.ts` — POST: preview recipient count + sample.
- `src/app/api/network/route.ts` — GET: list all router statuses (auto-creates missing rows with default online values).
- `src/app/api/network/[siteId]/route.ts` — POST: refresh simulated metrics (uptime += 60..600s, devices ≈ active sessions + 0..8, load-driven online/warning status, maintenance → offline).
- `src/app/api/network/[siteId]/reboot/route.ts` — POST: reset to online/uptime=0/devices=0/cpu=5/memory=20.
- `src/app/api/blacklist/route.ts` — GET/POST: list + upsert normalised-phone entry.
- `src/app/api/blacklist/[id]/route.ts` — DELETE: remove entry (404 if not found).
- `src/app/api/subscriptions/route.ts` — GET: list subscriptions ordered by nextChargeAt asc (optional `?status=`).
- `src/app/api/subscriptions/create/route.ts` — POST: create active subscription (blacklist check, nextChargeAt = now + duration).
- `src/app/api/subscriptions/[id]/route.ts` — PATCH: pause/resume/cancel.
- `src/app/api/subscriptions/process/route.ts` — POST: process all due subscriptions (creates Transaction + Session, awards points, advances nextChargeAt).

## Files modified
- `src/app/api/loyalty/[customerId]/route.ts` — fixed `referralsCompleted` bug (was reusing `_count.referralsMade` instead of filtering by status="completed"). GET now does two separate counts in parallel and passes them to `buildSummary(c, referralsCount, referralsCompleted)`.

## Pre-existing (confirmed already in place from Task 10 foundation)
These were already wired correctly during round 4 setup; I re-read them to confirm the contract and they required no changes:
- `src/lib/loyalty.ts` — `awardPoints`, `processReferralCompletion`, `isBlacklisted` (signatures without explicit `db` param; they import the singleton from `@/lib/db`). All behavior matches the spec.
- `src/app/api/loyalty/route.ts` — GET list of `LoyaltySummary[]` ordered by lifetimePoints desc, `?limit=` supported, separate referralsCount + referralsCompleted counts.
- `src/app/api/mpesa/stk/route.ts` — already checks `isBlacklisted(normalisedPhone)` → 403.
- `src/app/api/mpesa/status/[id]/route.ts` — on payment completion calls `awardPoints(...)` with `transaction.amountKES` + `processReferralCompletion(customerId, phone)`.
- `src/app/api/vouchers/redeem/route.ts` — checks `isBlacklisted` → 403, then `awardPoints(...)` for `voucher.priceKES` + `processReferralCompletion(customer.id, normalisedPhone)`.
- `src/app/api/admin/stats/route.ts` — returns `activeSubscriptions` (Subscription where status="active") + `pointsCirculation` (sum of customers' pointsBalance via Prisma aggregate).

## Verification (live curl against dev server, port 3000)
After running `bun run db:push` to regenerate the Prisma client (the running dev server had a stale client from before round 4), I restarted the dev server and ran these tests:

```
GET  /api/loyalty                  → 200 (16 customers, Mercy Cherono top with 10726 pts, referralsCount=1 referralsCompleted=1)
GET  /api/referrals                → 200 (3 referrals with referrerName + referrerPhone)
GET  /api/sms                      → 200 (broadcasts list)
POST /api/sms/audience-preview     → 200 {"recipientCount":16,"sample":[...5 phones]} (audience="all")
POST /api/sms/audience-preview     → 200 {"recipientCount":4,"sample":[...4 phones]} (audience="active")
POST /api/sms                      → 200 created broadcast with recipientCount=16
GET  /api/network                  → 200 (5 routers with siteName/location/maxUsers + simulated metrics)
POST /api/network/[siteId]         → 200 updated metrics (uptime += delta, connectedDevices recomputed, status online/warning by load)
POST /api/network/[siteId]/reboot  → 200 router reset (uptime=0, devices=0, cpu=5, memory=20, status=online)
GET  /api/blacklist                → 200 (list)
POST /api/blacklist                → 200 upserted entry
POST /api/mpesa/stk (blocked phone) → 403 {"error":"This number is blocked. Contact support."}
DELETE /api/blacklist/[id]         → 200 {"success":true}
GET  /api/subscriptions            → 200 (2 active subs ordered by nextChargeAt asc, customerName included)
POST /api/subscriptions/create     → 200 created active subscription with nextChargeAt = now + durationMinutes
PATCH /api/subscriptions/[id] {"action":"pause"}   → 200 status="paused"
PATCH /api/subscriptions/[id] {"action":"resume"}  → 200 status="active", nextChargeAt recomputed
PATCH /api/subscriptions/[id] {"action":"cancel"}  → 200 status="cancelled"
POST /api/subscriptions/process    → 200 {"processed":0,"revenue":0,"message":"No subscriptions are due for renewal right now."}
POST /api/referrals/apply (self)   → 400 {"error":"You cannot refer yourself"}
POST /api/loyalty/[id] PATCH       → 200 updated summary with pointsBalance + lifetimePoints + tier recomputed
POST /api/loyalty/redeem (insufficient) → 400 {"error":"Insufficient points","pointsBalance":0,"pointsCost":100}
GET  /api/admin/stats              → 200 includes activeSubscriptions:2, pointsCirculation:77373
```

## Lint status
`bun run lint` → exit 0 (clean).
