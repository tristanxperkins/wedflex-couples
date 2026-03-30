import { NextResponse, type NextRequest } from "next/server";
import { CreateServiceRequestSchema, zodError } from "@/app/lib/validation";
import { createUserClient, requireAuth, rateLimitKey, errStr } from "@/app/lib/api-helpers";
import { checkRateLimit, RATE_LIMITS } from "@/app/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = CreateServiceRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(zodError(parsed), { status: 400 });
    }

    const { title, category, location, offer_cents, description, accepted_terms, inspiration_images } =
      parsed.data;

    const supabase = await createUserClient();
    const { user, response } = await requireAuth(supabase);
    if (!user) return response!;

    // Rate limit
    const rl = checkRateLimit(rateLimitKey(req, user.id), RATE_LIMITS.mutation);
    if (rl) return rl;

    const insert: Record<string, unknown> = {
      title: title.trim(),
      category: category.trim(),
      location: location.trim(),
      offer_cents,
      couple_id: user.id,
      status: "open" as const,
    };

    if (description !== undefined) insert.description = description.trim();
    if (accepted_terms !== undefined) insert.accepted_terms = accepted_terms;
    if (inspiration_images !== undefined) insert.inspiration_images = inspiration_images;

    const { data, error } = await supabase
      .from("service_requests")
      .insert(insert)
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errStr(e) }, { status: 500 });
  }
}
