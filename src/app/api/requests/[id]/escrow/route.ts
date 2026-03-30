import { NextResponse, type NextRequest } from "next/server";
import { CreateEscrowSchema, zodError } from "@/app/lib/validation";
import { createUserClient, requireAuth, rateLimitKey, errStr } from "@/app/lib/api-helpers";
import { checkRateLimit, RATE_LIMITS } from "@/app/lib/rate-limit";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: request_id } = await ctx.params;

    const json = await req.json();
    const parsed = CreateEscrowSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(zodError(parsed), { status: 400 });
    }

    const amount_cents = parsed.data.amount_cents!;

    if (!request_id) {
      return NextResponse.json(
        { ok: false, error: "Missing request_id" },
        { status: 400 }
      );
    }

    const sb = await createUserClient();
    const { user, response } = await requireAuth(sb);
    if (!user) return response!;

    const rl = checkRateLimit(rateLimitKey(req, user.id), RATE_LIMITS.sensitive);
    if (rl) return rl;

    // Request must belong to me (couple), be awarded, and have a winner
    const { data: reqRow, error: rErr } = await sb
      .from("service_requests")
      .select("id, couple_id, status, awarded_wedflexer_id")
      .eq("id", request_id)
      .single();

    if (rErr || !reqRow) {
      return NextResponse.json({ ok: false, error: "Request not found" }, { status: 404 });
    }
    if (reqRow.couple_id !== user.id) {
      return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 403 });
    }
    if (reqRow.status !== "awarded" || !reqRow.awarded_wedflexer_id) {
      return NextResponse.json(
        { ok: false, error: "Request must be awarded first" },
        { status: 400 }
      );
    }

    const { data, error } = await sb
      .from("payments")
      .insert({
        request_id,
        couple_id: user.id,
        wedflexer_id: reqRow.awarded_wedflexer_id,
        amount_cents,
        status: "escrowed",
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errStr(e) }, { status: 500 });
  }
}
