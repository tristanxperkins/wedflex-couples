import { NextResponse } from "next/server";

/**
 * Simple in-memory sliding-window rate limiter.
 *
 * For production, replace with Redis-backed solution (e.g. @upstash/ratelimit).
 * This is sufficient for single-instance deployments and prevents basic abuse.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

interface RateLimitConfig {
  /** Max requests in the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

/** Default configs per endpoint category */
export const RATE_LIMITS = {
  /** Mutations: create request, send message, submit application */
  mutation: { limit: 30, windowMs: 60_000 } as RateLimitConfig,
  /** Reads: dashboard, open-requests, etc. */
  read: { limit: 60, windowMs: 60_000 } as RateLimitConfig,
  /** Sensitive: Stripe checkout, escrow, payout */
  sensitive: { limit: 10, windowMs: 60_000 } as RateLimitConfig,
  /** Auth: role changes */
  auth: { limit: 20, windowMs: 60_000 } as RateLimitConfig,
} as const;

/**
 * Check rate limit for a given key (typically user ID or IP).
 * Returns null if allowed, or a NextResponse with 429 if exceeded.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): NextResponse | null {
  cleanup(config.windowMs);

  const now = Date.now();
  const cutoff = now - config.windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= config.limit) {
    const retryAfter = Math.ceil(
      (entry.timestamps[0]! + config.windowMs - now) / 1000
    );
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  entry.timestamps.push(now);
  return null;
}
