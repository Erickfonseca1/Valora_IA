import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/supabase";
import { getCurrentUser, getValuationScope, resolveActiveOrg } from "@/lib/access";
import type { ApiResponse, TeamMemberProduction, MembershipRole } from "@/types";

// Produção da equipe — gestor (owner/admin) da organização ativa.
// Conta estudos por membro: este mês e total (não-deletados).
export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ members: TeamMemberProduction[] }>>> {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminClient();
  const scope = await getValuationScope(db, user.id);
  const orgId = await resolveActiveOrg(db, user.id, req);
  if (!orgId) {
    return NextResponse.json({ success: false, error: "No active organization" }, { status: 404 });
  }
  if (!scope.adminOrgIds.includes(orgId)) {
    return NextResponse.json({ success: false, error: "Gestor-only" }, { status: 403 });
  }

  const { data: memberRows } = await db
    .from("memberships")
    .select("user_id, role, created_at")
    .eq("organization_id", orgId);

  const members = (memberRows ?? []).filter((m) => m.role !== "pending") as Array<{
    user_id: string;
    role: MembershipRole;
    created_at: string;
  }>;

  const memberIds = members.map((m) => m.user_id);
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [{ data: monthRows }, { data: allRows }] = await Promise.all([
    db
      .from("valuations")
      .select("created_by")
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .gte("created_at", monthStart.toISOString())
      .in("created_by", memberIds),
    db
      .from("valuations")
      .select("created_by")
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .in("created_by", memberIds),
  ]);

  const monthCount: Record<string, number> = {};
  for (const r of (monthRows ?? []) as Array<{ created_by: string | null }>) {
    if (r.created_by) monthCount[r.created_by] = (monthCount[r.created_by] ?? 0) + 1;
  }
  const totalCount: Record<string, number> = {};
  for (const r of (allRows ?? []) as Array<{ created_by: string | null }>) {
    if (r.created_by) totalCount[r.created_by] = (totalCount[r.created_by] ?? 0) + 1;
  }

  const out: TeamMemberProduction[] = [];
  for (const m of members) {
    const { data: profile } = await db
      .from("profiles")
      .select("full_name")
      .eq("id", m.user_id)
      .maybeSingle();
    const { data: authUser } = await db.auth.admin.getUserById(m.user_id);
    out.push({
      user_id: m.user_id,
      full_name: profile?.full_name ?? null,
      email: authUser?.user?.email ?? null,
      role: m.role,
      this_month: monthCount[m.user_id] ?? 0,
      total: totalCount[m.user_id] ?? 0,
    });
  }

  out.sort((a, b) => b.this_month - a.this_month || b.total - a.total);

  return NextResponse.json({ success: true, data: { members: out } });
}