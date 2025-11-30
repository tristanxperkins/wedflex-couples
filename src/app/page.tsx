// app/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";

export default function WedFlexerHome() {
  return (
    <main className="bg-white text-brand-charcoal">
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-16 space-y-20">
        {/* ------------------------------------------------------------ */}
        {/* SECTION 1: HERO */}
        {/* ------------------------------------------------------------ */}
        <section className="grid gap-10 lg:grid-cols-[1.1fr_1fr] items-center">
          {/* LEFT */}
          <div className="space-y-7">
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-[0.25em] text-brand-primary uppercase">
                WedFlex for Couples
              </p>

              <h1 className="text-4xl md:text-5xl font-extrabold text-brand-primary leading-tight">
                Stop paying overpriced wedding vendors. 
              </h1>

              <p className="text-brand-charcoal text-sm md:text-base max-w-xl">
                WedFlex is where you can post offers for the help you need and connect with talented locals instead 
                of traditional overpriced wedding vendors.  </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/post-your-first-offer?step=1"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-semibold bg-brand-primary text-white shadow-sm hover:bg-brand-primary-dark transition"
              >
                WedFlex My Wedding
              </Link>

              <Link
                href="/auth/signin?role=couple&next=/dashboard/couple"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-semibold border border-brand-primary text-brand-primary bg-white hover:bg-brand-primary/10 transition"
              >
                Already planning? Sign In
              </Link>
            </div>

            {/* TRUST BAR */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-brand-charcoal/70">
              <span className="uppercase tracking-[0.2em] font-semibold text-[10px]">
                Popular WedFlexer skills
              </span>

              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-brand-primary/10 text-[12px] flex items-center gap-1.5">
                  📸 <span>Photography</span>
                </span>

                <span className="px-3 py-1 rounded-full bg-brand-primary/10 text-[12px] flex items-center gap-1.5">
                  🍰 <span>Cakes & desserts</span>
                </span>

                <span className="px-3 py-1 rounded-full bg-brand-primary/10 text-[12px] flex items-center gap-1.5">
                  🎤 <span>MCs & DJs</span>
                </span>

                <span className="px-3 py-1 rounded-full bg-brand-primary/10 text-[12px] flex items-center gap-1.5">
                  💐 <span>Decor & florals</span>
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT IMAGE */}
          <div className="relative h-[300px] md:h-[380px] lg:h-[420px] rounded-3xl overflow-hidden shadow-xl">
            <Image
              src="/images/WedFlex-in-action.png"
              alt="WedFlexers working"
              fill
              className="object-cover object-center"
              style={{objectPosition:"70% 50%"}}//xy
              priority
            />
          </div>
        </section>

                {/* ------------------------------------------------------------ */}
        {/* SECTION 2: TWO-COLUMN BLOCKS */}
        {/* ------------------------------------------------------------ */}
        <section className="grid gap-8 md:grid-cols-2">
          {/* LEFT - HOW IT WORKS */}
          <div className="rounded-3xl border border-brand-primary/20 p-6 shadow-sm bg-white">
            <h3 className="text-lg font-bold text-brand-primary">How WedFlex Works</h3>
            <p className="space-y-1.5 text-sm text-brand-charcoal"> WedFlex connects couples to WedFlexers through offers </p>
            <ul className="space-y-2 mt-3 text-brand-charcoal text-sm leading-relaxed list-none">
              <li>💜 Real couples post offers for wedding services</li>
              <li>🔍 WedFlexers accept offers and apply</li>
              <li>📊 Chat with WedFlexers to confirm details </li>
              <li>💸 Book and pay securely through WedFlex Escrow via Stripe</li>
              <li>📅 Track your budget and WedFlexer services on your dashboard</li>
              
              
            </ul>
          </div>

          {/* RIGHT - WHO ARE WEDFLEXERS */}
          <div className="rounded-3xl border border-brand-primary/20 p-6 shadow-sm bg-white">
            <h3 className="text-lg font-bold text-brand-primary">Who Are WedFlexers?</h3>
            <ul className="space-y-1.5 mt-3 text-brand-charcoal text-sm list-none">
              <li>🎨 Crafters, DIYers, & Creatives</li>
              <li>📋 Type-A organizers & planners</li>
              <li>📸 Photographers & Content Creators</li>
              <li>🥤 Servers & Bartenders</li>
              <li>🍰 Chefs & Bakers</li>
              <li>🎵 Musicians & Music Aficionados</li>
              <li>🚀 Side-hustlers & Entrepreneurs</li>
                          </ul>
          </div>
        </section>

        {/* ------------------------------------------------------------ */}
        {/* SECTION 3: EARNINGS SECTION */}
        {/* ------------------------------------------------------------ */}
        <section className="grid gap-10 lg:grid-cols-[1fr_1.1fr] items-center">
  {/* Left: PERKS GRID */}
  <div className="space-y-4">
    <h2 className="text-xl md:text-2xl font-bold text-brand-primary">
      Why WedFlex?
    </h2>

    <p className="text-sm text-brand-charcoal max-w-md">
      Stop paying for overpriced wedding services from traditional vendors.
    </p>

    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl p-4 bg-brand-primary text-white shadow-md space-y-1">
        <p className="uppercase tracking-wide text-xs font-semibold">
          1. Post an Offer
        </p>
        <p className="text-sm">
          Tell us what you need, set your offer, and share your wedding details. It takes just 2 minutes.
        </p>
      </div>

      <div className="rounded-2xl p-4 bg-brand-primary/10 border border-brand-primary/20 space-y-1">
        <p className="uppercase tracking-wide text-xs font-semibold text-brand-primary">
          2. Book a WedFlexer
        </p>
        <p className="text-sm text-brand-charcoal">
          WedFlexers accept your offer and share their profile with you. Chat to confirm details and lock in the help you need.
        </p>
      </div>

      <div className="rounded-2xl p-4 bg-white border border-brand-primary/20 space-y-1">
        <p className="uppercase tracking-wide text-xs font-semibold text-brand-primary">
          3. Trusted Delivery
        </p>
        <p className="text-sm text-brand-charcoal">
          You are protected by WedFlex Escrow. WedFlexers only get paid when the job is done.
        </p>
      </div>
    </div>

  </div>
  {/* RIGHT IMAGE */}
          <div className="relative h-[250px] md:h-[320px] rounded-3xl overflow-hidden shadow-lg">
            <Image
              src="/images/WedFlex-and-a-couple.png"
              alt="WedFlexers helping with a wedding"
              fill
              className="object-cover object-center"
            />
          </div>
</section>
         </div>

      {/* ------------------------------------------------------------ */}
      {/* 💜 PURPLE BANNER — FINAL SECTION */}
      {/* ------------------------------------------------------------ */}
      <section className="mt-20 bg-brand-primary/5">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-brand-primary mb-3">
            WedFlex is for Marriage and Community.
          </h1>

          <p className="max-w-3xl mx-auto text-sm md:text-lg text-brand-charcoal">
            Help us revolutionize the wedding industry to end overpriced weddings and support the communities they thrive in.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/post-your-first-offer"
              className="inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-semibold bg-brand-primary text-white hover:bg-brand-primary-dark"
            >
              WedFlex your Wedding
            </Link>

            <Link
              href="https://wedflex-wedflexers.vercel.app"
              className="inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-semibold border border-brand-primary text-brand-primary hover:bg-white"
            >
              Become a WedFlexer
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
