import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const ServiceRequestSchema = z.object({
  title: z.string().min(1, "Title required"),
  category: z.string().min(1, "Category required"),
  // This is effectively the "city" field on your form
  location: z.string().min(1, "City is required"),

  // Optional / future fields
  offer_cents: z.union([z.string(), z.number()]).optional().nullable(),
  description: z.string().optional(),
  accepted_terms: z.boolean().optional(),
  inspiration_images: z.array(z.string()).optional(),
});

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    // 1) Parse and validate the request body with Zod
    const json = await req.json();
    const parsed = ServiceRequestSchema.safeParse(json);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;

      // You can shape this however you want; keeping it simple:
      return NextResponse.json(
        {
          ok: false,
          error: "Validation failed",
          details: fieldErrors,
        },
        { status: 400 },
      );
    }

    const { title, category, location, offer_cents, description, accepted_terms, inspiration_images } =
      parsed.data;

    // 2) Normalize offer_cents into a safe integer or null
    const cents =
      offer_cents === null || offer_cents === undefined
        ? null
        : Number.isFinite(Number(offer_cents))
        ? Math.max(0, Math.floor(Number(offer_cents)))
        : null;

    // 3) Build a supabase client using the incoming Authorization header
    const hdrs = await headers();
    const auth = hdrs.get("authorization") ?? "";

    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });

    // 4) Who is the couple?
    const { data: me, error: uErr } = await supabase.auth.getUser();
    if (uErr || !me?.user) {
      return NextResponse.json(
        { ok: false, error: "not authenticated" },
        { status: 401 },
      );
    }

    // 5) Prepare insert payload for service_requests
    const insert: Record<string, unknown> = {
      title: String(title).trim(),
      category: String(category).trim(),
      location: String(location).trim(), // this is your required "city"
      offer_cents: cents,
      couple_id: me.user.id,
      status: "open" as const,
    };

    // Optional fields if your table has these columns:
    if (description !== undefined) {
      insert.description = description.trim();
    }
    if (accepted_terms !== undefined) {
      insert.accepted_terms = accepted_terms;
    }
    if (inspiration_images !== undefined) {
      insert.inspiration_images = inspiration_images;
    }

    // 6) Insert and return new id
    const { data, error } = await supabase
      .from("service_requests")
      .insert(insert)
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
