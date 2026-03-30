import { z } from "zod";

/** Max lengths to prevent abuse */
const MAX_TITLE_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_CATEGORY_LENGTH = 100;
const MAX_LOCATION_LENGTH = 200;
const MAX_FILE_URLS = 20;
const MAX_COUNTER_OFFER_DOLLARS = 1_000_000; // $1M cap

/** Reusable UUID schema */
const uuid = z.string().uuid("Invalid UUID format");

/** Reusable non-negative cents schema */
const centsSafe = z
  .union([z.string(), z.number()])
  .optional()
  .nullable()
  .transform((val) => {
    if (val === null || val === undefined) return null;
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.max(0, Math.floor(n));
  });

// ---------- Service Request ----------
export const CreateServiceRequestSchema = z.object({
  title: z.string().min(1, "Title required").max(MAX_TITLE_LENGTH),
  category: z.string().min(1, "Category required").max(MAX_CATEGORY_LENGTH),
  location: z.string().min(1, "City is required").max(MAX_LOCATION_LENGTH),
  offer_cents: centsSafe,
  description: z
    .string()
    .max(MAX_DESCRIPTION_LENGTH)
    .optional(),
  accepted_terms: z.boolean().optional(),
  inspiration_images: z.array(z.string().url()).max(MAX_FILE_URLS).optional(),
});

// ---------- Application ----------
export const CreateApplicationSchema = z.object({
  request_id: uuid,
  message: z.string().min(1, "Please add a message").max(MAX_MESSAGE_LENGTH),
  accept_offer: z.boolean().optional().default(false),
  counter_offer: z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((val) => {
      if (val == null || String(val).trim() === "") return null;
      const n = Number(val);
      if (!Number.isFinite(n) || n < 0 || n > MAX_COUNTER_OFFER_DOLLARS) return undefined; // will fail refine
      return n;
    })
    .refine((val) => val !== undefined, {
      message: `Counter-offer must be between $0 and $${MAX_COUNTER_OFFER_DOLLARS.toLocaleString()}`,
    })
    .nullable(),
  file_urls: z.array(z.string().url()).max(MAX_FILE_URLS).optional().nullable(),
});

// ---------- Application Status Update ----------
export const UpdateApplicationStatusSchema = z.object({
  status: z.enum(["pending", "accepted", "rejected", "withdrawn"]),
});

// ---------- Messages ----------
export const SendMessageSchema = z.object({
  other: uuid,
  request_id: z.string().uuid().optional().nullable(),
  text: z.string().max(MAX_MESSAGE_LENGTH).optional().default(""),
  file_url: z.string().url().optional().nullable(),
}).refine((data) => data.text.trim() || data.file_url, {
  message: "Message must have text or a file",
});

// ---------- Role Update ----------
export const UpdateRoleSchema = z.object({
  active_role: z.enum(["couple", "wedflexer"]),
});

// ---------- Stripe Checkout ----------
export const StripeCheckoutSchema = z.object({
  application_id: uuid,
});

// ---------- Escrow ----------
export const CreateEscrowSchema = z.object({
  amount_cents: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const n = Number(val);
      if (!Number.isFinite(n) || n <= 0) return undefined;
      return Math.round(n);
    })
    .refine((val) => val !== undefined, {
      message: "amount_cents must be a positive number",
    }),
});

// ---------- File Signed URL ----------
export const FileSignedUrlSchema = z.object({
  application_id: uuid,
  file_path: z.string().min(1, "Missing file_path").max(500),
});

// ---------- Book Request ----------
export const BookRequestSchema = z.object({
  application_id: uuid,
});

/** Helper to return a 400 with Zod errors */
export function zodError(result: { success: false; error: z.ZodError }) {
  const fieldErrors = result.error.flatten().fieldErrors;
  const formErrors = result.error.flatten().formErrors;
  return {
    ok: false as const,
    error: "Validation failed",
    details: { ...fieldErrors, _form: formErrors.length ? formErrors : undefined },
  };
}
