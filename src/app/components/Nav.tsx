// app/components/Nav.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../supabase/client";

export default function Nav() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data } = await sb.auth.getUser();
        if (data?.user?.email) setEmail(data.user.email);
      } catch {
        // ignore
      }
    })();
  }, []);

  async function handleSignOut() {
    const sb = supabaseBrowser();
    await sb.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="w-full flex items-center justify-between py-3">
      {/* Left: Brand */}
      <Link href="/" className="flex items-baseline gap-2">
        <span className="text-2xl font-extrabold text-brand-primary">
          WedFlex
        </span>
        <span className="text-[12px] uppercase tracking-[0.2em] text-brand-charcoal/60">
          For Couples
        </span>
      </Link>

      {/* Right: Links */}
      <div className="flex items-center gap-5 text-sm font-medium text-brand-charcoal">
        <Link href="/mission" className="hover:text-brand-primary">
          Mission
        </Link>

        <Link href="/post-offer" className="hover:text-brand-primary">
          Post an Offer
        </Link>

                {email ? (
          <>
            <Link
              href="/dashboard/couple"
              className="hidden sm:inline hover:text-brand-primary"
            >
              Dashboard
            </Link>
            <span className="hidden sm:inline text-xs text-brand-charcoal/70">
              {email}
            </span>
            <button
              onClick={handleSignOut}
              className="text-xs rounded-full border border-brand-primary px-3 py-1 text-brand-primary hover:bg-brand-primary hover:text-white transition"
            >
              Sign out
            </button>
          </>
        ) : (
          <Link
            href="/auth/signin?role=couple&next=/dashboard/couple"
            className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold border border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white transition"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
