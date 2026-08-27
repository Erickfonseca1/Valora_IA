/**
 * Seed de demonstração — cria um ambiente realista para a demo ao sócio:
 *   • conta demo (dono) + 2 avaliadores
 *   • organização "Demo Imobiliária" (multi-usuário)
 *   • avaliações reais rodando o próprio motor (comparáveis, POIs, prior)
 *
 * Uso (do diretório ValoraIA_back, com .env.local):
 *   npx tsx scripts/seed-demo.ts
 *
 * Idempotente: se a organização/slug já existir, apenas adiciona o que faltar.
 * Aviso: usa a service role — rodar apenas em ambiente de demonstração.
 */

import fs from "fs";
import path from "path";

// O tsx não lê .env.local do Next automaticamente; carregamos na mão
// (sem sobrescrever variáveis já presentes no ambiente).
function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.warn("[seed] .env.local não encontrado em", envPath);
    return;
  }
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const DEMO_EMAIL = "demo@avalia.demo";
const DEMO_PASSWORD = "Demo1234!";
const DEMO_ORG_SLUG = "demo-imobiliaria";

const CASES: Array<{
  address: string;
  property_type: "apartment" | "house" | "commercial";
  area_m2: number;
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  construction_age: number;
  conservation_state: "novo" | "entre_novo_e_regular" | "regular" | "reparos_simples";
  is_corner: boolean;
  terrain_slope: "plano" | "declive_leve";
  street_level: "no_nivel" | "acima_nivel";
}> = [
  { address: "Rua José Vilar, 210, Manaíra, João Pessoa, PB", property_type: "apartment", area_m2: 98, bedrooms: 3, bathrooms: 2, parking_spaces: 1, construction_age: 15, conservation_state: "regular", is_corner: false, terrain_slope: "plano", street_level: "no_nivel" },
  { address: "Av. Epitácio Pessoa, 1350, Manaíra, João Pessoa, PB", property_type: "apartment", area_m2: 112, bedrooms: 3, bathrooms: 3, parking_spaces: 2, construction_age: 8, conservation_state: "entre_novo_e_regular", is_corner: false, terrain_slope: "plano", street_level: "no_nivel" },
  { address: "Rua das Acácias, 88, Bancários, João Pessoa, PB", property_type: "house", area_m2: 160, bedrooms: 3, bathrooms: 2, parking_spaces: 2, construction_age: 12, conservation_state: "regular", is_corner: true, terrain_slope: "plano", street_level: "no_nivel" },
  { address: "Rua José Lins do Rego, 500, Torre, João Pessoa, PB", property_type: "apartment", area_m2: 74, bedrooms: 2, bathrooms: 2, parking_spaces: 1, construction_age: 5, conservation_state: "novo", is_corner: false, terrain_slope: "plano", street_level: "no_nivel" },
  { address: "Av. João Maurício, 300, Manaíra, João Pessoa, PB", property_type: "commercial", area_m2: 60, bedrooms: 0, bathrooms: 1, parking_spaces: 1, construction_age: 10, conservation_state: "regular", is_corner: false, terrain_slope: "plano", street_level: "no_nivel" },
  { address: "Rua Maximiano Chaves, 120, Bessa, João Pessoa, PB", property_type: "house", area_m2: 240, bedrooms: 4, bathrooms: 3, parking_spaces: 3, construction_age: 20, conservation_state: "reparos_simples", is_corner: false, terrain_slope: "plano", street_level: "acima_nivel" },
];

async function ensureUser(db: ReturnType<typeof import("../src/lib/db/supabase")["getAdminClient"]>, email: string, name: string, creci: string) {
  const { data: existing } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = (existing?.users ?? []).find((u) => u.email === email);

  // Conta existe → corrige perfil/metadata para o nome atual (idempotente).
  if (found) {
    await db.from("profiles").upsert({ id: found.id, full_name: name, creci });
    await db.auth.admin.updateUserById(found.id, { user_metadata: { full_name: name } });
    return found.id;
  }

  const { data, error } = await db.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  await db.from("profiles").upsert({ id: data!.user.id, full_name: name, creci });
  return data!.user.id;
}

async function ensureOrg(db: ReturnType<typeof import("../src/lib/db/supabase")["getAdminClient"]>, ownerId: string) {
  const { data: existing } = await db.from("organizations").select("id").eq("slug", DEMO_ORG_SLUG).maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await db
    .from("organizations")
    .insert({ name: "Demo Imobiliária", slug: DEMO_ORG_SLUG, type: "imobiliaria", created_by: ownerId })
    .select("id")
    .single();
  if (error) throw new Error(`createOrg: ${error.message}`);
  return data!.id;
}

async function main() {
  // Imports dinâmicos: só depois do env carregado (supabase.ts lê process.env).
  const { getAdminClient } = await import("../src/lib/db/supabase");
  const { runValuation } = await import("../src/lib/math/valuation-engine");
  const { geocodeAddress } = await import("../src/lib/geocoding/google-maps");

  const db = getAdminClient();

  console.log("1/4 criando usuários demo…");
  const ownerId = await ensureUser(db, DEMO_EMAIL, "Erick Demo (Dono)", "12.345-F");
  const av1Id = await ensureUser(db, "ana.demo@avalia.demo", "Ana Avaliadora", "22.111-F");
  const av2Id = await ensureUser(db, "bruno.demo@avalia.demo", "Bruno Corretor", "33.222-F");

  console.log("2/4 criando organização + membros…");
  const orgId = await ensureOrg(db, ownerId);
  const members = [
    { organization_id: orgId, user_id: ownerId, role: "owner" as const },
    { organization_id: orgId, user_id: av1Id, role: "admin" as const },
    { organization_id: orgId, user_id: av2Id, role: "avaliador" as const },
  ];
  for (const m of members) {
    const { data: dup } = await db.from("memberships").select("id").eq("organization_id", m.organization_id).eq("user_id", m.user_id).maybeSingle();
    if (!dup) await db.from("memberships").insert(m);
  }

  console.log("3/4 gerando avaliações reais (motor)…");
  let created = 0;
  for (const c of CASES) {
    const { data: dup } = await db.from("valuations").select("id").eq("address", c.address).eq("organization_id", orgId).maybeSingle();
    if (dup) continue;

    try {
      const geo = await geocodeAddress(c.address);
      if (!geo) throw new Error("não geocodificou");

      const engine = await runValuation({
        lat: geo.lat, lng: geo.lng, // geocodifica pelo endereço
        target_area: c.area_m2,
        target_construction_area: c.area_m2,
        target_land_area: c.property_type === "house" ? c.area_m2 * 2 : null,
        target_bedrooms: c.bedrooms || null,
        target_bathrooms: c.bathrooms || null,
        target_parking: c.parking_spaces || null,
        target_property_type: c.property_type,
        neighborhood: geo.neighborhood,
        city: geo.city ?? "João Pessoa",
        address: c.address,
        is_corner: c.is_corner,
        terrain_slope: c.terrain_slope,
        street_level: c.street_level,
        amenities: [],
        in_gated_community: false,
      });

      const { error } = await db.from("valuations").insert({
        address: c.address,
        city: "João Pessoa",
        organization_id: orgId,
        created_by: av1Id,
        property_type: c.property_type,
        area_construida_m2: c.area_m2,
        area_terreno_m2: c.property_type === "house" ? c.area_m2 * 2 : null,
        area_m2: c.area_m2,
        bedrooms: c.bedrooms || null,
        bathrooms: c.bathrooms || null,
        parking_spaces: c.parking_spaces || null,
        construction_age: c.construction_age,
        conservation_state: c.conservation_state,
        terrain_slope: c.terrain_slope,
        street_level: c.street_level,
        is_corner: c.is_corner,
        static_market_value_brl: engine.estimated_value,
        price_per_m2_homogenized: engine.price_per_m2_homogenized,
        confidence_score: engine.confidence_score,
        comparables: engine.frontend_comparables,
        neighborhood_pois: engine.neighborhood_pois,
        homogenization_factors: engine.homogenization_factors,
        confidence_diagnostics: engine.confidence_diagnostics,
        market_reference: engine.market_reference,
        amenities: [],
        in_gated_community: false,
      });
      if (error) throw new Error(`insert valuation ${c.address}: ${error.message}`);
      created += 1;
    } catch (e) {
      console.warn("skip", c.address, e instanceof Error ? e.message : e);
    }
  }

  console.log(`4/4 concluído. ${created} avaliação(ões) criada(s).`);
  console.log("\nLogin demo (dono):", DEMO_EMAIL, "/", DEMO_PASSWORD);
  console.log("Avaliador (admin): ana.demo@avalia.demo /", DEMO_PASSWORD);
  console.log("Corretor (avaliador): bruno.demo@avalia.demo /", DEMO_PASSWORD);
}

main().catch((e) => {
  console.error("Seed falhou:", e);
  process.exit(1);
});