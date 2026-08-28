import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/access";
import type { ApiResponse, Profile, Organization, Membership } from "@/types";

interface MeData {
  profile: Profile | null;
  organizations: Organization[];
  memberships: Membership[];
}

const ProfilePatchSchema = z.object({
  full_name: z.string().min(1).max(120).optional(),
  creci: z.string().max(40).nullable().optional(),
  cnaI: z.string().max(40).nullable().optional(),
  avatar_url: z.string().url().max(2048).nullable().optional(),
  onboarding_completed_at: z.string().nullable().optional(),
});

async function loadMe(db: ReturnType<typeof getAdminClient>, userId: string): Promise<MeData> {
  let profile: Profile | null = null;
  try {
    const { data, error } = await db
      .from("profiles")
      .select("id, full_name, creci, cnai, avatar_url, onboarding_completed_at, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      console.error("[me] select profiles com onboarding falhou:", error?.message);
      // Fallback: select básico (sem a flag) — a coluna pode faltar em bancos
      // sem a migration 024, e o perfil não pode sumir por causa disso.
      const { data: safe, error: safeError } = await db
        .from("profiles")
        .select("id, full_name, creci, cnai, avatar_url, created_at")
        .eq("id", userId)
        .maybeSingle();
      if (!safeError && safe) profile = safe as Profile;
    } else {
      profile = data as Profile;
    }
  } catch (e) {
    console.error("[me] load profile falhou:", e);
  }

  const { data: memberships } = await db
    .from("memberships")
    .select("*")
    .eq("user_id", userId);

  const rows = (memberships ?? []) as Membership[];
  let organizations: Organization[] = [];
  if (rows.length > 0) {
    const { data: orgs } = await db
      .from("organizations")
      .select("*")
      .in("id", rows.map((r) => r.organization_id));
    organizations = (orgs ?? []) as Organization[];
  }

  return {
    profile,
    organizations,
    memberships: rows,
  };
}

export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<MeData>>> {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const data = await loadMe(getAdminClient(), user.id);
  return NextResponse.json({ success: true, data });
}

export async function PATCH(
  req: NextRequest
): Promise<NextResponse<ApiResponse<MeData>>> {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = ProfilePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.issues },
      { status: 422 }
    );
  }

  const db = getAdminClient();
  const updates: Record<string, unknown> = {};
  if (parsed.data.full_name !== undefined) updates.full_name = parsed.data.full_name;
  if (parsed.data.creci !== undefined) updates.creci = parsed.data.creci;
  if (parsed.data.cnaI !== undefined) updates.cnaI = parsed.data.cnaI;
  if (parsed.data.avatar_url !== undefined) updates.avatar_url = parsed.data.avatar_url;
  if (parsed.data.onboarding_completed_at !== undefined) {
    updates.onboarding_completed_at = parsed.data.onboarding_completed_at;
  }

  const { error } = await db.from("profiles").update(updates).eq("id", user.id);
  if (error) {
    return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 });
  }

  const data = await loadMe(db, user.id);
  return NextResponse.json({ success: true, data });
}