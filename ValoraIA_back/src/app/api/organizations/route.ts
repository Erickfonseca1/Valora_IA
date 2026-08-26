import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/access";
import { logAudit } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/rate-limit";
import type { ApiResponse, Organization, Membership, OrgType } from "@/types";

const CreateOrgSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(["imobiliaria", "escritorio"]).default("imobiliaria"),
});

function slugify(value: string): string {
  return value.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "org";
}

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
  const parsed = CreateOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.issues },
      { status: 422 }
    );
  }

  const db = getAdminClient();
  const slug = `${slugify(parsed.data.name)}-${Math.random().toString(36).slice(2, 8)}`;

  const { data: org, error: orgError } = await db
    .from("organizations")
    .insert({
      name: parsed.data.name,
      slug,
      type: parsed.data.type as OrgType,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (orgError || !org) {
    return NextResponse.json({ success: false, error: "Failed to create organization" }, { status: 500 });
  }

  const { data: membership, error: membershipError } = await db
    .from("memberships")
    .insert({ organization_id: org.id, user_id: user.id, role: "owner", invited_by: user.id })
    .select("*")
    .single();

  if (membershipError || !membership) {
    return NextResponse.json({ success: false, error: "Failed to create membership" }, { status: 500 });
  }

  await logAudit(db, {
    action: "organization.create",
    entityType: "organization",
    entityId: org.id,
    userId: user.id,
    ip: getClientIp(req),
    userAgent: req.headers.get("user-agent") ?? undefined,
    metadata: { type: org.type },
  });

  return NextResponse.json(
    { success: true, data: { organization: org as Organization, membership: membership as Membership } },
    { status: 201 }
  );
}