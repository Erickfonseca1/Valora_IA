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
});

async function loadMe(db: ReturnType<typeof getAdminClient>, userId: string): Promise<MeData> {
  const { data: profile } = await db
    .from("profiles")
    .select("id, full_name, creci, cnaI, avatar_url, created_at")
    .eq("id", userId)
    .maybeSingle();

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
    profile: (profile as Profile | null) ?? null,
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

  const { error } = await db.from("profiles").update(updates).eq("id", user.id);
  if (error) {
    return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 });
  }

  const data = await loadMe(db, user.id);
  return NextResponse.json({ success: true, data });
}