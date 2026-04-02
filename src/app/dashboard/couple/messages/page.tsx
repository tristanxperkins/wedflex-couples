"use client";

import { useEffect, useState } from "react";
import RequireAuth from "../../../components/RequireAuth";
import DashboardSidebar from "../../../components/DashboardSidebar";
import Chat from "../../../components/chat";
import { supabaseBrowser } from "../../../supabase/client";

// Couple inbox. Shows all active message threads with WedFlexers.

type RawThread = {
  id: string;
  user_one: string;
  user_two: string;
  request_id: string | null;
  last_message_at: string | null;
};

type Thread = RawThread & {
  otherUserId: string;
  requestTitle: string | null;
};

export default function CoupleMessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: userData, error: userErr } = await sb.auth.getUser();
        if (userErr || !userData?.user) throw new Error("Not authenticated");
        const uid = userData.user.id;

        const { data: rawThreads, error: tErr } = await sb
          .from("message_threads")
          .select("id,user_one,user_two,request_id,last_message_at")
          .or(`user_one.eq.${uid},user_two.eq.${uid}`)
          .order("last_message_at", { ascending: false });
        if (tErr) throw tErr;

        const rows = (rawThreads ?? []) as RawThread[];
        const enriched = rows.map((t) => ({
          ...t,
          otherUserId: t.user_one === uid ? t.user_two : t.user_one,
          requestTitle: null as string | null,
        }));

        // Fetch service request titles
        const requestIds = enriched
          .map((t) => t.request_id)
          .filter(Boolean) as string[];
        const titleMap: Record<string, string> = {};
        if (requestIds.length > 0) {
          const { data: reqs } = await sb
            .from("service_requests")
            .select("id,title")
            .in("id", requestIds);
          (reqs ?? []).forEach((r: { id: string; title: string }) => {
            titleMap[r.id] = r.title;
          });
        }

        setThreads(
          enriched.map((t) => ({
            ...t,
            requestTitle: t.request_id ? (titleMap[t.request_id] ?? null) : null,
          }))
        );
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <RequireAuth>
      <main className="max-w-6xl mx-auto p-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <DashboardSidebar role="couple" />

        <section className="space-y-6">
          <header>
            <h1 className="text-2xl font-semibold">Messages</h1>
            <p className="text-sm opacity-70">
              Chat with WedFlexers who applied to your offers.
            </p>
          </header>

          {loading && <p className="text-sm text-slate-500">Loading…</p>}
          {err && <p className="text-red-600 text-sm">Error: {err}</p>}

          {!loading && !err && (
            <div className="grid gap-4 md:grid-cols-[280px_1fr]">
              {/* Thread list */}
              <div className="border rounded-lg divide-y overflow-hidden self-start">
                {threads.length === 0 ? (
                  <p className="p-4 text-sm opacity-70">
                    No conversations yet. WedFlexers who apply to your offers
                    will appear here.
                  </p>
                ) : (
                  threads.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelected(t)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                        selected?.id === t.id
                          ? "bg-purple-50 border-l-2 border-purple-700"
                          : ""
                      }`}
                    >
                      <div className="font-medium text-sm truncate">
                        {t.requestTitle ?? `WedFlexer ${t.otherUserId.slice(0, 8)}…`}
                      </div>
                      {t.last_message_at && (
                        <div className="text-xs opacity-40 mt-0.5">
                          {new Date(t.last_message_at).toLocaleDateString()}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Chat panel */}
              <div className="min-h-[300px]">
                {selected ? (
                  <Chat
                    otherUserId={selected.otherUserId}
                    requestId={selected.request_id ?? undefined}
                  />
                ) : (
                  <div className="border rounded-lg p-6 text-sm opacity-70 text-center">
                    Select a conversation to start chatting.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </RequireAuth>
  );
}
