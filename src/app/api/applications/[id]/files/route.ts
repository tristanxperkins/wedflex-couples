export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { FileSignedUrlSchema, zodError } from "@/app/lib/validation";
import { createUserClient, createAdminClient, requireAuth, rateLimitKey, errStr } from "@/app/lib/api-helpers";
import { checkRateLimit, RATE_LIMITS } from "@/app/lib/rate-limit";

type AppRow = {
  id: string;
  wedflexer_id: string;
  request_id: string;
  file_urls: string[] | null;
};

type ReqRow = {
  id: string;
  couple_id: string;
};

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = FileSignedUrlSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(zodError(parsed), { status: 400 });
    }

    const { application_id, file_path } = parsed.data;

    const userClient = await createUserClient();
    const { user, response } = await requireAuth(userClient);
    if (!user) return response!;

    const rl = checkRateLimit(rateLimitKey(req, user.id), RATE_LIMITS.read);
    if (rl) return rl;

    // Get the application
    const { data: app, error: aErr } = await userClient
      .from("applications")
      .select("id, wedflexer_id, request_id, file_urls")
      .eq("id", application_id)
      .single<AppRow>();

    if (aErr || !app) {
      return NextResponse.json({ ok: false, error: "Application not found" }, { status: 404 });
    }

    // Look up the service request for couple_id
    const { data: reqRow, error: rErr } = await userClient
      .from("service_requests")
      .select("id, couple_id")
      .eq("id", app.request_id)
      .single<ReqRow>();

    if (rErr || !reqRow) {
      return NextResponse.json({ ok: false, error: "Related request not found" }, { status: 404 });
    }

    // Authorization: only the app's wedflexer or the request's couple
    const isOwner = user.id === app.wedflexer_id || user.id === reqRow.couple_id;
    if (!isOwner) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const serverClient = createAdminClient();
    const { data: signed, error: sErr } = await serverClient.storage
      .from("application_files")
      .createSignedUrl(file_path, 60 * 10);

    if (sErr) {
      return NextResponse.json({ ok: false, error: sErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, url: signed.signedUrl });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errStr(e) }, { status: 500 });
  }
}
