import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { StripeCheckoutSchema, zodError } from "@/app/lib/validation";
import { createUserClient, requireAuth, rateLimitKey, errStr } from "@/app/lib/api-helpers";
import { checkRateLimit, RATE_LIMITS } from "@/app/lib/rate-limit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// platform fee in basis points, e.g. 800 = 8%
const FEE_BPS = Number(process.env.PLATFORM_FEE_BPS ?? "800");

type ServiceReqRow = {
  id: string;
  title: string;
  location: string;
  service_date: string;
  status: "open" | "closed" | "awarded" | "cancelled";
  couple_id: string;
};

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = StripeCheckoutSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(zodError(parsed), { status: 400 });
    }

    const { application_id } = parsed.data;

    const supabase = await createUserClient();
    const { user, response } = await requireAuth(supabase);
    if (!user) return response!;

    const rl = checkRateLimit(rateLimitKey(req, user.id), RATE_LIMITS.sensitive);
    if (rl) return rl;

    // Pull application + related service_request
    const { data: rawApp, error: aErr } = await supabase
      .from("applications")
      .select(
        `
          id,
          bid_cents,
          request_id,
          wedflexer_id,
          service_requests:service_requests!applications_request_id_fkey (
            id,
            title,
            location,
            service_date,
            status,
            couple_id
          )
        `,
      )
      .eq("id", application_id)
      .single();

    if (aErr || !rawApp) {
      return NextResponse.json(
        { ok: false, error: aErr?.message ?? "Application not found" },
        { status: 404 },
      );
    }

    const app = rawApp as {
      id: string;
      bid_cents: number | null;
      request_id: string;
      wedflexer_id: string;
      service_requests: ServiceReqRow | ServiceReqRow[] | null;
    };

    const srRaw = Array.isArray(app.service_requests)
      ? app.service_requests[0]
      : app.service_requests;

    if (!srRaw) {
      return NextResponse.json(
        { ok: false, error: "Related service request not found" },
        { status: 400 },
      );
    }

    const sr = srRaw as ServiceReqRow;

    if (sr.status !== "open") {
      return NextResponse.json(
        { ok: false, error: "Offer is not open for booking" },
        { status: 400 },
      );
    }

    const amount_cents = app.bid_cents ?? 0;
    if (amount_cents <= 0) {
      return NextResponse.json(
        { ok: false, error: "Application has no valid bid amount" },
        { status: 400 },
      );
    }

    const fee_cents = Math.floor((amount_cents * FEE_BPS) / 10_000);

    // Create booking record
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .insert({
        request_id: app.request_id,
        application_id: app.id,
        couple_id: sr.couple_id,
        wedflexer_id: app.wedflexer_id,
        service_date: sr.service_date,
        status: "pending_payment",
      })
      .select("id")
      .single();

    if (bErr || !booking) {
      return NextResponse.json(
        { ok: false, error: bErr?.message ?? "Could not create booking" },
        { status: 500 },
      );
    }

    await supabase
      .from("service_requests")
      .update({ status: "closed" })
      .eq("id", app.request_id);

    await supabase
      .from("applications")
      .update({ is_awarded: true })
      .eq("id", app.id);

    const origin =
      req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_ORIGIN ?? "";

    // Stripe idempotency key prevents duplicate charges on retries
    const idempotencyKey = `checkout_${booking.id}`;

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        success_url: `${origin}/booked/success?booking=${booking.id}`,
        cancel_url: `${origin}/r/${app.request_id}`,
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: amount_cents,
              product_data: {
                name: `Booking: ${sr.title}`,
                description: `${sr.location} • Service date ${sr.service_date}`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          booking_id: booking.id,
          wedflexer_id: app.wedflexer_id,
          fee_cents: String(fee_cents),
        },
      },
      { idempotencyKey },
    );

    // Record the pending payment
    await supabase.from("payments").insert({
      booking_id: booking.id,
      couple_id: sr.couple_id,
      wedflexer_id: app.wedflexer_id,
      amount_cents,
      stripe_checkout_session_id: session.id,
      status: "pending",
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errStr(e) }, { status: 500 });
  }
}
