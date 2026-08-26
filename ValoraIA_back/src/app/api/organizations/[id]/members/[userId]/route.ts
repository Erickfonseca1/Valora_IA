import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/access";
import { logAudit } from "@/lib/security/audit";
import type { ApiResponse } from "@/types";

const MemberPatchSchema = z.object({
  role: z.enum(["owner", "admin", "avaliador"]),
});

// Change a member's role. Owners can only be demoted by another owner.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id, userId } = await params;
  const db = getAdminClient();
  const { data: caller } = await db
    .from("memberships")
    .select("role")
    .eq("organization_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!caller || (caller.role !== "owner" && caller.role !== "admin")) {
    return NextResponse.json({ success: false, error: "Only owners/admins can manage members" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = MemberPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 422 });
  }

  const { data: target } = await db
    .from("memberships")
    .select("role")
    .eq("organization_id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!target) {
    return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
  }

  // Only an owner can change another owner's role.
  if (target.role === "owner" && caller.role !== "owner") {
    return NextResponse.json({ success: false, error: "Only owners can manage owners" }, { status: 403 });
  }

  const { error } = await db
    .from("memberships")
    .update({ role: parsed.data.role })
    .eq("organization_id", id)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ success: false, error: "Failed to update member" }, { status: 500 });
  }

  await logAudit(db, {
    action: "organization.member_role",
    entityType: "organization",
    entityId: id,
    userId: user.id,
    metadata: { target_user_id: userId, role: parsed.data.role },
  });

  return NextResponse.json({ success: true, data: { ok: true } });
}

// Remove a member. The last owner cannot be removed; the organization must be
// transferred or deleted first.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id, userId } = await params;
  const db = getAdminClient();
  const { data: caller } = await db
    .from("memberships")
    .select("role")
    .eq("organization_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!caller || (caller.role !== "owner" && caller.role !== "admin")) {
    return NextResponse.json({ success: false, error: "Only owners/admins can manage members" }, { status: 403 });
  }

  const { data: target } = await db
    .from("memberships")
    .select("role")
    .eq("organization_id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!target) {
    return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
  }

  if (target.role === "owner") {
    return NextResponse.json({ success: false, error: "Owners cannot be removed. Transfer the organization first." }, { status: 403 });
  }
  if (target.role === "admin" && caller.role !== "owner") {
    return NextResponse.json({ success: false, error: "Only owners can remove admins" }, { status: 403 });
  }

  const { error } = await db
    .from("memberships")
    .delete()
    .eq("organization_id", id)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ success: false, error: "Failed to remove member" }, { status: 500 });
  }

  await logAudit(db, {
    action: "organization.member_remove",
    entityType: "organization",
    entityId: id,
    userId: user.id,
    metadata: { target_user_id: userId },
  });

  return NextResponse.json({ success: true, data: { ok: true } });
}