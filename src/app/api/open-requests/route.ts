import { NextResponse, type NextRequest } from "next/server";
import { createUserClient, rateLimitKey, errStr } from "@/app/lib/api-helpers";
import { checkRateLimit, RATE_LIMITS } from "@/app/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(rateLimitKey(req), RATE_LIMITS.read);
    if (rl) return rl;

    const supabase = await createUserClient();

    const { data, error } = await supabase
      .from("service_requests")
      .select("id, title, category, location, offer_cents, status, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errStr(e) }, { status: 500 });
  }
}
