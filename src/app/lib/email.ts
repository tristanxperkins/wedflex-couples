import { Resend } from "resend";
import { logger } from "./logger";

const FROM = process.env.EMAIL_FROM ?? "WedFlex <noreply@wedflex.com>";

/** Fire-and-forget email — errors are logged but never thrown. */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (e) {
    logger.error("[email] Failed to send", e, { subject, to });
  }
}

const APP_URL = process.env.NEXT_PUBLIC_APP_ORIGIN ?? "https://wedflex.com";

/** Escape HTML entities to prevent injection in email templates. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrap(body: string): string {
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#333">
${body}
<hr style="margin:32px 0;border:none;border-top:1px solid #eee"/>
<p style="font-size:12px;color:#999">WedFlex — connecting couples with talented wedding professionals.</p>
</div>`;
}

export function newApplicationEmail(requestTitle: string): { subject: string; html: string } {
  const safe = escapeHtml(requestTitle);
  return {
    subject: `New application for "${requestTitle}"`,
    html: wrap(`<p>Hi there,</p>
<p>You have a new application for your WedFlex request <strong>${safe}</strong>.</p>
<p>Log in to review the application and choose your WedFlexer.</p>
<p><a href="${APP_URL}/dashboard" style="display:inline-block;padding:10px 20px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:4px">View Applications</a></p>`),
  };
}

export function applicationAcceptedEmail(requestTitle: string): { subject: string; html: string } {
  const safe = escapeHtml(requestTitle);
  return {
    subject: `You've been selected for "${requestTitle}"`,
    html: wrap(`<p>Congratulations!</p>
<p>A couple has selected you for their WedFlex request: <strong>${safe}</strong>.</p>
<p>Log in to view the booking details and next steps.</p>
<p><a href="${APP_URL}/dashboard" style="display:inline-block;padding:10px 20px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:4px">View Dashboard</a></p>`),
  };
}

export function bookingConfirmedEmail(requestTitle: string, serviceDate: string): { subject: string; html: string } {
  const safeTitle = escapeHtml(requestTitle);
  const safeDate = escapeHtml(serviceDate);
  return {
    subject: `Booking confirmed — ${requestTitle}`,
    html: wrap(`<p>Your booking is confirmed!</p>
<p>Payment has been received for <strong>${safeTitle}</strong> on <strong>${safeDate}</strong>.</p>
<p>Your WedFlexer has been notified and will be in touch soon.</p>
<p><a href="${APP_URL}/dashboard" style="display:inline-block;padding:10px 20px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:4px">View Booking</a></p>`),
  };
}

export function payoutReleasedEmail(amountDollars: string): { subject: string; html: string } {
  const safeAmount = escapeHtml(amountDollars);
  return {
    subject: "Your WedFlex payout has been released",
    html: wrap(`<p>Great news!</p>
<p>Your payout of <strong>$${safeAmount}</strong> has been released and is on its way to your bank account.</p>
<p>Transfers typically arrive within 1–3 business days depending on your bank.</p>
<p><a href="${APP_URL}/dashboard" style="display:inline-block;padding:10px 20px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:4px">View Dashboard</a></p>`),
  };
}

export function welcomeEmail(): { subject: string; html: string } {
  return {
    subject: "Welcome to WedFlex",
    html: wrap(`<p>Welcome to WedFlex!</p>
<p>We connect couples with talented wedding professionals. Whether you're looking to hire or get hired, you're in the right place.</p>
<p>Get started by posting your first request or browsing open offers.</p>
<p><a href="${APP_URL}/dashboard" style="display:inline-block;padding:10px 20px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:4px">Go to Dashboard</a></p>`),
  };
}
