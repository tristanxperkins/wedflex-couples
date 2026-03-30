import { NextResponse, type NextRequest } from "next/server";
import { createUserClient, rateLimitKey, errStr } from "@/app/lib/api-helpers";
import { checkRateLimit, RATE_LIMITS } from "@/app/lib/rate-limit";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const rl = checkRateLimit(rateLimitKey(req), RATE_LIMITS.read);
    if (rl) return rl;

    const supabase = await createUserClient();

    const { data: reqRow, error: rErr } = await supabase
      .from("service_requests")
      .select(
        "id, title, category, location, offer_cents, status, created_at, couple_id"
      )
      .eq("id", id)
      .single();

    if (rErr) {
      return NextResponse.json({ ok: false, error: "Request not found" }, { status: 404 });
    }

    // If caller is the couple owner, fetch applications
    const { data: me } = await supabase.auth.getUser();
    let applications: unknown[] = [];
    if (me?.user?.id && me.user.id === reqRow.couple_id) {
      const { data: apps } = await supabase
        .from("applications")
        .select("id, wedflexer_id, message, bid_cents, status, created_at")
        .eq("request_id", id)
        .order("created_at", { ascending: false });
      applications = apps ?? [];
    }

    return NextResponse.json({ ok: true, request: reqRow, applications });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errStr(e) }, { status: 500 });
  }
}
