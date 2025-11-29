// app/auth/signin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../../supabase/client";

export default function CoupleSignInPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPath, setNextPath] = useState<string | null>(null);

  // Read ?next= from URL on the client
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const next = url.searchParams.get("next");
    setNextPath(next);
  }, []);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const sb = supabaseBrowser();

      if (typeof window === "undefined") throw new Error("Window not available");

      // Build callback URL for THIS app, with role=couple + next
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("role", "couple");
      if (nextPath) callbackUrl.searchParams.set("next", nextPath);

      const { error } = await sb.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callbackUrl.toString(),
        },
      });
      if (error) throw error;

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-brand-primary mb-4">
        Sign in to continue
      </h1>

      {sent ? (
        <div className="rounded border border-brand-primary/30 bg-brand-primary/5 p-4 text-sm">
          <p>
            A secure sign-in link was sent to <strong>{email}</strong>. Check your
            email and click the link to return to WedFlex.
          </p>
        </div>
      ) : (
        <form onSubmit={sendLink} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-brand-primary mb-1">
              Email address
            </label>
            <input
              type="email"
              required
              className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={sending || !email}
            className="w-full rounded-lg bg-brand-primary text-white py-2.5 text-sm font-semibold disabled:opacity-60 hover:bg-brand-primary-dark"
          >
            {sending ? "Sending link…" : "Send magic link"}
          </button>

          {error && <p className="text-xs text-red-600 mt-2">Error: {error}</p>}

          <p className="text-[11px] text-brand-charcoal/60 mt-2">
            We&apos;ll email you a one-time sign-in link. No passwords to remember.
          </p>
        </form>
      )}
    </main>
  );
}
