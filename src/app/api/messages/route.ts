import { NextResponse, type NextRequest } from "next/server";
import { SendMessageSchema, zodError } from "@/app/lib/validation";
import { createUserClient, requireAuth, rateLimitKey, errStr } from "@/app/lib/api-helpers";
import { checkRateLimit, RATE_LIMITS } from "@/app/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createUserClient();
    const { user, response } = await requireAuth(supabase);
    if (!user) return response!;

    const rl = checkRateLimit(rateLimitKey(req, user.id), RATE_LIMITS.read);
    if (rl) return rl;

    const { searchParams } = new URL(req.url);
    const otherUserId = searchParams.get("other");
    const requestId = searchParams.get("request");

    if (!otherUserId) {
      return NextResponse.json(
        { ok: false, error: "Missing other user id" },
        { status: 400 }
      );
    }

    const myId = user.id;
    const [u1, u2] =
      myId < otherUserId ? [myId, otherUserId] : [otherUserId, myId];

    const { data: threadRow, error: threadErr } = await supabase
      .from("message_threads")
      .select("id")
      .eq("user_one", u1)
      .eq("user_two", u2)
      .eq("request_id", requestId || null)
      .single();

    if (threadErr || !threadRow) {
      return NextResponse.json({ ok: true, messages: [] });
    }

    const { data: msgs, error: msgErr } = await supabase
      .from("messages")
      .select("id,sender_id,body,file_url,created_at")
      .eq("thread_id", threadRow.id)
      .order("created_at", { ascending: true });

    if (msgErr) throw msgErr;

    return NextResponse.json({ ok: true, messages: msgs ?? [] });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: errStr(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = SendMessageSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(zodError(parsed), { status: 400 });
    }

    const { other: otherUserId, request_id: requestId, text, file_url: fileUrl } = parsed.data;

    const supabase = await createUserClient();
    const { user, response } = await requireAuth(supabase);
    if (!user) return response!;

    const rl = checkRateLimit(rateLimitKey(req, user.id), RATE_LIMITS.mutation);
    if (rl) return rl;

    const myId = user.id;
    const [u1, u2] =
      myId < otherUserId ? [myId, otherUserId] : [otherUserId, myId];

    // Find or create thread
    const { data: threadRow, error: findErr } = await supabase
      .from("message_threads")
      .select("id")
      .eq("user_one", u1)
      .eq("user_two", u2)
      .eq("request_id", requestId || null)
      .single();

    let threadId: string | null = null;

    if (!findErr && threadRow) {
      threadId = threadRow.id;
    } else {
      const { data: newThread, error: insertErr } = await supabase
        .from("message_threads")
        .insert({
          user_one: u1,
          user_two: u2,
          request_id: requestId || null,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertErr || !newThread) {
        return NextResponse.json(
          { ok: false, error: errStr(insertErr) },
          { status: 400 }
        );
      }
      threadId = newThread.id;
    }

    const { data: newMsg, error: msgErr } = await supabase
      .from("messages")
      .insert({
        thread_id: threadId,
        sender_id: myId,
        body: text.trim(),
        file_url: fileUrl ?? null,
      })
      .select("id,sender_id,body,file_url,created_at")
      .single();

    if (msgErr || !newMsg) {
      return NextResponse.json(
        { ok: false, error: errStr(msgErr) },
        { status: 400 }
      );
    }

    await supabase
      .from("message_threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", threadId);

    return NextResponse.json({ ok: true, message: newMsg });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: errStr(e) },
      { status: 500 }
    );
  }
}
