// app/offers/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "../supabase/client";
import UploadInput from "../components/UploadInput";
// If you already share CATEGORY_OPTIONS and CITY_OPTIONS, import those instead.
import { CATEGORY_OPTIONS, CITY_OPTIONS } from "../lib/constants";

type Step = 1 | 2 | 3;

export default function NewOfferPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [eventDate, setEventDate] = useState(""); // yyyy-mm-dd
  const [eventTime, setEventTime] = useState(""); // hh:mm
  const [guestCount, setGuestCount] = useState<string>("");

  const [details, setDetails] = useState("");
  const [inspirationLink, setInspirationLink] = useState("");
  const [inspirationImages, setInspirationImages] = useState<string[]>([]);
  const [offerDollars, setOfferDollars] = useState<string>("");
const [acceptedTerms, setAcceptedTerms] = useState(false);

  function goNext() {
    setErr(null);
    setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  }

  function goBack() {
    setErr(null);
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  async function handleSubmit() {
     if (!acceptedTerms) {
    setErr("Please agree to the terms before posting your offer.");
    return;
  }
  try {
      setLoading(true);
      setErr(null);

      const sb = supabaseBrowser();

      // Ensure they are signed in as a couple
      const { data: me } = await sb.auth.getUser();
      if (!me?.user) {
        // Send them to couple sign-in with redirect back here
        router.push("/auth/signin?role=couple&next=/offers/new");
        return;
      }

      // Build service_date (ISO) from date + time if provided
      let serviceDate: string | null = null;
      if (eventDate) {
        const iso = eventTime
          ? new Date(`${eventDate}T${eventTime}:00`)
          : new Date(`${eventDate}T12:00:00`);
        serviceDate = iso.toISOString();
      }

      const dollars = Number(offerDollars.replace(/[^0-9.]/g, ""));
      const offerCents = Number.isFinite(dollars)
        ? Math.round(dollars * 100)
        : null;

      const guestCountNum = guestCount ? Number(guestCount.replace(/\D/g, "")) : null;

      const { data, error } = await sb
        .from("service_requests")
        .insert({
          title,
          category: category || null,
          location: city || null,
          service_date: serviceDate,
          offer_cents: offerCents,
          status: "open",
          details: details || null,
          inspiration_link: inspirationLink || null,
          inspiration_images: inspirationImages.length ? inspirationImages : null,
          guest_count: guestCountNum,
          couple_id: me.user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      // After posting, send them to couple dashboard (or a “view offer” page later)
      router.push("/dashboard/couple?posted=1");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-white text-brand-charcoal min-h-[70vh]">
      <div className="max-w-3xl mx-auto px-4 py-10 md:py-14 space-y-8">
        {/* Header + Step indicator */}
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.25em] text-brand-primary uppercase">
            For Couples
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-brand-primary">
            Post a wedding offer
          </h1>
          <p className="text-sm md:text-base text-brand-charcoal max-w-xl">
            Tell WedFlexers what you need help with and how much you&apos;re offering.
            WedFlexers will apply, and you choose the right fit for your wedding. If you have multiple needs just post one now and post the rest later.
          </p>
        </header>

        {/* Step tracker */}
        <div className="flex items-center justify-between text-xs text-brand-charcoal/70">
          <span>Step {step} of 3</span>
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={
                  "h-2 w-6 rounded-full " +
                  (step === s ? "bg-brand-primary" : "bg-brand-primary/20")
                }
              />
            ))}
          </div>
        </div>

        <section className="rounded-3xl border border-brand-primary/20 bg-white shadow-sm p-6 md:p-7 space-y-6">
          {/* STEP 1 – Event basics */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-brand-primary">
                1. Wedding Details
              </h2>
              <p className="text-sm text-brand-charcoal">
                Share a few details about your wedding so WedFlexers understand the context.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-primary mb-1">
                    What do you need help with? (Title)
                  </label>
                  <input
                    type="text"
                    className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/60"
                    placeholder="Example: Need setup + breakdown help for our backyard wedding"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
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
                      required
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
                      required
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
                      When do you need the service?
                    </label>
                    <input
                      type="date"
                      className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      required
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
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-brand-primary mb-1">
                      Wedding Guest count (approx.)
                    </label>
                    <input
                      type="number"
                      min={1}
                      className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. 120"
                      value={guestCount}
                      onChange={(e) => setGuestCount(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 – What do you need + budget */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-brand-primary">
                2. Complete your Offer
              </h2>
              <p className="text-sm text-brand-charcoal">
                Describe what you want your WedFlexer to do and how much you&apos;re offering.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-primary mb-1">
                    Describe the help you&apos;re looking for in detail
                  </label>
                  <textarea
                    className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm min-h-[120px]"
                    placeholder="Example: We need two people to help set up chairs and reset the space after the reception… or We need a designated driver to and from the hotel"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-primary mb-1">
                    Inspiration link (optional)
                  </label>
                  <input
                    type="url"
                    className="w-full border border-brand-primary/30 rounded-lg px-3 py-2 text-sm"
                    placeholder="Link to Pinterest board, Google Drive, etc."
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
    You can upload décor ideas, color palettes, or venue photos to help WedFlexers
    understand your vision.
  </p>
</div>
                <div className="grid gap-4 md:grid-cols-[1.2fr_1fr] items-end">
                  <div>
                    <label className="block text-xs font-semibold text-brand-primary mb-1">
                      What&apos;s your offer? (USD)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-brand-charcoal">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="flex-1 border border-brand-primary/30 rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. 250"
                        value={offerDollars}
                        onChange={(e) => setOfferDollars(e.target.value)}
                        required
                      />
                    </div>
                    <p className="text-[11px] mt-1 text-brand-charcoal/70">
                      You&apos;re setting the offer price. WedFlexers will decide if they want
                      to accept and apply.
                    </p>
                  </div>

                  <div className="text-[11px] text-brand-charcoal/70 md:text-right">
                    You can always post multiple offers for different parts of your wedding
                    (setup, dessert table, cleanup, etc.).
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 – Review & Post */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-brand-primary">
                3. Review your offer
              </h2>
              <p className="text-sm text-brand-charcoal">
                Make sure everything looks correct. You can always edit or close your offer later.
              </p>

              <div className="rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs font-semibold text-brand-primary uppercase tracking-wide">
                    Title
                  </p>
                  <p className="text-brand-charcoal">{title || "Not set"}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-brand-primary uppercase tracking-wide">
                      Category
                    </p>
                    <p className="text-brand-charcoal">
                      {category || "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-primary uppercase tracking-wide">
                      City
                    </p>
                    <p className="text-brand-charcoal">
                      {city || "Not set"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold text-brand-primary uppercase tracking-wide">
                      Date
                    </p>
                    <p className="text-brand-charcoal">
                      {eventDate || "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-primary uppercase tracking-wide">
                      Time
                    </p>
                    <p className="text-brand-charcoal">
                      {eventTime || "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-primary uppercase tracking-wide">
                      Guests
                    </p>
                    <p className="text-brand-charcoal">
                      {guestCount || "Not set"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-brand-primary uppercase tracking-wide">
                    Description
                  </p>
                  <p className="text-brand-charcoal whitespace-pre-line">
                    {details || "No description yet."}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-brand-primary uppercase tracking-wide">
                      Offer amount
                    </p>
                    <p className="text-brand-charcoal">
                      {offerDollars ? `$${offerDollars}` : "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-primary uppercase tracking-wide">
                      Inspiration link
                    </p>
                    <p className="text-brand-charcoal text-xs break-words">
                      {inspirationLink || "None provided"}
                    </p>
                  </div>
                  {inspirationImages.length > 0 && (
  <div>
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

              {/* NEW TERMS BLOCK */}
    <div className="space-y-3 rounded-2xl border border-brand-primary/20 bg-white p-4 text-xs text-brand-charcoal">
      <p className="font-semibold text-brand-primary text-sm">
        Agree to our Terms & Conditions Before you post your offer
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          You&apos;ll communicate clearly and respectfully with WedFlexers who apply to your offer.
        </li>
        <li>
          You won&apos;t share misleading details about the work, timing, or pay for this offer.
        </li>
        <li>
          You are protected by WedFlex Escrow. You pay for service when you book, but WedFlexers do not get paid until the service is delivered.
        </li>
        <li>
          You understand WedFlexers are independent contractors, not employees of WedFlex.
        </li>
        <li>
          
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
      
          {/* Error */}
          {err && (
            <p className="text-xs text-red-600">
              Error: {err}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1 || loading}
              className="text-xs md:text-sm text-brand-charcoal/70 hover:text-brand-charcoal disabled:opacity-40"
            >
              {step === 1 ? "" : "← Back"}
            </button>

            <div className="flex gap-2">
              {step < 3 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex items-center rounded-full px-5 py-2 text-xs md:text-sm font-semibold bg-brand-primary text-white hover:bg-brand-primary-dark"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading|| !acceptedTerms}
                  className="inline-flex items-center rounded-full px-5 py-2 text-xs md:text-sm font-semibold bg-brand-primary text-white hover:bg-brand-primary-dark disabled:opacity-60"
                >
                  {loading ? "Posting…" : "Post offer"}
                </button>
              )}
            </div>
          </div>
        </section>

        <p className="text-[11px] text-brand-charcoal/60">
          Need help?{" "}
          <Link href="/post-your-first-offer" className="underline text-brand-primary">
            Learn more about how WedFlex works for couples.
          </Link>
        </p>
      </div>
    </main>
  );
}
