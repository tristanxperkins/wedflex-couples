"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../supabase/client";

type Mode = "signin" | "signup" | "reset";

export default function CoupleAuthPage() {
  const router = useRouter();
  const sb = supabaseBrowser();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [nextPath, setNextPath] = useState<string>("/post-your-first-offer");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    setNextPath(url.searchParams.get("next") || "/post-your-first-offer");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setMsg(null);

    try {
      if (!email) throw new Error("Email is required.");

      if (mode === "reset") {
        // Password reset email - this DOES use redirect, but it only needs to return to the couples app
        const baseUrl =
          process.env.NEXT_PUBLIC_SITE_URL ||
          process.env.NEXT_PUBLIC_APP_ORIGIN ||
          window.location.origin;

        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: `${baseUrl}/auth/reset`,
        });
        if (error) throw error;
        setMsg("Check your email for a password reset link.");
        return;
      }

      if (!password || password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      if (mode === "signup") {
        // Create account
        const { error } = await sb.auth.signUp({
          email,
          password,
          options: {
            data: { role: "couple" }, // optional metadata
          },
        });
        if (error) throw error;

        // If email confirmations are ON, user may need to confirm first.
        // If OFF, they’ll be signed in immediately.
        setMsg("Account created. If prompted, confirm your email, then sign in.");
        setMode("signin");
        return;
      }

      // Sign in
      const { error } = await sb.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Optional: ensure couple profile exists (safe + idempotent)
      const { data: me } = await sb.auth.getUser();
      if (me?.user) {
        await sb.from("couple_profiles").upsert(
          { id: me.user.id }, // adjust if your PK is different
          { onConflict: "id" }
        );
      }

      router.replace(nextPath);
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
              {mode === "signin" && "Sign in to WedFlex"}
              {mode === "signup" && "Create your WedFlex account"}
              {mode === "reset" && "Reset your password"}
            </h1>

            <p className="text-sm md:text-base text-brand-charcoal/80 mb-6 max-w-lg">
              {mode === "reset"
                ? "Enter your email and we’ll send a password reset link."
                : "Use your email and password to continue. No magic links for couples (keeps redirects clean)."}
            </p>

            {msg && (
              <div className="rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-4 text-sm mb-4">
                {msg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
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

              {mode !== "reset" && (
                <div>
                  <label className="block text-xs font-semibold text-brand-primary mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/60"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                  />
                </div>
              )}

              {error && <p className="text-xs text-red-600">Error: {error}</p>}

              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center justify-center rounded-xl bg-brand-primary text-white px-5 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-60 hover:bg-brand-primary-dark transition w-full"
              >
                {sending
                  ? "Working…"
                  : mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
              </button>

              <div className="flex flex-wrap gap-3 text-[12px]">
                {mode !== "signin" && (
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="text-brand-primary underline"
                  >
                    Sign in instead
                  </button>
                )}
                {mode !== "signup" && (
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-brand-primary underline"
                  >
                    Create an account
                  </button>
                )}
                {mode !== "reset" && (
                  <button
                    type="button"
                    onClick={() => setMode("reset")}
                    className="text-brand-primary underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <p className="text-[11px] text-brand-charcoal/60">
                By continuing, you agree to WedFlex Terms.
              </p>
            </form>
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
