import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/db/supabase";
import { getCurrentUser, getUserMemberships } from "@/lib/access";
import type { ApiResponse, OrganizationDetail, Organization, OrganizationMember, OrgInvite } from "@/types";

const OrgPatchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  type: z.enum(["solo", "imobiliaria", "escritorio"]).optional(),
  logo_url: z.string().url().max(2048).nullable().optional(),
});

async function canManage(db: ReturnType<typeof getAdminClient>, userId: string, orgId: string) {
  const { data } = await db
    .from("memberships")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role === "owner" || data?.role === "admin";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<OrganizationDetail>>> {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getAdminClient();
  const memberships = await getUserMemberships(db, user.id);
  const membership = memberships.find((m) => m.organization_id === id);
  if (!membership) {
    return NextResponse.json({ success: false, error: "Not a member" }, { status: 403 });
  }

  const { data: org } = await db.from("organizations").select("*").eq("id", id).single();
  if (!org) {
    return NextResponse.json({ success: false, error: "Organization not found" }, { status: 404 });
  }

  const manager = membership.role === "owner" || membership.role === "admin";

  const [memberRows, inviteRows] = await Promise.all([
    manager
      ? db.from("memberships").select("user_id, role, created_at").eq("organization_id", id)
      : Promise.resolve({ data: null }),
    manager
      ? db.from("org_invites").select("*").eq("organization_id", id).is("revoked_at", null)
      : Promise.resolve({ data: null }),
  ]);

  // Resolve member names/emails (best-effort)
  const members: OrganizationMember[] = [];
  for (const row of (memberRows?.data ?? []) as Array<{ user_id: string; role: string; created_at: string }>) {
    const { data: profile } = await db.from("profiles").select("full_name").eq("id", row.user_id).maybeSingle();
    const { data: authUser } = await db.auth.admin.getUserById(row.user_id);
    members.push({
      user_id: row.user_id,
      full_name: profile?.full_name ?? null,
      email: authUser?.user?.email ?? null,
      role: row.role as OrganizationMember["role"],
      created_at: row.created_at,
    });
  }

  const detail: OrganizationDetail = {
    ...(org as Organization),
    members,
    invites: manager ? ((inviteRows?.data ?? []) as OrgInvite[]) : [],
  };

  return NextResponse.json({ success: true, data: detail });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Organization>>> {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getAdminClient();
  if (!(await canManage(db, user.id, id))) {
    return NextResponse.json({ success: false, error: "Only owners/admins can update the organization" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = OrgPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.issues },
      { status: 422 }
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.type !== undefined) updates.type = parsed.data.type;
  if (parsed.data.logo_url !== undefined) updates.logo_url = parsed.data.logo_url;

  const { data, error } = await db.from("organizations").update(updates).eq("id", id).select("*").single();
  if (error || !data) {
    return NextResponse.json({ success: false, error: "Failed to update organization" }, { status: 500 });
  }
  return NextResponse.json({ success: true, data: data as Organization });
}