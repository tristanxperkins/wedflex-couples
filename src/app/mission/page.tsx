// app/mission/page.tsx

import Image from "next/image";
import Link from "next/link";

export default function MissionPage() {
  return (
    <main className="bg-white">
      {/* Hero / intro */}
      <section className="max-w-4xl mx-auto px-4 py-10 md:py-14">
        <h1 className="text-3xl md:text-4xl font-extrabold text-brand-primary">
          WedFlex is for Marriage and Community.
        </h1>
        <p className="mt-4 text-base md:text-lg text-slate-700">
          At WedFlex, we believe that the cost of a wedding should not be a financial
          burden that marks the beginning of a marriage.
        </p>
      </section>

      {/* Two-column: mission + Wedding Tax story */}
      <section className="max-w-6xl mx-auto px-4 pb-12 md:pb-16 grid gap-10 md:grid-cols-2 items-start">
        {/* Left: copy */}
        <div className="space-y-4 text-sm md:text-base text-brand-charcoal">
          <p>
            We know in our core that successful marriages are the foundation of successful
            communities. But recently the wedding industry has become excessively
            overpriced. The industry has forgotten that supporting real marriages is the whole
            point.
          </p>

          <p className="text-xs font-semibold tracking-[0.2em] text-brand-primary uppercase pt-2">
            The Wedding Tax ❌
          </p>

          <p>
            Through research on the cost of weddings, we uncovered the &quot;Wedding
            Tax&quot;. The wedding tax is not an actual tax, but it is the very real
            30-60% markup that traditional wedding vendors charge for services simply
            because it is a wedding. Couples who want to get married deserve better.
          </p>

          <p>
            Everything we do at WedFlex is centered around eliminating the Wedding Tax and
            fixing the overpriced wedding industry for good. We will pursue these values
            passionately and with urgency… for marriage and community. 👊
          </p>
        </div>

        {/* Right: image card */}
        <div className="relative h-64 md:h-80 lg:h-96 rounded-3xl overflow-hidden shadow-lg">
          <Image
            src="/images/Weddings-are-a-ripoff.png"
            alt="Influencers are sick of it"
            fill
            className="object-cover object-top"
            priority
          />
        </div>
      </section>

      {/* Values section */}
      <section className="max-w-6xl mx-auto px-4 pb-12 md:pb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-brand-charcoal">
            Our Values
          </h2>
          <p className="mt-2 text-sm md:text-base text-brand-charcoal max-w-2xl mx-auto">
            These are the convictions that shape how we build WedFlex for couples,
            WedFlexers, and the communities we serve.
          </p>
        </div>

        <div className="grid gap-4 md:gap-6 md:grid-cols-3">
          {/* Value 1 */}
          <div className="border rounded-2xl p-5 bg-white shadow-sm flex flex-col gap-2">
            <div className="text-2xl">💜</div>
            <h3 className="font-semibold text-brand-charcoal">
              Getting married should not cause financial stress.
            </h3>
            <p className="text-sm text-brand-charcoal">
              We believe every couple deserves to start marriage on a strong foundation,
              not under the weight of wedding debt or unfair markups.
            </p>
          </div>

          {/* Value 2 */}
          <div className="border rounded-2xl p-5 bg-white shadow-sm flex flex-col gap-2">
            <div className="text-2xl">🏡</div>
            <h3 className="font-semibold text-brand-charcoal">
              Successful marriages are the foundation of successful communities.
            </h3>
            <p className="text-sm text-brand-charcoal">
              When couples thrive, families, neighborhoods, and future generations thrive
              too. This belief has our whole heart.
            </p>
          </div>

          {/* Value 3 */}
          <div className="border rounded-2xl p-5 bg-white shadow-sm flex flex-col gap-2">
            <div className="text-2xl">🛡️</div>
            <h3 className="font-semibold text-brand-charcoal">
              Prioritize trust and safety for Couples and WedFlexers.
            </h3>
            <p className="text-sm text-brand-charcoal">
              We center transparency, secure payments, and respectful behavior so both
              couples and WedFlexers feel protected and valued.
            </p>
          </div>
        </div>
      </section>

      {/* Community image strip */}
      <section className="max-w-5xl mx-auto px-4 pb-12 md:pb-16">
        <div className="relative h-64 md:h-80 rounded-3xl overflow-hidden shadow-lg">
          <Image
            src="/images/WedFlex-and-a-couple.png"
            alt="Community of WedFlexers supporting a wedding"
            fill
            className="object-cover object-top"
          />
        </div>
        <p className="mt-3 text-center text-sm text-brand-charcoal">
          Real weddings. Real people. Real community. WedFlex connects couples with
          talented locals to bring their vision to life.
        </p>
      </section>

      {/* Purple CTA band */}
      <section className="mt-12 bg-brand-primary/5 text-purple">
        <div className="max-w-6xl mx-auto px-4 py-10 md:py-14 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-2 text-brand-primary">
            Join the WedFlex Revolution Today!
          </h2>
          <p className="max-w-2xl mx-auto text-sm md:text-base text-brand-charcoal">
            Whether you&apos;re planning a wedding or ready to earn money as a WedFlexer,
            you can help eliminate the Wedding Tax ❌ and support marriages in your
            community.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="https://wedflex-couples.vercel.app"
              className="inline-flex items-center rounded-xl px-6 py-3 text-sm font-semibold bg-white text-brand-primary hover:bg-purple-50 shadow-md"
            >
              WedFlex Your Wedding →
            </Link>
            <Link
              href="/earn-money"
              className="inline-flex items-center rounded-xl px-6 py-3 text-sm font-semibold bg-white text-brand-primary hover:bg-purple-50 shadow-md"
            >
              Become a WedFlexer →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
