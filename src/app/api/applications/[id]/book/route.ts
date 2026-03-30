import { NextResponse, type NextRequest } from "next/server";
import { BookRequestSchema, zodError } from "@/app/lib/validation";
import { createUserClient, requireAuth, rateLimitKey, errStr } from "@/app/lib/api-helpers";
import { checkRateLimit, RATE_LIMITS } from "@/app/lib/rate-limit";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: request_id } = await context.params;

    const json = await req.json();
    const parsed = BookRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(zodError(parsed), { status: 400 });
    }

    const { application_id } = parsed.data;

    if (!request_id) {
      return NextResponse.json(
        { ok: false, error: "Missing request_id" },
        { status: 400 }
      );
    }

    const supabase = await createUserClient();
    const { user, response } = await requireAuth(supabase);
    if (!user) return response!;

    const rl = checkRateLimit(rateLimitKey(req, user.id), RATE_LIMITS.sensitive);
    if (rl) return rl;

    // Verify request ownership & openness
    const { data: reqRow, error: reqErr } = await supabase
      .from("service_requests")
      .select("id, couple_id, status")
      .eq("id", request_id)
      .single();

    if (reqErr || !reqRow)
      return NextResponse.json({ ok: false, error: "Request not found" }, { status: 404 });

    if (reqRow.status !== "open")
      return NextResponse.json({ ok: false, error: "Request not open" }, { status: 400 });

    if (user.id !== reqRow.couple_id)
      return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 403 });

    const { data: appRow, error: appErr } = await supabase
      .from("applications")
      .select("id, request_id, wedflexer_id")
      .eq("id", application_id)
      .eq("request_id", request_id)
      .single();

    if (appErr || !appRow)
      return NextResponse.json(
        { ok: false, error: "Application not found for this request" },
        { status: 404 }
      );

    // Accept chosen application
    const { error: winnerErr } = await supabase
      .from("applications")
      .update({ status: "accepted" })
      .eq("id", application_id);
    if (winnerErr)
      return NextResponse.json({ ok: false, error: winnerErr.message }, { status: 400 });

    // Reject all others
    const { error: rejectErr } = await supabase
      .from("applications")
      .update({ status: "rejected" })
      .eq("request_id", request_id)
      .neq("id", application_id);
    if (rejectErr)
      return NextResponse.json({ ok: false, error: rejectErr.message }, { status: 400 });

    // Mark request as awarded
    const { error: updErr } = await supabase
      .from("service_requests")
      .update({
        status: "awarded",
        awarded_application_id: application_id,
        awarded_wedflexer_id: appRow.wedflexer_id,
        awarded_at: new Date().toISOString(),
      })
      .eq("id", request_id)
      .eq("couple_id", user.id);
    if (updErr)
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errStr(e) }, { status: 500 });
  }
}
