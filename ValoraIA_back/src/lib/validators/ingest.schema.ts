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

  // Portal de origem (opcional; dedup continua por source_url)
  source: z
    .enum(["olx", "zapimoveis", "vivareal", "quintoandar", "imovelweb"])
    .optional(),
  ad_id: z.string().max(255).optional(),

  price: coercePositiveNumber("price"),
  usable_area: coercePositiveNumber("usable_area"),
  total_area: coercePositiveNumber("total_area").optional(),
  land_area: coercePositiveNumber("land_area").optional(),

  bedrooms: coerceNonNegativeInt("bedrooms"),
  bathrooms: coerceNonNegativeInt("bathrooms"),
  suites: coerceNonNegativeInt("suites"),
  parking_spaces: coerceNonNegativeInt("parking_spaces"),

  // Custos do imóvel (homogeneização NBR 14653)
  condo_fee: coercePositiveNumber("condo_fee").optional(),
  iptu: coercePositiveNumber("iptu").optional(),

  property_type: z.enum(["apartment", "house", "commercial", "land"], {
    error: "property_type must be one of: apartment, house, commercial, land",
  }),

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
  address: z.string().max(512).nullable().optional().default(null),
  state: z.string().length(2).nullable().optional().default(null),

  construction_age: z.number().int().min(0).max(300).nullable().optional().default(null),
  conservation_state: z
    .enum(["novo", "entre_novo_e_regular", "regular", "reparos_simples", "reparos_importantes", "critico"])
    .optional()
    .default("regular"),

  // Atributos do edifício/condomínio
  floor: z.number().int().min(0).nullable().optional().default(null),
  total_floors: z.number().int().min(0).nullable().optional().default(null),
  is_condo: z.boolean().optional().default(true),
  is_new_launch: z.boolean().optional().default(false),
  listing_created_at: z
    .union([z.string(), z.number()])
    .transform((v) => {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) throw new Error("listing_created_at must be a valid date");
      return d.toISOString();
    })
    .optional(),

  images: z
    .array(z.string().min(1).max(2048))
    .optional()
    .default([]),
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
