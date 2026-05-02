import { z } from "zod";

// Coerces string → number, rejects NaN/Inf
const coercePositiveNumber = (field: string) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => {
      const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : v;
      if (!isFinite(n) || isNaN(n)) throw new Error(`${field} must be a finite number`);
      return n;
    })
    .refine((n) => n > 0, { message: `${field} must be > 0` });

const coerceNonNegativeInt = (field: string) =>
  z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform((v) => {
      if (v == null || v === "") return null;
      const n = typeof v === "string" ? parseInt(v, 10) : Math.floor(v as number);
      if (!isFinite(n) || isNaN(n)) throw new Error(`${field} must be an integer`);
      return n;
    })
    .refine((n) => n === null || n >= 0, { message: `${field} must be >= 0` });

export const IngestSchema = z.object({
  source_url: z
    .string()
    .url({ message: "source_url must be a valid URL" })
    .max(2048),

  platform: z.enum(["olx", "zapimoveis", "vivareal", "quintoandar", "imovelweb"], {
    error: "platform must be one of: olx, zapimoveis, vivareal, quintoandar, imovelweb",
  }),

  price: coercePositiveNumber("price"),
  usable_area: coercePositiveNumber("usable_area"),

  bedrooms: coerceNonNegativeInt("bedrooms"),
  bathrooms: coerceNonNegativeInt("bathrooms"),
  parking_spaces: coerceNonNegativeInt("parking_spaces"),

  lat: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === "string" ? parseFloat(v) : v))
    .refine((n) => isFinite(n) && n >= -90 && n <= 90, {
      message: "lat must be between -90 and 90",
    }),

  lng: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === "string" ? parseFloat(v) : v))
    .refine((n) => isFinite(n) && n >= -180 && n <= 180, {
      message: "lng must be between -180 and 180",
    }),

  neighborhood: z.string().max(255).nullable().optional().default(null),
  city: z.string().min(1).max(255),
});

export type ValidatedIngestPayload = z.infer<typeof IngestSchema>;

// ─── Evaluate endpoint schema ──────────────────────────────────────────────────
export const EvaluateSchema = z.object({
  lat: z
    .number({ error: "lat is required and must be a number" })
    .min(-90)
    .max(90),
  lng: z
    .number({ error: "lng is required and must be a number" })
    .min(-180)
    .max(180),
  target_area: z
    .number({ error: "target_area is required and must be a number" })
    .positive({ message: "target_area must be > 0" }),
  target_bedrooms: z.number().int().min(0).nullable().optional().default(null),
});

export type ValidatedEvaluatePayload = z.infer<typeof EvaluateSchema>;
