"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "../supabase/client";
import UploadInput from "../components/UploadInput";
import { CATEGORY_OPTIONS, CITY_OPTIONS } from "../lib/constants";

function cx(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(" ");
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function PostFirstOfferPage() {
  const router = useRouter();

  // -------------------------
  // STEP CONTROL
  // -------------------------
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // -------------------------
  // AUTH (STEP 1)
  // -------------------------
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");

  async function refreshAuth() {
    setCheckingAuth(true);
    const sb = supabaseBrowser();
    const { data } = await sb.auth.getUser();
    const authed = !!data?.user;
    setIsAuthed(authed);
    setUserEmail(data?.user?.email ?? null);
    setCheckingAuth(false);
  }

  useEffect(() => {
    void refreshAuth();
  }, []);

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setNote(null);
    setBusy(true);

    try {
      const sb = supabaseBrowser();
      const email = authEmail.trim().toLowerCase();
      const password = authPassword;

      if (!isValidEmail(email)) throw new Error("Please enter a valid email.");
      if (password.length < 8) throw new Error("Password must be at least 8 characters.");

      if (authMode === "signup") {
        const { error, data } = await sb.auth.signUp({
          email,
          password,
          options: { data: { role: "couple" } },
        });
        if (error) throw error;

        // If email confirmations are ON, session may be null until confirmed.
        if (!data?.session) {
          setNote(
            "Account created. If email confirmation is enabled, check your inbox to confirm, then come back and sign in."
          );
          return;
        }

        await refreshAuth();
        setNote("Account created — you’re signed in. Continue to Step 2.");
        setStep(2);
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;

        await refreshAuth();
        setNote("Signed in. Continue to Step 2.");
        setStep(2);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const sb = supabaseBrowser();
    await sb.auth.signOut();
    setIsAuthed(false);
    setUserEmail(null);
    setStep(1);
  }

  // -------------------------
  // OFFER FORM (STEP 2)
  // -------------------------
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [eventDate, setEventDate] = useState(""); // yyyy-mm-dd
  const [eventTime, setEventTime] = useState(""); // hh:mm
  const [guestCount, setGuestCount] = useState<string>("");

  const [details, setDetails] = useState("");
  const [inspirationLink, setInspirationLink] = useState("");
  const [inspirationImages, setInspirationImages] = useState<string[]>([]);
  const [offerAmount, setOfferAmount] = useState<string>("");

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const canSubmitOffer = useMemo(() => {
    const gc = Number(String(guestCount).replace(/\D/g, ""));
    const dollars = Number(offerAmount.replace(/[^0-9.]/g, ""));
    return (
      isAuthed &&
      title.trim().length > 0 &&
      category.trim().length > 0 &&
      city.trim().length > 0 &&
      eventDate.length > 0 &&
      eventTime.length > 0 &&
      Number.isFinite(gc) &&
      gc > 0 &&
      details.trim().length > 0 &&
      Number.isFinite(dollars) &&
      dollars > 0 &&
      acceptedTerms
    );
  }, [
    isAuthed,
    title,
    category,
    city,
    eventDate,
    eventTime,
    guestCount,
    details,
    offerAmount,
    acceptedTerms,
  ]);

  async function submitOffer() {
    setErr(null);
    setNote(null);
    setBusy(true);

    try {
      const sb = supabaseBrowser();
      const { data: me } = await sb.auth.getUser();
      if (!me?.user) throw new Error("Not signed in. Please create an account first.");

      // event_at = timestamp with time; service_date = date only
      const eventAt = new Date(`${eventDate}T${eventTime}:00`).toISOString();
      const serviceDate = eventDate; // YYYY-MM-DD

      const gc = Number(String(guestCount).replace(/\D/g, ""));
      const dollars = Number(offerAmount.replace(/[^0-9.]/g, ""));
      const offerCents = Math.round(dollars * 100);

      const { error } = await sb.from("service_requests").insert({
        title: title.trim(),
        category: category.trim(),
        location: city.trim(),
        service_date: serviceDate,
        event_at: eventAt,
        guest_count: gc,
        details: details.trim(),
        inspiration_link: inspirationLink || null,
        inspiration_images: inspirationImages.length ? inspirationImages : null,
        offer_cents: offerCents,
        status: "open",
        accept_terms: acceptedTerms,
        couple_id: me.user.id,
      });

      if (error) throw error;

      setNote("Offer posted. Continue to Step 3 to finalize your dashboard.");
      setStep(3);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // -------------------------
  // STEP 3: FINALIZE DASHBOARD
  // -------------------------
  async function finalizeDashboard() {
    setErr(null);
    setNote(null);
    setBusy(true);

    try {
      const sb = supabaseBrowser();
      const { data: me } = await sb.auth.getUser();
      if (!me?.user) throw new Error("Not signed in.");

      // Optional: ensure a couple profile row exists (only if your table exists)
      // If your table is named differently, change "couple_profiles".
      // If you don't want this, you can delete this block safely.
      await sb.from("couple_profiles").upsert(
        {
          id: me.user.id,
          email: me.user.email ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      router.push("/dashboard/couple?onboarded=1");
    } catch (e) {
      // If couple_profiles table doesn't exist, just go to dashboard anyway.
      console.warn("Finalize dashboard warning:", e);
      router.push("/dashboard/couple?onboarded=1");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="bg-white text-brand-charcoal min-h-[80vh]">
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14 space-y-10">
        {/* Top intro */}
        <section className="grid gap-10 lg:grid-cols-[1.2fr_1fr] items-center">
          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-[0.25em] text-brand-primary uppercase">
              It&apos;s time to WedFlex Your Wedding!
            </p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-brand-primary">
               Let&apos;s post your first WedFlex offer
            </h1>
            <p className="text-sm md:text-base text-brand-charcoal max-w-xl">
              Offers connect you with WedFlexers who can help with your wedding needs.
              Your offer will detail the wedding services
              you need and the pay you are offering.            
                        </p>


            <div className="grid gap-3 text-sm">
              <div className="flex gap-3 items-start">
                <span className="text-lg">🟪</span>
                <p>
                  <strong>First</strong>, we&apos;ll create a quick profile
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-lg">🟪</span>
                <p>
                  <strong>Next</strong>, you&apos;ll post an offer for any wedding service (bridal bouquet, a dj, a day-of coordinator, etc.)
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-lg">🟪</span>
                <p>
                  <strong>Get Applications</strong> from WedFlexers who want to help with your offer. Review WedFlexers and chat to confirm details from your Dashboard.
                                  </p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-lg">🟪</span>
                <p>
                  <strong>Book, pay, and relax.</strong> WedFlex holds payment to WedFlexers until
                  the service is delivered.
                </p>
 </div>
  </div>

            <div className="flex items-center gap-2 text-xs text-brand-charcoal/70">
              <span>Step {step} of 3</span>
              <div className="flex gap-1">
                {[1, 2, 3].map((s) => (
                  <span
                    key={s}
                    className={cx(
                      "h-2 w-6 rounded-full",
                      step === s ? "bg-brand-primary" : "bg-brand-primary/20"
                    )}
                  />
                ))}
              </div>
            </div>

            {err && <p className="text-xs text-red-600">Error: {err}</p>}
            {note && <p className="text-xs text-emerald-700">{note}</p>}
          </div>

          <div className="relative h-[260px] md:h-[320px] lg:h-[360px] rounded-3xl overflow-hidden shadow-xl">
            <Image
              src="/images/bouquet.jpg"
              alt="Wedding inspiration"
              fill
              className="object-cover object-center"
              style={{ objectPosition: "50% 25%" }}
              priority
            />
          </div>
        </section>

        {/* STEP 1: Create Account */}
        {step === 1 && (
          <section className="rounded-3xl border border-brand-primary/15 bg-white shadow-sm p-6 md:p-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-2">
              <h2 className="text-lg md:text-xl font-bold text-brand-primary">
                Step 1: Create your account
              </h2>
              <p className="text-sm text-brand-charcoal max-w-lg">
                Couples use an email + password to sign in. (No magic links.)
              </p>

              {checkingAuth ? (
                <p className="text-xs text-brand-charcoal/70">Checking sign-in…</p>
              ) : isAuthed ? (
                <div className="rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-4 text-xs space-y-2">
                  <p>
                    Signed in as <span className="font-semibold">{userEmail}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold bg-brand-primary text-white hover:bg-brand-primary-dark"
                    >
                      Continue to Step 2
                    </button>
                    <button
                      type="button"
                      onClick={signOut}
                      className="inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold border border-brand-primary text-brand-primary hover:bg-white"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-brand-charcoal/70">
                  Create an account if you’re new, or sign in if you already have one.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-brand-primary/20 bg-white p-5 space-y-3 text-sm">
              {isAuthed ? (
                <p className="text-sm text-brand-charcoal">
                  You’re signed in. Click “Continue to Step 2”.
                </p>
              ) : (
                <>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("signup");
                        setErr(null);
                        setNote(null);
                      }}
                      className={cx(
                        "px-3 py-2 rounded-full text-xs font-semibold border",
                        authMode === "signup"
                          ? "bg-brand-primary text-white border-brand-primary"
                          : "bg-white text-brand-primary border-brand-primary/30"
                      )}
                    >
                      Create account
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("signin");
                        setErr(null);
                        setNote(null);
                      }}
                      className={cx(
                        "px-3 py-2 rounded-full text-xs font-semibold border",
                        authMode === "signin"
                          ? "bg-brand-primary text-white border-brand-primary"
                          : "bg-white text-brand-primary border-brand-primary/30"
                      )}
                    >
                      Sign in
                    </button>
                  </div>

                  <form onSubmit={handleAuthSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-brand-primary mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="you@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-brand-primary mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="At least 8 characters"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={busy || !authEmail || !authPassword}
                      className="w-full inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold bg-brand-primary text-white hover:bg-brand-primary-dark disabled:opacity-60"
                    >
                      {busy
                        ? "Working…"
                        : authMode === "signup"
                        ? "Create account"
                        : "Sign in"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </section>
        )}

        {/* STEP 2: Offer form + terms */}
        {step === 2 && (
          <section className="rounded-3xl border border-brand-primary/15 bg-white shadow-sm p-6 md:p-8 space-y-6">
            <header className="space-y-2">
              <h2 className="text-lg md:text-xl font-bold text-brand-primary">
                Step 2: Post your offer
              </h2>
              <p className="text-sm text-brand-charcoal max-w-2xl">
                Fill everything out below and accept the terms to post.
              </p>
            </header>

            {!isAuthed && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                You must complete Step 1 (create account) before posting.
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold bg-brand-primary text-white hover:bg-brand-primary-dark"
                  >
                    Go to Step 1
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-brand-primary mb-1">
                  Title *
                </label>
                <input
                  className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Example: Need help setting up chairs + decor"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-primary mb-1">
                  Category *
                </label>
                <select
                  className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm bg-white"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Select…</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-brand-primary mb-1">
                  City *
                </label>
                <select
                  className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm bg-white"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  <option value="">Select…</option>
                  {CITY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-primary mb-1">
                  Guest count *
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm"
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  placeholder="120"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-brand-primary mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-primary mb-1">
                  Time *
                </label>
                <input
                  type="time"
                  className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-primary mb-1">
                Details *
              </label>
              <textarea
                className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm min-h-[120px]"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Explain exactly what you need, timing, expectations, dress code, etc."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-brand-primary mb-1">
                  Inspiration link (optional)
                </label>
                <input
                  className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm"
                  value={inspirationLink}
                  onChange={(e) => setInspirationLink(e.target.value)}
                  placeholder="Pinterest / Google Drive link"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-primary mb-1">
                  Offer amount (USD) *
                </label>
                <div className="flex items-center gap-2">
                  <span>$</span>
                  <input
                    className="flex-1 border border-brand-primary/30 rounded-lg px-3 py-2 text-sm"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    placeholder="250"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-brand-primary mb-1">
                Upload inspiration photos (optional)
              </label>
              <UploadInput
                bucket="wedding_inspo"
                label="Upload inspiration images"
                multiple
                onUploaded={(url) => setInspirationImages((prev) => [url, ...prev])}
              />
              {inspirationImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {inspirationImages.map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt="Inspiration"
                      className="w-full h-20 object-cover rounded-lg border border-brand-primary/20"
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-4 text-xs space-y-2">
              <p className="font-semibold text-brand-primary text-sm">Terms & Conditions</p>
              <ul className="list-disc list-inside space-y-1 text-brand-charcoal">
                <li>You will communicate clearly and respectfully with applicants.</li>
                <li>You will not misrepresent the work, timing, or pay.</li>
                <li>You understand WedFlexers are independent contractors, not employees of WedFlex.</li>
              </ul>

              <label className="flex items-start gap-2 mt-2">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 border-brand-primary/40 rounded"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <span>I agree to these terms for posting offers on WedFlex.</span>
              </label>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs md:text-sm text-brand-charcoal/70 hover:text-brand-charcoal"
              >
                ← Back to Step 1
              </button>

              <button
                type="button"
                onClick={submitOffer}
                disabled={!canSubmitOffer || busy}
                className="inline-flex items-center rounded-full px-5 py-2 text-xs md:text-sm font-semibold bg-brand-primary text-white hover:bg-brand-primary-dark disabled:opacity-60"
              >
                {busy ? "Posting…" : "Post offer"}
              </button>
            </div>
          </section>
        )}

        {/* STEP 3: Finalize dashboard */}
        {step === 3 && (
          <section className="rounded-3xl border border-brand-primary/15 bg-white shadow-sm p-6 md:p-8 space-y-4">
            <h2 className="text-lg md:text-xl font-bold text-brand-primary">
              Step 3: Finalize your dashboard
            </h2>
            <p className="text-sm text-brand-charcoal max-w-2xl">
              Your offer is posted. Next, complete your couple profile so you can manage offers and
              choose the right WedFlexer.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={finalizeDashboard}
                disabled={busy}
                className="inline-flex items-center rounded-full px-5 py-2 text-xs md:text-sm font-semibold bg-brand-primary text-white hover:bg-brand-primary-dark disabled:opacity-60"
              >
                {busy ? "Loading…" : "Go to my dashboard"}
              </button>

              <Link
                href="/dashboard/couple"
                className="inline-flex items-center rounded-full px-5 py-2 text-xs md:text-sm font-semibold border border-brand-primary text-brand-primary hover:bg-white"
              >
                Skip and go now
              </Link>
            </div>

            <p className="text-[11px] text-brand-charcoal/60">
              If you run into issues, you can always return here and post another offer later.
            </p>
          </section>
        )}

        {/* Tiny help footer */}
        <p className="text-[11px] text-brand-charcoal/60">
          Want to go home?{" "}
          <Link href="/" className="underline text-brand-primary">
            Return to homepage
          </Link>
        </p>
      </div>
    </main>
  );
}
