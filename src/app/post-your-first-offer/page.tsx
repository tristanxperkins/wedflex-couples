"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabaseBrowser } from "../supabase/client";
import UploadInput from "../components/UploadInput";
import { CATEGORY_OPTIONS, CITY_OPTIONS } from "../lib/constants";

type Step = 1 | 2 | 3;

function cx(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(" ");
}

export default function PostYourFirstOfferPage() {
  const router = useRouter();

  // ---- AUTH STATE ----
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  

  // ---- EMBEDDED SIGN-IN STATE ----
const [authEmail, setAuthEmail] = useState("");
const [authSending, setAuthSending] = useState(false);
const [authSent, setAuthSent] = useState(false);
const [authError, setAuthError] = useState<string | null>(null);


  // ---- OFFER FORM STEP + STATE ----
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Step 1 + 2 form fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [guestCount, setGuestCount] = useState<string>("");

  const [details, setDetails] = useState("");
  const [inspirationLink, setInspirationLink] = useState("");
  const [inspirationImages, setInspirationImages] = useState<string[]>([]);
  const [offerAmount, setOfferAmount] = useState<string>("");

  // Step 3 – terms
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // ------------------------------------------------------------
  // AUTH CHECK ON LOAD
  // ------------------------------------------------------------
  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser();
      const { data } = await sb.auth.getUser();
      const authed = !!data?.user;
      setIsAuthed(authed);
      setUserEmail(data?.user?.email ?? null);
      setCheckingAuth(false);
    })();
  }, []);

  // ------------------------------------------------------------
  // EMBEDDED MAGIC LINK SIGN-IN (COUPLES)
  // ------------------------------------------------------------
  async function sendMagicLink(e: React.FormEvent) {
  e.preventDefault();
  setAuthSending(true);
  setAuthError(null);

  try {
    const sb = supabaseBrowser();
    if (typeof window === "undefined") throw new Error("Window not available");

    // We always want to come back HERE after clicking the magic link
    const nextPath = "/post-your-first-offer";

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("role", "couple");
    callbackUrl.searchParams.set("next", "/post-your-first-offer");

    const { error } = await sb.auth.signInWithOtp({
      email: authEmail,
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    if (error) throw error;
    setAuthSent(true);
  } catch (err) {
    setAuthError(err instanceof Error ? err.message : String(err));
  } finally {
    setAuthSending(false);
  }
}


  async function refreshAuth() {
    setCheckingAuth(true);
    const sb = supabaseBrowser();
    const { data } = await sb.auth.getUser();
    const authed = !!data?.user;
    setIsAuthed(authed);
    setUserEmail(data?.user?.email ?? null);
    setCheckingAuth(false);
  }

  // ------------------------------------------------------------
  // OFFER FORM STEP HANDLERS
  // ------------------------------------------------------------
  function goNext() {
    setErr(null);

    if (!isAuthed) {
      setErr("Please sign in or create your WedFlex account in Section 2 first.");
      return;
    }

    if (step === 1) {
      if (!title.trim()) {
        setErr("Please add a title for your offer.");
        return;
      }
      if (!category) {
        setErr("Please select a service category.");
        return;
      }
      if (!city) {
        setErr("Please select a city / location.");
        return;
      }
      if (!eventDate) {
        setErr("Please choose the date you need this service.");
        return;
      }
      if (!eventTime) {
        setErr("Please enter the start time for the service.");
        return;
      }
      if (!guestCount || Number(guestCount) <= 0) {
        setErr("Please enter your approximate guest count.");
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!details.trim()) {
        setErr("Please describe what you need help with.");
        return;
      }
      if (!offerAmount.trim()) {
        setErr("Please enter your offer amount in USD.");
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!acceptedTerms) {
        setErr("Please agree to the terms before posting your offer.");
        return;
      }
      void handleSubmit();
    }
  }

  function goBack() {
    setErr(null);
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  // ------------------------------------------------------------
  // SUBMIT OFFER → service_requests
  // ------------------------------------------------------------
  async function handleSubmit() {
    try {
      setLoading(true);
      setErr(null);

      const sb = supabaseBrowser();
      const { data: me } = await sb.auth.getUser();
      if (!me?.user) {
        setErr("Your session expired. Please sign in again in Section 2.");
        return;
      }

      // service_date (DATE) & event_at (TIMESTAMPTZ)
      let serviceDate: string | null = null;
      let eventAt: string | null = null;

      if (eventDate) {
        serviceDate = eventDate; // yyyy-mm-dd
        if (eventTime) {
          eventAt = new Date(`${eventDate}T${eventTime}:00`).toISOString();
        }
      }

      const dollars = Number(offerAmount.replace(/[^0-9.]/g, ""));
      const offerCents = Number.isFinite(dollars)
        ? Math.round(dollars * 100)
        : null;

      const guestCountNum = guestCount
        ? Number(guestCount.replace(/\D/g, ""))
        : null;

      const { error } = await sb.from("service_requests").insert({
        title: title.trim(),
        category: category || null,
        location: city || null,
        service_date: serviceDate,
        event_at: eventAt,
        offer_cents: offerCents,
        status: "open",
        details: details || null,
        inspiration_link: inspirationLink || null,
        inspiration_images: inspirationImages.length
          ? inspirationImages
          : null,
        guest_count: guestCountNum,
        accept_terms: acceptedTerms,
        couple_id: me.user.id,
      });

      if (error) throw error;

      setSuccess(true);
      // Send them to dashboard so they can see it + profile prompt
      router.push("/dashboard/couple?posted=1");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------
  return (
    <main className="bg-white text-brand-charcoal min-h-[80vh]">
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14 space-y-12">
        {/* ------------------------------------------------------------ */}
        {/* SECTION 1: INFO + IMAGE (NO STEPS, JUST OVERVIEW)            */}
        {/* ------------------------------------------------------------ */}
        <section className="grid gap-10 lg:grid-cols-[1.2fr_1fr] items-center">
          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-[0.25em] text-brand-primary uppercase">
              It&apos;s time to WedFlex Your Wedding!
            </p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-brand-primary">
              Let&apos;s post your first offer
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
          </div>

          <div className="relative h-[260px] md:h-[320px] lg:h-[360px] rounded-3xl overflow-hidden shadow-xl">
            <Image
              src="/images/bouquet.jpg"
              alt="WedFlexer made bouquet"
              fill
              className="object-cover object-center"
              style={{objectPosition:"50% 25%"}}//xy
              priority
            />
          </div>
        </section>

        {/* ------------------------------------------------------------ */}
        {/* SECTION 2: EMBEDDED AUTH (LEFT TEXT, RIGHT FORM)             */}
        {/* ------------------------------------------------------------ */}
        <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr] items-start border border-brand-primary/10 rounded-3xl p-6 md:p-8 bg-brand-primary/3">
          {/* LEFT: instructions */}
          <div className="space-y-3">
            <h2 className="text-lg md:text-xl font-bold text-brand-primary">
              First, verify your email
            </h2>
            <p className="text-sm text-brand-charcoal max-w-lg">
              We&apos;ll create a quick, secure WedFlex account for you. 
              You&apos;ll manage your offers, messages, and WedFlexers
              from your couple dashboard.
            </p>

            <ul className="text-sm space-y-1 text-brand-charcoal">
              <li>• Use your email to sign in or create an account.</li>
              <li>
                • We&apos;ll send a magic link — no passwords to remember.
              </li>
              <li>
                • After you click the link in your email, you&apos;ll come back to
                this page to post your offer.
              </li>
            </ul>

            {checkingAuth ? (
              <p className="text-xs text-brand-charcoal/70 mt-2">
                Checking if you&apos;re already signed in…
              </p>
            ) : isAuthed ? (
              <p className="text-xs text-emerald-700 mt-2">
                You are signed in as{" "}
                <span className="font-semibold">{userEmail}</span>. Now
                complete the form below to post your first offer!
              </p>
            ) : null}
          </div>

          {/* RIGHT: sign-in box */}
          <div className="rounded-2xl border border-brand-primary/20 bg-white p-5 space-y-3 text-sm">
            {isAuthed ? (
              <>
                <p className="text-brand-charcoal">
                  You&apos;re already signed in. If needed, you can refresh your
                  session or sign out from your dashboard later.
                </p>
                <button
                  type="button"
                  onClick={refreshAuth}
                  className="mt-2 inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold bg-brand-primary text-white hover:bg-brand-primary-dark"
                >
                  Refresh status
                </button>
              </>
            ) : (
              <>
                {authSent ? (
                  <p className="text-sm text-brand-charcoal">
                    Magic link sent to{" "}
                    <span className="font-semibold">{authEmail}</span>. Check your
                    email and click the link to come back here signed in.
                  </p>
                ) : (
                  <form onSubmit={sendMagicLink} className="space-y-3">
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
                    <button
                      type="submit"
                      disabled={authSending || !authEmail}
                      className="w-full inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold bg-brand-primary text-white hover:bg-brand-primary-dark disabled:opacity-60"
                    >
                      {authSending ? "Sending link…" : "Send sign-in link"}
                    </button>
                    {authError && (
                      <p className="text-xs text-red-600">Error: {authError}</p>
                    )}
                    {authSent && (
    <p className="text-xs text-brand-charcoal/70 mt-1">
      One-time sign in link sent to <strong>{authEmail}</strong>. Check your email to continue.
    </p>
  )}
                  </form>
                )}

                <p className="text-[11px] text-brand-charcoal/70">
                  We&apos;ll never share your email. By signing in, you agree to
                  WedFlex&apos;s terms and privacy policy.
                </p>
              </>
            )}
          </div>
        </section>

        {/* ------------------------------------------------------------ */}
        {/* SECTION 3: OFFER FORM (ONLY 1–2–3 STEP THING)                */}
        {/* ------------------------------------------------------------ */}
        <section className="rounded-3xl border border-brand-primary/15 bg-white shadow-sm p-6 md:p-7 space-y-6">
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-brand-primary">
                Step 2: Post your first offer
              </h2>
              <p className="text-sm text-brand-charcoal max-w-xl">
                Tell WedFlexers what you need help with, when, and what you&apos;re
                offering. This will appear in the WedFlexer feed.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-brand-charcoal/70">
              <span>Step {step} of 3</span>
              <div className="flex gap-1">
                {[1, 2, 3].map((s) => (
                  <span
                    key={s}
                    className={cx(
                      "h-2 w-6 rounded-full",
                      step === s ? "bg-brand-primary" : "bg-brand-primary/20",
                    )}
                  />
                ))}
              </div>
            </div>
          </header>

          {!isAuthed && !checkingAuth && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Please complete the sign in step above before posting your offer.
              You can still preview the form, but you won&apos;t be able to submit
              until you have a WedFlex account.
            </p>
          )}

          {/* STEP 1 – Event basics */}
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="text-md font-semibold text-brand-primary">
                1. Wedding details
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-primary mb-1">
                    What do you need help with? (Title)
                  </label>
                  <input
                    type="text"
                    className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm"
                    placeholder="Example: Setup + breakdown for backyard reception"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-brand-primary mb-1">
                      Service category
                    </label>
                    <select
                      className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm bg-white"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="">Select a category…</option>
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-brand-primary mb-1">
                      City / location
                    </label>
                    <select
                      className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm bg-white"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    >
                      <option value="">Select city…</option>
                      {CITY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-brand-primary mb-1">
                      Event date
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
                      Start time
                    </label>
                    <input
                      type="time"
                      className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-primary mb-1">
                      Guest count (approx.)
                    </label>
                    <input
                      type="number"
                      min={1}
                      className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. 120"
                      value={guestCount}
                      onChange={(e) => setGuestCount(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 – Description + budget */}
          {step === 2 && (
            <div className="space-y-5">
              <h3 className="text-md font-semibold text-brand-primary">
                2. Describe the help & your offer
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-primary mb-1">
                    Describe what you need in detail
                  </label>
                  <textarea
                    className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm min-h-[120px]"
                    placeholder="Example: We need two people to help set up chairs, decorate the ceremony space, and reset the room after the reception..."
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-primary mb-1">
                    Inspiration link (optional)
                  </label>
                  <input
                    type="url"
                    className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm"
                    placeholder="Link to Pinterest, Google Drive, etc."
                    value={inspirationLink}
                    onChange={(e) => setInspirationLink(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-brand-primary mb-1">
                    Upload inspiration photos (optional)
                  </label>

                  <UploadInput
                    bucket="wedding_inspo"
                    label="Upload inspiration images"
                    multiple
                    onUploaded={(url) =>
                      setInspirationImages((prev) => [url, ...prev])
                    }
                  />

                  {inspirationImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
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

                  <p className="text-[11px] text-brand-charcoal/70">
                    Décor ideas, color palettes, or venue photos help WedFlexers
                    understand your vision.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-[1.2fr_1fr] items-end">
                  <div>
                    <label className="block text-xs font-semibold text-brand-primary mb-1">
                      Your offer amount (USD)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-brand-charcoal">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="flex-1 border border-brand-primary/30 rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. 250"
                        value={offerAmount}
                        onChange={(e) => setOfferAmount(e.target.value)}
                      />
                    </div>
                    <p className="text-[11px] mt-1 text-brand-charcoal/70">
                      You&apos;re setting the offer price. WedFlexers decide if they
                      want to apply based on your offer.
                    </p>
                  </div>

                  <p className="text-[11px] text-brand-charcoal/70 md:text-right">
                    You can post more offers later from your dashboard for other parts
                    of your wedding.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 – Review + terms */}
          {step === 3 && (
            <div className="space-y-5">
              <h3 className="text-md font-semibold text-brand-primary">
                3. Review & agree to terms
              </h3>

              <div className="rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs font-semibold text-brand-primary uppercase tracking-wide">
                    Title
                  </p>
                  <p>{title || "Not set"}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-brand-primary uppercase tracking-wide">
                      Category
                    </p>
                    <p>{category || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-primary uppercase tracking-wide">
                      City
                    </p>
                    <p>{city || "Not set"}</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold text-brand-primary uppercase tracking-wide">
                      Date
                    </p>
                    <p>{eventDate || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-primary uppercase tracking-wide">
                      Time
                    </p>
                    <p>{eventTime || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-primary uppercase tracking-wide">
                      Guests
                    </p>
                    <p>{guestCount || "Not set"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-brand-primary uppercase tracking-wide">
                    Description
                  </p>
                  <p className="whitespace-pre-line">
                    {details || "No description yet."}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-brand-primary uppercase tracking-wide">
                      Offer amount
                    </p>
                    <p>{offerAmount ? `$${offerAmount}` : "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-primary uppercase tracking-wide">
                      Inspiration link
                    </p>
                    <p className="text-xs break-words">
                      {inspirationLink || "None provided"}
                    </p>
                  </div>

                  {inspirationImages.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="text-xs font-semibold text-brand-primary uppercase tracking-wide mb-1">
                        Inspiration photos
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {inspirationImages.map((src) => (
                          <img
                            key={src}
                            src={src}
                            alt="Inspiration preview"
                            className="w-full h-20 object-cover rounded-lg border border-brand-primary/20"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-brand-primary/20 bg-white p-4 text-xs text-brand-charcoal">
                <p className="font-semibold text-brand-primary text-sm">
                  Agree to our Terms & Conditions before you post
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    You&apos;ll communicate clearly and respectfully with WedFlexers who
                    apply to your offer.
                  </li>
                  <li>
                    You won&apos;t share misleading details about the work, timing, or
                    pay for this offer.
                  </li>
                  <li>
                    You&apos;ll use WedFlex payments so WedFlexers are paid only after
                    they deliver the service.
                  </li>
                  <li>
                    You understand WedFlexers are independent contractors, not employees
                    of WedFlex or your event.
                  </li>
                </ul>

                <label className="flex items-start gap-2 mt-2">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 border-brand-primary/40 rounded"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                  />
                  <span>
                    I have read and agree to these terms for posting offers on WedFlex.
                  </span>
                </label>
              </div>
            </div>
          )}

          {err && <p className="text-xs text-red-600">Error: {err}</p>}
          {success && (
            <p className="text-xs text-emerald-700">
              Offer posted! Redirecting you to your dashboard…
            </p>
          )}

          {/* Step navigation buttons */}
          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1 || loading}
              className="text-xs md:text-sm text-brand-charcoal/70 hover:text-brand-charcoal disabled:opacity-30"
            >
              {step === 1 ? "" : "← Back"}
            </button>

            <button
              type="button"
              onClick={goNext}
              disabled={loading}
              className="inline-flex items-center rounded-full px-5 py-2 text-xs md:text-sm font-semibold bg-brand-primary text-white hover:bg-brand-primary-dark disabled:opacity-60"
            >
              {step === 3 ? (loading ? "Posting…" : "Post offer") : "Continue"}
            </button>
          </div>
        </section>

        {/* ------------------------------------------------------------ */}
        {/* SECTION 4: PROFILE NUDGE → DASHBOARD                         */}
        {/* ------------------------------------------------------------ */}
        <section className="rounded-3xl border border-brand-primary/10 bg-brand-primary/5 px-5 py-6 md:px-6 md:py-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-md md:text-lg font-bold text-brand-primary">
              Step 3: Complete your couple profile
            </h2>
            <p className="text-sm text-brand-charcoal max-w-xl">
              Congratulations! You just posted your first offer on WedFlex!
              Now head to your couple dashboard and complete your profile to tell
              WedFlexers more about your story, start reviewing applications, and tracking your budget. 
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/couple"
              className="inline-flex items-center rounded-full px-4 py-2 text-xs md:text-sm font-semibold bg-brand-primary text-white hover:bg-brand-primary-dark"
            >
              Go to my dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
