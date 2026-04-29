import { NextResponse, type NextRequest } from "next/server";
import { createUserClient, requireAuth, rateLimitKey, errStr } from "@/app/lib/api-helpers";
import { checkRateLimit, RATE_LIMITS } from "@/app/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createUserClient();
    const { user, response } = await requireAuth(supabase);
    if (!user) return response!;

    const rl = await checkRateLimit(rateLimitKey(req, user.id), RATE_LIMITS.read);
    if (rl) return rl;

    const { data, error } = await supabase
      .from("service_requests")
      .select("id, title, category, status, created_at, awarded_wedflexer_id")
      .eq("couple_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errStr(e) }, { status: 500 });
  }
}
