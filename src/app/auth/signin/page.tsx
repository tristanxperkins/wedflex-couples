"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../../supabase/client";

export default function CoupleAuthPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPath, setNextPath] = useState<string>("/post-your-first-offer");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    setNextPath(url.searchParams.get("next") || "/post-your-first-offer");
  }, []);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);

    try {
      const sb = supabaseBrowser();
      const redirectBase = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectBase },
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
          {/* LEFT: Auth card */}
          <section className="bg-white rounded-3xl shadow-sm border border-brand-primary/10 px-6 py-7 md:px-8 md:py-9">
            <p className="text-xs font-semibold tracking-[0.25em] text-brand-primary uppercase mb-2">
              Couples
            </p>

            <h1 className="text-3xl md:text-4xl font-extrabold text-brand-primary mb-2">
              Sign in to WedFlex
            </h1>

            <p className="text-sm md:text-base text-brand-charcoal/80 mb-6 max-w-lg">
              We&apos;ll send you a one-time secure link to sign in. No password to
              remember, just your email.
            </p>

            {sent ? (
              <div className="rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-4 text-sm">
                <p className="font-semibold text-brand-primary">Magic link sent ✉️</p>
                <p className="mt-1 text-brand-charcoal/80">
                  We emailed a one-time sign-in link to{" "}
                  <span className="font-semibold">{email}</span>. Open it on this
                  device to continue.
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

                {error && <p className="text-xs text-red-600">Error: {error}</p>}

                <button
                  type="submit"
                  disabled={sending || !email}
                  className="inline-flex items-center justify-center rounded-xl bg-brand-primary text-white px-5 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-60 hover:bg-brand-primary-dark transition w-full"
                >
                  {sending ? "Sending link…" : "Send one-time sign in link"}
                </button>

                <p className="text-[11px] text-brand-charcoal/60">
                  By continuing, you agree to WedFlex Terms.
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
                Join the WedFlex revolution with this secure sign-in 🔐
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
