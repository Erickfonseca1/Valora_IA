import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/access";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import type { ApiResponse, Profile, Organization, Membership } from "@/types";

// Called once after signup: creates the profile and the personal "solo"
// organization with the user as owner. Idempotent.
export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ profile: Profile; organizations: Organization[]; memberships: Membership[] }>>> {
  const ip = getClientIp(req);
  if (!rateLimit(`onboarding:${ip}`, 10, 60_000)) return rateLimitResponse();

  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminClient();

  // Profile (skip if already present)
  let fullName = (user.email ?? "Usuário").split("@")[0];
  const { data: existingProfile } = await db
    .from("profiles")
    .select("id, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!existingProfile) {
    const { data: created, error } = await db
      .from("profiles")
      .insert({ id: user.id, full_name: fullName })
      .select("id, full_name, creci, cnai, avatar_url, created_at")
      .single();
    if (error && !error.message.includes("duplicate")) {
      return NextResponse.json({ success: false, error: "Failed to create profile" }, { status: 500 });
    }
    if (created) fullName = created.full_name;
  }

  // Personal org (skip if the user already has memberships)
  const { data: existingMemberships } = await db
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);
  if ((existingMemberships ?? []).length === 0) {
    const slugBase = (fullName || "usuario").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
    const { data: org, error: orgError } = await db
      .from("organizations")
      .insert({ name: `Avaliações de ${fullName}`, slug: `${slugBase}-${user.id.slice(0, 6)}`, type: "solo", created_by: user.id })
      .select("id")
      .single();
    if (orgError) {
      return NextResponse.json({ success: false, error: "Failed to create organization" }, { status: 500 });
    }
    await db
      .from("memberships")
      .insert({ organization_id: org.id, user_id: user.id, role: "owner" });
  }

  const [profile, organizations, memberships] = await Promise.all([
    db.from("profiles").select("id, full_name, creci, cnai, avatar_url, onboarding_completed_at, created_at").eq("id", user.id).single(),
    db.from("organizations").select("*").in("id", (await db.from("memberships").select("organization_id").eq("user_id", user.id)).data?.map((m) => m.organization_id) ?? []),
    db.from("memberships").select("*").eq("user_id", user.id),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      profile: profile.data as Profile,
      organizations: (organizations.data ?? []) as Organization[],
      memberships: (memberships.data ?? []) as Membership[],
    },
  });
}