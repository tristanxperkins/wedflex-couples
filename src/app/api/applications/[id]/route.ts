import { NextResponse, type NextRequest } from "next/server";
import { UpdateApplicationStatusSchema, zodError } from "@/app/lib/validation";
import { createUserClient, rateLimitKey, errStr } from "@/app/lib/api-helpers";
import { checkRateLimit, RATE_LIMITS } from "@/app/lib/rate-limit";

interface Params {
  id: string;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<Params> }
) {
  try {
    const { id } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    const parsed = UpdateApplicationStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(zodError(parsed), { status: 400 });
    }

    const supabase = await createUserClient();

    const rl = checkRateLimit(rateLimitKey(req), RATE_LIMITS.mutation);
    if (rl) return rl;

    const { data, error } = await supabase
      .from("applications")
      .update({ status: parsed.data.status })
      .eq("id", id)
      .select("id, request_id, status, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errStr(e) }, { status: 500 });
  }
}
