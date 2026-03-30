import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Create a Supabase client scoped to the calling user's auth token (RLS). */
export async function createUserClient() {
  const hdrs = await headers();
  const auth = hdrs.get("authorization") ?? "";
  return createClient(url, anon, {
    global: { headers: { Authorization: auth } },
  });
}

/** Create a Supabase admin client (bypasses RLS). Server-only. */
export function createAdminClient() {
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, service);
}

/** Authenticate the caller. Returns the user or a 401 response. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function requireAuth(supabase: { auth: { getUser: () => Promise<any> } }) {
  const { data: me, error } = await supabase.auth.getUser();
  if (error || !me?.user) {
    return {
      user: null,
      response: NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      ),
    };
  }
  return { user: me.user, response: null };
}

/** Extract a rate-limit key from the request (user ID preferred, fallback to IP). */
export function rateLimitKey(req: NextRequest, userId?: string): string {
  if (userId) return userId;
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/** Standard error serializer */
export function errStr(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
