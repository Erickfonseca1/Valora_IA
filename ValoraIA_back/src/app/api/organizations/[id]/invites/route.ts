import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { getAdminClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/access";
import { logAudit } from "@/lib/security/audit";
import type { ApiResponse, OrgInvite } from "@/types";

const InviteSchema = z.object({
  email: z.string().email().max(254),
  role: z.enum(["avaliador", "admin"]).default("avaliador"),
});

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ invite: OrgInvite }>>> {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getAdminClient();
  const { data: membership } = await db
    .from("memberships")
    .select("role")
    .eq("organization_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return NextResponse.json({ success: false, error: "Only owners/admins can invite" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.issues },
      { status: 422 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const token = crypto.randomBytes(24).toString("hex");

  const { data: invite, error } = await db
    .from("org_invites")
    .insert({
      organization_id: id,
      email,
      role: parsed.data.role,
      token,
      invited_by: user.id,
      expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
    })
    .select("*")
    .single();

  if (error || !invite) {
    return NextResponse.json({ success: false, error: "Failed to create invite" }, { status: 500 });
  }

  await logAudit(db, {
    action: "organization.invite",
    entityType: "organization",
    entityId: id,
    userId: user.id,
    metadata: { email, role: parsed.data.role },
  });

  // TODO(email): send the invite link. For now the token is returned so the
  // owner can share it directly (MVP).
  return NextResponse.json({ success: true, data: { invite: invite as OrgInvite } }, { status: 201 });
}