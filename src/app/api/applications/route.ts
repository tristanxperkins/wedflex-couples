import { NextResponse, type NextRequest } from "next/server";
import { CreateApplicationSchema, zodError } from "@/app/lib/validation";
import { createUserClient, requireAuth, rateLimitKey, errStr } from "@/app/lib/api-helpers";
import { checkRateLimit, RATE_LIMITS } from "@/app/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = CreateApplicationSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(zodError(parsed), { status: 400 });
    }

    const { request_id, message, accept_offer, counter_offer, file_urls } = parsed.data;

    const supabase = await createUserClient();
    const { user, response } = await requireAuth(supabase);
    if (!user) return response!;

    const rl = checkRateLimit(rateLimitKey(req, user.id), RATE_LIMITS.mutation);
    if (rl) return rl;

    const { data: reqRow, error: rErr } = await supabase
      .from("service_requests")
      .select("id, couple_id, offer_cents, status")
      .eq("id", request_id)
      .single();

    if (rErr || !reqRow) {
      return NextResponse.json({ ok: false, error: "Request not found" }, { status: 404 });
    }
    if (reqRow.status !== "open") {
      return NextResponse.json({ ok: false, error: "This offer is not open" }, { status: 400 });
    }

    let bid_cents: number | null = null;
    if (accept_offer) {
      if (typeof reqRow.offer_cents === "number" && Number.isFinite(reqRow.offer_cents)) {
        bid_cents = Math.max(0, Math.floor(reqRow.offer_cents));
      } else {
        return NextResponse.json(
          { ok: false, error: "Couple did not post an offer amount. Please submit a counter-offer." },
          { status: 400 }
        );
      }
    } else if (counter_offer != null) {
      bid_cents = Math.round(counter_offer * 100);
    }

    const { data: app, error } = await supabase
      .from("applications")
      .insert({
        request_id,
        wedflexer_id: user.id,
        message: message.trim(),
        bid_cents,
        file_urls: file_urls ?? null,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, id: app.id });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errStr(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createUserClient();
    const { user, response } = await requireAuth(supabase);
    if (!user) return response!;

    const rl = checkRateLimit(rateLimitKey(req, user.id), RATE_LIMITS.read);
    if (rl) return rl;

    const { data, error } = await supabase
      .from("applications")
      .select("id, request_id, message, bid_cents, status, created_at")
      .eq("wedflexer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errStr(e) }, { status: 500 });
  }
}
