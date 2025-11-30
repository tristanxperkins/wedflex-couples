"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../../supabase/client";

export default function CoupleSignInPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPath, setNextPath] = useState<string | null>(null);

  // Read ?next= from URL so we can send it through the magic-link callback
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

      // Build callback URL specifically for the COUPLES app
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
    <main className="min-h-screen bg-[#faf5ff] text-brand-charcoal">
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] items-start">
          {/* LEFT: Sign-in card */}
          <section className="bg-white rounded-3xl shadow-sm border border-brand-primary/10 px-6 py-7 md:px-8 md:py-9">
            <p className="text-xs font-semibold tracking-[0.25em] text-brand-primary uppercase mb-2">
              Couple account sign in
            </p>

            <h1 className="text-3xl md:text-4xl font-extrabold text-brand-primary mb-2">
              Sign in to WedFlex your wedding.
            </h1>

            <p className="text-sm md:text-base text-brand-charcoal/80 mb-6 max-w-lg">
              We&apos;ll send you a one-time secure link to sign in. No password to
              remember, just your email.
            </p>

            {sent ? (
              <div className="rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-4 text-sm space-y-2">
                <p>
                  A sign-in link was sent to <strong>{email}</strong>. Check your
                  email and click the link to continue planning your wedding on WedFlex.
                </p>
                <p className="text-[11px] text-brand-charcoal/60">
                  If you don&apos;t see it after a minute, check your promotions or spam
                  folder.
                </p>
              </div>
            ) : (
              <form onSubmit={sendLink} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-brand-primary mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/60"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending || !email}
                  className="inline-flex items-center justify-center rounded-xl bg-brand-primary text-white px-5 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-60 hover:bg-brand-primary-dark transition"
                >
                  {sending ? "Sending link…" : "Send one-time sign-in link"}
                </button>

                {error && (
                  <p className="text-xs text-red-600 mt-1">Error: {error}</p>
                )}

                <p className="text-[11px] text-brand-charcoal/60 mt-2">
                  By continuing, you agree to receive a one-time sign-in link from
                  WedFlex to this email address.
                </p>
              </form>
            )}
          </section>

          {/* RIGHT: Brand story card */}
          <section className="space-y-4">
            <div className="rounded-3xl bg-brand-primary text-white px-6 py-7 md:px-8 md:py-9 shadow-sm">
              <p className="text-xs font-semibold tracking-[0.25em] uppercase mb-3">
                Learn more about the WedFlex revolution
              </p>

              <h2 className="text-2xl md:text-3xl font-extrabold mb-4 leading-snug">
                WedFlex is putting an end to overpriced weddings ❌
              </h2>

              <ul className="space-y-2 text-sm md:text-[15px]">
                <li>💍 Getting married shouldn&apos;t cause financial stress.</li>
                <li>
                  🏡 Strong marriages are the foundation of strong communities.
                </li>
                <li>
                  🛡️ We prioritize trust and safety for couples and WedFlexers.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl bg-white border border-brand-primary/10 px-5 py-4 text-sm shadow-sm">
              <p className="font-medium text-brand-charcoal">
                Join the WedFlex revolution with this secure, one-time sign-in 🔐
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
