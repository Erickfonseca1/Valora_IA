import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/access";
import { logAudit } from "@/lib/security/audit";
import type { ApiResponse, Organization, Membership, MembershipRole } from "@/types";

const AcceptSchema = z.object({ token: z.string().min(8).max(128) });

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ organization: Organization; membership: Membership }>>> {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = AcceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.issues },
      { status: 422 }
    );
  }

  const db = getAdminClient();
  const { data: invite, error } = await db
    .from("org_invites")
    .select("*")
    .eq("token", parsed.data.token)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !invite) {
    return NextResponse.json({ success: false, error: "Invite not found or already used" }, { status: 404 });
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ success: false, error: "Invite expired" }, { status: 410 });
  }

  const email = (user.email ?? "").toLowerCase();
  if (invite.email.toLowerCase() !== email) {
    return NextResponse.json(
      { success: false, error: "This invite was sent to a different e-mail" },
      { status: 403 }
    );
  }

  const { data: membership, error: membershipError } = await db
    .from("memberships")
    .insert({
      organization_id: invite.organization_id,
      user_id: user.id,
      role: invite.role as MembershipRole,
      invited_by: invite.invited_by,
    })
    .select("*")
    .single();

  if (membershipError) {
    // Duplicate membership means the user already belongs to the org.
    if (membershipError.message.includes("duplicate")) {
      return NextResponse.json({ success: false, error: "You are already a member of this organization" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: "Failed to accept invite" }, { status: 500 });
  }

  await db.from("org_invites").update({ accepted_by: user.id, accepted_at: new Date().toISOString() }).eq("id", invite.id);

  const { data: organization } = await db
    .from("organizations")
    .select("*")
    .eq("id", invite.organization_id)
    .single();

  await logAudit(db, {
    action: "organization.invite_accept",
    entityType: "organization",
    entityId: invite.organization_id,
    userId: user.id,
  });

  return NextResponse.json({
    success: true,
    data: {
      organization: organization as Organization,
      membership: membership as Membership,
    },
  });
}