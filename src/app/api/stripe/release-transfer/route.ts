import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { createAdminClient, requireAuth, createUserClient, rateLimitKey, errStr } from "@/app/lib/api-helpers";
import { checkRateLimit, RATE_LIMITS } from "@/app/lib/rate-limit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    // Authentication required - this triggers real money transfers
    const supabase = await createUserClient();
    const { user, response } = await requireAuth(supabase);
    if (!user) return response!;

    const rl = checkRateLimit(rateLimitKey(req, user.id), RATE_LIMITS.sensitive);
    if (rl) return rl;

    const admin = createAdminClient();

    const { data: rows, error } = await admin.rpc("release_payout_candidates");
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    for (const r of rows as Array<{ payout_id: string; amount_cents: number; wedflexer_stripe_account: string }>) {
      try {
        // Idempotency key prevents duplicate transfers on retries
        const tr = await stripe.transfers.create(
          {
            amount: r.amount_cents,
            currency: "usd",
            destination: r.wedflexer_stripe_account,
          },
          { idempotencyKey: `transfer_${r.payout_id}` },
        );
        await admin.from("payouts").update({ stripe_transfer_id: tr.id, status: "paid" }).eq("id", r.payout_id);
      } catch {
        await admin.from("payouts").update({ status: "failed" }).eq("id", r.payout_id);
      }
    }

    return NextResponse.json({ ok: true, count: (rows || []).length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errStr(e) }, { status: 500 });
  }
}
