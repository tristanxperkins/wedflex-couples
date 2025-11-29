// app/auth/callback/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../supabase/client";

export default function CoupleAuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      if (typeof window === "undefined") return;

      const url = new URL(window.location.href);
      const supabase = supabaseBrowser();

      // 1) Determine where to send them after auth
      const next =
        url.searchParams.get("next") ||
        "/dashboard/couple"; // or "/couple/onboarding" if you prefer

      // 2) If we already have a session, just go there
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          router.replace(next);
          return;
        }
      } catch {
        // ignore, we'll try exchange
      }

      // 3) Try to exchange the auth info from URL
      const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
      const search = url.search.startsWith("?") ? url.search.slice(1) : url.search;
      const hasCode = url.searchParams.get("code");

      try {
        let error: unknown = null;

        if (hash) {
          // Magic link / email flow – Supabase puts tokens in the hash fragment
          const res = await supabase.auth.exchangeCodeForSession(hash);
          error = res.error;
        } else if (hasCode) {
          // PKCE / OAuth-style flow – pass the full query string
          const res = await supabase.auth.exchangeCodeForSession(search);
          error = res.error;
        } else {
          // Nothing to exchange – probably hit directly
          router.replace("/auth/signin?role=couple");
          return;
        }

        if (error) {
          console.error("Supabase exchange error:", error);
          router.replace(
            "/auth/signin?role=couple&error=" +
              encodeURIComponent(
                (error as { message?: string })?.message || "Sign-in failed",
              ),
          );
          return;
        }

        // 4) Success – go to the intended destination
        router.replace(next);
      } catch (e) {
        console.error("Auth callback fatal error (couple):", e);
        router.replace("/auth/signin?role=couple");
      }
    })();
  }, [router]);

  return (
    <main className="min-h-[60vh] flex items-center justify-center">
      <p className="text-sm text-brand-charcoal">
        Signing you in securely…
      </p>
    </main>
  );
}
